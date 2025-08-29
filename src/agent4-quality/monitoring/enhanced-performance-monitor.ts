/**
 * Enhanced Performance Monitoring Service
 * Tracks and reports on application performance metrics
 */

import { eventBus } from '@/shared/events/event-bus';

export interface PerformanceMetrics {
  pageLoad: PageLoadMetrics;
  runtime: RuntimeMetrics;
  network: NetworkMetrics;
  resources: ResourceMetrics;
  userInteraction: UserInteractionMetrics;
}

export interface PageLoadMetrics {
  navigationStart: number;
  domContentLoaded: number;
  loadComplete: number;
  firstPaint: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  timeToInteractive: number;
  totalBlockingTime: number;
  cumulativeLayoutShift: number;
  firstInputDelay?: number;
}

export interface RuntimeMetrics {
  heapUsed: number;
  heapTotal: number;
  externalMemory: number;
  frameRate: number;
  longTasks: LongTask[];
  errors: ErrorMetric[];
}

export interface LongTask {
  duration: number;
  startTime: number;
  name: string;
}

export interface ErrorMetric {
  message: string;
  stack?: string;
  timestamp: number;
  count: number;
}

export interface NetworkMetrics {
  requests: NetworkRequest[];
  totalRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  totalDataTransferred: number;
  cacheHitRate: number;
}

export interface NetworkRequest {
  url: string;
  method: string;
  duration: number;
  size: number;
  status: number;
  cached: boolean;
}

export interface ResourceMetrics {
  images: ResourceDetail[];
  scripts: ResourceDetail[];
  stylesheets: ResourceDetail[];
  fonts: ResourceDetail[];
  totalSize: number;
  cachedSize: number;
  lazyLoadedCount: number;
}

export interface ResourceDetail {
  url: string;
  size: number;
  loadTime: number;
  cached: boolean;
  lazyLoaded: boolean;
}

export interface UserInteractionMetrics {
  clicks: number;
  scrolls: number;
  touches: number;
  keyPresses: number;
  averageResponseTime: number;
  rageClicks: number;
  deadClicks: number;
}

class EnhancedPerformanceMonitor {
  private metrics: PerformanceMetrics;
  private observers: Map<string, PerformanceObserver> = new Map();
  private isMonitoring = false;
  private errorCounts = new Map<string, number>();

  constructor() {
    this.metrics = this.initializeMetrics();
  }

  private initializeMetrics(): PerformanceMetrics {
    return {
      pageLoad: {
        navigationStart: 0,
        domContentLoaded: 0,
        loadComplete: 0,
        firstPaint: 0,
        firstContentfulPaint: 0,
        largestContentfulPaint: 0,
        timeToInteractive: 0,
        totalBlockingTime: 0,
        cumulativeLayoutShift: 0,
      },
      runtime: {
        heapUsed: 0,
        heapTotal: 0,
        externalMemory: 0,
        frameRate: 60,
        longTasks: [],
        errors: [],
      },
      network: {
        requests: [],
        totalRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        totalDataTransferred: 0,
        cacheHitRate: 0,
      },
      resources: {
        images: [],
        scripts: [],
        stylesheets: [],
        fonts: [],
        totalSize: 0,
        cachedSize: 0,
        lazyLoadedCount: 0,
      },
      userInteraction: {
        clicks: 0,
        scrolls: 0,
        touches: 0,
        keyPresses: 0,
        averageResponseTime: 0,
        rageClicks: 0,
        deadClicks: 0,
      },
    };
  }

  /**
   * Start monitoring performance
   */
  start(): void {
    if (this.isMonitoring || typeof window === 'undefined') return;
    
    this.isMonitoring = true;
    
    // Monitor page load metrics
    this.monitorPageLoad();
    
    // Monitor long tasks
    this.monitorLongTasks();
    
    // Monitor layout shifts
    this.monitorLayoutShifts();
    
    // Monitor largest contentful paint
    this.monitorLCP();
    
    // Monitor first input delay
    this.monitorFID();
    
    // Monitor network activity
    this.monitorNetwork();
    
    // Monitor resource loading
    this.monitorResources();
    
    // Monitor user interactions
    this.monitorUserInteractions();
    
    // Monitor runtime errors
    this.monitorErrors();
    
    // Monitor frame rate
    this.monitorFrameRate();
    
    // Start periodic reporting
    this.startReporting();
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    this.isMonitoring = false;
    
    // Clean up observers
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
    
    // Clear intervals
    if (this.reportingInterval) {
      clearInterval(this.reportingInterval);
    }
  }

  private reportingInterval?: NodeJS.Timeout;

  private startReporting(): void {
    // Report metrics every 30 seconds
    this.reportingInterval = setInterval(() => {
      this.reportMetrics();
    }, 30000);
  }

  private monitorPageLoad(): void {
    if (!window.performance || !window.performance.timing) return;
    
    const timing = window.performance.timing;
    const paintMetrics = window.performance.getEntriesByType('paint');
    
    this.metrics.pageLoad = {
      navigationStart: timing.navigationStart,
      domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
      loadComplete: timing.loadEventEnd - timing.navigationStart,
      firstPaint: paintMetrics.find(m => m.name === 'first-paint')?.startTime || 0,
      firstContentfulPaint: paintMetrics.find(m => m.name === 'first-contentful-paint')?.startTime || 0,
      largestContentfulPaint: 0,
      timeToInteractive: 0,
      totalBlockingTime: 0,
      cumulativeLayoutShift: 0,
    };
  }

  private monitorLongTasks(): void {
    if (!('PerformanceObserver' in window)) return;
    
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) {
            this.metrics.runtime.longTasks.push({
              duration: entry.duration,
              startTime: entry.startTime,
              name: entry.name,
            });
            
            // Update total blocking time
            this.metrics.pageLoad.totalBlockingTime += Math.max(0, entry.duration - 50);
          }
        }
      });
      
      observer.observe({ entryTypes: ['longtask'] });
      this.observers.set('longtask', observer);
    } catch (e) {
      console.warn('Long task monitoring not supported');
    }
  }

  private monitorLayoutShifts(): void {
    if (!('PerformanceObserver' in window)) return;
    
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            this.metrics.pageLoad.cumulativeLayoutShift += (entry as any).value;
          }
        }
      });
      
      observer.observe({ entryTypes: ['layout-shift'] });
      this.observers.set('layout-shift', observer);
    } catch (e) {
      console.warn('Layout shift monitoring not supported');
    }
  }

  private monitorLCP(): void {
    if (!('PerformanceObserver' in window)) return;
    
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.metrics.pageLoad.largestContentfulPaint = lastEntry.startTime;
      });
      
      observer.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.set('lcp', observer);
    } catch (e) {
      console.warn('LCP monitoring not supported');
    }
  }

  private monitorFID(): void {
    if (!('PerformanceObserver' in window)) return;
    
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-input') {
            this.metrics.pageLoad.firstInputDelay = (entry as any).processingStart - entry.startTime;
          }
        }
      });
      
      observer.observe({ entryTypes: ['first-input'] });
      this.observers.set('fid', observer);
    } catch (e) {
      console.warn('FID monitoring not supported');
    }
  }

  private monitorNetwork(): void {
    if (!('PerformanceObserver' in window)) return;
    
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const resourceEntry = entry as PerformanceResourceTiming;
          
          const request: NetworkRequest = {
            url: entry.name,
            method: 'GET',
            duration: resourceEntry.responseEnd - resourceEntry.startTime,
            size: resourceEntry.transferSize || 0,
            status: 200, // Can't get actual status from Performance API
            cached: resourceEntry.transferSize === 0,
          };
          
          this.metrics.network.requests.push(request);
          this.metrics.network.totalRequests++;
          this.metrics.network.totalDataTransferred += request.size;
          
          if (request.cached) {
            this.metrics.network.cacheHitRate = 
              (this.metrics.network.requests.filter(r => r.cached).length / 
               this.metrics.network.totalRequests) * 100;
          }
        }
      });
      
      observer.observe({ entryTypes: ['resource'] });
      this.observers.set('resource', observer);
    } catch (e) {
      console.warn('Network monitoring not supported');
    }
  }

  private monitorResources(): void {
    if (!window.performance) return;
    
    const resources = window.performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    
    resources.forEach(resource => {
      const detail: ResourceDetail = {
        url: resource.name,
        size: resource.transferSize || 0,
        loadTime: resource.responseEnd - resource.startTime,
        cached: resource.transferSize === 0,
        lazyLoaded: resource.name.includes('lazy') || resource.startTime > 3000,
      };
      
      // Categorize resource
      if (resource.initiatorType === 'img') {
        this.metrics.resources.images.push(detail);
      } else if (resource.initiatorType === 'script') {
        this.metrics.resources.scripts.push(detail);
      } else if (resource.initiatorType === 'css' || resource.initiatorType === 'link') {
        this.metrics.resources.stylesheets.push(detail);
      } else if (resource.initiatorType === 'font') {
        this.metrics.resources.fonts.push(detail);
      }
      
      this.metrics.resources.totalSize += detail.size;
      if (detail.cached) {
        this.metrics.resources.cachedSize += detail.size;
      }
      if (detail.lazyLoaded) {
        this.metrics.resources.lazyLoadedCount++;
      }
    });
  }

  private monitorUserInteractions(): void {
    let lastClickTime = 0;
    let clickCount = 0;
    
    // Monitor clicks
    document.addEventListener('click', (e) => {
      this.metrics.userInteraction.clicks++;
      
      // Detect rage clicks (3+ clicks within 500ms)
      const now = Date.now();
      if (now - lastClickTime < 500) {
        clickCount++;
        if (clickCount >= 3) {
          this.metrics.userInteraction.rageClicks++;
        }
      } else {
        clickCount = 1;
      }
      lastClickTime = now;
      
      // Detect dead clicks (clicks with no effect)
      const target = e.target as HTMLElement;
      if (!target.onclick && !target.href && target.tagName !== 'BUTTON' && target.tagName !== 'A') {
        this.metrics.userInteraction.deadClicks++;
      }
    });
    
    // Monitor scrolls
    let scrollTimeout: NodeJS.Timeout;
    document.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        this.metrics.userInteraction.scrolls++;
      }, 100);
    });
    
    // Monitor touches
    document.addEventListener('touchstart', () => {
      this.metrics.userInteraction.touches++;
    });
    
    // Monitor key presses
    document.addEventListener('keydown', () => {
      this.metrics.userInteraction.keyPresses++;
    });
  }

  private monitorErrors(): void {
    window.addEventListener('error', (event) => {
      const errorKey = event.message;
      const count = (this.errorCounts.get(errorKey) || 0) + 1;
      this.errorCounts.set(errorKey, count);
      
      const existingError = this.metrics.runtime.errors.find(e => e.message === event.message);
      if (existingError) {
        existingError.count++;
      } else {
        this.metrics.runtime.errors.push({
          message: event.message,
          stack: event.error?.stack,
          timestamp: Date.now(),
          count: 1,
        });
      }
      
      // Broadcast critical errors
      if (count === 1 || count % 10 === 0) {
        eventBus.broadcast('performance:error', {
          message: event.message,
          count,
        });
      }
    });
    
    window.addEventListener('unhandledrejection', (event) => {
      this.metrics.runtime.errors.push({
        message: `Unhandled Promise Rejection: ${event.reason}`,
        timestamp: Date.now(),
        count: 1,
      });
    });
  }

  private monitorFrameRate(): void {
    let lastTime = performance.now();
    let frames = 0;
    
    const measureFrameRate = () => {
      if (!this.isMonitoring) return;
      
      frames++;
      const currentTime = performance.now();
      
      if (currentTime >= lastTime + 1000) {
        this.metrics.runtime.frameRate = Math.round((frames * 1000) / (currentTime - lastTime));
        frames = 0;
        lastTime = currentTime;
      }
      
      requestAnimationFrame(measureFrameRate);
    };
    
    requestAnimationFrame(measureFrameRate);
  }

  /**
   * Get current metrics
   */
  getMetrics(): PerformanceMetrics {
    // Update memory metrics if available
    if ((performance as any).memory) {
      this.metrics.runtime.heapUsed = (performance as any).memory.usedJSHeapSize;
      this.metrics.runtime.heapTotal = (performance as any).memory.totalJSHeapSize;
      this.metrics.runtime.externalMemory = (performance as any).memory.jsHeapSizeLimit;
    }
    
    // Calculate average response time
    if (this.metrics.network.requests.length > 0) {
      this.metrics.network.averageResponseTime = 
        this.metrics.network.requests.reduce((sum, r) => sum + r.duration, 0) / 
        this.metrics.network.requests.length;
    }
    
    return this.metrics;
  }

  /**
   * Report metrics
   */
  private reportMetrics(): void {
    const metrics = this.getMetrics();
    
    // Check for performance issues
    const issues = this.detectPerformanceIssues(metrics);
    
    if (issues.length > 0) {
      eventBus.broadcast('performance:issues', { issues, metrics });
    }
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Performance Metrics:', metrics);
      if (issues.length > 0) {
        console.warn('Performance Issues Detected:', issues);
      }
    }
  }

  /**
   * Detect performance issues
   */
  private detectPerformanceIssues(metrics: PerformanceMetrics): string[] {
    const issues: string[] = [];
    
    // Page load issues
    if (metrics.pageLoad.largestContentfulPaint > 2500) {
      issues.push(`LCP is ${metrics.pageLoad.largestContentfulPaint}ms (target: <2500ms)`);
    }
    
    if (metrics.pageLoad.firstInputDelay && metrics.pageLoad.firstInputDelay > 100) {
      issues.push(`FID is ${metrics.pageLoad.firstInputDelay}ms (target: <100ms)`);
    }
    
    if (metrics.pageLoad.cumulativeLayoutShift > 0.1) {
      issues.push(`CLS is ${metrics.pageLoad.cumulativeLayoutShift} (target: <0.1)`);
    }
    
    // Runtime issues
    if (metrics.runtime.frameRate < 30) {
      issues.push(`Low frame rate: ${metrics.runtime.frameRate} FPS`);
    }
    
    if (metrics.runtime.longTasks.length > 5) {
      issues.push(`${metrics.runtime.longTasks.length} long tasks detected`);
    }
    
    if (metrics.runtime.errors.length > 0) {
      issues.push(`${metrics.runtime.errors.length} JavaScript errors detected`);
    }
    
    // Network issues
    if (metrics.network.averageResponseTime > 1000) {
      issues.push(`High average response time: ${metrics.network.averageResponseTime}ms`);
    }
    
    if (metrics.network.cacheHitRate < 50) {
      issues.push(`Low cache hit rate: ${metrics.network.cacheHitRate.toFixed(1)}%`);
    }
    
    // User interaction issues
    if (metrics.userInteraction.rageClicks > 0) {
      issues.push(`${metrics.userInteraction.rageClicks} rage clicks detected`);
    }
    
    if (metrics.userInteraction.deadClicks > 10) {
      issues.push(`${metrics.userInteraction.deadClicks} dead clicks detected`);
    }
    
    return issues;
  }

  /**
   * Get performance score
   */
  getPerformanceScore(): number {
    const metrics = this.getMetrics();
    let score = 100;
    
    // Deduct points for performance issues
    if (metrics.pageLoad.largestContentfulPaint > 2500) score -= 10;
    if (metrics.pageLoad.largestContentfulPaint > 4000) score -= 10;
    
    if (metrics.pageLoad.firstInputDelay && metrics.pageLoad.firstInputDelay > 100) score -= 10;
    if (metrics.pageLoad.firstInputDelay && metrics.pageLoad.firstInputDelay > 300) score -= 10;
    
    if (metrics.pageLoad.cumulativeLayoutShift > 0.1) score -= 10;
    if (metrics.pageLoad.cumulativeLayoutShift > 0.25) score -= 10;
    
    if (metrics.runtime.frameRate < 30) score -= 15;
    if (metrics.runtime.errors.length > 0) score -= 5;
    if (metrics.network.averageResponseTime > 1000) score -= 10;
    
    return Math.max(0, score);
  }
}

// Create singleton instance
export const enhancedPerformanceMonitor = new EnhancedPerformanceMonitor();

// Auto-start in browser
if (typeof window !== 'undefined') {
  enhancedPerformanceMonitor.start();
}