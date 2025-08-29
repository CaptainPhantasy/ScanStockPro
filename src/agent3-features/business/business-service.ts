import { supabase } from '@/agent1-foundation/config/supabase-client';
import type { Database } from '@/agent1-foundation/config/supabase-client';

type Business = Database['public']['Tables']['businesses']['Row'];
type BusinessInsert = Database['public']['Tables']['businesses']['Insert'];
type BusinessUpdate = Database['public']['Tables']['businesses']['Update'];

export class BusinessService {
  /**
   * Create a new business for a user
   */
  static async createBusiness(business: BusinessInsert): Promise<Business> {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .insert(business)
        .select()
        .single();

      if (error) {
        console.error('Error creating business:', error);
        throw new Error(`Failed to create business: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('BusinessService.createBusiness error:', error);
      throw error;
    }
  }

  /**
   * Get business by ID
   */
  static async getBusiness(businessId: string): Promise<Business | null> {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', businessId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Business not found
        }
        console.error('Error fetching business:', error);
        throw new Error(`Failed to fetch business: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('BusinessService.getBusiness error:', error);
      throw error;
    }
  }

  /**
   * Get business by owner ID
   */
  static async getBusinessByOwner(ownerId: string): Promise<Business | null> {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', ownerId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Business not found
        }
        console.error('Error fetching business by owner:', error);
        throw new Error(`Failed to fetch business by owner: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('BusinessService.getBusinessByOwner error:', error);
      throw error;
    }
  }

  /**
   * Update business settings
   */
  static async updateBusiness(businessId: string, updates: BusinessUpdate): Promise<Business> {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', businessId)
        .select()
        .single();

      if (error) {
        console.error('Error updating business:', error);
        throw new Error(`Failed to update business: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('BusinessService.updateBusiness error:', error);
      throw error;
    }
  }

  /**
   * Update business usage metrics
   */
  static async updateUsageMetrics(businessId: string, metrics: Partial<Business['usage_metrics']>): Promise<Business> {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .update({
          usage_metrics: supabase.rpc('jsonb_merge', {
            target: supabase.select('usage_metrics').from('businesses').eq('id', businessId).single(),
            patch: metrics
          }),
          updated_at: new Date().toISOString()
        })
        .eq('id', businessId)
        .select()
        .single();

      if (error) {
        console.error('Error updating usage metrics:', error);
        throw new Error(`Failed to update usage metrics: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('BusinessService.updateUsageMetrics error:', error);
      throw error;
    }
  }

  /**
   * Check if user has access to business
   */
  static async checkBusinessAccess(businessId: string, userId: string): Promise<boolean> {
    try {
      // Check if user is owner
      const business = await this.getBusiness(businessId);
      if (business?.owner_id === userId) {
        return true;
      }

      // Check if user is team member
      const { data: teamMember, error } = await supabase
        .from('team_members')
        .select('role, permissions')
        .eq('business_id', businessId)
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (error || !teamMember) {
        return false;
      }

      return teamMember.permissions?.edit || teamMember.role === 'admin';
    } catch (error) {
      console.error('BusinessService.checkBusinessAccess error:', error);
      return false;
    }
  }

  /**
   * Get business subscription info
   */
  static async getSubscriptionInfo(businessId: string): Promise<{
    tier: Business['subscription_tier'];
    limits: Record<string, any>;
    usage: Business['usage_metrics'];
  } | null> {
    try {
      const business = await this.getBusiness(businessId);
      if (!business) return null;

      const limits = {
        free: { products: 100, storage_mb: 100, api_calls: 1000 },
        pro: { products: 1000, storage_mb: 1000, api_calls: 10000 },
        enterprise: { products: -1, storage_mb: -1, api_calls: -1 }
      };

      return {
        tier: business.subscription_tier,
        limits: limits[business.subscription_tier],
        usage: business.usage_metrics
      };
    } catch (error) {
      console.error('BusinessService.getSubscriptionInfo error:', error);
      return null;
    }
  }
}
