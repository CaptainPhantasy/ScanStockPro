'use client';

import { useEffect, useState, useCallback } from 'react';
import { offlineService } from '@/agent3-features/offline/offline-service';
import { realtimeService } from '@/agent3-features/sync/realtime-service';

interface UseOfflineSyncOptions {
  businessId?: string;
  enableRealtime?: boolean;
  enableOffline?: boolean;
}

export function useOfflineSync({
  businessId = 'demo-business-001',
  enableRealtime = true,
  enableOffline = true
}: UseOfflineSyncOptions = {}) {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingOperations, setPendingOperations] = useState(0);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Initialize offline service
  useEffect(() => {
    if (!enableOffline) return;

    const initOffline = async () => {
      await offlineService.initialize();
      const count = await offlineService.getPendingOperationsCount();
      setPendingOperations(count);
    };

    initOffline();

    // Monitor online/offline status
    const handleOnline = () => {
      setIsOnline(true);
      setSyncStatus('syncing');
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus('idle');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check initial status
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [enableOffline]);

  // Initialize real-time subscriptions
  useEffect(() => {
    if (!enableRealtime || !isOnline) return;

    const setupRealtime = () => {
      realtimeService.subscribeToProducts(businessId, {
        onInsert: (product) => {
          console.log('New product added:', product);
          // Update local cache
          if (enableOffline) {
            offlineService.cacheProducts([product]);
          }
        },
        onUpdate: (product) => {
          console.log('Product updated:', product);
          // Update local cache
          if (enableOffline) {
            offlineService.cacheProducts([product]);
          }
        },
        onDelete: (product) => {
          console.log('Product deleted:', product);
          // Remove from local cache if needed
        }
      });
    };

    setupRealtime();

    return () => {
      realtimeService.unsubscribeAll();
    };
  }, [businessId, enableRealtime, isOnline, enableOffline]);

  // Sync pending operations
  const syncPendingOperations = useCallback(async () => {
    if (!isOnline || !enableOffline) return;

    setSyncStatus('syncing');
    try {
      await offlineService.syncPendingOperations();
      const count = await offlineService.getPendingOperationsCount();
      setPendingOperations(count);
      setLastSyncTime(new Date());
      setSyncStatus('idle');
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncStatus('error');
    }
  }, [isOnline, enableOffline]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && pendingOperations > 0) {
      syncPendingOperations();
    }
  }, [isOnline, pendingOperations, syncPendingOperations]);

  // Queue an offline operation
  const queueOperation = useCallback(async (
    type: 'CREATE' | 'UPDATE' | 'DELETE',
    entity: string,
    data: any
  ) => {
    if (!enableOffline) return;

    await offlineService.addPendingOperation(type, entity, data);
    const count = await offlineService.getPendingOperationsCount();
    setPendingOperations(count);

    // Try to sync immediately if online
    if (isOnline) {
      syncPendingOperations();
    }
  }, [enableOffline, isOnline, syncPendingOperations]);

  // Get cached products
  const getCachedProducts = useCallback(async () => {
    if (!enableOffline) return [];
    return await offlineService.getProducts();
  }, [enableOffline]);

  // Clear all cached data
  const clearCache = useCallback(async () => {
    if (!enableOffline) return;
    await offlineService.clearCache();
    setPendingOperations(0);
  }, [enableOffline]);

  return {
    isOnline,
    pendingOperations,
    syncStatus,
    lastSyncTime,
    syncPendingOperations,
    queueOperation,
    getCachedProducts,
    clearCache,
    realtimeStatus: realtimeService.getConnectionStatus()
  };
}