// Mock browser APIs for testing environment

// Performance Observer API
global.PerformanceObserver = class {
  constructor(callback) {
    this.callback = callback
  }
  
  observe(options) {
    // Simulate performance entries
    setTimeout(() => {
      const entries = []
      
      if (options.entryTypes?.includes('navigation')) {
        entries.push({
          name: 'navigation',
          entryType: 'navigation',
          startTime: 0,
          duration: 1200,
          responseStart: 100,
          requestStart: 0,
          loadEventEnd: 1200
        })
      }
      
      if (options.entryTypes?.includes('paint')) {
        entries.push({
          name: 'first-contentful-paint',
          entryType: 'paint',
          startTime: 800,
          duration: 0
        })
      }
      
      if (options.entryTypes?.includes('largest-contentful-paint')) {
        entries.push({
          name: 'largest-contentful-paint',
          entryType: 'largest-contentful-paint',
          startTime: 1200,
          duration: 0
        })
      }
      
      this.callback({
        getEntries: () => entries
      })
    }, 100)
  }
  
  disconnect() {}
  takeRecords() { return [] }
}

// Battery API
Object.defineProperty(navigator, 'getBattery', {
  writable: true,
  value: jest.fn(() => Promise.resolve({
    level: 0.8,
    charging: false,
    chargingTime: Infinity,
    dischargingTime: 28800,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  }))
})

// Network Information API
Object.defineProperty(navigator, 'connection', {
  writable: true,
  value: {
    effectiveType: '4g',
    downlink: 10,
    rtt: 100,
    saveData: false,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  }
})

// Permissions API
Object.defineProperty(navigator, 'permissions', {
  writable: true,
  value: {
    query: jest.fn(() => Promise.resolve({
      state: 'granted',
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    }))
  }
})

// Device Memory API
Object.defineProperty(navigator, 'deviceMemory', {
  writable: true,
  value: 4
})

// Hardware Concurrency API
Object.defineProperty(navigator, 'hardwareConcurrency', {
  writable: true,
  value: 4
})

// Web Locks API
Object.defineProperty(navigator, 'locks', {
  writable: true,
  value: {
    request: jest.fn((name, options, callback) => {
      if (typeof options === 'function') {
        callback = options
      }
      return Promise.resolve(callback())
    }),
    query: jest.fn(() => Promise.resolve({ held: [], pending: [] }))
  }
})

// Clipboard API
Object.defineProperty(navigator, 'clipboard', {
  writable: true,
  value: {
    writeText: jest.fn(() => Promise.resolve()),
    readText: jest.fn(() => Promise.resolve('copied text')),
    write: jest.fn(() => Promise.resolve()),
    read: jest.fn(() => Promise.resolve([]))
  }
})

// Share API
Object.defineProperty(navigator, 'share', {
  writable: true,
  value: jest.fn(() => Promise.resolve())
})

// Vibration API
Object.defineProperty(navigator, 'vibrate', {
  writable: true,
  value: jest.fn(() => true)
})

// Page Visibility API
Object.defineProperty(document, 'visibilityState', {
  writable: true,
  value: 'visible'
})

Object.defineProperty(document, 'hidden', {
  writable: true,
  value: false
})

// Screen Wake Lock API
Object.defineProperty(navigator, 'wakeLock', {
  writable: true,
  value: {
    request: jest.fn(() => Promise.resolve({
      type: 'screen',
      released: false,
      release: jest.fn(() => Promise.resolve()),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    }))
  }
})

// Intersection Observer API
global.IntersectionObserver = class {
  constructor(callback) {
    this.callback = callback
  }
  
  observe(element) {
    // Simulate intersection
    setTimeout(() => {
      this.callback([{
        target: element,
        isIntersecting: true,
        intersectionRatio: 1,
        boundingClientRect: { top: 0, left: 0, right: 100, bottom: 100 },
        rootBounds: { top: 0, left: 0, right: 1000, bottom: 1000 },
        intersectionRect: { top: 0, left: 0, right: 100, bottom: 100 },
        time: performance.now()
      }])
    }, 100)
  }
  
  unobserve() {}
  disconnect() {}
}

// Resize Observer API  
global.ResizeObserver = class {
  constructor(callback) {
    this.callback = callback
  }
  
  observe(element) {
    // Simulate resize
    setTimeout(() => {
      this.callback([{
        target: element,
        contentRect: {
          width: 390,
          height: 844,
          top: 0,
          left: 0,
          right: 390,
          bottom: 844
        },
        borderBoxSize: [{
          inlineSize: 390,
          blockSize: 844
        }],
        contentBoxSize: [{
          inlineSize: 390,
          blockSize: 844
        }]
      }])
    }, 100)
  }
  
  unobserve() {}
  disconnect() {}
}

// Mutation Observer API
global.MutationObserver = class {
  constructor(callback) {
    this.callback = callback
  }
  
  observe(target, options) {
    // Store reference for potential mutations
    this.target = target
    this.options = options
  }
  
  disconnect() {}
  takeRecords() { return [] }
}

// IndexedDB API mock
global.indexedDB = {
  open: jest.fn(() => {
    const request = {
      result: {
        transaction: jest.fn(() => ({
          objectStore: jest.fn(() => ({
            add: jest.fn(),
            put: jest.fn(),
            get: jest.fn(),
            delete: jest.fn(),
            clear: jest.fn(),
            getAll: jest.fn()
          }))
        }))
      },
      onerror: null,
      onsuccess: null,
      onupgradeneeded: null
    }
    
    setTimeout(() => {
      if (request.onsuccess) request.onsuccess()
    }, 10)
    
    return request
  }),
  deleteDatabase: jest.fn()
}

// Service Worker API mock
Object.defineProperty(navigator, 'serviceWorker', {
  writable: true,
  value: {
    register: jest.fn(() => Promise.resolve({
      scope: 'https://localhost:3000/',
      active: {
        postMessage: jest.fn()
      },
      installing: null,
      waiting: null,
      update: jest.fn(() => Promise.resolve()),
      unregister: jest.fn(() => Promise.resolve(true)),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    })),
    ready: Promise.resolve({
      active: {
        postMessage: jest.fn()
      },
      sync: {
        register: jest.fn(() => Promise.resolve())
      },
      showNotification: jest.fn(() => Promise.resolve())
    }),
    controller: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  }
})

// Notification API
global.Notification = class {
  constructor(title, options) {
    this.title = title
    this.options = options
    this.onclick = null
    this.onclose = null
    this.onerror = null
    this.onshow = null
  }
  
  static permission = 'default'
  static requestPermission = jest.fn(() => Promise.resolve('granted'))
  
  close() {}
}

// File API enhancements
global.File = class extends Blob {
  constructor(parts, filename, properties) {
    super(parts, properties)
    this.name = filename
    this.lastModified = Date.now()
  }
}

global.FileReader = class {
  constructor() {
    this.result = null
    this.error = null
    this.readyState = 0
    this.onload = null
    this.onerror = null
    this.onabort = null
  }
  
  readAsDataURL(file) {
    setTimeout(() => {
      this.result = 'data:image/jpeg;base64,/9j/4AAQSkZJRg...'
      this.readyState = 2
      if (this.onload) this.onload({ target: this })
    }, 100)
  }
  
  readAsText(file) {
    setTimeout(() => {
      this.result = 'file content'
      this.readyState = 2  
      if (this.onload) this.onload({ target: this })
    }, 100)
  }
  
  abort() {}
}

// URL API
global.URL.createObjectURL = jest.fn(() => 'blob:http://localhost/mock-url')
global.URL.revokeObjectURL = jest.fn()

// Canvas API mock
HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  fillRect: jest.fn(),
  clearRect: jest.fn(),
  getImageData: jest.fn(() => ({ data: new Uint8ClampedArray(4) })),
  putImageData: jest.fn(),
  createImageData: jest.fn(() => ({ data: new Uint8ClampedArray(4) })),
  setTransform: jest.fn(),
  drawImage: jest.fn(),
  save: jest.fn(),
  fillText: jest.fn(),
  restore: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  closePath: jest.fn(),
  stroke: jest.fn(),
  translate: jest.fn(),
  scale: jest.fn(),
  rotate: jest.fn(),
  arc: jest.fn(),
  fill: jest.fn(),
  measureText: jest.fn(() => ({ width: 100 })),
  transform: jest.fn(),
  rect: jest.fn(),
  clip: jest.fn()
}))

HTMLCanvasElement.prototype.toDataURL = jest.fn(() => 
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
)