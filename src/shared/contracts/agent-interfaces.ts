// Complete interface contracts for all 4 agents - 4-way communication matrix

// Core data types
export interface User {
  id: string;
  email: string;
  businessId: string;
  role: 'admin' | 'user' | 'viewer';
  sessionId?: string;
}

export interface ProductSchema {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  businessId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InventorySchema {
  id: string;
  productId: string;
  quantity: number;
  location: string;
  lastCounted: Date;
  businessId: string;
}

export interface BusinessSchema {
  id: string;
  name: string;
  subscription: 'free' | 'pro' | 'enterprise';
  settings: Record<string, any>;
}

// Agent 1 → Agent 2 Interface (Foundation → Interface)
export interface Foundation_To_Interface {
  // Authentication
  auth: {
    useAuth: () => AuthState;
    useUser: () => User | null;
    signIn: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
    refreshToken: () => Promise<void>;
  };
  
  // Data Models
  models: {
    Product: ProductSchema;
    Inventory: InventorySchema;
    Business: BusinessSchema;
  };
  
  // API Client
  api: {
    get: (endpoint: string) => Promise<any>;
    post: (endpoint: string, data: any) => Promise<any>;
    put: (endpoint: string, data: any) => Promise<any>;
    delete: (endpoint: string) => Promise<void>;
    upload: (file: File, endpoint: string) => Promise<any>;
  };
  
  // Real-time
  subscribe: (channel: string, callback: Function) => void;
  unsubscribe: (channel: string) => void;
}

// Agent 1 → Agent 3 Interface (Foundation → Features)
export interface Foundation_To_Features {
  // Database Access
  database: {
    products: ProductRepository;
    inventory: InventoryRepository;
    businesses: BusinessRepository;
    query: (sql: string) => Promise<any>;
    transaction: (operations: Function[]) => Promise<any>;
  };
  
  // Realtime Infrastructure
  realtime: {
    channel: (name: string) => RealtimeChannel;
    broadcast: (event: string, payload: any) => void;
    presence: (sessionId: string) => PresenceChannel;
    subscribe: (channel: string, callback: Function) => void;
  };
  
  // Server Utilities
  utils: {
    cache: CacheService;
    queue: QueueService;
    storage: StorageService;
    encryption: EncryptionService;
  };
}

// Agent 2 → Agent 3 Interface (Interface → Features)
export interface Interface_To_Features {
  // Camera Integration
  camera: {
    capture: () => Promise<ImageData>;
    scan: () => Promise<BarcodeData>;
    stream: MediaStream | null;
    permission: 'granted' | 'denied' | 'prompt';
  };
  
  // User Inputs (Mobile-optimized)
  inputs: {
    quantity: number;
    notes: string;
    voice: AudioData;
    gesture: GestureType;
    location: GPSCoordinates;
    timestamp: Date;
  };
  
  // UI Events
  events: EventEmitter<{
    'scan:complete': BarcodeData;
    'count:submit': CountData;
    'product:select': Product;
    'session:start': Session;
    'offline:status': boolean;
  }>;
}

// All → Agent 4 Interface (Quality & Integration)
export interface All_To_Quality {
  // From Agent 1
  foundation: {
    testDb: SupabaseClient;
    metrics: MetricsEndpoint;
    logs: LogService;
    config: ConfigService;
  };
  
  // From Agent 2
  interface: {
    testIds: Record<string, string>;
    components: ComponentMap;
    routes: RouteMap;
    mobileDevices: DeviceInfo[];
  };
  
  // From Agent 3
  features: {
    services: ServiceMap;
    apiUsage: UsageMetrics;
    businessRules: RuleSet;
    aiModels: AIModelInfo[];
  };
}

// Repository interfaces
export interface ProductRepository {
  create: (data: Partial<ProductSchema>) => Promise<ProductSchema>;
  findById: (id: string) => Promise<ProductSchema | null>;
  findByBarcode: (barcode: string) => Promise<ProductSchema | null>;
  update: (id: string, data: Partial<ProductSchema>) => Promise<ProductSchema>;
  delete: (id: string) => Promise<boolean>;
  search: (query: string) => Promise<ProductSchema[]>;
  list: (businessId: string, page?: number, limit?: number) => Promise<{ data: ProductSchema[], total: number }>;
}

export interface InventoryRepository {
  create: (data: Partial<InventorySchema>) => Promise<InventorySchema>;
  findByProduct: (productId: string) => Promise<InventorySchema[]>;
  update: (id: string, data: Partial<InventorySchema>) => Promise<InventorySchema>;
  getHistory: (productId: string, days?: number) => Promise<InventorySchema[]>;
  bulkUpdate: (updates: Array<{ id: string, quantity: number }>) => Promise<InventorySchema[]>;
}

export interface BusinessRepository {
  findById: (id: string) => Promise<BusinessSchema | null>;
  update: (id: string, data: Partial<BusinessSchema>) => Promise<BusinessSchema>;
  getUsers: (businessId: string) => Promise<User[]>;
  getSettings: (businessId: string) => Promise<Record<string, any>>;
}

// Service interfaces
export interface CacheService {
  get: (key: string) => Promise<any>;
  set: (key: string, value: any, ttl?: number) => Promise<void>;
  delete: (key: string) => Promise<void>;
  clear: () => Promise<void>;
}

export interface QueueService {
  enqueue: (job: any) => Promise<string>;
  dequeue: () => Promise<any>;
  status: (jobId: string) => Promise<string>;
}

export interface StorageService {
  upload: (file: File, path: string) => Promise<string>;
  download: (path: string) => Promise<Blob>;
  delete: (path: string) => Promise<void>;
}

export interface EncryptionService {
  encrypt: (data: string) => Promise<string>;
  decrypt: (data: string) => Promise<string>;
  hash: (data: string) => Promise<string>;
}

// Real-time interfaces
export interface RealtimeChannel {
  on: (event: string, callback: Function) => void;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
  send: (event: string, payload: any) => void;
}

export interface PresenceChannel extends RealtimeChannel {
  track: (presence: any) => void;
  onPresenceChange: (callback: Function) => void;
}

// Event emitter interface
export interface EventEmitter<T> {
  on<K extends keyof T>(event: K, callback: (data: T[K]) => void): void;
  off<K extends keyof T>(event: K, callback: (data: T[K]) => void): void;
  emit<K extends keyof T>(event: K, data: T[K]): void;
}

// Data types
export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export interface ImageData {
  dataUrl: string;
  blob: Blob;
  metadata: {
    width: number;
    height: number;
    format: string;
    size: number;
  };
}

export interface BarcodeData {
  barcode: string;
  format: string;
  confidence: number;
  timestamp: Date;
}

export interface AudioData {
  audio: string;
  transcript?: string;
  timestamp: Date;
  duration: number;
}

export interface GestureType {
  type: 'swipe' | 'pinch' | 'rotate' | 'tap' | 'longPress';
  direction?: 'up' | 'down' | 'left' | 'right';
  coordinates: { x: number; y: number };
  intensity?: number;
}

export interface GPSCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: Date;
}

export interface CountData {
  productId: string;
  quantity: number;
  location: string;
  notes?: string;
  timestamp: Date;
  userId: string;
}

export interface Session {
  id: string;
  businessId: string;
  participants: User[];
  startTime: Date;
  status: 'active' | 'paused' | 'completed';
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  currentQuantity: number;
}

// Legacy interfaces for backward compatibility
export interface Agent1ToAgent2 extends Foundation_To_Interface {}
export interface Agent1ToAgent3 extends Foundation_To_Features {}
export interface Agent2ToAgent3 extends Interface_To_Features {}
export interface AllToAgent4 extends All_To_Quality {}
