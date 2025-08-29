import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tbzjbmvklhdkvvcaansg.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRiempibXZrbGhka3Z2Y2FhbnNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMzY4MjksImV4cCI6MjA3MTkxMjgyOX0.y5MgpSojF8OK6GOq_kn5qM3S4j2MougYQ1t9fLUQeEM';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRiempibXZrbGhka3Z2Y2FhbnNnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjMzNjgyOSwiZXhwIjoyMDcxOTEyODI5fQ.LIPvDInBO_qoJlcKL-8ccG3foZ9s_h-dLwGb-HjEpco';

// Client-side Supabase client (with anon key)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side Supabase client (with service role key for admin operations)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Health check function to verify connection
export async function checkSupabaseHealth() {
  try {
    const { data, error } = await supabase.from('businesses').select('count').limit(1);
    if (error) {
      console.log('Supabase connection test:', error.message);
      return { status: 'error', message: error.message };
    }
    return { status: 'success', message: 'Connected to Supabase successfully' };
  } catch (err) {
    console.error('Supabase connection error:', err);
    return { status: 'error', message: 'Failed to connect to Supabase' };
  }
}

// Type-safe database interface matching your actual Supabase schema
export interface Database {
  public: {
    Tables: {
      businesses: {
        Row: {
          id: string;
          name: string;
          owner_id: string;
          subscription_tier: 'free' | 'pro' | 'enterprise';
          openai_api_key_encrypted: string | null;
          settings: {
            auto_sync: boolean;
            batch_size: number;
            mobile_first: boolean;
          };
          billing_info: Record<string, any>;
          usage_metrics: {
            api_calls: number;
            storage_mb: number;
          };
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['businesses']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['businesses']['Insert']>;
      };
      products: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          barcode: string | null;
          sku: string | null;
          category: string | null;
          description: string | null;
          current_quantity: number;
          min_quantity: number;
          max_quantity: number | null;
          unit_cost: number | null;
          sell_price: number | null;
          images: string[];
          ai_metadata: Record<string, any>;
          ai_confidence: number | null;
          ai_last_scanned: string | null;
          last_accessed: string;
          access_count: number;
          locations: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['products']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['products']['Insert']>;
      };
      product_categories: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          parent_id: string | null;
          color: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['product_categories']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['product_categories']['Insert']>;
      };
      counting_sessions: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          description: string | null;
          created_by: string;
          participants: string[];
          status: 'active' | 'paused' | 'completed' | 'cancelled';
          settings: {
            voice_enabled: boolean;
            allow_negative: boolean;
            require_photos: boolean;
          };
          allowed_locations: string[];
          gps_fence: Record<string, any> | null;
          started_at: string;
          completed_at: string | null;
          total_counts: number;
          unique_products: number;
          total_participants: number;
        };
        Insert: Omit<Database['public']['Tables']['counting_sessions']['Row'], 'id' | 'started_at' | 'total_counts' | 'unique_products' | 'total_participants'>;
        Update: Partial<Database['public']['Tables']['counting_sessions']['Insert']>;
      };
      inventory_counts: {
        Row: {
          id: string;
          product_id: string;
          session_id: string | null;
          quantity: number;
          previous_quantity: number | null;
          quantity_difference: number;
          location: string | null;
          counted_by: string;
          device_info: Record<string, any>;
          gps_coordinates: Record<string, any> | null;
          offline_synced: boolean;
          sync_batch_id: string | null;
          conflict_resolved: boolean;
          conflict_data: Record<string, any> | null;
          counted_at: string;
          synced_at: string | null;
          notes: string | null;
          images: string[];
          voice_notes: string[];
          network_quality: string | null;
          sync_priority: number;
        };
        Insert: Omit<Database['public']['Tables']['inventory_counts']['Row'], 'id' | 'counted_at' | 'quantity_difference' | 'offline_synced' | 'conflict_resolved'>;
        Update: Partial<Database['public']['Tables']['inventory_counts']['Insert']>;
      };
      team_members: {
        Row: {
          id: string;
          business_id: string;
          user_id: string;
          role: 'admin' | 'user' | 'viewer';
          permissions: {
            edit: boolean;
            admin: boolean;
            count: boolean;
          };
          invited_by: string | null;
          invited_at: string;
          joined_at: string | null;
          status: 'pending' | 'active' | 'inactive';
        };
        Insert: Omit<Database['public']['Tables']['team_members']['Row'], 'id' | 'invited_at'>;
        Update: Partial<Database['public']['Tables']['team_members']['Insert']>;
      };
      ai_usage: {
        Row: {
          id: string;
          business_id: string | null;
          user_id: string | null;
          feature: 'product_recognition' | 'categorization' | 'search' | 'description_generation';
          tokens_used: number;
          prompt_tokens: number;
          completion_tokens: number;
          cost_estimate: number;
          model: string;
          metadata: Record<string, any>;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['ai_usage']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['ai_usage']['Insert']>;
      };
      sync_queue: {
        Row: {
          id: string;
          user_id: string | null;
          device_id: string;
          operation_type: 'create' | 'update' | 'delete';
          table_name: string;
          record_id: string | null;
          operation_data: Record<string, any>;
          original_data: Record<string, any> | null;
          priority: number;
          retry_count: number;
          max_retries: number;
          status: 'pending' | 'processing' | 'completed' | 'failed' | 'conflict';
          error_message: string | null;
          conflict_resolution: 'server_wins' | 'client_wins' | 'merge' | 'manual' | null;
          created_at: string;
          scheduled_at: string;
          processed_at: string | null;
          network_info: Record<string, any>;
        };
        Insert: Omit<Database['public']['Tables']['sync_queue']['Row'], 'id' | 'created_at' | 'scheduled_at'>;
        Update: Partial<Database['public']['Tables']['sync_queue']['Insert']>;
      };
    };
  };
}