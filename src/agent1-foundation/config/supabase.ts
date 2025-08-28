import { createClient } from '@supabase/supabase-js'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// Environment validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Client-side Supabase client (browser)
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10 // Mobile battery optimization
    }
  },
  global: {
    headers: {
      'x-application-name': 'scanstock-pro-mobile'
    }
  }
})

// Component client for Next.js App Router
export const createSupabaseComponentClient = () => 
  createClientComponentClient({
    supabaseUrl,
    supabaseKey: supabaseAnonKey
  })

// Server-side client with service key (server actions/API routes only)
export const supabaseServerClient = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null

// Mobile-optimized configuration
export const MOBILE_CONFIG = {
  // Aggressive caching for poor network conditions
  cacheTTL: 300000, // 5 minutes
  maxRetries: 3,
  retryDelay: 1000,
  
  // Batch operations for efficiency
  batchSize: 50,
  debounceMs: 500,
  
  // Offline queue settings
  maxOfflineQueue: 1000,
  syncInterval: 30000, // 30 seconds
  
  // Real-time optimization
  heartbeatInterval: 30000,
  maxReconnectAttempts: 5
}

// Database schema types for TypeScript
export interface Database {
  public: {
    Tables: {
      businesses: {
        Row: {
          id: string
          name: string
          owner_id: string
          subscription_tier: 'free' | 'pro' | 'enterprise'
          openai_api_key_encrypted: string | null
          settings: Record<string, any>
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          owner_id: string
          subscription_tier?: 'free' | 'pro' | 'enterprise'
          openai_api_key_encrypted?: string | null
          settings?: Record<string, any>
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          owner_id?: string
          subscription_tier?: 'free' | 'pro' | 'enterprise'
          openai_api_key_encrypted?: string | null
          settings?: Record<string, any>
          updated_at?: string
        }
      }
      products: {
        Row: {
          id: string
          business_id: string
          name: string
          barcode: string | null
          sku: string | null
          category: string | null
          current_quantity: number
          images: string[] | null
          ai_metadata: Record<string, any> | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          business_id: string
          name: string
          barcode?: string | null
          sku?: string | null
          category?: string | null
          current_quantity?: number
          images?: string[] | null
          ai_metadata?: Record<string, any> | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          name?: string
          barcode?: string | null
          sku?: string | null
          category?: string | null
          current_quantity?: number
          images?: string[] | null
          ai_metadata?: Record<string, any> | null
          updated_at?: string
        }
      }
      inventory_counts: {
        Row: {
          id: string
          product_id: string
          quantity: number
          previous_quantity: number | null
          counted_by: string
          device_info: Record<string, any> | null
          offline_synced: boolean
          counted_at: string
          synced_at: string | null
        }
        Insert: {
          id?: string
          product_id: string
          quantity: number
          previous_quantity?: number | null
          counted_by: string
          device_info?: Record<string, any> | null
          offline_synced?: boolean
          counted_at?: string
          synced_at?: string | null
        }
        Update: {
          id?: string
          product_id?: string
          quantity?: number
          previous_quantity?: number | null
          counted_by?: string
          device_info?: Record<string, any> | null
          offline_synced?: boolean
          synced_at?: string | null
        }
      }
      team_members: {
        Row: {
          id: string
          business_id: string
          user_id: string
          role: 'admin' | 'user' | 'viewer'
          permissions: Record<string, boolean>
          invited_at: string
          joined_at: string | null
          status: 'pending' | 'active' | 'inactive'
        }
        Insert: {
          id?: string
          business_id: string
          user_id: string
          role?: 'admin' | 'user' | 'viewer'
          permissions?: Record<string, boolean>
          invited_at?: string
          joined_at?: string | null
          status?: 'pending' | 'active' | 'inactive'
        }
        Update: {
          role?: 'admin' | 'user' | 'viewer'
          permissions?: Record<string, boolean>
          joined_at?: string | null
          status?: 'pending' | 'active' | 'inactive'
        }
      }
      counting_sessions: {
        Row: {
          id: string
          business_id: string
          name: string
          created_by: string
          participants: string[]
          status: 'active' | 'paused' | 'completed'
          settings: Record<string, any>
          started_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          business_id: string
          name: string
          created_by: string
          participants?: string[]
          status?: 'active' | 'paused' | 'completed'
          settings?: Record<string, any>
          started_at?: string
          completed_at?: string | null
        }
        Update: {
          name?: string
          participants?: string[]
          status?: 'active' | 'paused' | 'completed'
          settings?: Record<string, any>
          completed_at?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}