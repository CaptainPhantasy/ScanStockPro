// Mutex locks for resource contention

interface Lock {
  agentId: string;
  resource: string;
  acquiredAt: number;
  expiresAt: number;
}

class LockManager {
  private locks: Map<string, Lock> = new Map();
  
  async acquireLock(agentId: string, resource: string): Promise<boolean> {
    const existingLock = this.locks.get(resource);
    
    if (existingLock && existingLock.expiresAt > Date.now()) {
      return false; // Resource is locked
    }
    
    this.locks.set(resource, {
      agentId,
      resource,
      acquiredAt: Date.now(),
      expiresAt: Date.now() + 30000 // 30 second timeout
    });
    
    return true;
  }
  
  releaseLock(agentId: string, resource: string): boolean {
    const lock = this.locks.get(resource);
    if (lock?.agentId === agentId) {
      this.locks.delete(resource);
      return true;
    }
    return false;
  }
  
  // Mobile-specific: auto-release on disconnect
  releaseAllLocks(agentId: string) {
    for (const [resource, lock] of this.locks.entries()) {
      if (lock.agentId === agentId) {
        this.locks.delete(resource);
      }
    }
  }
}

export const lockManager = new LockManager();
