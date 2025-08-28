import { Foundation_To_Features, User } from '../../shared/contracts/agent-interfaces';
import {
  CycleCountSession,
  Zone,
  SessionProgress,
  ParticipantProgress,
  ProductLock,
  InventoryCount
} from '../inventory/types';

interface CollaborationEvent {
  type: 'user_joined' | 'user_left' | 'product_claimed' | 'product_released' | 'count_submitted' | 'zone_completed' | 'session_paused' | 'session_resumed';
  userId: string;
  sessionId: string;
  timestamp: Date;
  data?: any;
}

interface TeamPresence {
  userId: string;
  userName: string;
  status: 'active' | 'idle' | 'counting' | 'offline';
  currentZone?: string;
  currentProduct?: string;
  lastActivity: Date;
  deviceInfo?: {
    type: 'mobile' | 'tablet' | 'desktop';
    batteryLevel?: number;
    networkQuality: 'good' | 'fair' | 'poor';
  };
  location?: {
    zone: string;
    coordinates?: { x: number; y: number };
  };
}

interface ConflictResolution {
  conflictId: string;
  type: 'simultaneous_count' | 'quantity_mismatch' | 'zone_overlap';
  participants: string[];
  productId?: string;
  zoneId?: string;
  data: any;
  status: 'pending' | 'resolved' | 'escalated';
  resolution?: {
    method: 'newest_wins' | 'highest_authority' | 'average' | 'manual_review';
    resolvedBy: string;
    resolvedAt: Date;
    finalValue: any;
  };
}

interface SessionMetrics {
  sessionId: string;
  startTime: Date;
  duration: number; // in seconds
  participants: number;
  itemsProcessed: number;
  zonesCompleted: number;
  discrepanciesFound: number;
  averageTimePerItem: number;
  efficiency: number; // 0-1 score
  teamCoordination: number; // 0-1 score
}

export class CollaborationService {
  private activeSessions: Map<string, CycleCountSession> = new Map();
  private sessionChannels: Map<string, any> = new Map();
  private userPresence: Map<string, TeamPresence[]> = new Map(); // sessionId -> users
  private productLocks: Map<string, ProductLock> = new Map();
  private conflictQueue: Map<string, ConflictResolution> = new Map();

  constructor(private foundation: Foundation_To_Features) {
    this.setupGlobalPresenceTracking();
    this.startCleanupScheduler();
  }

  // Session Management
  async createSession(
    businessId: string,
    name: string,
    description: string,
    zones: Zone[],
    createdBy: string
  ): Promise<CycleCountSession> {
    const session: CycleCountSession = {
      id: this.generateId(),
      businessId,
      name,
      description,
      zones,
      assignedUsers: [],
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
        maxDiscrepancyThreshold: 0.05,
        requirePhotos: false,
        requireNotes: false,
        autoReconcile: false,
        notifyOnCompletion: true
      }
    };

    // Initialize real-time channel
    await this.initializeChannel(session);

    // Store session
    this.activeSessions.set(session.id, session);
    await this.persistSession(session);

    // Initialize presence tracking
    this.userPresence.set(session.id, []);

    return session;
  }

  async joinSession(sessionId: string, user: User): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (session.status === 'completed' || session.status === 'cancelled') {
      throw new Error('Cannot join a completed or cancelled session');
    }

    // Add user to session if not already present
    if (!session.assignedUsers.includes(user.id)) {
      session.assignedUsers.push(user.id);
      
      // Initialize participant progress
      session.progress.participantProgress.set(user.id, {
        userId: user.id,
        itemsCounted: 0,
        zonesCompleted: 0,
        lastActivity: new Date(),
        status: 'active'
      });
    }

    // Add to presence tracking
    const presence: TeamPresence = {
      userId: user.id,
      userName: user.email, // Would be actual name from user profile
      status: 'active',
      lastActivity: new Date(),
      deviceInfo: {
        type: 'mobile', // Would be detected from user agent
        networkQuality: 'good'
      }
    };

    const sessionPresence = this.userPresence.get(sessionId) || [];
    const existingIndex = sessionPresence.findIndex(p => p.userId === user.id);
    
    if (existingIndex >= 0) {
      sessionPresence[existingIndex] = presence;
    } else {
      sessionPresence.push(presence);
    }
    
    this.userPresence.set(sessionId, sessionPresence);

    // Broadcast user joined event
    await this.broadcastEvent(sessionId, {
      type: 'user_joined',
      userId: user.id,
      sessionId,
      timestamp: new Date(),
      data: { userName: user.email }
    });

    // Auto-assign zones if needed
    await this.autoAssignZones(session);
    
    await this.persistSession(session);
  }

  async leaveSession(sessionId: string, userId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    // Release any product locks
    await this.releaseAllUserLocks(sessionId, userId);

    // Update presence
    const sessionPresence = this.userPresence.get(sessionId) || [];
    const updatedPresence = sessionPresence.filter(p => p.userId !== userId);
    this.userPresence.set(sessionId, updatedPresence);

    // Update participant status
    const participantProgress = session.progress.participantProgress.get(userId);
    if (participantProgress) {
      participantProgress.status = 'disconnected';
      participantProgress.lastActivity = new Date();
    }

    // Broadcast user left event
    await this.broadcastEvent(sessionId, {
      type: 'user_left',
      userId,
      sessionId,
      timestamp: new Date()
    });

    await this.persistSession(session);
  }

  // Product Lock Management for Conflict Prevention
  async claimProduct(
    sessionId: string,
    productId: string,
    userId: string,
    estimatedTime: number = 30 // seconds
  ): Promise<boolean> {
    const lockKey = `${sessionId}:${productId}`;
    const existingLock = this.productLocks.get(lockKey);

    // Check if product is already locked by another user
    if (existingLock && existingLock.userId !== userId && existingLock.expiresAt > new Date()) {
      // Detect potential conflict
      await this.handlePotentialConflict(sessionId, productId, userId, existingLock.userId);
      return false;
    }

    // Create new lock
    const lock: ProductLock = {
      productId,
      userId,
      sessionId,
      lockedAt: new Date(),
      expiresAt: new Date(Date.now() + estimatedTime * 1000),
      lockType: 'count'
    };

    this.productLocks.set(lockKey, lock);

    // Update user presence
    await this.updateUserPresence(sessionId, userId, {
      status: 'counting',
      currentProduct: productId,
      lastActivity: new Date()
    });

    // Broadcast claim event
    await this.broadcastEvent(sessionId, {
      type: 'product_claimed',
      userId,
      sessionId,
      timestamp: new Date(),
      data: { productId, expiresAt: lock.expiresAt }
    });

    // Auto-release after expiration
    setTimeout(() => {
      this.releaseProductLock(sessionId, productId, userId);
    }, estimatedTime * 1000);

    return true;
  }

  async releaseProductLock(
    sessionId: string,
    productId: string,
    userId: string
  ): Promise<void> {
    const lockKey = `${sessionId}:${productId}`;
    const lock = this.productLocks.get(lockKey);

    if (!lock || lock.userId !== userId) {
      return; // Not locked by this user
    }

    this.productLocks.delete(lockKey);

    // Update user presence
    await this.updateUserPresence(sessionId, userId, {
      status: 'active',
      currentProduct: undefined,
      lastActivity: new Date()
    });

    // Broadcast release event
    await this.broadcastEvent(sessionId, {
      type: 'product_released',
      userId,
      sessionId,
      timestamp: new Date(),
      data: { productId }
    });
  }

  // Progress Tracking
  async updateProgress(
    sessionId: string,
    userId: string,
    progressUpdate: {
      itemsCounted?: number;
      zoneCompleted?: string;
      countSubmitted?: InventoryCount;
    }
  ): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    const participantProgress = session.progress.participantProgress.get(userId);
    if (!participantProgress) return;

    // Update individual progress
    if (progressUpdate.itemsCounted !== undefined) {
      participantProgress.itemsCounted = progressUpdate.itemsCounted;
    }

    if (progressUpdate.zoneCompleted) {
      participantProgress.zonesCompleted++;
      
      // Mark zone as completed
      const zone = session.zones.find(z => z.id === progressUpdate.zoneCompleted);
      if (zone) {
        zone.status = 'completed';
      }
    }

    participantProgress.lastActivity = new Date();

    // Recalculate overall progress
    const totalCompleted = Array.from(session.progress.participantProgress.values())
      .reduce((sum, p) => sum + p.itemsCounted, 0);
    
    session.progress.completedItems = totalCompleted;
    session.progress.percentage = (totalCompleted / session.progress.totalItems) * 100;

    // Broadcast progress update
    await this.broadcastEvent(sessionId, {
      type: 'count_submitted',
      userId,
      sessionId,
      timestamp: new Date(),
      data: {
        progress: session.progress,
        userProgress: participantProgress,
        countData: progressUpdate.countSubmitted
      }
    });

    // Check if session is complete
    if (session.progress.percentage >= 100) {
      await this.completeSession(sessionId);
    }

    await this.persistSession(session);
  }

  // Team Presence and Activity Tracking
  async trackPresence(
    sessionId: string,
    userId: string,
    status: 'active' | 'idle' | 'counting' | 'offline',
    metadata?: any
  ): Promise<void> {
    await this.updateUserPresence(sessionId, userId, {
      status,
      lastActivity: new Date(),
      ...metadata
    });

    // Broadcast presence update to other team members
    const sessionPresence = this.userPresence.get(sessionId) || [];
    const userPresenceData = sessionPresence.find(p => p.userId === userId);

    if (userPresenceData) {
      await this.broadcastPresenceUpdate(sessionId, userPresenceData);
    }
  }

  async getTeamPresence(sessionId: string): Promise<TeamPresence[]> {
    return this.userPresence.get(sessionId) || [];
  }

  // Conflict Detection and Resolution
  private async handlePotentialConflict(
    sessionId: string,
    productId: string,
    newUserId: string,
    existingUserId: string
  ): Promise<void> {
    const conflictId = this.generateId();
    
    const conflict: ConflictResolution = {
      conflictId,
      type: 'simultaneous_count',
      participants: [existingUserId, newUserId],
      productId,
      data: {
        sessionId,
        attemptedAt: new Date(),
        existingLock: this.productLocks.get(`${sessionId}:${productId}`)
      },
      status: 'pending'
    };

    this.conflictQueue.set(conflictId, conflict);

    // Notify both users about the conflict
    await this.notifyConflict(sessionId, conflict);

    // Auto-resolve with "first come, first served" after 10 seconds if no manual resolution
    setTimeout(() => {
      this.autoResolveConflict(conflictId);
    }, 10000);
  }

  async resolveConflict(
    conflictId: string,
    resolution: {
      method: 'newest_wins' | 'highest_authority' | 'average' | 'manual_review';
      resolvedBy: string;
      finalValue?: any;
    }
  ): Promise<void> {
    const conflict = this.conflictQueue.get(conflictId);
    if (!conflict || conflict.status !== 'pending') return;

    conflict.status = 'resolved';
    conflict.resolution = {
      ...resolution,
      resolvedAt: new Date()
    };

    // Apply resolution logic
    await this.applyConflictResolution(conflict);

    // Notify participants
    await this.notifyConflictResolution(conflict);

    this.conflictQueue.delete(conflictId);
  }

  // Session Analytics and Metrics
  async getSessionMetrics(sessionId: string): Promise<SessionMetrics> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const duration = session.startedAt ? 
      (Date.now() - session.startedAt.getTime()) / 1000 : 0;

    const participants = session.assignedUsers.length;
    const itemsProcessed = session.progress.completedItems;
    const zonesCompleted = session.zones.filter(z => z.status === 'completed').length;

    const averageTimePerItem = itemsProcessed > 0 ? duration / itemsProcessed : 0;
    
    // Calculate efficiency (items per minute per person)
    const efficiency = participants > 0 && duration > 0 ? 
      (itemsProcessed / (duration / 60)) / participants : 0;

    // Calculate team coordination score based on conflicts and overlap
    const teamCoordination = this.calculateTeamCoordination(sessionId);

    return {
      sessionId,
      startTime: session.startedAt || new Date(),
      duration,
      participants,
      itemsProcessed,
      zonesCompleted,
      discrepanciesFound: 0, // Would be calculated from actual data
      averageTimePerItem,
      efficiency: Math.min(efficiency / 10, 1), // Normalize to 0-1
      teamCoordination
    };
  }

  // Private Helper Methods
  private async initializeChannel(session: CycleCountSession): Promise<void> {
    const channel = this.foundation.realtime.channel(`session:${session.id}`);
    
    channel.on('presence', (payload: any) => {
      this.handlePresenceChange(session.id, payload);
    });

    channel.on('collaboration', (payload: any) => {
      this.handleCollaborationEvent(session.id, payload);
    });

    await channel.subscribe();
    this.sessionChannels.set(session.id, channel);
  }

  private async broadcastEvent(sessionId: string, event: CollaborationEvent): Promise<void> {
    const channel = this.sessionChannels.get(sessionId);
    if (channel) {
      channel.send('collaboration', event);
    }
  }

  private async updateUserPresence(
    sessionId: string,
    userId: string,
    updates: Partial<TeamPresence>
  ): Promise<void> {
    const sessionPresence = this.userPresence.get(sessionId) || [];
    const userIndex = sessionPresence.findIndex(p => p.userId === userId);

    if (userIndex >= 0) {
      sessionPresence[userIndex] = { ...sessionPresence[userIndex], ...updates };
    }

    this.userPresence.set(sessionId, sessionPresence);
  }

  private async broadcastPresenceUpdate(
    sessionId: string,
    presence: TeamPresence
  ): Promise<void> {
    const channel = this.sessionChannels.get(sessionId);
    if (channel) {
      channel.send('presence', presence);
    }
  }

  private async autoAssignZones(session: CycleCountSession): Promise<void> {
    const availableZones = session.zones.filter(z => !z.assignedUserId);
    const availableUsers = session.assignedUsers.filter(userId => 
      !session.zones.some(z => z.assignedUserId === userId)
    );

    // Simple round-robin assignment
    availableUsers.forEach((userId, index) => {
      if (availableZones[index]) {
        availableZones[index].assignedUserId = userId;
        availableZones[index].status = 'pending';
      }
    });
  }

  private async releaseAllUserLocks(sessionId: string, userId: string): Promise<void> {
    const locksToRelease = Array.from(this.productLocks.entries())
      .filter(([key, lock]) => lock.sessionId === sessionId && lock.userId === userId);

    for (const [lockKey, lock] of locksToRelease) {
      this.productLocks.delete(lockKey);
      
      await this.broadcastEvent(sessionId, {
        type: 'product_released',
        userId,
        sessionId,
        timestamp: new Date(),
        data: { productId: lock.productId, reason: 'user_disconnected' }
      });
    }
  }

  private async completeSession(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    session.status = 'completed';
    session.completedAt = new Date();

    // Generate final report
    const metrics = await this.getSessionMetrics(sessionId);
    
    // Clean up resources
    const channel = this.sessionChannels.get(sessionId);
    if (channel) {
      await channel.unsubscribe();
      this.sessionChannels.delete(sessionId);
    }

    this.userPresence.delete(sessionId);

    // Notify participants
    await this.notifySessionCompletion(session, metrics);
    
    await this.persistSession(session);
  }

  private calculateTeamCoordination(sessionId: string): number {
    // Calculate based on conflicts, zone overlap efficiency, etc.
    // This is a simplified version
    const conflicts = Array.from(this.conflictQueue.values())
      .filter(c => c.data.sessionId === sessionId);
    
    const conflictPenalty = conflicts.length * 0.1;
    return Math.max(0, 1 - conflictPenalty);
  }

  private setupGlobalPresenceTracking(): void {
    // Set up global presence channel for cross-session coordination
    const globalChannel = this.foundation.realtime.channel('global-presence');
    
    globalChannel.on('user-status', (payload: any) => {
      this.handleGlobalPresenceChange(payload);
    });
    
    globalChannel.subscribe();
  }

  private startCleanupScheduler(): void {
    // Clean up expired locks and inactive sessions every minute
    setInterval(() => {
      this.cleanupExpiredLocks();
      this.cleanupInactiveSessions();
    }, 60000);
  }

  private cleanupExpiredLocks(): void {
    const now = new Date();
    const expiredLocks = Array.from(this.productLocks.entries())
      .filter(([_, lock]) => lock.expiresAt <= now);

    for (const [lockKey, lock] of expiredLocks) {
      this.productLocks.delete(lockKey);
      
      // Notify about auto-release
      this.broadcastEvent(lock.sessionId, {
        type: 'product_released',
        userId: lock.userId,
        sessionId: lock.sessionId,
        timestamp: new Date(),
        data: { productId: lock.productId, reason: 'expired' }
      });
    }
  }

  private cleanupInactiveSessions(): void {
    const now = new Date();
    const inactiveThreshold = 24 * 60 * 60 * 1000; // 24 hours

    for (const [sessionId, session] of this.activeSessions) {
      const lastActivity = session.startedAt || new Date(0);
      
      if (now.getTime() - lastActivity.getTime() > inactiveThreshold && 
          session.status !== 'completed') {
        
        session.status = 'cancelled';
        this.completeSession(sessionId);
      }
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Placeholder methods - would be implemented with actual database/notification calls
  private async persistSession(session: CycleCountSession): Promise<void> {}
  private async notifyConflict(sessionId: string, conflict: ConflictResolution): Promise<void> {}
  private async autoResolveConflict(conflictId: string): Promise<void> {}
  private async applyConflictResolution(conflict: ConflictResolution): Promise<void> {}
  private async notifyConflictResolution(conflict: ConflictResolution): Promise<void> {}
  private async notifySessionCompletion(session: CycleCountSession, metrics: SessionMetrics): Promise<void> {}
  private handlePresenceChange(sessionId: string, payload: any): void {}
  private handleCollaborationEvent(sessionId: string, payload: any): void {}
  private handleGlobalPresenceChange(payload: any): void {}
}