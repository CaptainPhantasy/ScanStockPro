import { Foundation_To_Features, ProductRepository, InventoryRepository } from '../../shared/contracts/agent-interfaces';
import {
  InventoryCount,
  DeviceInfo,
  CycleCountSession,
  Zone,
  DiscrepancyRecord,
  DiscrepancyReason,
  ReorderSuggestion,
  ValidationResult,
  Alert,
  ProductLock,
  BatchOperation,
  BatchItem
} from './types';

export class InventoryService {
  constructor(
    private foundation: Foundation_To_Features,
    private productRepo: ProductRepository,
    private inventoryRepo: InventoryRepository
  ) {}

  // Core counting operations
  async recordCount(
    productId: string,
    quantity: number,
    userId: string,
    deviceInfo: DeviceInfo,
    location: string = 'default',
    notes?: string,
    sessionId?: string
  ): Promise<InventoryCount> {
    // Start transaction for consistency
    return await this.foundation.database.transaction([
      async () => {
        // Get current inventory
        const currentInventory = await this.inventoryRepo.findByProduct(productId);
        const previousQuantity = currentInventory[0]?.quantity || 0;

        // Validate the quantity change
        const validation = await this.validateQuantityChange(productId, quantity, previousQuantity);
        if (!validation.isValid) {
          throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
        }

        // Check for conflicts (if someone else is counting this item)
        const existingLock = await this.checkProductLock(productId);
        if (existingLock && existingLock.userId !== userId) {
          throw new Error(`Product is currently being counted by another user`);
        }

        // Record the count
        const countRecord: InventoryCount = {
          id: this.generateId(),
          productId,
          quantity,
          previousQuantity,
          difference: quantity - previousQuantity,
          userId,
          deviceInfo,
          location,
          notes,
          timestamp: new Date(),
          sessionId,
          verified: false
        };

        // Update current quantity
        await this.inventoryRepo.update(currentInventory[0]?.id, {
          quantity,
          lastCounted: new Date()
        });

        // Store count history
        await this.storeCountHistory(countRecord);

        // Check for discrepancies
        if (Math.abs(countRecord.difference) > this.getDiscrepancyThreshold(productId)) {
          await this.flagDiscrepancy(countRecord);
        }

        // Broadcast to team if in session
        if (sessionId) {
          await this.broadcastCountUpdate(sessionId, countRecord);
        }

        // Check for alerts
        await this.checkAlertConditions(productId, quantity);

        return countRecord;
      }
    ]);
  }

  // Cycle counting
  async initiateCycleCount(
    businessId: string,
    name: string,
    description: string,
    zones: Zone[],
    assignedUsers: string[],
    settings: any = {}
  ): Promise<CycleCountSession> {
    const session: CycleCountSession = {
      id: this.generateId(),
      businessId,
      name,
      description,
      zones,
      assignedUsers,
      status: 'planning',
      expectedDuration: zones.reduce((total, zone) => total + zone.estimatedTime, 0),
      progress: {
        totalItems: zones.reduce((total, zone) => total + zone.productIds.length, 0),
        completedItems: 0,
        percentage: 0,
        participantProgress: new Map()
      },
      settings: {
        allowDiscrepancies: true,
        maxDiscrepancyThreshold: 0.05, // 5%
        requirePhotos: false,
        requireNotes: false,
        autoReconcile: false,
        notifyOnCompletion: true,
        ...settings
      }
    };

    // Initialize participant progress tracking
    assignedUsers.forEach(userId => {
      session.progress.participantProgress.set(userId, {
        userId,
        itemsCounted: 0,
        zonesCompleted: 0,
        lastActivity: new Date(),
        status: 'active'
      });
    });

    // Create real-time session channel
    const channel = this.foundation.realtime.channel(`cycle-count:${session.id}`);
    await channel.subscribe();

    // Store session
    await this.storeCycleCountSession(session);

    // Assign zones to users (round-robin if not pre-assigned)
    await this.assignZonesToUsers(session);

    // Notify assigned users
    await this.notifySessionParticipants(session);

    return session;
  }

  async startCycleCount(sessionId: string): Promise<void> {
    const session = await this.getCycleCountSession(sessionId);
    session.status = 'active';
    session.startedAt = new Date();

    await this.updateCycleCountSession(session);
    
    // Broadcast session start
    await this.foundation.realtime.broadcast(`cycle-count:${sessionId}`, {
      type: 'session_started',
      session
    });
  }

  // Discrepancy management
  async resolveDiscrepancy(
    discrepancyId: string,
    resolution: {
      acceptPhysicalCount: boolean;
      reason: DiscrepancyReason;
      notes: string;
      investigatedBy: string;
    }
  ): Promise<void> {
    const discrepancy = await this.getDiscrepancy(discrepancyId);
    
    if (resolution.acceptPhysicalCount) {
      // Accept the physical count and adjust inventory
      await this.inventoryRepo.update(discrepancy.id, {
        quantity: discrepancy.physicalQuantity
      });
    }

    // Update discrepancy record
    await this.updateDiscrepancy(discrepancyId, {
      status: 'resolved',
      reason: resolution.reason,
      notes: resolution.notes,
      investigatedBy: resolution.investigatedBy,
      resolvedAt: new Date()
    });

    // Log the resolution
    await this.logDiscrepancyResolution(discrepancy, resolution);

    // Update analytics
    await this.updateDiscrepancyAnalytics(discrepancy);
  }

  // Smart suggestions based on AI analysis
  async getSuggestedReorderPoint(productId: string): Promise<ReorderSuggestion> {
    // Get historical data
    const history = await this.inventoryRepo.getHistory(productId, 90); // 90 days
    const product = await this.productRepo.findById(productId);
    
    if (!product || history.length < 7) {
      throw new Error('Insufficient data for reorder analysis');
    }

    // Calculate velocity and trends
    const salesVelocity = this.calculateSalesVelocity(history);
    const seasonalityFactor = await this.calculateSeasonality(productId);
    const leadTimeDays = await this.getSupplierLeadTime(productId);
    const currentStock = history[0]?.quantity || 0;

    // AI-powered suggestion logic
    const baseReorderPoint = salesVelocity * leadTimeDays;
    const seasonalAdjustment = baseReorderPoint * seasonalityFactor;
    const safetyStock = salesVelocity * 7; // 1 week buffer

    const suggestedReorderPoint = Math.ceil(baseReorderPoint + seasonalAdjustment + safetyStock);
    const suggestedReorderQuantity = Math.ceil(salesVelocity * 30); // 30 days supply

    // Determine reason code
    let reasonCode: any = 'low_stock';
    if (salesVelocity > this.getHighVelocityThreshold(productId)) {
      reasonCode = 'high_velocity';
    } else if (seasonalityFactor > 1.2) {
      reasonCode = 'seasonal_demand';
    }

    // Calculate confidence based on data quality
    const confidence = this.calculateSuggestionConfidence(history, salesVelocity);

    const suggestion: ReorderSuggestion = {
      productId,
      currentStock,
      suggestedReorderPoint,
      suggestedReorderQuantity,
      reasonCode,
      confidence,
      monthlySalesVelocity: salesVelocity * 30,
      seasonalityFactor,
      leadTimeDays
    };

    // Add projected stockout date if trending towards zero
    if (salesVelocity > 0) {
      const daysUntilStockout = currentStock / salesVelocity;
      if (daysUntilStockout <= 30) {
        suggestion.projectedStockoutDate = new Date(Date.now() + daysUntilStockout * 24 * 60 * 60 * 1000);
      }
    }

    return suggestion;
  }

  // Batch operations for efficiency
  async processBatchOperation(operation: BatchOperation): Promise<void> {
    operation.status = 'processing';
    await this.updateBatchOperation(operation);

    let processed = 0;
    const errors: any[] = [];

    for (let i = 0; i < operation.operations.length; i++) {
      try {
        const item = operation.operations[i];
        await this.processBatchItem(item, operation);
        processed++;
        
        // Update progress
        operation.progress = (processed / operation.operations.length) * 100;
        await this.updateBatchOperation(operation);
        
      } catch (error: any) {
        errors.push({
          itemIndex: i,
          productId: operation.operations[i].productId,
          error: error.message,
          code: 'PROCESSING_ERROR'
        });
      }
    }

    operation.status = errors.length === 0 ? 'completed' : 'failed';
    operation.errors = errors;
    operation.completedAt = new Date();
    
    await this.updateBatchOperation(operation);
  }

  // Product lock management for real-time collaboration
  async acquireProductLock(
    productId: string,
    userId: string,
    sessionId: string,
    lockType: 'count' | 'edit' | 'transfer' = 'count'
  ): Promise<boolean> {
    const existingLock = await this.checkProductLock(productId);
    
    if (existingLock && existingLock.userId !== userId && existingLock.expiresAt > new Date()) {
      return false; // Lock held by another user
    }

    // Create new lock
    const lock: ProductLock = {
      productId,
      userId,
      sessionId,
      lockedAt: new Date(),
      expiresAt: new Date(Date.now() + 30000), // 30 seconds
      lockType
    };

    await this.storeProductLock(lock);
    
    // Auto-release after expiration
    setTimeout(() => this.releaseProductLock(productId, userId), 30000);
    
    return true;
  }

  async releaseProductLock(productId: string, userId: string): Promise<void> {
    await this.removeProductLock(productId, userId);
  }

  // Alert system
  async checkAlertConditions(productId: string, currentQuantity: number): Promise<Alert[]> {
    const product = await this.productRepo.findById(productId);
    if (!product) return [];

    const alerts: Alert[] = [];
    const reorderPoint = await this.getProductReorderPoint(productId);
    const maxStock = await this.getProductMaxStock(productId);

    // Low stock alert
    if (currentQuantity <= reorderPoint) {
      alerts.push(await this.createAlert({
        type: 'low_stock',
        severity: currentQuantity === 0 ? 'critical' : 'high',
        title: 'Low Stock Alert',
        message: `${product.name} is below reorder point (${currentQuantity}/${reorderPoint})`,
        productId,
        businessId: product.businessId
      }));
    }

    // Zero stock alert
    if (currentQuantity === 0) {
      alerts.push(await this.createAlert({
        type: 'zero_stock',
        severity: 'critical',
        title: 'Out of Stock',
        message: `${product.name} is out of stock`,
        productId,
        businessId: product.businessId
      }));
    }

    // Overstock alert
    if (maxStock && currentQuantity > maxStock) {
      alerts.push(await this.createAlert({
        type: 'overstocked',
        severity: 'medium',
        title: 'Overstock Alert',
        message: `${product.name} is overstocked (${currentQuantity}/${maxStock})`,
        productId,
        businessId: product.businessId
      }));
    }

    // Store alerts and broadcast
    for (const alert of alerts) {
      await this.storeAlert(alert);
      await this.broadcastAlert(alert);
    }

    return alerts;
  }

  // Private helper methods
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private async validateQuantityChange(productId: string, newQuantity: number, previousQuantity: number): Promise<ValidationResult> {
    const errors: any[] = [];
    const warnings: any[] = [];

    // Basic validation
    if (newQuantity < 0) {
      errors.push({
        code: 'NEGATIVE_QUANTITY',
        message: 'Quantity cannot be negative',
        field: 'quantity',
        severity: 'high' as const
      });
    }

    // Unrealistic change detection
    const changePercent = Math.abs((newQuantity - previousQuantity) / (previousQuantity || 1));
    if (changePercent > 2.0) { // 200% change
      warnings.push({
        code: 'LARGE_CHANGE',
        message: 'Large quantity change detected - please verify',
        field: 'quantity',
        severity: 'medium' as const
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private getDiscrepancyThreshold(productId: string): number {
    // Could be configurable per product or business
    return 0.05; // 5% threshold
  }

  private calculateSalesVelocity(history: any[]): number {
    if (history.length < 2) return 0;
    
    const dailyChanges = [];
    for (let i = 1; i < history.length; i++) {
      const change = history[i-1].quantity - history[i].quantity;
      if (change > 0) dailyChanges.push(change);
    }
    
    return dailyChanges.length > 0 ? 
      dailyChanges.reduce((sum, change) => sum + change, 0) / dailyChanges.length : 0;
  }

  private async calculateSeasonality(productId: string): Promise<number> {
    // Simplified seasonality calculation
    // In production, this would use more sophisticated ML models
    const currentMonth = new Date().getMonth();
    const historicalData = await this.getHistoricalSeasonalData(productId);
    
    return historicalData[currentMonth] || 1.0;
  }

  private calculateSuggestionConfidence(history: any[], velocity: number): number {
    if (history.length < 7) return 0.3;
    if (history.length < 30) return 0.6;
    if (velocity === 0) return 0.4;
    return 0.9;
  }

  // Placeholder methods - would be implemented with actual database calls
  private async checkProductLock(productId: string): Promise<ProductLock | null> { return null; }
  private async storeCountHistory(count: InventoryCount): Promise<void> {}
  private async flagDiscrepancy(count: InventoryCount): Promise<void> {}
  private async broadcastCountUpdate(sessionId: string, count: InventoryCount): Promise<void> {}
  private async storeCycleCountSession(session: CycleCountSession): Promise<void> {}
  private async assignZonesToUsers(session: CycleCountSession): Promise<void> {}
  private async notifySessionParticipants(session: CycleCountSession): Promise<void> {}
  private async getCycleCountSession(sessionId: string): Promise<CycleCountSession> { return {} as any; }
  private async updateCycleCountSession(session: CycleCountSession): Promise<void> {}
  private async getDiscrepancy(discrepancyId: string): Promise<DiscrepancyRecord> { return {} as any; }
  private async updateDiscrepancy(discrepancyId: string, update: any): Promise<void> {}
  private async logDiscrepancyResolution(discrepancy: DiscrepancyRecord, resolution: any): Promise<void> {}
  private async updateDiscrepancyAnalytics(discrepancy: DiscrepancyRecord): Promise<void> {}
  private async getSupplierLeadTime(productId: string): Promise<number> { return 7; }
  private async getHighVelocityThreshold(productId: string): Promise<number> { return 10; }
  private async updateBatchOperation(operation: BatchOperation): Promise<void> {}
  private async processBatchItem(item: BatchItem, operation: BatchOperation): Promise<void> {}
  private async storeProductLock(lock: ProductLock): Promise<void> {}
  private async removeProductLock(productId: string, userId: string): Promise<void> {}
  private async getProductReorderPoint(productId: string): Promise<number> { return 10; }
  private async getProductMaxStock(productId: string): Promise<number> { return 1000; }
  private async createAlert(alert: Partial<Alert>): Promise<Alert> { return alert as Alert; }
  private async storeAlert(alert: Alert): Promise<void> {}
  private async broadcastAlert(alert: Alert): Promise<void> {}
  private async getHistoricalSeasonalData(productId: string): Promise<number[]> { return Array(12).fill(1.0); }
}