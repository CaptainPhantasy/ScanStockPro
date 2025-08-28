// Jest DOM matchers
import '@testing-library/jest-dom'

// Mock implementations for browser APIs
global.ResizeObserver = class {
  observe() {}
  disconnect() {}
  unobserve() {}
}

global.IntersectionObserver = class {
  observe() {}
  disconnect() {}
  unobserve() {}
}

// Mock media devices for camera tests
Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: jest.fn().mockResolvedValue({
      getTracks: () => [],
      getVideoTracks: () => [{ stop: jest.fn() }],
      getAudioTracks: () => [],
    }),
    enumerateDevices: jest.fn().mockResolvedValue([]),
  },
})

// Mock geolocation
Object.defineProperty(navigator, 'geolocation', {
  writable: true,
  value: {
    getCurrentPosition: jest.fn((success) =>
      success({
        coords: {
          latitude: 40.7128,
          longitude: -74.006,
          accuracy: 10,
        },
      })
    ),
    watchPosition: jest.fn(),
    clearWatch: jest.fn(),
  },
})

// Mock performance API
Object.defineProperty(window, 'performance', {
  writable: true,
  value: {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByType: jest.fn(() => []),
    getEntriesByName: jest.fn(() => []),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn(),
    observer: jest.fn(),
  },
})

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
})

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({}),
    ok: true,
    status: 200,
    statusText: 'OK',
  })
)

// Mock WebSocket
global.WebSocket = class {
  constructor() {
    this.readyState = 1
  }
  send() {}
  close() {}
  addEventListener() {}
  removeEventListener() {}
}

// Mock crypto for security tests
Object.defineProperty(global, 'crypto', {
  value: {
    randomBytes: jest.fn((size) => Buffer.alloc(size)),
    createHash: jest.fn(() => ({
      update: jest.fn().mockReturnThis(),
      digest: jest.fn(() => 'mocked-hash'),
    })),
    createCipher: jest.fn(() => ({
      update: jest.fn().mockReturnThis(),
      final: jest.fn(() => 'encrypted-data'),
    })),
    pbkdf2Sync: jest.fn(() => Buffer.from('derived-key')),
  },
})

// Mock Stripe
jest.mock('@stripe/stripe-js', () => ({
  loadStripe: jest.fn(() =>
    Promise.resolve({
      elements: jest.fn(() => ({
        create: jest.fn(() => ({
          mount: jest.fn(),
          on: jest.fn(),
          destroy: jest.fn(),
        })),
      })),
      createPaymentMethod: jest.fn(),
      confirmCardPayment: jest.fn(),
      retrievePaymentIntent: jest.fn(),
    })
  ),
}))

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      signIn: jest.fn(),
      signOut: jest.fn(),
      signUp: jest.fn(),
      getUser: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      then: jest.fn(),
    })),
    realtime: {
      channel: jest.fn(() => ({
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
      })),
    },
  })),
}))

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    query: {},
    pathname: '/',
    route: '/',
    asPath: '/',
  }),
}))

// Mock Next.js Image component
jest.mock('next/image', () => {
  const MockedImage = ({ src, alt, ...props }) =>
    React.createElement('img', { src, alt, ...props })
  MockedImage.displayName = 'MockedNextImage'
  return MockedImage
})

// Mock React hooks for testing
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useState: jest.fn(),
  useEffect: jest.fn(),
  useContext: jest.fn(),
  useRef: jest.fn(),
  useMemo: jest.fn(),
  useCallback: jest.fn(),
}))

// Console suppressions for cleaner test output
const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks()
  localStorageMock.clear()
  sessionStorageMock.clear()
})