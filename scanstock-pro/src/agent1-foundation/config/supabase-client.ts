import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tbzjbmvklhdkvvcaansg.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'wg0MDJeupB0KjNV4';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRiempibXZrbGhka3Z2Y2FhbnNnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjMzNjgyOSwiZXhwIjoyMDcxOTEyODI5fQ.LIPvDInBO_qoJlcKL-8ccG3foZ9s_h-dLwGb-HjEpco';

// Client-side Supabase client (with anon key)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side Supabase client (with service role key for admin operations)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Type-safe database interface
export interface Database {
  public: {
    Tables: {
      businesses: {
        Row: {
          id: string;
          name: string;
          industry: string;
          subscription: 'free' | 'pro' | 'enterprise';
          settings: Record<string, any>;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['businesses']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['businesses']['Insert']>;
      };
      users: {
        Row: {
          id: string;
          email: string;
          business_id: string;
          role: 'admin' | 'user' | 'viewer';
          session_id?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
      };
      products: {
        Row: {
          id: string;
          name: string;
          sku: string;
          barcode: string;
          category: string;
          business_id: string;
          cost?: number;
          price?: number;
          reorder_point?: number;
          max_stock?: number;
          description?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['products']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['products']['Insert']>;
      };
      inventory: {
        Row: {
          id: string;
          product_id: string;
          quantity: number;
          location: string;
          last_counted: string;
          business_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['inventory']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['inventory']['Insert']>;
      };
      inventory_counts: {
        Row: {
          id: string;
          product_id: string;
          quantity: number;
          previous_quantity: number;
          difference: number;
          user_id: string;
          location: string;
          notes?: string;
          session_id?: string;
          verified: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['inventory_counts']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['inventory_counts']['Insert']>;
      };
      cycle_count_sessions: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          description?: string;
          status: 'planning' | 'active' | 'paused' | 'completed' | 'cancelled';
          assigned_users: string[];
          zones: Record<string, any>[];
          progress: Record<string, any>;
          settings: Record<string, any>;
          started_at?: string;
          completed_at?: string;
          expected_duration: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['cycle_count_sessions']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['cycle_count_sessions']['Insert']>;
      };
      ai_usage: {
        Row: {
          id: string;
          business_id: string;
          user_id?: string;
          feature: 'product_recognition' | 'categorization' | 'search' | 'description_generation';
          tokens_used: number;
          prompt_tokens: number;
          completion_tokens: number;
          cost_estimate: number;
          model: string;
          metadata?: Record<string, any>;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['ai_usage']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['ai_usage']['Insert']>;
      };
      client_api_keys: {
        Row: {
          id: string;
          business_id: string;
          service: 'openai' | 'other';
          encrypted_key: string;
          is_active: boolean;
          added_by: string;
          usage_stats: Record<string, any>;
          limits: Record<string, any>;
          allowed_features: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['client_api_keys']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['client_api_keys']['Insert']>;
      };
      alerts: {
        Row: {
          id: string;
          type: string;
          severity: 'low' | 'medium' | 'high' | 'critical';
          title: string;
          message: string;
          product_id?: string;
          business_id: string;
          acknowledged_at?: string;
          resolved_at?: string;
          metadata?: Record<string, any>;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['alerts']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['alerts']['Insert']>;
      };
    };
  };
}

export type { Database };