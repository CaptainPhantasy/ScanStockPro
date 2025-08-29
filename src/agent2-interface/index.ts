// Agent 2: Mobile Interface Module
// Complete mobile-first interface for ScanStock Pro warehouse scanning

// Main interface export for Agent 3 integration
export { default as Agent2Interface, Agent2State, Agent2Utils, Agent2Navigation } from './exports';

// Component library exports
export * from './components/mobile';
export * from './layouts';
export * from './pages';

// Functionality exports  
export * from './camera';
export * from './hooks';
export * from './pwa';

// Type exports
export type {
  Product,
  BarcodeData,
  ImageData,
  CountData,
  Session,
  GestureType,
  Interface_To_Features,
} from '../shared/contracts/agent-interfaces';

export type { 
  OfflineOperation, 
  OfflineState 
} from './hooks/useOffline';

export type { 
  PWAState, 
  PWAInstallPrompt 
} from './pwa/register';