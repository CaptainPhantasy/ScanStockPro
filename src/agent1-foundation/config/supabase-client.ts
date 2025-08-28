// ScanStock Pro - Supabase Client Configuration
// Agent 1: Foundation & Infrastructure

import { createClient } from '@supabase/supabase-js';
import { Database } from './supabase';

// Supabase configuration
const supabaseUrl = 'https://tbzjbmvklhdkvvcaansg.supabase.co';
const supabaseAnonKey = 'wg0MDJeupB0KjNV4';

// Create Supabase client
export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  db: {
    schema: 'public'
  }
});

// Server-side client (for API routes)
export const supabaseServerClient = createClient<Database>(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRiempibXZrbGhka3Z2Y2FhbnNnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjMzNjgyOSwiZXhwIjoyMDcxOTEyODI5fQ.LIPvDInBO_qoJlcKL-8ccG3foZ9s_h-dLwGb-HjEpco',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Component client for React components
export const createSupabaseComponentClient = () => {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  });
};

// Mobile-first configuration
export const MOBILE_CONFIG = {
  // Real-time settings for mobile
  realtime: {
    inventory_counts: true,
    products: true,
    counting_sessions: true
  },
  
  // Offline sync settings
  offline: {
    enabled: true,
    batch_size: 50,
    retry_attempts: 3,
    sync_interval: 30000 // 30 seconds
  },
  
  // Mobile performance settings
  performance: {
    lazy_loading: true,
    image_optimization: true,
    touch_optimized: true
  }
};

// Export types
export type { Database } from './supabase';

// Health check function
export const checkSupabaseHealth = async () => {
  try {
    const { data, error } = await supabaseClient
      .from('businesses')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('Supabase health check failed:', error);
      return { healthy: false, error: error.message };
    }
    
    return { healthy: true, data };
  } catch (error) {
    console.error('Supabase connection error:', error);
    return { healthy: false, error: 'Connection failed' };
  }
};

// Initialize real-time subscriptions
export const initializeRealtime = () => {
  // Subscribe to inventory changes
  const inventoryChannel = supabaseClient
    .channel('inventory_changes')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'inventory_counts' },
      (payload) => {
        console.log('Inventory change:', payload);
        // Emit event for other agents
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('inventory_change', { detail: payload }));
        }
      }
    )
    .subscribe();

  // Subscribe to product changes
  const productChannel = supabaseClient
    .channel('product_changes')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'products' },
      (payload) => {
        console.log('Product change:', payload);
        // Emit event for other agents
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('product_change', { detail: payload }));
        }
      }
    )
    .subscribe();

  // Subscribe to session changes
  const sessionChannel = supabaseClient
    .channel('session_changes')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'counting_sessions' },
      (payload) => {
        console.log('Session change:', payload);
        // Emit event for other agents
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('session_change', { detail: payload }));
        }
      }
    )
    .subscribe();

  return {
    inventoryChannel,
    productChannel,
    sessionChannel
  };
};

// Cleanup function
export const cleanupRealtime = (channels: any) => {
  if (channels.inventoryChannel) {
    supabaseClient.removeChannel(channels.inventoryChannel);
  }
  if (channels.productChannel) {
    supabaseClient.removeChannel(channels.productChannel);
  }
  if (channels.sessionChannel) {
    supabaseClient.removeChannel(channels.sessionChannel);
  }
};

export default supabaseClient;
