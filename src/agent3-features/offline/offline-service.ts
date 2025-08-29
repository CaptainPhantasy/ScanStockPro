import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface OfflineDB extends DBSchema {
  products: {
    key: string;
    value: {
      id: string;
      name: string;
      barcode?: string;
      sku?: string;
      quantity: number;
      category?: string;
      price?: number;
      image_url?: string;
      updated_at: string;
      synced: boolean;
    };
  };
  pending_operations: {
    key: string;
    value: {
      id: string;
      type: 'CREATE' | 'UPDATE' | 'DELETE';
      entity: 'product' | 'inventory_count';
      data: any;
      created_at: string;
      retries: number;
    };
  };
  settings: {
    key: string;
    value: any;
  };
}

export class OfflineService {
  private db: IDBPDatabase<OfflineDB> | null = null;
  private syncInProgress = false;
  private onlineListener: (() => void) | null = null;

  async initialize() {
    if (typeof window === 'undefined') return;

    try {
      this.db = await openDB<OfflineDB>('scanstock-offline', 1, {
        upgrade(db) {
          // Products store
          if (!db.objectStoreNames.contains('products')) {
            const productStore = db.createObjectStore('products', { keyPath: 'id' });
            productStore.createIndex('barcode', 'barcode', { unique: false });
            productStore.createIndex('synced', 'synced', { unique: false });
          }

          // Pending operations store
          if (!db.objectStoreNames.contains('pending_operations')) {
            const pendingStore = db.createObjectStore('pending_operations', { keyPath: 'id' });
            pendingStore.createIndex('created_at', 'created_at', { unique: false });
          }

          // Settings store
          if (!db.objectStoreNames.contains('settings')) {
            db.createObjectStore('settings');
          }
        },
      });

      // Listen for online events
      this.setupOnlineListener();
      
      console.log('Offline database initialized');
    } catch (error) {
      console.error('Failed to initialize offline database:', error);
    }
  }

  private setupOnlineListener() {
    if (this.onlineListener) {
      window.removeEventListener('online', this.onlineListener);
    }

    this.onlineListener = () => {
      console.log('Network is back online, syncing pending operations...');
      this.syncPendingOperations();
    };

    window.addEventListener('online', this.onlineListener);
  }

  async cacheProducts(products: any[]) {
    if (!this.db) return;

    const tx = this.db.transaction('products', 'readwrite');
    await Promise.all([
      ...products.map(product => tx.store.put({
        ...product,
        synced: true
      })),
      tx.done
    ]);
  }

  async getProducts() {
    if (!this.db) return [];
    return await this.db.getAll('products');
  }

  async getProductByBarcode(barcode: string) {
    if (!this.db) return null;
    const index = this.db.transaction('products').store.index('barcode');
    return await index.get(barcode);
  }

  async addPendingOperation(type: 'CREATE' | 'UPDATE' | 'DELETE', entity: string, data: any) {
    if (!this.db) return;

    const operation = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      entity,
      data,
      created_at: new Date().toISOString(),
      retries: 0
    };

    await this.db.add('pending_operations', operation);

    // Try to sync immediately if online
    if (navigator.onLine) {
      this.syncPendingOperations();
    }
  }

  async syncPendingOperations() {
    if (!this.db || this.syncInProgress) return;

    this.syncInProgress = true;

    try {
      const operations = await this.db.getAll('pending_operations');
      
      for (const operation of operations) {
        try {
          await this.executePendingOperation(operation);
          
          // Remove successful operation
          await this.db.delete('pending_operations', operation.id);
        } catch (error) {
          console.error('Failed to sync operation:', error);
          
          // Increment retry count
          operation.retries++;
          
          if (operation.retries >= 5) {
            // Move to failed operations or notify user
            console.error('Operation failed after 5 retries:', operation);
            await this.db.delete('pending_operations', operation.id);
          } else {
            await this.db.put('pending_operations', operation);
          }
        }
      }
    } finally {
      this.syncInProgress = false;
    }
  }

  private async executePendingOperation(operation: any) {
    const endpoint = `/api/${operation.entity}s`;
    
    let response;
    switch (operation.type) {
      case 'CREATE':
        response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(operation.data)
        });
        break;
        
      case 'UPDATE':
        response = await fetch(endpoint, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(operation.data)
        });
        break;
        
      case 'DELETE':
        response = await fetch(`${endpoint}?id=${operation.data.id}`, {
          method: 'DELETE'
        });
        break;
    }

    if (!response?.ok) {
      throw new Error(`Sync failed: ${response?.status}`);
    }

    return response.json();
  }

  async updateProductOffline(productId: string, updates: any) {
    if (!this.db) return;

    const product = await this.db.get('products', productId);
    if (!product) return;

    const updatedProduct = {
      ...product,
      ...updates,
      updated_at: new Date().toISOString(),
      synced: false
    };

    await this.db.put('products', updatedProduct);
    
    // Queue for sync
    await this.addPendingOperation('UPDATE', 'product', {
      id: productId,
      ...updates
    });
  }

  async clearCache() {
    if (!this.db) return;
    
    await Promise.all([
      this.db.clear('products'),
      this.db.clear('pending_operations')
    ]);
  }

  isOnline() {
    return navigator.onLine;
  }

  async getPendingOperationsCount() {
    if (!this.db) return 0;
    const operations = await this.db.getAll('pending_operations');
    return operations.length;
  }

  destroy() {
    if (this.onlineListener) {
      window.removeEventListener('online', this.onlineListener);
    }
    if (this.db) {
      this.db.close();
    }
  }
}

// Singleton instance
export const offlineService = new OfflineService();