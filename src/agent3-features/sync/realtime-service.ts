import { createClient } from '@/agent1-foundation/database/supabase-client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface RealtimeSubscription {
  channel: RealtimeChannel;
  table: string;
  callbacks: Map<string, (payload: any) => void>;
}

export class RealtimeService {
  private supabase = createClient();
  private subscriptions = new Map<string, RealtimeSubscription>();
  private presenceChannel: RealtimeChannel | null = null;

  // Subscribe to product changes
  subscribeToProducts(businessId: string, callbacks: {
    onInsert?: (product: any) => void;
    onUpdate?: (product: any) => void;
    onDelete?: (product: any) => void;
  }) {
    const channelName = `products-${businessId}`;
    
    if (this.subscriptions.has(channelName)) {
      console.log('Already subscribed to products channel');
      return;
    }

    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'products',
          filter: `business_id=eq.${businessId}`
        },
        (payload) => {
          console.log('Product inserted:', payload);
          callbacks.onInsert?.(payload.new);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'products',
          filter: `business_id=eq.${businessId}`
        },
        (payload) => {
          console.log('Product updated:', payload);
          callbacks.onUpdate?.(payload.new);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'products',
          filter: `business_id=eq.${businessId}`
        },
        (payload) => {
          console.log('Product deleted:', payload);
          callbacks.onDelete?.(payload.old);
        }
      )
      .subscribe((status) => {
        console.log(`Products realtime subscription status: ${status}`);
      });

    this.subscriptions.set(channelName, {
      channel,
      table: 'products',
      callbacks: new Map(Object.entries(callbacks))
    });

    return channel;
  }

  // Subscribe to inventory counts
  subscribeToInventoryCounts(businessId: string, callbacks: {
    onInsert?: (count: any) => void;
    onUpdate?: (count: any) => void;
  }) {
    const channelName = `inventory-counts-${businessId}`;
    
    if (this.subscriptions.has(channelName)) {
      console.log('Already subscribed to inventory counts channel');
      return;
    }

    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory_counts',
          filter: `business_id=eq.${businessId}`
        },
        (payload) => {
          console.log('Inventory count change:', payload);
          if (payload.eventType === 'INSERT') {
            callbacks.onInsert?.(payload.new);
          } else if (payload.eventType === 'UPDATE') {
            callbacks.onUpdate?.(payload.new);
          }
        }
      )
      .subscribe((status) => {
        console.log(`Inventory counts realtime subscription status: ${status}`);
      });

    this.subscriptions.set(channelName, {
      channel,
      table: 'inventory_counts',
      callbacks: new Map(Object.entries(callbacks))
    });

    return channel;
  }

  // Presence for collaborative features
  async joinPresence(countSessionId: string, userData: { userId: string; name: string }) {
    const channelName = `presence-${countSessionId}`;
    
    if (this.presenceChannel) {
      await this.presenceChannel.unsubscribe();
    }

    this.presenceChannel = this.supabase.channel(channelName, {
      config: {
        presence: {
          key: userData.userId,
        },
      },
    });

    this.presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = this.presenceChannel?.presenceState();
        console.log('Presence sync:', state);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await this.presenceChannel?.track({
            online_at: new Date().toISOString(),
            ...userData
          });
        }
      });

    return this.presenceChannel;
  }

  // Get current presence state
  getPresenceState() {
    if (!this.presenceChannel) return {};
    return this.presenceChannel.presenceState();
  }

  // Broadcast message to channel
  async broadcast(channelName: string, event: string, payload: any) {
    const channel = this.supabase.channel(channelName);
    await channel.send({
      type: 'broadcast',
      event,
      payload
    });
  }

  // Unsubscribe from a specific channel
  async unsubscribe(channelName: string) {
    const subscription = this.subscriptions.get(channelName);
    if (subscription) {
      await subscription.channel.unsubscribe();
      this.subscriptions.delete(channelName);
      console.log(`Unsubscribed from channel: ${channelName}`);
    }
  }

  // Unsubscribe from all channels
  async unsubscribeAll() {
    for (const [channelName, subscription] of this.subscriptions) {
      await subscription.channel.unsubscribe();
    }
    this.subscriptions.clear();
    
    if (this.presenceChannel) {
      await this.presenceChannel.unsubscribe();
      this.presenceChannel = null;
    }
    
    console.log('Unsubscribed from all channels');
  }

  // Check connection status
  getConnectionStatus() {
    return {
      subscriptions: Array.from(this.subscriptions.keys()),
      presenceActive: !!this.presenceChannel,
      totalChannels: this.subscriptions.size
    };
  }
}

// Singleton instance
export const realtimeService = new RealtimeService();