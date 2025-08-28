export interface WebVitals {
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  ttfb: number; // Time to First Byte
  fcp: number; // First Contentful Paint
  tti: number; // Time to Interactive
  tbt: number; // Total Blocking Time
}

export interface MobileMetrics {
  batteryUsage: number;
  memoryUsage: number;
  networkPayload: number;
  offlineSyncTime: number;
  cameraInitTime: number;
  framerate: number;
  loadTime: number;
  renderTime: number;
}

export interface APIMetrics {
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  size: number;
  timestamp: number;
  userId?: string;
  errorType?: string;
}

export interface UserSession {
  sessionId: string;
  userId?: string;
  startTime: number;
  endTime?: number;
  pageViews: number;
  actions: UserAction[];
  device: DeviceInfo;
  location: GeolocationCoordinates;
}

export interface UserAction {
  type: 'click' | 'scan' | 'input' | 'navigation' | 'error';
  element?: string;
  timestamp: number;
  data?: any;
  duration?: number;
}

export interface DeviceInfo {
  type: 'mobile' | 'tablet' | 'desktop';
  os: string;
  browser: string;
  version: string;
  screenSize: { width: number; height: number };
  connectionType: string;
  isOnline: boolean;
}

export interface PerformanceBudget {
  lcp: number;
  fid: number;
  cls: number;
  ttfb: number;
  bundleSize: number;
  imageSize: number;
  totalSize: number;
}

export interface Alert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'performance' | 'error' | 'security' | 'usage';
  message: string;
  timestamp: number;
  data?: any;
  resolved?: boolean;
}

export class PerformanceMonitor {
  private observer: PerformanceObserver | null = null;
  private sessionId: string;
  private metrics: Map<string, any> = new Map();
  private budget: PerformanceBudget;
  private alertCallbacks: ((alert: Alert) => void)[] = [];

  constructor(budget?: Partial<PerformanceBudget>) {
    this.sessionId = this.generateSessionId();
    this.budget = {
      lcp: 2500,
      fid: 100,
      cls: 0.1,
      ttfb: 800,
      bundleSize: 200 * 1024, // 200KB
      imageSize: 500 * 1024,  // 500KB
      totalSize: 1024 * 1024, // 1MB
      ...budget,
    };

    this.initializePerformanceObserver();
    this.startSessionTracking();
  }

  // Core Web Vitals Measurement
  async measureWebVitals(): Promise<WebVitals> {
    return new Promise((resolve) => {
      const vitals: Partial<WebVitals> = {};

      // Use Performance Observer for modern browsers
      if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();

          entries.forEach((entry) => {
            switch (entry.entryType) {
              case 'largest-contentful-paint':
                vitals.lcp = entry.startTime;
                break;
              case 'first-input':
                vitals.fid = entry.processingStart - entry.startTime;
                break;
              case 'layout-shift':
                if (!entry.hadRecentInput) {
                  vitals.cls = (vitals.cls || 0) + entry.value;
                }
                break;
              case 'navigation':
                const nav = entry as PerformanceNavigationTiming;
                vitals.ttfb = nav.responseStart - nav.requestStart;
                vitals.tti = this.calculateTTI();
                vitals.tbt = this.calculateTBT();
                break;
              case 'paint':
                if (entry.name === 'first-contentful-paint') {
                  vitals.fcp = entry.startTime;
                }
                break;
            }
          });

          // Check if all metrics are collected
          if (this.hasAllVitals(vitals)) {
            resolve(vitals as WebVitals);
          }
        });

        observer.observe({ 
          entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift', 'navigation', 'paint']
        });

        // Fallback timeout
        setTimeout(() => {
          resolve(this.getFallbackVitals(vitals));
        }, 10000);

      } else {
        // Fallback for older browsers
        resolve(this.getFallbackVitals(vitals));
      }
    });
  }

  // Mobile-Specific Performance Metrics
  async measureMobileMetrics(): Promise<MobileMetrics> {
    const metrics: MobileMetrics = {
      batteryUsage: await this.getBatteryUsage(),
      memoryUsage: this.getMemoryUsage(),
      networkPayload: this.getNetworkPayload(),
      offlineSyncTime: this.getOfflineSyncTime(),
      cameraInitTime: this.getCameraInitTime(),
      framerate: this.getFrameRate(),
      loadTime: this.getLoadTime(),
      renderTime: this.getRenderTime(),
    };

    this.checkMobileThresholds(metrics);
    return metrics;
  }

  // API Performance Tracking
  trackAPICall(
    endpoint: string,
    method: string,
    startTime: number,
    endTime: number,
    statusCode: number,
    size: number,
    error?: Error
  ): void {
    const metrics: APIMetrics = {
      endpoint,
      method,
      responseTime: endTime - startTime,
      statusCode,
      size,
      timestamp: Date.now(),
      errorType: error?.name,
    };

    this.storeMetric('api', metrics);
    this.checkAPIThresholds(metrics);
  }

  // User Session Tracking
  startSessionTracking(): void {
    const session: UserSession = {
      sessionId: this.sessionId,
      startTime: Date.now(),
      pageViews: 1,
      actions: [],
      device: this.getDeviceInfo(),
      location: this.getCurrentLocation(),
    };

    this.storeMetric('session', session);
    this.trackPageVisibility();
    this.trackUserActions();
  }

  // Real User Monitoring (RUM)
  enableRealUserMonitoring(): void {
    // Track all user interactions
    document.addEventListener('click', this.trackClick.bind(this));
    document.addEventListener('input', this.trackInput.bind(this));
    document.addEventListener('error', this.trackError.bind(this));

    // Track resource loading
    window.addEventListener('load', this.trackPageLoad.bind(this));
    window.addEventListener('beforeunload', this.endSession.bind(this));

    // Track network changes
    if ('connection' in navigator) {
      (navigator as any).connection.addEventListener('change', this.trackConnectionChange.bind(this));
    }

    // Track visibility changes (battery optimization)
    document.addEventListener('visibilitychange', this.trackVisibilityChange.bind(this));
  }

  // Performance Budget Monitoring
  checkPerformanceBudgets(vitals: WebVitals): Alert[] {
    const alerts: Alert[] = [];

    if (vitals.lcp > this.budget.lcp) {
      alerts.push(this.createAlert('critical', 'performance', 
        `LCP ${vitals.lcp}ms exceeds budget ${this.budget.lcp}ms`));
    }

    if (vitals.fid > this.budget.fid) {
      alerts.push(this.createAlert('high', 'performance', 
        `FID ${vitals.fid}ms exceeds budget ${this.budget.fid}ms`));
    }

    if (vitals.cls > this.budget.cls) {
      alerts.push(this.createAlert('high', 'performance', 
        `CLS ${vitals.cls} exceeds budget ${this.budget.cls}`));
    }

    if (vitals.ttfb > this.budget.ttfb) {
      alerts.push(this.createAlert('medium', 'performance', 
        `TTFB ${vitals.ttfb}ms exceeds budget ${this.budget.ttfb}ms`));
    }

    alerts.forEach(alert => this.triggerAlert(alert));
    return alerts;
  }

  // Resource Size Monitoring
  checkResourceBudgets(): Alert[] {
    const alerts: Alert[] = [];
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];

    let totalSize = 0;
    let jsSize = 0;
    let cssSize = 0;
    let imageSize = 0;

    resources.forEach(resource => {
      const size = resource.transferSize || 0;
      totalSize += size;

      if (resource.name.includes('.js')) jsSize += size;
      if (resource.name.includes('.css')) cssSize += size;
      if (resource.name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) imageSize += size;
    });

    if (totalSize > this.budget.totalSize) {
      alerts.push(this.createAlert('high', 'performance', 
        `Total bundle size ${this.formatBytes(totalSize)} exceeds budget ${this.formatBytes(this.budget.totalSize)}`));
    }

    if (imageSize > this.budget.imageSize) {
      alerts.push(this.createAlert('medium', 'performance', 
        `Image size ${this.formatBytes(imageSize)} exceeds budget ${this.formatBytes(this.budget.imageSize)}`));
    }

    alerts.forEach(alert => this.triggerAlert(alert));
    return alerts;
  }

  // Error Tracking and Monitoring
  trackError(error: ErrorEvent | Error): void {
    const errorData = {
      message: error instanceof Error ? error.message : error.message,
      stack: error instanceof Error ? error.stack : error.error?.stack,
      filename: error instanceof ErrorEvent ? error.filename : undefined,
      lineno: error instanceof ErrorEvent ? error.lineno : undefined,
      colno: error instanceof ErrorEvent ? error.colno : undefined,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      sessionId: this.sessionId,
    };

    this.storeMetric('error', errorData);
    
    const alert = this.createAlert('high', 'error', `JavaScript error: ${errorData.message}`);
    this.triggerAlert(alert);
  }

  // Memory Usage Monitoring
  getMemoryUsage(): number {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return memory.usedJSHeapSize / (1024 * 1024); // MB
    }
    return 0;
  }

  // Network Performance
  getNetworkPayload(): number {
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    return resources.reduce((total, resource) => total + (resource.transferSize || 0), 0);
  }

  // Camera Performance Tracking
  trackCameraPerformance(): void {
    let cameraInitStart: number;

    // Override getUserMedia to track camera initialization
    const originalGetUserMedia = navigator.mediaDevices.getUserMedia;
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      cameraInitStart = performance.now();
      
      try {
        const stream = await originalGetUserMedia.call(navigator.mediaDevices, constraints);
        const initTime = performance.now() - cameraInitStart;
        
        this.storeMetric('camera', {
          initTime,
          timestamp: Date.now(),
          constraints,
        });

        if (initTime > 3000) { // 3 second threshold
          const alert = this.createAlert('medium', 'performance', 
            `Camera initialization took ${initTime.toFixed(0)}ms`);
          this.triggerAlert(alert);
        }

        return stream;
      } catch (error) {
        const alert = this.createAlert('high', 'error', 
          `Camera initialization failed: ${error.message}`);
        this.triggerAlert(alert);
        throw error;
      }
    };
  }

  // Data Export and Reporting
  exportMetrics(): { [key: string]: any } {
    const metrics: { [key: string]: any } = {};
    
    this.metrics.forEach((value, key) => {
      metrics[key] = value;
    });

    return {
      sessionId: this.sessionId,
      timestamp: Date.now(),
      metrics,
      budget: this.budget,
    };
  }

  generatePerformanceReport(): PerformanceReport {
    const vitals = this.metrics.get('vitals') || {};
    const mobileMetrics = this.metrics.get('mobile') || {};
    const apiMetrics = this.metrics.get('api') || [];
    const errors = this.metrics.get('error') || [];

    return {
      summary: {
        totalErrors: errors.length,
        avgResponseTime: this.calculateAverageResponseTime(apiMetrics),
        scoreBreakdown: this.calculatePerformanceScore(vitals),
      },
      vitals,
      mobileMetrics,
      budgetStatus: this.getBudgetStatus(vitals),
      recommendations: this.generateRecommendations(vitals, mobileMetrics),
      alerts: this.getAllAlerts(),
    };
  }

  // Alert Management
  onAlert(callback: (alert: Alert) => void): void {
    this.alertCallbacks.push(callback);
  }

  private triggerAlert(alert: Alert): void {
    this.alertCallbacks.forEach(callback => callback(alert));
  }

  // Private Helper Methods
  private initializePerformanceObserver(): void {
    if ('PerformanceObserver' in window) {
      this.observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => this.processPerformanceEntry(entry));
      });

      this.observer.observe({ 
        entryTypes: ['measure', 'navigation', 'resource', 'paint']
      });
    }
  }

  private processPerformanceEntry(entry: PerformanceEntry): void {
    // Store performance entries for analysis
    const entries = this.metrics.get('entries') || [];
    entries.push({
      name: entry.name,
      entryType: entry.entryType,
      startTime: entry.startTime,
      duration: entry.duration,
      timestamp: Date.now(),
    });
    this.storeMetric('entries', entries);
  }

  private async getBatteryUsage(): Promise<number> {
    if ('getBattery' in navigator) {
      try {
        const battery = await (navigator as any).getBattery();
        return 1 - battery.level; // Usage percentage
      } catch (error) {
        return 0;
      }
    }
    return 0;
  }

  private calculateTTI(): number {
    // Simplified TTI calculation
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    return navigation.loadEventEnd;
  }

  private calculateTBT(): number {
    // Total Blocking Time calculation (simplified)
    const longTasks = performance.getEntriesByType('longtask') as PerformanceEntry[];
    return longTasks.reduce((total, task) => {
      return total + Math.max(0, task.duration - 50);
    }, 0);
  }

  private hasAllVitals(vitals: Partial<WebVitals>): boolean {
    return !!(vitals.lcp && vitals.fid !== undefined && vitals.cls !== undefined && vitals.ttfb);
  }

  private getFallbackVitals(vitals: Partial<WebVitals>): WebVitals {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    return {
      lcp: vitals.lcp || navigation.loadEventEnd,
      fid: vitals.fid || 0,
      cls: vitals.cls || 0,
      ttfb: vitals.ttfb || (navigation.responseStart - navigation.requestStart),
      fcp: vitals.fcp || navigation.loadEventStart,
      tti: navigation.loadEventEnd,
      tbt: 0,
    };
  }

  private getDeviceInfo(): DeviceInfo {
    const userAgent = navigator.userAgent;
    const screenSize = { width: window.screen.width, height: window.screen.height };
    
    return {
      type: this.getDeviceType(),
      os: this.getOS(userAgent),
      browser: this.getBrowser(userAgent),
      version: this.getBrowserVersion(userAgent),
      screenSize,
      connectionType: this.getConnectionType(),
      isOnline: navigator.onLine,
    };
  }

  private getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    const width = window.screen.width;
    if (width <= 768) return 'mobile';
    if (width <= 1024) return 'tablet';
    return 'desktop';
  }

  private generateSessionId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  private storeMetric(key: string, value: any): void {
    this.metrics.set(key, value);
  }

  private createAlert(severity: Alert['severity'], type: Alert['type'], message: string, data?: any): Alert {
    return {
      id: Math.random().toString(36).substring(2),
      severity,
      type,
      message,
      timestamp: Date.now(),
      data,
    };
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  // Additional tracking methods would be implemented here...
  private trackClick(event: Event): void { /* Implementation */ }
  private trackInput(event: Event): void { /* Implementation */ }
  private trackPageLoad(): void { /* Implementation */ }
  private endSession(): void { /* Implementation */ }
  private trackConnectionChange(): void { /* Implementation */ }
  private trackVisibilityChange(): void { /* Implementation */ }
  private trackPageVisibility(): void { /* Implementation */ }
  private trackUserActions(): void { /* Implementation */ }
  private getCurrentLocation(): GeolocationCoordinates { return {} as GeolocationCoordinates; }
  private getOfflineSyncTime(): number { return 0; }
  private getCameraInitTime(): number { return 0; }
  private getFrameRate(): number { return 60; }
  private getLoadTime(): number { return performance.now(); }
  private getRenderTime(): number { return performance.now(); }
  private getOS(userAgent: string): string { return 'Unknown'; }
  private getBrowser(userAgent: string): string { return 'Unknown'; }
  private getBrowserVersion(userAgent: string): string { return 'Unknown'; }
  private getConnectionType(): string { return 'unknown'; }
  private checkMobileThresholds(metrics: MobileMetrics): void { /* Implementation */ }
  private checkAPIThresholds(metrics: APIMetrics): void { /* Implementation */ }
  private calculateAverageResponseTime(apiMetrics: APIMetrics[]): number { return 0; }
  private calculatePerformanceScore(vitals: WebVitals): any { return {}; }
  private getBudgetStatus(vitals: WebVitals): any { return {}; }
  private generateRecommendations(vitals: WebVitals, mobile: MobileMetrics): string[] { return []; }
  private getAllAlerts(): Alert[] { return []; }
}

export interface PerformanceReport {
  summary: {
    totalErrors: number;
    avgResponseTime: number;
    scoreBreakdown: any;
  };
  vitals: WebVitals;
  mobileMetrics: MobileMetrics;
  budgetStatus: any;
  recommendations: string[];
  alerts: Alert[];
}