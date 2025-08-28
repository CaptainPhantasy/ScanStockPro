// Camera API mocks for testing

// MediaDevices API mock
Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: jest.fn((constraints) => {
      // Simulate different scenarios based on constraints
      if (constraints?.video === false) {
        return Promise.reject(new Error('Video not requested'))
      }
      
      if (constraints?.video?.facingMode === 'environment') {
        // Simulate back camera request
        return Promise.resolve(createMockVideoStream('back-camera'))
      }
      
      // Default to front camera
      return Promise.resolve(createMockVideoStream('front-camera'))
    }),
    
    enumerateDevices: jest.fn(() => Promise.resolve([
      {
        deviceId: 'camera-front-123',
        kind: 'videoinput',
        label: 'Front Camera',
        groupId: 'group-1'
      },
      {
        deviceId: 'camera-back-456', 
        kind: 'videoinput',
        label: 'Back Camera',
        groupId: 'group-1'
      },
      {
        deviceId: 'mic-123',
        kind: 'audioinput',
        label: 'Default Microphone',
        groupId: 'group-2'
      }
    ])),
    
    getDisplayMedia: jest.fn(() => 
      Promise.resolve(createMockVideoStream('screen'))
    ),
    
    getSupportedConstraints: jest.fn(() => ({
      width: true,
      height: true,
      facingMode: true,
      frameRate: true,
      aspectRatio: true,
      resizeMode: true,
      torch: false // Most mobile devices don't support torch via getUserMedia
    }))
  }
})

// Create mock video stream
function createMockVideoStream(source = 'camera') {
  const track = {
    id: `${source}-track-${Date.now()}`,
    kind: 'video',
    label: `${source} track`,
    enabled: true,
    muted: false,
    readyState: 'live',
    
    // Track methods
    stop: jest.fn(() => {
      track.readyState = 'ended'
      if (track.onended) track.onended()
    }),
    
    clone: jest.fn(() => createMockVideoTrack(source)),
    
    getCapabilities: jest.fn(() => ({
      width: { min: 320, max: 1920 },
      height: { min: 240, max: 1080 },
      frameRate: { min: 15, max: 60 },
      facingMode: ['user', 'environment'],
      aspectRatio: { min: 0.5, max: 2.0 }
    })),
    
    getConstraints: jest.fn(() => ({
      width: 1280,
      height: 720,
      frameRate: 30,
      facingMode: source === 'back-camera' ? 'environment' : 'user'
    })),
    
    getSettings: jest.fn(() => ({
      width: 1280,
      height: 720,
      frameRate: 30,
      facingMode: source === 'back-camera' ? 'environment' : 'user',
      aspectRatio: 16/9,
      deviceId: source === 'back-camera' ? 'camera-back-456' : 'camera-front-123'
    })),
    
    applyConstraints: jest.fn((constraints) => {
      // Simulate constraint application
      return Promise.resolve()
    }),
    
    // Event handlers
    onended: null,
    onmute: null,
    onunmute: null,
    
    addEventListener: jest.fn((event, handler) => {
      track[`on${event}`] = handler
    }),
    
    removeEventListener: jest.fn((event, handler) => {
      track[`on${event}`] = null
    })
  }
  
  const stream = {
    id: `${source}-stream-${Date.now()}`,
    active: true,
    
    // Stream methods
    getTracks: jest.fn(() => [track]),
    getVideoTracks: jest.fn(() => [track]),
    getAudioTracks: jest.fn(() => []),
    
    getTrackById: jest.fn((id) => 
      track.id === id ? track : null
    ),
    
    addTrack: jest.fn((newTrack) => {
      // Add track to stream
    }),
    
    removeTrack: jest.fn((trackToRemove) => {
      if (trackToRemove === track) {
        stream.active = false
      }
    }),
    
    clone: jest.fn(() => createMockVideoStream(source)),
    
    // Event handlers
    onaddtrack: null,
    onremovetrack: null,
    onactive: null,
    oninactive: null,
    
    addEventListener: jest.fn((event, handler) => {
      stream[`on${event}`] = handler
    }),
    
    removeEventListener: jest.fn((event, handler) => {
      stream[`on${event}`] = null
    })
  }
  
  return stream
}

function createMockVideoTrack(source) {
  return createMockVideoStream(source).getVideoTracks()[0]
}

// ImageCapture API mock
global.ImageCapture = class {
  constructor(videoTrack) {
    this.track = videoTrack
  }
  
  takePhoto(photoSettings = {}) {
    return Promise.resolve(new Blob(['mock-image-data'], { type: 'image/jpeg' }))
  }
  
  getPhotoCapabilities() {
    return Promise.resolve({
      redEyeReduction: 'never',
      imageHeight: { min: 240, max: 1080, step: 1 },
      imageWidth: { min: 320, max: 1920, step: 1 },
      fillLightMode: ['auto', 'off', 'flash']
    })
  }
  
  getPhotoSettings() {
    return Promise.resolve({
      imageHeight: 720,
      imageWidth: 1280,
      redEyeReduction: false,
      fillLightMode: 'auto'
    })
  }
  
  grabFrame() {
    return Promise.resolve(new ImageBitmap())
  }
}

// Camera permission simulation
const simulateCameraPermission = (state = 'granted') => {
  navigator.permissions.query = jest.fn(({ name }) => {
    if (name === 'camera') {
      return Promise.resolve({
        state,
        onchange: null,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      })
    }
    return Promise.resolve({ state: 'granted' })
  })
}

// Camera error simulation
const simulateCameraError = (errorType = 'NotAllowedError') => {
  const errors = {
    NotAllowedError: new DOMException('Permission denied', 'NotAllowedError'),
    NotFoundError: new DOMException('No camera found', 'NotFoundError'),
    NotReadableError: new DOMException('Camera in use', 'NotReadableError'),
    OverconstrainedError: new DOMException('Constraints not satisfiable', 'OverconstrainedError'),
    SecurityError: new DOMException('Security error', 'SecurityError'),
    AbortError: new DOMException('Operation aborted', 'AbortError')
  }
  
  navigator.mediaDevices.getUserMedia = jest.fn(() => 
    Promise.reject(errors[errorType] || new Error('Unknown camera error'))
  )
}

// Video element extensions
Object.defineProperty(HTMLVideoElement.prototype, 'play', {
  writable: true,
  value: jest.fn(() => Promise.resolve())
})

Object.defineProperty(HTMLVideoElement.prototype, 'pause', {
  writable: true,
  value: jest.fn()
})

Object.defineProperty(HTMLVideoElement.prototype, 'load', {
  writable: true,
  value: jest.fn()
})

// Mock video metadata
Object.defineProperty(HTMLVideoElement.prototype, 'videoWidth', {
  writable: true,
  value: 1280
})

Object.defineProperty(HTMLVideoElement.prototype, 'videoHeight', {
  writable: true,
  value: 720
})

Object.defineProperty(HTMLVideoElement.prototype, 'duration', {
  writable: true,
  value: Infinity
})

Object.defineProperty(HTMLVideoElement.prototype, 'currentTime', {
  writable: true,
  value: 0
})

Object.defineProperty(HTMLVideoElement.prototype, 'readyState', {
  writable: true,
  value: 4 // HAVE_ENOUGH_DATA
})

// Export utilities for test files
global.CameraTestUtils = {
  simulateCameraPermission,
  simulateCameraError,
  createMockVideoStream,
  
  // Helper to simulate camera initialization delay
  simulateCameraDelay: (delay = 1000) => {
    const originalGetUserMedia = navigator.mediaDevices.getUserMedia
    navigator.mediaDevices.getUserMedia = jest.fn((constraints) => 
      new Promise((resolve, reject) => {
        setTimeout(async () => {
          try {
            const stream = await originalGetUserMedia(constraints)
            resolve(stream)
          } catch (error) {
            reject(error)
          }
        }, delay)
      })
    )
  },
  
  // Helper to simulate camera switching
  simulateCameraSwitch: () => {
    let currentCamera = 'front'
    
    navigator.mediaDevices.getUserMedia = jest.fn((constraints) => {
      const facingMode = constraints?.video?.facingMode
      
      if (facingMode === 'environment' || facingMode?.exact === 'environment') {
        currentCamera = 'back'
        return Promise.resolve(createMockVideoStream('back-camera'))
      } else {
        currentCamera = 'front'
        return Promise.resolve(createMockVideoStream('front-camera'))
      }
    })
    
    return () => currentCamera
  },
  
  // Helper to simulate torch/flashlight
  simulateTorch: () => {
    let torchEnabled = false
    
    const mockTrack = {
      applyConstraints: jest.fn(async (constraints) => {
        if (constraints.advanced?.[0]?.torch !== undefined) {
          torchEnabled = constraints.advanced[0].torch
        }
        return Promise.resolve()
      }),
      
      getSettings: jest.fn(() => ({
        torch: torchEnabled,
        width: 1280,
        height: 720,
        frameRate: 30
      }))
    }
    
    return { mockTrack, getTorchState: () => torchEnabled }
  }
}

// Initialize default camera permission state
simulateCameraPermission('granted')