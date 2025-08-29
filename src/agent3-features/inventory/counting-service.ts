/**
 * Inventory Counting Service
 * Manages counting sessions, variance reporting, and approval workflows
 */

import { supabase, supabaseAdmin } from '@/agent1-foundation/database/supabase-client';
import { eventBus } from '@/shared/events/event-bus';

export interface CountingSession {
  id: string;
  business_id: string;
  name: string;
  description?: string;
  status: 'planning' | 'active' | 'paused' | 'completed' | 'cancelled';
  assigned_users: string[];
  zones: CountingZone[];
  progress: SessionProgress;
  settings: SessionSettings;
  started_at?: string;
  completed_at?: string;
  expected_duration: number;
  created_at: string;
  updated_at: string;
}

export interface CountingZone {
  id: string;
  name: string;
  location: string;
  products: string[];
  assigned_to?: string;
  status: 'pending' | 'in_progress' | 'completed';
  progress: number;
}

export interface SessionProgress {
  total_items: number;
  counted_items: number;
  variance_items: number;
  percentage: number;
  estimated_time_remaining: number;
}

export interface SessionSettings {
  require_approval: boolean;
  approval_threshold: number;
  allow_blind_counts: boolean;
  enable_cycle_counting: boolean;
  notification_settings: {
    on_start: boolean;
    on_complete: boolean;
    on_variance: boolean;
  };
}

export interface CountEntry {
  product_id: string;
  quantity: number;
  previous_quantity: number;
  difference: number;
  location: string;
  notes?: string;
  verified: boolean;
  timestamp: string;
}

export interface VarianceReport {
  session_id: string;
  total_variance: number;
  variance_percentage: number;
  high_variance_items: VarianceItem[];
  approval_required: boolean;
  generated_at: string;
}

export interface VarianceItem {
  product_id: string;
  product_name: string;
  expected: number;
  counted: number;
  variance: number;
  variance_percentage: number;
  location: string;
}

class CountingService {
  /**
   * Create a new counting session
   */
  async createSession(
    session: Omit<CountingSession, 'id' | 'created_at' | 'updated_at'>
  ): Promise<CountingSession> {
    const { data, error } = await supabase
      .from('cycle_count_sessions')
      .insert(session)
      .select()
      .single();

    if (error) throw error;

    // Broadcast session creation
    eventBus.broadcast('counting:session:created', { sessionId: data.id });

    return data;
  }

  /**
   * Start a counting session
   */
  async startSession(sessionId: string): Promise<void> {
    const { error } = await supabase
      .from('cycle_count_sessions')
      .update({
        status: 'active',
        started_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    if (error) throw error;

    eventBus.broadcast('counting:session:started', { sessionId });
  }

  /**
   * Submit a count entry
   */
  async submitCount(
    sessionId: string,
    entry: CountEntry
  ): Promise<void> {
    // Get current inventory
    const { data: currentInventory } = await supabase
      .from('inventory')
      .select('quantity')
      .eq('product_id', entry.product_id)
      .single();

    const previous_quantity = currentInventory?.quantity || 0;
    const difference = entry.quantity - previous_quantity;

    // Record the count
    const { error: countError } = await supabase
      .from('inventory_counts')
      .insert({
        product_id: entry.product_id,
        quantity: entry.quantity,
        previous_quantity,
        difference,
        location: entry.location,
        notes: entry.notes,
        session_id: sessionId,
        verified: entry.verified,
        user_id: (await supabase.auth.getUser()).data.user?.id
      });

    if (countError) throw countError;

    // Update inventory if verified
    if (entry.verified) {
      const { error: updateError } = await supabase
        .from('inventory')
        .update({
          quantity: entry.quantity,
          last_counted: new Date().toISOString()
        })
        .eq('product_id', entry.product_id);

      if (updateError) throw updateError;
    }

    // Update session progress
    await this.updateSessionProgress(sessionId);

    eventBus.broadcast('counting:entry:submitted', {
      sessionId,
      productId: entry.product_id,
      variance: difference
    });
  }

  /**
   * Update session progress
   */
  private async updateSessionProgress(sessionId: string): Promise<void> {
    // Get all counts for this session
    const { data: counts } = await supabase
      .from('inventory_counts')
      .select('*')
      .eq('session_id', sessionId);

    // Get session details
    const { data: session } = await supabase
      .from('cycle_count_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (!session || !counts) return;

    const progress: SessionProgress = {
      total_items: session.zones.reduce((acc: number, zone: any) => 
        acc + (zone.products?.length || 0), 0
      ),
      counted_items: counts.length,
      variance_items: counts.filter(c => c.difference !== 0).length,
      percentage: 0,
      estimated_time_remaining: 0
    };

    progress.percentage = (progress.counted_items / progress.total_items) * 100;
    
    // Update session
    await supabase
      .from('cycle_count_sessions')
      .update({ progress })
      .eq('id', sessionId);
  }

  /**
   * Generate variance report
   */
  async generateVarianceReport(sessionId: string): Promise<VarianceReport> {
    // Get all counts for session
    const { data: counts } = await supabase
      .from('inventory_counts')
      .select(`
        *,
        product:products(name)
      `)
      .eq('session_id', sessionId);

    if (!counts) throw new Error('No counts found');

    const varianceItems: VarianceItem[] = counts
      .filter(c => c.difference !== 0)
      .map(c => ({
        product_id: c.product_id,
        product_name: c.product?.name || 'Unknown',
        expected: c.previous_quantity,
        counted: c.quantity,
        variance: c.difference,
        variance_percentage: c.previous_quantity > 0 
          ? (c.difference / c.previous_quantity) * 100 
          : 100,
        location: c.location
      }))
      .sort((a, b) => Math.abs(b.variance_percentage) - Math.abs(a.variance_percentage));

    const totalVariance = varianceItems.reduce((sum, item) => sum + Math.abs(item.variance), 0);
    const totalExpected = counts.reduce((sum, c) => sum + c.previous_quantity, 0);
    const variancePercentage = totalExpected > 0 ? (totalVariance / totalExpected) * 100 : 0;

    const report: VarianceReport = {
      session_id: sessionId,
      total_variance: totalVariance,
      variance_percentage: variancePercentage,
      high_variance_items: varianceItems.slice(0, 10),
      approval_required: variancePercentage > 5, // 5% threshold
      generated_at: new Date().toISOString()
    };

    return report;
  }

  /**
   * Complete a counting session
   */
  async completeSession(sessionId: string): Promise<void> {
    const report = await this.generateVarianceReport(sessionId);

    const { error } = await supabase
      .from('cycle_count_sessions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    if (error) throw error;

    // Create alert if approval required
    if (report.approval_required) {
      const { data: session } = await supabase
        .from('cycle_count_sessions')
        .select('business_id, name')
        .eq('id', sessionId)
        .single();

      await supabase
        .from('alerts')
        .insert({
          type: 'counting_approval_required',
          severity: 'high',
          title: 'Counting Session Requires Approval',
          message: `Session "${session?.name}" has ${report.variance_percentage.toFixed(1)}% variance and requires manager approval`,
          business_id: session?.business_id,
          metadata: { sessionId, report }
        });
    }

    eventBus.broadcast('counting:session:completed', { sessionId, report });
  }

  /**
   * Get active sessions for business
   */
  async getActiveSessions(businessId: string): Promise<CountingSession[]> {
    const { data, error } = await supabase
      .from('cycle_count_sessions')
      .select('*')
      .eq('business_id', businessId)
      .in('status', ['active', 'paused'])
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Generate cycle count schedule
   */
  async generateCycleCountSchedule(
    businessId: string,
    frequency: 'daily' | 'weekly' | 'monthly'
  ): Promise<CountingSession[]> {
    // Get all products sorted by last counted date
    const { data: products } = await supabase
      .from('inventory')
      .select(`
        *,
        product:products(*)
      `)
      .eq('business_id', businessId)
      .order('last_counted', { ascending: true });

    if (!products) return [];

    // Group products into zones based on location
    const zones = new Map<string, string[]>();
    products.forEach(inv => {
      const location = inv.location || 'main';
      if (!zones.has(location)) {
        zones.set(location, []);
      }
      zones.get(location)?.push(inv.product_id);
    });

    // Create sessions based on frequency
    const sessions: CountingSession[] = [];
    const itemsPerSession = Math.ceil(products.length / (frequency === 'daily' ? 30 : frequency === 'weekly' ? 4 : 1));
    
    let sessionIndex = 0;
    zones.forEach((productIds, location) => {
      const chunks = this.chunkArray(productIds, itemsPerSession);
      chunks.forEach((chunk, index) => {
        sessions.push({
          id: '',
          business_id: businessId,
          name: `Cycle Count - ${location} - Part ${index + 1}`,
          description: `Automated cycle count for ${location}`,
          status: 'planning',
          assigned_users: [],
          zones: [{
            id: `zone-${sessionIndex}`,
            name: location,
            location,
            products: chunk,
            status: 'pending',
            progress: 0
          }],
          progress: {
            total_items: chunk.length,
            counted_items: 0,
            variance_items: 0,
            percentage: 0,
            estimated_time_remaining: chunk.length * 30 // 30 seconds per item
          },
          settings: {
            require_approval: true,
            approval_threshold: 5,
            allow_blind_counts: false,
            enable_cycle_counting: true,
            notification_settings: {
              on_start: true,
              on_complete: true,
              on_variance: true
            }
          },
          expected_duration: chunk.length * 30,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        sessionIndex++;
      });
    });

    return sessions;
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Export count report
   */
  async exportReport(
    sessionId: string,
    format: 'pdf' | 'excel' | 'csv'
  ): Promise<Blob> {
    const report = await this.generateVarianceReport(sessionId);
    
    // Get all count details
    const { data: counts } = await supabase
      .from('inventory_counts')
      .select(`
        *,
        product:products(name, sku, barcode)
      `)
      .eq('session_id', sessionId);

    if (format === 'csv') {
      const csv = this.generateCSV(counts || [], report);
      return new Blob([csv], { type: 'text/csv' });
    }

    // For PDF and Excel, we'd typically use libraries like jsPDF or xlsx
    // For now, return CSV as fallback
    const csv = this.generateCSV(counts || [], report);
    return new Blob([csv], { type: 'text/csv' });
  }

  private generateCSV(counts: any[], report: VarianceReport): string {
    const headers = [
      'Product Name',
      'SKU',
      'Barcode',
      'Location',
      'Previous Qty',
      'Counted Qty',
      'Variance',
      'Variance %',
      'Notes',
      'Verified',
      'Timestamp'
    ].join(',');

    const rows = counts.map(c => [
      c.product?.name || '',
      c.product?.sku || '',
      c.product?.barcode || '',
      c.location,
      c.previous_quantity,
      c.quantity,
      c.difference,
      c.previous_quantity > 0 ? ((c.difference / c.previous_quantity) * 100).toFixed(2) : '100',
      c.notes || '',
      c.verified ? 'Yes' : 'No',
      new Date(c.created_at).toLocaleString()
    ].join(','));

    const summary = [
      '',
      'Summary',
      `Total Variance: ${report.total_variance}`,
      `Variance Percentage: ${report.variance_percentage.toFixed(2)}%`,
      `Approval Required: ${report.approval_required ? 'Yes' : 'No'}`
    ].join('\n');

    return [headers, ...rows, '', summary].join('\n');
  }
}

export const countingService = new CountingService();