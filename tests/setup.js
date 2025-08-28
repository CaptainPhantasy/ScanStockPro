// Global test setup and utilities

// Mock browser APIs that aren't available in Jest/Node environment
require('./mocks/browser-apis')
require('./mocks/camera-api')
require('./mocks/barcode-scanner')

// Test utilities
global.TestUtils = {
  // Simulate barcode scan
  simulateBarcodeScan: (barcode, format = 'EAN13') => {
    const event = new CustomEvent('barcode-detected', {
      detail: { barcode, format, confidence: 0.95 }
    })
    window.dispatchEvent(event)
  },

  // Simulate offline/online state
  setNetworkStatus: (online) => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: online
    })
    
    const event = new Event(online ? 'online' : 'offline')
    window.dispatchEvent(event)
  },

  // Mock camera permissions
  mockCameraPermission: (granted = true) => {
    navigator.permissions = {
      query: jest.fn(() => Promise.resolve({
        state: granted ? 'granted' : 'denied'
      }))
    }
  },

  // Wait for async operations
  waitForAsync: (ms = 0) => new Promise(resolve => setTimeout(resolve, ms)),

  // Mock device orientation
  mockDeviceOrientation: (orientation = 'portrait') => {
    Object.defineProperty(screen, 'orientation', {
      writable: true,
      value: {
        type: orientation,
        angle: orientation === 'landscape' ? 90 : 0
      }
    })
  },

  // Mock device pixel ratio
  mockDevicePixelRatio: (ratio = 2) => {
    Object.defineProperty(window, 'devicePixelRatio', {
      writable: true,
      value: ratio
    })
  },

  // Mock touch events
  createTouchEvent: (type, touches = []) => {
    const event = new Event(type, { bubbles: true })
    event.touches = touches
    return event
  },

  // Mock performance metrics
  mockPerformanceMetrics: (metrics = {}) => {
    const defaultMetrics = {
      lcp: 1200,
      fid: 50,
      cls: 0.05,
      ttfb: 300,
      fcp: 800
    }
    
    window.performance.getEntriesByType = jest.fn((type) => {
      if (type === 'navigation') {
        return [{
          responseStart: 100,
          requestStart: 0,
          loadEventEnd: metrics.lcp || defaultMetrics.lcp
        }]
      }
      return []
    })
  }
}

// Custom matchers
expect.extend({
  toBeWithinThreshold(received, expected, threshold) {
    const pass = Math.abs(received - expected) <= threshold
    return {
      message: () => 
        `expected ${received} to be within ${threshold} of ${expected}`,
      pass
    }
  },

  toHaveValidBarcode(received) {
    const barcodePattern = /^\d{8,14}$/
    const pass = barcodePattern.test(received)
    return {
      message: () => `expected ${received} to be a valid barcode`,
      pass
    }
  },

  toBeAccessible(received) {
    // Check for basic accessibility attributes
    const hasAriaLabel = received.hasAttribute('aria-label')
    const hasRole = received.hasAttribute('role')
    const hasTabIndex = received.hasAttribute('tabindex')
    
    const pass = hasAriaLabel || hasRole || hasTabIndex
    return {
      message: () => `expected element to have accessibility attributes`,
      pass
    }
  },

  toBeMobileOptimized(received) {
    const style = window.getComputedStyle(received)
    const minTouchTarget = 48 // pixels
    
    const width = parseInt(style.width)
    const height = parseInt(style.height)
    
    const pass = width >= minTouchTarget && height >= minTouchTarget
    return {
      message: () => 
        `expected element to meet mobile touch target size (${minTouchTarget}px)`,
      pass
    }
  }
})

// Test data factories
global.TestData = {
  createUser: (overrides = {}) => ({
    id: 'user-123',
    email: 'test@warehouse.com',
    businessId: 'business-123',
    role: 'user',
    ...overrides
  }),

  createProduct: (overrides = {}) => ({
    id: 'product-123',
    name: 'Test Product',
    sku: 'TEST-001',
    barcode: '1234567890123',
    category: 'Electronics',
    businessId: 'business-123',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  }),

  createInventoryCount: (overrides = {}) => ({
    id: 'count-123',
    productId: 'product-123',
    quantity: 25,
    location: 'A-1-B',
    notes: 'Test count',
    timestamp: new Date(),
    userId: 'user-123',
    ...overrides
  }),

  createPerformanceMetrics: (overrides = {}) => ({
    lcp: 1200,
    fid: 50,
    cls: 0.05,
    ttfb: 300,
    fcp: 800,
    tti: 2000,
    tbt: 100,
    ...overrides
  }),

  createMobileMetrics: (overrides = {}) => ({
    batteryUsage: 0.1,
    memoryUsage: 45,
    networkPayload: 256000,
    offlineSyncTime: 2000,
    cameraInitTime: 1500,
    framerate: 60,
    loadTime: 1200,
    renderTime: 800,
    ...overrides
  })
}

// Global test configuration
global.TestConfig = {
  timeout: 10000,
  retries: 2,
  viewport: {
    width: 390,
    height: 844
  },
  networkConditions: {
    '3G': {
      download: 1600000,
      upload: 750000,
      latency: 150
    },
    'slow-3G': {
      download: 50000,
      upload: 50000,
      latency: 2000
    }
  }
}

// Console helpers for debugging tests
global.logTestInfo = (message, data) => {
  if (process.env.NODE_ENV === 'test' && process.env.DEBUG_TESTS) {
    console.log(`[TEST] ${message}`, data || '')
  }
}

// Performance budget helpers
global.checkPerformanceBudget = (metrics, budget = {}) => {
  const defaultBudget = {
    lcp: 2500,
    fid: 100,
    cls: 0.1,
    ttfb: 800
  }
  
  const finalBudget = { ...defaultBudget, ...budget }
  
  const violations = []
  
  Object.entries(finalBudget).forEach(([metric, threshold]) => {
    if (metrics[metric] > threshold) {
      violations.push({
        metric,
        actual: metrics[metric],
        threshold,
        violation: metrics[metric] - threshold
      })
    }
  })
  
  return {
    passed: violations.length === 0,
    violations
  }
}