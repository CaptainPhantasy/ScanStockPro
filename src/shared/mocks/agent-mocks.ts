// Comprehensive mock implementations for 4-agent parallel development

// Mock data
const mockData = {
  products: [
    { id: 'prod-1', name: 'Mock Product 1', sku: 'SKU001', barcode: '123456789', category: 'Electronics' },
    { id: 'prod-2', name: 'Mock Product 2', sku: 'SKU002', barcode: '987654321', category: 'Clothing' }
  ],
  inventory: [
    { id: 'inv-1', productId: 'prod-1', quantity: 50, location: 'Warehouse A' },
    { id: 'inv-2', productId: 'prod-2', quantity: 25, location: 'Warehouse B' }
  ],
  users: [
    { id: 'user-1', email: 'test@test.com', businessId: 'business-1', role: 'admin' }
  ]
};

const mockUser = { id: 'mock-user', email: 'test@test.com', businessId: 'business-1', role: 'admin' };

// Central Mock Registry
export class MockRegistry {
  private mocks = new Map<string, any>();
  
  register(agentId: string, mock: any) {
    this.mocks.set(agentId, mock);
  }
  
  getMock(agentId: string) {
    return this.mocks.get(agentId);
  }
  
  // Enable/disable mocks for testing
  useMocks(enabled: boolean) {
    globalThis.USE_MOCKS = enabled;
  }
  
  // Get all mocks
  getAllMocks() {
    return Object.fromEntries(this.mocks);
  }
}

// Agent 1 Mock (Foundation & Infrastructure)
export const Agent1Mock = {
  // Mock Supabase client
  supabase: {
    from: (table: string) => ({
      select: async (columns?: string) => ({ 
        data: mockData[table] || [], 
        error: null 
      }),
      insert: async (data: any) => ({ 
        data: { id: `mock-${Date.now()}`, ...data }, 
        error: null 
      }),
      update: async (data: any) => ({ 
        data: { ...data }, 
        error: null 
      }),
      delete: async () => ({ 
        error: null 
      }),
      eq: function(field: string, value: any) {
        this._filter = { field, value };
        return this;
      },
      single: async function() {
        const filtered = mockData[this._table]?.find(item => 
          item[this._filter.field] === this._filter.value
        );
        return { data: filtered, error: null };
      }
    }),
    
    auth: {
      signIn: async (credentials: any) => ({ 
        user: mockUser, 
        error: null,
        data: { user: mockUser, session: { access_token: 'mock-token' } }
      }),
      signOut: async () => ({ error: null }),
      getUser: () => ({ data: { user: mockUser }, error: null }),
      onAuthStateChange: (callback: Function) => {
        callback('SIGNED_IN', { user: mockUser });
        return { data: { subscription: { unsubscribe: () => {} } } };
      }
    },
    
    realtime: {
      channel: (name: string) => ({
        on: (event: string, callback: Function) => {
          console.log(`Mock realtime: ${event} on ${name}`);
        },
        subscribe: async () => ({ error: null }),
        unsubscribe: async () => ({ error: null }),
        send: (event: string, payload: any) => {
          console.log(`Mock realtime send: ${event}`, payload);
        }
      })
    },
    
    storage: {
      from: (bucket: string) => ({
        upload: async (path: string, file: File) => ({ 
          data: { path }, 
          error: null 
        }),
        download: async (path: string) => ({ 
          data: new Blob(), 
          error: null 
        }),
        remove: async (path: string) => ({ error: null })
      })
    }
  },
  
  // Mock database repositories
  database: {
    products: {
      create: async (data: any) => ({ id: 'mock-prod-id', ...data }),
      findById: async (id: string) => mockData.products.find(p => p.id === id),
      findByBarcode: async (barcode: string) => mockData.products.find(p => p.barcode === barcode),
      update: async (id: string, data: any) => ({ id, ...data }),
      delete: async (id: string) => true,
      search: async (query: string) => mockData.products.filter(p => p.name.includes(query)),
      list: async (businessId: string, page = 1, limit = 10) => ({
        data: mockData.products.slice((page - 1) * limit, page * limit),
        total: mockData.products.length
      })
    },
    
    inventory: {
      create: async (data: any) => ({ id: 'mock-inv-id', ...data }),
      findByProduct: async (productId: string) => mockData.inventory.filter(i => i.productId === productId),
      update: async (id: string, data: any) => ({ id, ...data }),
      getHistory: async (productId: string, days = 30) => [
        { id: 'hist-1', productId, quantity: 50, timestamp: new Date() }
      ],
      bulkUpdate: async (updates: Array<{ id: string, quantity: number }>) => 
        updates.map(u => ({ id: u.id, quantity: u.quantity }))
    },
    
    businesses: {
      findById: async (id: string) => ({ id, name: 'Mock Business', subscription: 'pro' }),
      update: async (id: string, data: any) => ({ id, ...data }),
      getUsers: async (businessId: string) => mockData.users,
      getSettings: async (businessId: string) => ({ theme: 'dark', notifications: true })
    }
  },
  
  // Mock services
  utils: {
    cache: {
      get: async (key: string) => mockData[key] || null,
      set: async (key: string, value: any) => { mockData[key] = value; },
      delete: async (key: string) => { delete mockData[key]; },
      clear: async () => { 
        for (const k of Object.keys(mockData)) {
          delete mockData[k];
        }
      }
    },
    
    queue: {
      enqueue: async (job: any) => `job-${Date.now()}`,
      dequeue: async () => ({ id: 'mock-job', data: {} }),
      status: async (jobId: string) => 'completed'
    },
    
    storage: {
      upload: async (file: File, path: string) => `https://mock-storage.com/${path}`,
      download: async (path: string) => new Blob(['mock data']),
      delete: async (path: string) => true
    },
    
    encryption: {
      encrypt: async (data: string) => btoa(data),
      decrypt: async (data: string) => atob(data),
      hash: async (data: string) => `hash-${data}`
    }
  }
};

// Agent 2 Mock (Mobile Interface)
export const Agent2Mock = {
  // Mock camera
  camera: {
    requestPermission: async () => 'granted',
    startStream: async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      return canvas.captureStream();
    },
    capture: async () => ({
      dataUrl: 'data:image/jpeg;base64,mock-image-data',
      blob: new Blob(['mock image'], { type: 'image/jpeg' }),
      metadata: {
        width: 640,
        height: 480,
        format: 'jpeg',
        size: 1024
      }
    }),
    scan: async () => ({ 
      barcode: '123456789',
      format: 'EAN13',
      confidence: 0.95,
      timestamp: new Date()
    }),
    stream: null,
    permission: 'granted' as const
  },
  
  // Mock mobile UI
  ui: {
    showScanner: () => console.log('Mock scanner shown'),
    showKeypad: () => console.log('Mock keypad shown'),
    vibrate: () => navigator.vibrate?.(100),
    showToast: (message: string) => console.log('Toast:', message),
    showModal: (title: string, content: string) => console.log('Modal:', title, content)
  },
  
  // Mock touch events
  touch: {
    onTap: (callback: Function) => {
      console.log('Mock tap handler registered');
      return () => console.log('Mock tap handler removed');
    },
    onSwipe: (callback: Function) => {
      console.log('Mock swipe handler registered');
      return () => console.log('Mock swipe handler removed');
    },
    onLongPress: (callback: Function) => {
      console.log('Mock long press handler registered');
      return () => console.log('Mock long press handler removed');
    }
  },
  
  // Mock inputs
  inputs: {
    quantity: 1,
    notes: '',
    voice: {
      audio: 'data:audio/wav;base64,mock-audio',
      transcript: 'Mock voice input',
      timestamp: new Date(),
      duration: 2000
    },
    gesture: {
      type: 'tap' as const,
      coordinates: { x: 100, y: 200 }
    },
    location: {
      latitude: 37.7749,
      longitude: -122.4194,
      accuracy: 10,
      timestamp: new Date()
    },
    timestamp: new Date()
  },
  
  // Mock events
  events: {
    on: (event: string, callback: Function) => {
      console.log(`Mock event listener: ${event}`);
    },
    off: (event: string, callback: Function) => {
      console.log(`Mock event removed: ${event}`);
    },
    emit: (event: string, data: any) => {
      console.log(`Mock event emitted: ${event}`, data);
    }
  }
};

// Agent 3 Mock (Business Features)
export const Agent3Mock = {
  // Mock inventory operations
  inventory: {
    count: async (productId: string, quantity: number) => ({
      id: 'mock-count-id',
      productId,
      quantity,
      timestamp: new Date()
    }),
    
    getProduct: async (id: string) => mockData.products.find(p => p.id === id),
    
    updateQuantity: async (id: string, qty: number) => ({
      success: true,
      newQuantity: qty,
      timestamp: new Date()
    }),
    
    processBatch: async (counts: Array<{ productId: string, quantity: number }>) => ({
      processed: counts.length,
      success: true,
      timestamp: new Date()
    })
  },
  
  // Mock AI recognition
  ai: {
    recognize: async (image: string) => ({
      product: 'Recognized Product',
      confidence: 0.95,
      category: 'Electronics',
      tokensUsed: 150,
      processingTime: 2500,
      suggestions: ['Product A', 'Product B']
    }),
    
    categorize: async (products: any[]) => 
      products.map(p => ({ ...p, category: 'Mock Category' })),
    
    analyzeImage: async (image: string) => ({
      text: 'Mock product text',
      barcodes: ['123456789'],
      confidence: 0.92
    })
  },
  
  // Mock collaboration
  collaboration: {
    createSession: async (businessId: string, participants: string[]) => ({
      id: 'session-1',
      businessId,
      participants,
      startTime: new Date(),
      status: 'active'
    }),
    
    joinSession: async (sessionId: string, userId: string) => ({
      success: true,
      session: { id: sessionId, status: 'active' }
    }),
    
    updatePresence: async (sessionId: string, userId: string, status: string) => ({
      success: true,
      timestamp: new Date()
    })
  },
  
  // Mock analytics
  analytics: {
    getMetrics: async () => ({
      totalProducts: 150,
      totalValue: 25000,
      countAccuracy: 0.98,
      timeSavings: '2.5 hours/week'
    }),
    
    generateInsight: async () => ({
      type: 'low_stock_alert',
      message: '5 products below minimum threshold',
      priority: 'high',
      recommendations: ['Reorder Product A', 'Check Product B']
    }),
    
    trackEvent: async (event: string, data: any) => ({
      success: true,
      eventId: `evt-${Date.now()}`
    })
  }
};

// Agent 4 Mock (Quality & Integration)
export const Agent4Mock = {
  // Mock testing
  tests: {
    runMobileTests: async () => ({
      passed: 45,
      failed: 0,
      skipped: 2,
      total: 47,
      duration: '2m 30s'
    }),
    
    checkPerformance: async () => ({
      lighthouse: 95,
      fcp: 1200,
      tti: 2800,
      cls: 0.05,
      fid: 85
    }),
    
    validateSecurity: async () => ({
      secure: true,
      issues: [],
      score: 95,
      recommendations: []
    }),
    
    runE2ETests: async () => ({
      passed: 12,
      failed: 0,
      total: 12,
      coverage: '100% critical paths'
    })
  },
  
  // Mock security
  security: {
    validateApiKey: async (key: string) => true,
    checkVulnerabilities: async () => [],
    encryptData: async (data: string) => btoa(data),
    scanDependencies: async () => ({
      vulnerabilities: 0,
      outdated: 2,
      recommendations: ['Update package A', 'Update package B']
    })
  },
  
  // Mock billing
  billing: {
    createSubscription: async (customerId: string, plan: string) => ({ 
      id: 'sub_mock', 
      status: 'active',
      plan,
      customerId
    }),
    
    recordUsage: async (customerId: string, feature: string, quantity: number) => ({ 
      success: true,
      usageId: `usage-${Date.now()}`
    }),
    
    getInvoice: async (subscriptionId: string) => ({
      id: 'inv_mock',
      amount: 29.99,
      status: 'paid',
      dueDate: new Date()
    })
  },
  
  // Mock monitoring
  monitoring: {
    recordMetric: async (name: string, value: number) => ({
      success: true,
      metricId: `metric-${Date.now()}`
    }),
    
    getAlerts: async () => [],
    
    checkHealth: async () => ({
      status: 'healthy',
      uptime: 99.9,
      lastCheck: new Date()
    })
  }
};

// Initialize mock registry
export const mockRegistry = new MockRegistry();
mockRegistry.register('agent1', Agent1Mock);
mockRegistry.register('agent2', Agent2Mock);
mockRegistry.register('agent3', Agent3Mock);
mockRegistry.register('agent4', Agent4Mock);

// Export individual mocks for backward compatibility
export { Agent1Mock, Agent2Mock, Agent3Mock, Agent4Mock };
