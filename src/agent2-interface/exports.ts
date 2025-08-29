// Agent 2 → Agent 3 Interface Exports
// Mobile interface capabilities for business features

import type { 
  Interface_To_Features,
  Product,
  BarcodeData,
  ImageData,
  CountData,
  Session,
  GestureType,
  AudioData,
  GPSCoordinates,
} from '../shared/contracts/agent-interfaces';

// Export all mobile components
export * from './components/mobile';
export * from './layouts';
export * from './pages';
export * from './camera';
export * from './hooks';
export * from './pwa';

// Camera integration state
let cameraState = {
  lastCapture: null as ImageData | null,
  lastBarcode: null as string | null,
  scanMode: 'barcode' as 'barcode' | 'image' | 'voice',
  permission: 'prompt' as 'granted' | 'denied' | 'prompt',
  isActive: false,
};

// User input state
let inputState = {
  quantity: 1,
  notes: '',
  selectedProduct: null as Product | null,
  voiceTranscript: '',
  location: '',
  timestamp: new Date(),
};

// Event callbacks
const eventCallbacks = new Map<string, Function[]>();

// Implementation of the Interface_To_Features contract
export const Agent2Interface: Interface_To_Features = {
  // Camera integration
  camera: {
    capture: async (): Promise<ImageData> => {
      // Implementation would capture from active camera
      if (!cameraState.lastCapture) {
        throw new Error('No camera capture available');
      }
      return cameraState.lastCapture;
    },
    
    scan: async (): Promise<BarcodeData> => {
      // Implementation would scan from active camera
      if (!cameraState.lastBarcode) {
        throw new Error('No barcode scan available');
      }
      return {
        barcode: cameraState.lastBarcode,
        format: 'unknown',
        confidence: 1.0,
        timestamp: new Date(),
      };
    },
    
    get stream() {
      // This would return the actual MediaStream when camera is active
      return null;
    },
    
    get permission() {
      return cameraState.permission;
    },
  },

  // User inputs (mobile-optimized)
  inputs: {
    get quantity() {
      return inputState.quantity;
    },
    set quantity(value: number) {
      inputState.quantity = value;
      triggerEvent('input:quantity', value);
    },
    
    get notes() {
      return inputState.notes;
    },
    set notes(value: string) {
      inputState.notes = value;
      triggerEvent('input:notes', value);
    },
    
    get voice(): AudioData {
      return {
        audio: inputState.voiceTranscript,
        transcript: inputState.voiceTranscript,
        timestamp: inputState.timestamp,
        duration: 0,
      };
    },
    
    get gesture(): GestureType {
      return {
        type: 'tap',
        coordinates: { x: 0, y: 0 },
      };
    },
    
    get location(): GPSCoordinates {
      return {
        latitude: 0,
        longitude: 0,
        accuracy: 0,
        timestamp: inputState.timestamp,
      };
    },
    
    get timestamp() {
      return inputState.timestamp;
    },
  },

  // UI events
  events: {
    on<K extends keyof EventMap>(event: K, callback: (data: EventMap[K]) => void): void {
      if (!eventCallbacks.has(event)) {
        eventCallbacks.set(event, []);
      }
      eventCallbacks.get(event)!.push(callback);
    },

    off<K extends keyof EventMap>(event: K, callback: (data: EventMap[K]) => void): void {
      const callbacks = eventCallbacks.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    },

    emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
      triggerEvent(event, data);
    },
  },
};

// Internal event system
type EventMap = {
  'scan:complete': BarcodeData;
  'count:submit': CountData;
  'product:select': Product;
  'session:start': Session;
  'offline:status': boolean;
  'input:quantity': number;
  'input:notes': string;
  'input:product': Product | null;
  'input:voice': string;
  'input:location': string;
  'camera:capture': ImageData;
  'camera:permission': 'granted' | 'denied' | 'prompt';
  'ui:navigate': string;
  'gesture:detected': GestureType;
};

function triggerEvent<K extends keyof EventMap>(event: K, data: EventMap[K]) {
  const callbacks = eventCallbacks.get(event);
  if (callbacks) {
    callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event callback for ${event}:`, error);
      }
    });
  }
}

// State management functions for Agent 3 to use
export const Agent2State = {
  // Camera state management
  updateCameraState(updates: Partial<typeof cameraState>) {
    cameraState = { ...cameraState, ...updates };
    
    if (updates.lastCapture) {
      triggerEvent('camera:capture', updates.lastCapture);
    }
    if (updates.lastBarcode) {
      triggerEvent('scan:complete', {
        barcode: updates.lastBarcode,
        format: 'unknown', // Would be provided by scanner
        confidence: 1.0,
        timestamp: new Date(),
      });
    }
    if (updates.permission) {
      triggerEvent('camera:permission', updates.permission);
    }
  },

  // Input state management
  updateInputState(updates: Partial<typeof inputState>) {
    const oldState = { ...inputState };
    inputState = { ...inputState, ...updates };
    
    // Trigger events for changed values
    Object.keys(updates).forEach(key => {
      const eventKey = `input:${key}` as keyof EventMap;
      if (eventCallbacks.has(eventKey) && oldState[key] !== inputState[key]) {
        triggerEvent(eventKey, inputState[key]);
      }
    });
  },

  // Get current state
  getCameraState: () => ({ ...cameraState }),
  getInputState: () => ({ ...inputState }),
  
  // Reset state
  resetState() {
    cameraState = {
      lastCapture: null,
      lastBarcode: null,
      scanMode: 'barcode',
      permission: 'prompt',
      isActive: false,
    };
    
    inputState = {
      quantity: 1,
      notes: '',
      selectedProduct: null,
      voiceTranscript: '',
      location: '',
      timestamp: new Date(),
    };
  },
};

// Mobile-specific utilities for Agent 3
export const Agent2Utils = {
  // Haptic feedback
  haptic(intensity: 'light' | 'medium' | 'heavy' = 'light') {
    if ('vibrate' in navigator) {
      const patterns = {
        light: [25],
        medium: [50],
        heavy: [100],
      };
      navigator.vibrate(patterns[intensity]);
    }
  },

  // Toast notifications (mobile-optimized)
  showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
    // This would integrate with a toast system
    console.log(`Toast [${type}]: ${message}`);
    
    // Haptic feedback based on type
    switch (type) {
      case 'success':
        this.haptic('medium');
        break;
      case 'error':
        this.haptic('heavy');
        break;
      case 'info':
        this.haptic('light');
        break;
    }
  },

  // Check if device is mobile
  isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  },

  // Check if PWA is installed
  isInstalled() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as any).standalone ||
           document.referrer.includes('android-app://');
  },

  // Get device orientation
  getOrientation() {
    return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
  },

  // Safe area dimensions
  getSafeArea() {
    const computedStyle = getComputedStyle(document.documentElement);
    return {
      top: computedStyle.getPropertyValue('env(safe-area-inset-top)') || '0px',
      bottom: computedStyle.getPropertyValue('env(safe-area-inset-bottom)') || '0px',
      left: computedStyle.getPropertyValue('env(safe-area-inset-left)') || '0px',
      right: computedStyle.getPropertyValue('env(safe-area-inset-right)') || '0px',
    };
  },
};

// Re-export types for Agent 3
export type {
  Product,
  BarcodeData,
  ImageData,
  CountData,
  Session,
  GestureType,
} from '../shared/contracts/agent-interfaces';

// Navigation utilities
export const Agent2Navigation = {
  // Navigate to specific pages
  navigateToScanner() {
    triggerEvent('ui:navigate', '/scanner');
  },
  
  navigateToProducts() {
    triggerEvent('ui:navigate', '/products');
  },
  
  navigateToQuickCount() {
    triggerEvent('ui:navigate', '/count');
  },
  
  navigateToHistory() {
    triggerEvent('ui:navigate', '/history');
  },
  
  navigateBack() {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      triggerEvent('ui:navigate', '/');
    }
  },
};

// Default export for easy import
export default Agent2Interface;