// 4-way async communication system

class EventBus {
  private events: Map<string, Set<Function>> = new Map();
  private queue: any[] = [];
  private isOnline: boolean = true;

  // Broadcast to all agents
  broadcast(event: string, data: any) {
    const payload = {
      event,
      data,
      timestamp: Date.now(),
      sender: this.getAgentId()
    };
    
    if (this.isOnline) {
      this.emit(event, payload);
    } else {
      this.queue.push(payload);
    }
  }

  // Point-to-point communication
  send(target: string, message: any) {
    this.broadcast(`direct:${target}`, message);
  }

  // Subscribe to events
  on(event: string, callback: Function) {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(callback);
  }

  // Mobile-specific: handle offline/online
  setOnlineStatus(online: boolean) {
    this.isOnline = online;
    if (online && this.queue.length > 0) {
      for (const payload of this.queue) {
        this.emit(payload.event, payload);
      }
      this.queue = [];
    }
  }

  private emit(event: string, data: any) {
    const callbacks = this.events.get(event);
    if (callbacks) {
      for (const callback of callbacks) {
        callback(data);
      }
    }
  }

  private getAgentId(): string {
    // Detect which agent is sending based on file path
    const stack = new Error().stack || '';
    if (stack.includes('agent1')) return 'agent1';
    if (stack.includes('agent2')) return 'agent2';
    if (stack.includes('agent3')) return 'agent3';
    if (stack.includes('agent4')) return 'agent4';
    return 'unknown';
  }
}

export const eventBus = new EventBus();
