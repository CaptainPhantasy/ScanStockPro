import { User, ProductSchema, InventorySchema } from '../../shared/contracts/agent-interfaces';

// Core inventory types
export interface InventoryCount {
  id: string;
  productId: string;
  quantity: number;
  previousQuantity: number;
  difference: number;
  userId: string;
  deviceInfo: DeviceInfo;
  location: string;
  notes?: string;
  timestamp: Date;
  sessionId?: string;
  verified: boolean;
}

export interface DeviceInfo {
  id: string;
  type: 'mobile' | 'tablet' | 'desktop';
  userAgent: string;
  location?: GPSCoordinates;
  batteryLevel?: number;
  networkStatus: 'online' | 'offline';
}

export interface GPSCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: Date;
}

// Cycle counting types
export interface CycleCountSession {
  id: string;
  businessId: string;
  name: string;
  description?: string;
  zones: Zone[];
  assignedUsers: string[];
  status: 'planning' | 'active' | 'paused' | 'completed' | 'cancelled';
  startedAt?: Date;
  completedAt?: Date;
  expectedDuration: number; // in minutes
  progress: SessionProgress;
  settings: CycleCountSettings;
}

export interface Zone {
  id: string;
  name: string;
  description?: string;
  location: string;
  productIds: string[];
  assignedUserId?: string;
  status: 'pending' | 'in_progress' | 'completed';
  estimatedTime: number; // in minutes
}

export interface SessionProgress {
  totalItems: number;
  completedItems: number;
  percentage: number;
  participantProgress: Map<string, ParticipantProgress>;
}

export interface ParticipantProgress {
  userId: string;
  itemsCounted: number;
  zonesCompleted: number;
  lastActivity: Date;
  status: 'active' | 'idle' | 'disconnected';
}

export interface CycleCountSettings {
  allowDiscrepancies: boolean;
  maxDiscrepancyThreshold: number;
  requirePhotos: boolean;
  requireNotes: boolean;
  autoReconcile: boolean;
  notifyOnCompletion: boolean;
}

// Discrepancy management
export interface DiscrepancyRecord {
  id: string;
  productId: string;
  sessionId: string;
  systemQuantity: number;
  physicalQuantity: number;
  difference: number;
  percentage: number;
  reason: DiscrepancyReason;
  status: 'pending' | 'investigating' | 'resolved' | 'accepted';
  investigatedBy?: string;
  resolvedAt?: Date;
  notes?: string;
  photos?: string[];
}

export type DiscrepancyReason = 
  | 'theft'
  | 'damage'
  | 'expired'
  | 'miscounted'
  | 'system_error'
  | 'transfer_not_recorded'
  | 'supplier_shortage'
  | 'other';

// Smart suggestions
export interface ReorderSuggestion {
  productId: string;
  currentStock: number;
  suggestedReorderPoint: number;
  suggestedReorderQuantity: number;
  reasonCode: ReorderReason;
  confidence: number;
  projectedStockoutDate?: Date;
  monthlySalesVelocity: number;
  seasonalityFactor: number;
  leadTimeDays: number;
}

export type ReorderReason =
  | 'low_stock'
  | 'high_velocity'
  | 'seasonal_demand'
  | 'promotional_planning'
  | 'supplier_minimum'
  | 'bulk_discount';

// Validation and business rules
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  code: string;
  message: string;
  field: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ValidationWarning extends ValidationError {}

// Alert system
export interface Alert {
  id: string;
  type: AlertType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  productId?: string;
  businessId: string;
  createdAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  metadata?: Record<string, any>;
}

export type AlertType =
  | 'low_stock'
  | 'zero_stock'
  | 'overstocked'
  | 'discrepancy_detected'
  | 'count_overdue'
  | 'system_error'
  | 'security_alert';

// Lock management for real-time collaboration
export interface ProductLock {
  productId: string;
  userId: string;
  sessionId: string;
  lockedAt: Date;
  expiresAt: Date;
  lockType: 'count' | 'edit' | 'transfer';
}

// Batch operations
export interface BatchOperation {
  id: string;
  type: 'bulk_count' | 'bulk_adjust' | 'bulk_transfer';
  businessId: string;
  userId: string;
  operations: BatchItem[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  errors: BatchError[];
  createdAt: Date;
  completedAt?: Date;
}

export interface BatchItem {
  productId: string;
  operation: 'set' | 'add' | 'subtract';
  quantity: number;
  location?: string;
  notes?: string;
}

export interface BatchError {
  itemIndex: number;
  productId: string;
  error: string;
  code: string;
}