'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface OfflineOperation {
  id: string;
  type: 'count' | 'product_update' | 'product_create' | 'product_delete';
  data: any;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
}

export interface OfflineState {
  isOffline: boolean;
  queueLength: number;
  lastSyncTime: Date | null;
  syncInProgress: boolean;
}

const STORAGE_KEYS = {
  OFFLINE_QUEUE: 'scanstock_offline_queue',
  LAST_SYNC: 'scanstock_last_sync',
} as const;

export const useOffline = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [queue, setQueue] = useState<OfflineOperation[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const syncIntervalRef = useRef<NodeJS.Timeout>();

  // Load persisted data on mount
  useEffect(() => {
    loadPersistedData();
  }, []);

  // Monitor connection status
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      syncQueue();
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic sync attempt when online
    if (!isOffline) {
      syncIntervalRef.current = setInterval(() => {
        if (queue.length > 0 && !syncInProgress) {
          syncQueue();
        }
      }, 30000); // Try sync every 30 seconds
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [isOffline, queue.length, syncInProgress]);

  const loadPersistedData = useCallback(() => {
    try {
      // Load offline queue
      const storedQueue = localStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
      if (storedQueue) {
        const parsedQueue = JSON.parse(storedQueue).map((op: any) => ({
          ...op,
          timestamp: new Date(op.timestamp),
        }));
        setQueue(parsedQueue);
      }

      // Load last sync time
      const storedSyncTime = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
      if (storedSyncTime) {
        setLastSyncTime(new Date(storedSyncTime));
      }
    } catch (error) {
      console.error('Failed to load offline data:', error);
    }
  }, []);

  const persistQueue = useCallback((newQueue: OfflineOperation[]) => {
    try {
      localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(newQueue));
    } catch (error) {
      console.error('Failed to persist offline queue:', error);
    }
  }, []);

  const persistSyncTime = useCallback((time: Date) => {
    try {
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, time.toISOString());
      setLastSyncTime(time);
    } catch (error) {
      console.error('Failed to persist sync time:', error);
    }
  }, []);

  const queueOperation = useCallback((operation: Omit<OfflineOperation, 'id' | 'timestamp' | 'retryCount'>) => {
    const newOperation: OfflineOperation = {
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      retryCount: 0,
      maxRetries: operation.maxRetries || 3,
      ...operation,
    };

    const newQueue = [...queue, newOperation];
    setQueue(newQueue);
    persistQueue(newQueue);

    // Attempt immediate sync if online
    if (!isOffline && !syncInProgress) {
      setTimeout(() => syncQueue(), 1000); // Small delay to ensure state updates
    }

    return newOperation.id;
  }, [queue, isOffline, syncInProgress, persistQueue]);

  const removeFromQueue = useCallback((operationId: string) => {
    const newQueue = queue.filter(op => op.id !== operationId);
    setQueue(newQueue);
    persistQueue(newQueue);
  }, [queue, persistQueue]);

  const processOperation = useCallback(async (operation: OfflineOperation): Promise<boolean> => {
    try {
      const baseUrl = '/api';
      let response: Response;

      switch (operation.type) {
        case 'count':
          response = await fetch(`${baseUrl}/inventory/count`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(operation.data),
          });
          break;

        case 'product_update':
          response = await fetch(`${baseUrl}/products/${operation.data.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(operation.data),
          });
          break;

        case 'product_create':
          response = await fetch(`${baseUrl}/products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(operation.data),
          });
          break;

        case 'product_delete':
          response = await fetch(`${baseUrl}/products/${operation.data.id}`, {
            method: 'DELETE',
          });
          break;

        default:
          console.error('Unknown operation type:', operation.type);
          return false;
      }

      return response.ok;
    } catch (error) {
      console.error('Failed to process operation:', error);
      return false;
    }
  }, []);

  const syncQueue = useCallback(async () => {
    if (isOffline || syncInProgress || queue.length === 0) {
      return;
    }

    setSyncInProgress(true);
    
    try {
      let successCount = 0;
      let failureCount = 0;
      const failedOperations: OfflineOperation[] = [];

      // Process operations sequentially to maintain order
      for (const operation of queue) {
        const success = await processOperation(operation);
        
        if (success) {
          successCount++;
        } else {
          // Increment retry count
          const updatedOperation = {
            ...operation,
            retryCount: operation.retryCount + 1,
          };

          // Keep in queue if under retry limit
          if (updatedOperation.retryCount < updatedOperation.maxRetries) {
            failedOperations.push(updatedOperation);
          }
          
          failureCount++;
        }

        // Small delay between operations to avoid overwhelming server
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Update queue with only failed operations
      setQueue(failedOperations);
      persistQueue(failedOperations);

      // Update sync time if we had any successes
      if (successCount > 0) {
        persistSyncTime(new Date());
      }

      console.log(`Sync completed: ${successCount} success, ${failureCount} failed`);
      
      // Haptic feedback for successful sync
      if (successCount > 0 && 'vibrate' in navigator) {
        navigator.vibrate([50, 100, 50]);
      }

    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setSyncInProgress(false);
    }
  }, [isOffline, syncInProgress, queue, processOperation, persistQueue, persistSyncTime]);

  const clearQueue = useCallback(() => {
    setQueue([]);
    persistQueue([]);
  }, [persistQueue]);

  const getQueueStats = useCallback(() => {
    const stats = queue.reduce((acc, op) => {
      acc[op.type] = (acc[op.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: queue.length,
      byType: stats,
      oldestOperation: queue.length > 0 ? queue[0].timestamp : null,
    };
  }, [queue]);

  return {
    // State
    isOffline,
    queueLength: queue.length,
    lastSyncTime,
    syncInProgress,

    // Actions
    queueOperation,
    syncQueue,
    clearQueue,
    removeFromQueue,

    // Utilities
    getQueueStats,
    
    // Queue data (read-only)
    queue: [...queue], // Return copy to prevent direct mutation
  };
};