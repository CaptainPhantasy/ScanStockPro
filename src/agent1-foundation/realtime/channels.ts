import { RealtimeChannel, RealtimePresence } from '@supabase/supabase-js'
import { supabaseClient, MOBILE_CONFIG } from '../config/supabase'

export interface InventoryChangePayload {
  product_id: string
  quantity: number
  previous_quantity: number
  counted_by: string
  counted_at: string
  location?: string
  session_id?: string
}

export interface SessionPresence {
  user_id: string
  username: string
  current_location?: string
  last_activity: string
  device_info: {
    type: 'mobile' | 'tablet' | 'desktop'
    id: string
  }
}

export interface CountingSession {
  id: string
  name: string
  participants: string[]
  status: 'active' | 'paused' | 'completed'
  created_by: string
  started_at: string
}

export class RealtimeService {
  private channels: Map<string, RealtimeChannel> = new Map()
  private presenceChannels: Map<string, RealtimeChannel> = new Map()
  private reconnectAttempts = 0
  private maxReconnectAttempts = MOBILE_CONFIG.maxReconnectAttempts
  private heartbeatInterval: NodeJS.Timeout | null = null

  constructor() {
    this.setupConnectionMonitoring()
  }

  /**
   * Subscribe to inventory changes for a business
   * Critical for real-time mobile sync
   */
  subscribeToInventory(
    businessId: string, 
    callback: (payload: InventoryChangePayload) => void,
    onError?: (error: any) => void
  ): RealtimeChannel {
    const channelName = `inventory:${businessId}`
    
    // Check if already subscribed
    const existingChannel = this.channels.get(channelName)
    if (existingChannel) {
      return existingChannel
    }

    const channel = supabaseClient
      .channel(channelName, {
        config: {
          presence: {
            key: `user_${businessId}`
          }
        }
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'inventory_counts'
          // Note: Filtering by business will be handled in the callback
          // since we can't directly filter on joined tables
        },
        (payload: any) => {
          // Transform database payload to our interface
          const inventoryChange: InventoryChangePayload = {
            product_id: payload.new.product_id,
            quantity: payload.new.quantity,
            previous_quantity: payload.new.previous_quantity || 0,
            counted_by: payload.new.counted_by,
            counted_at: payload.new.counted_at,
            location: payload.new.location,
            session_id: payload.new.session_id
          }
          
          try {
            callback(inventoryChange)
          } catch (error) {
            console.error('Inventory callback error:', error)
            onError?.(error)
          }
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
        (payload: any) => {
          // Handle product quantity updates
          if (payload.old.current_quantity !== payload.new.current_quantity) {
            const inventoryChange: InventoryChangePayload = {
              product_id: payload.new.id,
              quantity: payload.new.current_quantity,
              previous_quantity: payload.old.current_quantity,
              counted_by: 'system', // System update
              counted_at: payload.new.updated_at,
            }
            
            try {
              callback(inventoryChange)
            } catch (error) {
              console.error('Product callback error:', error)
              onError?.(error)
            }
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log(`✓ Subscribed to inventory channel: ${channelName}`)
          this.reconnectAttempts = 0
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Inventory channel error:', err)
          onError?.(err)
          this.handleReconnection(channelName)
        } else if (status === 'TIMED_OUT') {
          console.warn('Inventory channel timed out')
          this.handleReconnection(channelName)
        } else if (status === 'CLOSED') {
          console.log('Inventory channel closed')
          this.channels.delete(channelName)
        }
      })

    this.channels.set(channelName, channel)
    return channel
  }

  /**
   * Subscribe to session presence for collaboration
   * Shows who's counting what in real-time
   */
  subscribeToSessionPresence(
    sessionId: string,
    onPresenceUpdate: (presences: Record<string, SessionPresence>) => void,
    onError?: (error: any) => void
  ): RealtimeChannel {
    const channelName = `session:${sessionId}`
    
    // Check if already subscribed
    const existingChannel = this.presenceChannels.get(channelName)
    if (existingChannel) {
      return existingChannel
    }

    const channel = supabaseClient
      .channel(channelName, {
        config: {
          presence: {
            key: sessionId
          }
        }
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const transformedState: Record<string, SessionPresence> = {}
        
        Object.keys(state).forEach(key => {
          const presence = state[key][0] // Get first presence for user
          transformedState[key] = presence as SessionPresence
        })
        
        try {
          onPresenceUpdate(transformedState)
        } catch (error) {
          console.error('Presence sync error:', error)
          onError?.(error)
        }
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log(`User joined session: ${key}`)
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log(`User left session: ${key}`)
      })
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log(`✓ Subscribed to session presence: ${channelName}`)
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Session presence error:', err)
          onError?.(err)
        }
      })

    this.presenceChannels.set(channelName, channel)
    return channel
  }

  /**
   * Track user presence in a session
   */
  async trackPresence(
    sessionId: string, 
    userInfo: SessionPresence
  ): Promise<void> {
    const channel = this.presenceChannels.get(`session:${sessionId}`)
    
    if (!channel) {
      throw new Error(`Not subscribed to session: ${sessionId}`)
    }

    try {
      await channel.track({
        ...userInfo,
        last_activity: new Date().toISOString()
      })
    } catch (error) {
      console.error('Failed to track presence:', error)
      throw error
    }
  }

  /**
   * Update user presence (location, activity)
   */
  async updatePresence(
    sessionId: string, 
    updates: Partial<SessionPresence>
  ): Promise<void> {
    const channel = this.presenceChannels.get(`session:${sessionId}`)
    
    if (!channel) {
      throw new Error(`Not subscribed to session: ${sessionId}`)
    }

    try {
      await channel.track({
        ...updates,
        last_activity: new Date().toISOString()
      })
    } catch (error) {
      console.error('Failed to update presence:', error)
      throw error
    }
  }

  /**
   * Send broadcast message to session participants
   * Useful for coordinating counting activities
   */
  async broadcastToSession(
    sessionId: string,
    event: string,
    payload: any
  ): Promise<void> {
    const channel = this.presenceChannels.get(`session:${sessionId}`)
    
    if (!channel) {
      throw new Error(`Not subscribed to session: ${sessionId}`)
    }

    try {
      await channel.send({
        type: 'broadcast',
        event,
        payload: {
          ...payload,
          timestamp: new Date().toISOString()
        }
      })
    } catch (error) {
      console.error('Failed to broadcast message:', error)
      throw error
    }
  }

  /**
   * Listen for broadcast messages in a session
   */
  subscribeToBroadcast(
    sessionId: string,
    event: string,
    callback: (payload: any) => void
  ): void {
    const channel = this.presenceChannels.get(`session:${sessionId}`)
    
    if (!channel) {
      throw new Error(`Not subscribed to session: ${sessionId}`)
    }

    channel.on('broadcast', { event }, callback)
  }

  /**
   * Subscribe to business-wide notifications
   * For team coordination and announcements
   */
  subscribeToBusiness(
    businessId: string,
    callback: (event: string, payload: any) => void
  ): RealtimeChannel {
    const channelName = `business:${businessId}`
    
    const channel = supabaseClient
      .channel(channelName)
      .on('broadcast', { event: '*' }, ({ event, payload }) => {
        callback(event, payload)
      })
      .subscribe()

    this.channels.set(channelName, channel)
    return channel
  }

  /**
   * Unsubscribe from a channel
   */
  async unsubscribe(channelName: string): Promise<void> {
    const channel = this.channels.get(channelName) || this.presenceChannels.get(channelName)
    
    if (channel) {
      await channel.unsubscribe()
      this.channels.delete(channelName)
      this.presenceChannels.delete(channelName)
      console.log(`✓ Unsubscribed from: ${channelName}`)
    }
  }

  /**
   * Unsubscribe from all channels
   */
  async unsubscribeAll(): Promise<void> {
    const allChannels = [
      ...Array.from(this.channels.values()),
      ...Array.from(this.presenceChannels.values())
    ]

    await Promise.all(allChannels.map(channel => channel.unsubscribe()))
    
    this.channels.clear()
    this.presenceChannels.clear()
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }

    console.log('✓ Unsubscribed from all channels')
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): 'connected' | 'connecting' | 'disconnected' {
    // This would be implemented based on Supabase's connection state
    // For now, we'll assume connected if we have active channels
    return this.channels.size > 0 || this.presenceChannels.size > 0 
      ? 'connected' 
      : 'disconnected'
  }

  /**
   * Mobile-optimized connection monitoring
   */
  private setupConnectionMonitoring(): void {
    // Heartbeat to maintain connection on mobile
    this.heartbeatInterval = setInterval(() => {
      if (this.channels.size > 0 || this.presenceChannels.size > 0) {
        // Send a lightweight ping to maintain connection
        this.sendHeartbeat()
      }
    }, MOBILE_CONFIG.heartbeatInterval)

    // Listen for network changes (mobile specific)
    if (typeof window !== 'undefined' && 'navigator' in window) {
      window.addEventListener('online', this.handleNetworkOnline.bind(this))
      window.addEventListener('offline', this.handleNetworkOffline.bind(this))
    }
  }

  private sendHeartbeat(): void {
    // Send a minimal broadcast to maintain connection
    this.channels.forEach(async (channel, name) => {
      try {
        await channel.send({
          type: 'broadcast',
          event: 'heartbeat',
          payload: { timestamp: Date.now() }
        })
      } catch (error) {
        // Heartbeat failure indicates connection issues
        console.warn(`Heartbeat failed for ${name}:`, error)
      }
    })
  }

  private handleReconnection(channelName: string): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`Max reconnection attempts reached for ${channelName}`)
      return
    }

    this.reconnectAttempts++
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000) // Exponential backoff

    setTimeout(() => {
      console.log(`Attempting to reconnect to ${channelName} (attempt ${this.reconnectAttempts})`)
      
      // Clean up old channel
      const oldChannel = this.channels.get(channelName)
      if (oldChannel) {
        oldChannel.unsubscribe()
        this.channels.delete(channelName)
      }

      // Attempt to resubscribe would need to be implemented based on the original subscription
      // This would require storing subscription parameters
    }, delay)
  }

  private handleNetworkOnline(): void {
    console.log('Network back online - checking channel status')
    this.reconnectAttempts = 0 // Reset reconnection attempts
    
    // Optionally trigger reconnection for all channels
    this.channels.forEach((channel, name) => {
      // Channel will automatically attempt to reconnect
      console.log(`Channel ${name} will attempt to reconnect`)
    })
  }

  private handleNetworkOffline(): void {
    console.log('Network offline - channels will pause')
    // No action needed - Supabase handles this gracefully
  }
}

// Export singleton instance for use across the application
export const realtimeService = new RealtimeService()

// Utility functions for common use cases
export const subscribeToInventoryUpdates = (
  businessId: string,
  callback: (payload: InventoryChangePayload) => void
) => {
  return realtimeService.subscribeToInventory(businessId, callback)
}

export const subscribeToSession = (
  sessionId: string,
  onPresenceUpdate: (presences: Record<string, SessionPresence>) => void
) => {
  return realtimeService.subscribeToSessionPresence(sessionId, onPresenceUpdate)
}