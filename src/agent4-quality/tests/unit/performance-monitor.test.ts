import { PerformanceMonitor, WebVitals, MobileMetrics } from '../../monitoring/performance-monitor';

// Mock performance APIs
const mockPerformanceObserver = jest.fn();
const mockPerformanceEntries = jest.fn();

global.PerformanceObserver = mockPerformanceObserver;

Object.defineProperty(global, 'performance', {
  writable: true,
  value: {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByType: mockPerformanceEntries,
    getEntriesByName: jest.fn(() => []),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn(),
  },
});

// Mock navigator APIs
Object.defineProperty(global.navigator, 'getBattery', {
  writable: true,
  value: jest.fn(() => Promise.resolve({
    level: 0.85,
    charging: false,
    chargingTime: Infinity,
    dischargingTime: 7200
  }))
});

Object.defineProperty(global.navigator, 'connection', {
  writable: true,
  value: {
    effectiveType: '4g',
    downlink: 10,
    rtt: 100
  }
});

describe('PerformanceMonitor', () => {
  let performanceMonitor: PerformanceMonitor;
  
  beforeEach(() => {
    jest.clearAllMocks();
    performanceMonitor = new PerformanceMonitor({
      lcp: 2000,
      fid: 80,
      cls: 0.08,
      ttfb: 600,
      bundleSize: 150 * 1024,
    });
  });

  describe('Initialization', () => {
    test('should initialize with default performance budget', () => {
      const monitor = new PerformanceMonitor();
      expect(monitor).toBeDefined();
    });

    test('should initialize with custom performance budget', () => {
      const customBudget = {
        lcp: 3000,
        fid: 120,
        cls: 0.15,
      };
      
      const monitor = new PerformanceMonitor(customBudget);
      expect(monitor).toBeDefined();
    });

    test('should generate unique session IDs', () => {
      const monitor1 = new PerformanceMonitor();
      const monitor2 = new PerformanceMonitor();
      
      expect((monitor1 as any).sessionId).not.toBe((monitor2 as any).sessionId);
    });
  });

  describe('Web Vitals Measurement', () => {
    test('should measure web vitals with PerformanceObserver', async () => {
      // Mock PerformanceObserver callback
      const mockCallback = jest.fn();
      mockPerformanceObserver.mockImplementation((callback) => {
        mockCallback.mockImplementation(callback);
        return {
          observe: jest.fn((config) => {
            // Simulate performance entries
            setTimeout(() => {
              callback({
                getEntries: () => [
                  {
                    entryType: 'largest-contentful-paint',
                    startTime: 1500,
                    name: 'largest-contentful-paint'
                  },
                  {
                    entryType: 'first-input', 
                    startTime: 100,
                    processingStart: 150,
                    name: 'first-input'
                  },
                  {
                    entryType: 'layout-shift',
                    value: 0.05,
                    hadRecentInput: false,
                    name: 'layout-shift'
                  },
                  {
                    entryType: 'paint',
                    startTime: 800,
                    name: 'first-contentful-paint'
                  }
                ]
              });
            }, 100);
          }),
          disconnect: jest.fn()
        };
      });

      // Mock navigation timing
      mockPerformanceEntries.mockReturnValue([{
        responseStart: 200,
        requestStart: 100,
        loadEventEnd: 2000,
        loadEventStart: 1800
      }]);

      const vitals = await performanceMonitor.measureWebVitals();
      
      expect(vitals.lcp).toBe(1500);
      expect(vitals.fid).toBe(50); // processingStart - startTime
      expect(vitals.cls).toBe(0.05);
      expect(vitals.ttfb).toBe(100); // responseStart - requestStart
      expect(vitals.fcp).toBe(800);
    });

    test('should provide fallback vitals for older browsers', async () => {
      // Disable PerformanceObserver
      delete (global as any).PerformanceObserver;
      
      mockPerformanceEntries.mockReturnValue([{
        responseStart: 200,
        requestStart: 100,
        loadEventEnd: 2000,
        loadEventStart: 1800
      }]);

      const monitor = new PerformanceMonitor();
      const vitals = await monitor.measureWebVitals();
      
      expect(vitals.lcp).toBe(2000); // loadEventEnd
      expect(vitals.fid).toBe(0);
      expect(vitals.cls).toBe(0);
      expect(vitals.ttfb).toBe(100);
      
      // Restore PerformanceObserver
      (global as any).PerformanceObserver = mockPerformanceObserver;
    });

    test('should timeout if vitals take too long', async () => {
      mockPerformanceObserver.mockImplementation(() => ({
        observe: jest.fn(),
        disconnect: jest.fn()
      }));

      const vitals = await performanceMonitor.measureWebVitals();
      
      // Should return fallback values
      expect(typeof vitals.lcp).toBe('number');
      expect(typeof vitals.fid).toBe('number');
    });
  });

  describe('Mobile Metrics', () => {
    test('should measure mobile-specific metrics', async () => {
      const metrics = await performanceMonitor.measureMobileMetrics();
      
      expect(metrics).toHaveProperty('batteryUsage');
      expect(metrics).toHaveProperty('memoryUsage');
      expect(metrics).toHaveProperty('networkPayload');
      expect(metrics).toHaveProperty('offlineSyncTime');
      expect(metrics).toHaveProperty('cameraInitTime');
      expect(metrics).toHaveProperty('framerate');
      expect(metrics).toHaveProperty('loadTime');
      expect(metrics).toHaveProperty('renderTime');
      
      expect(typeof metrics.batteryUsage).toBe('number');
      expect(typeof metrics.memoryUsage).toBe('number');
    });

    test('should handle missing battery API', async () => {
      delete (global.navigator as any).getBattery;
      
      const metrics = await performanceMonitor.measureMobileMetrics();
      expect(metrics.batteryUsage).toBe(0);
      
      // Restore battery API
      (global.navigator as any).getBattery = jest.fn(() => Promise.resolve({
        level: 0.85
      }));
    });

    test('should handle missing memory API', async () => {
      delete (global.performance as any).memory;
      
      const metrics = await performanceMonitor.measureMobileMetrics();
      expect(metrics.memoryUsage).toBe(0);
    });
  });

  describe('API Performance Tracking', () => {
    test('should track API call metrics', () => {
      const startTime = Date.now();
      const endTime = startTime + 250;
      
      performanceMonitor.trackAPICall(
        '/api/products',
        'GET',
        startTime,
        endTime,
        200,
        1024
      );

      const metrics = performanceMonitor.exportMetrics();
      expect(metrics.metrics.api).toBeDefined();
    });

    test('should track API errors', () => {
      const startTime = Date.now();
      const endTime = startTime + 500;
      const error = new Error('API Error');
      
      performanceMonitor.trackAPICall(
        '/api/products',
        'POST',
        startTime,
        endTime,
        500,
        0,
        error
      );

      const metrics = performanceMonitor.exportMetrics();
      expect(metrics.metrics.api[0].errorType).toBe('Error');
    });
  });

  describe('Performance Budgets', () => {
    test('should check performance against budgets', () => {
      const vitals: WebVitals = {
        lcp: 2500, // Over budget (2000)
        fid: 60,   // Under budget (80)
        cls: 0.12, // Over budget (0.08)
        ttfb: 400, // Under budget (600)
        fcp: 1000,
        tti: 3000,
        tbt: 200
      };

      const alerts = performanceMonitor.checkPerformanceBudgets(vitals);
      
      expect(alerts).toHaveLength(2); // LCP and CLS violations
      expect(alerts[0].severity).toBe('critical');
      expect(alerts[0].message).toContain('LCP');
      expect(alerts[1].severity).toBe('high');
      expect(alerts[1].message).toContain('CLS');
    });

    test('should pass when all metrics are within budget', () => {
      const vitals: WebVitals = {
        lcp: 1800, // Under budget
        fid: 70,   // Under budget
        cls: 0.05, // Under budget
        ttfb: 500, // Under budget
        fcp: 800,
        tti: 2500,
        tbt: 150
      };

      const alerts = performanceMonitor.checkPerformanceBudgets(vitals);
      expect(alerts).toHaveLength(0);
    });
  });

  describe('Resource Budget Monitoring', () => {
    test('should check resource sizes against budgets', () => {
      // Mock resource entries
      mockPerformanceEntries.mockReturnValue([
        { name: 'script.js', transferSize: 100 * 1024 },
        { name: 'styles.css', transferSize: 30 * 1024 },
        { name: 'image.jpg', transferSize: 200 * 1024 },
        { name: 'app.js', transferSize: 80 * 1024 }
      ]);

      const alerts = performanceMonitor.checkResourceBudgets();
      
      expect(Array.isArray(alerts)).toBe(true);
      // Should alert if total size exceeds budget
      if (alerts.length > 0) {
        expect(alerts[0].type).toBe('performance');
      }
    });
  });

  describe('Error Tracking', () => {
    test('should track JavaScript errors', () => {
      const error = new Error('Test error');
      
      performanceMonitor.trackError(error);
      
      const metrics = performanceMonitor.exportMetrics();
      expect(metrics.metrics.error).toBeDefined();
      expect(metrics.metrics.error.message).toBe('Test error');
    });

    test('should track ErrorEvent objects', () => {
      const errorEvent = {
        message: 'Script error',
        filename: 'app.js',
        lineno: 42,
        colno: 10,
        error: new Error('Script error')
      } as ErrorEvent;
      
      performanceMonitor.trackError(errorEvent);
      
      const metrics = performanceMonitor.exportMetrics();
      expect(metrics.metrics.error.filename).toBe('app.js');
      expect(metrics.metrics.error.lineno).toBe(42);
    });
  });

  describe('Alert System', () => {
    test('should trigger alert callbacks', () => {
      const alertCallback = jest.fn();
      performanceMonitor.onAlert(alertCallback);
      
      // Trigger an alert by exceeding performance budget
      const vitals: WebVitals = {
        lcp: 5000, // Way over budget
        fid: 200,  // Over budget
        cls: 0.5,  // Way over budget
        ttfb: 2000,// Over budget
        fcp: 1000,
        tti: 3000,
        tbt: 200
      };

      performanceMonitor.checkPerformanceBudgets(vitals);
      
      expect(alertCallback).toHaveBeenCalled();
      expect(alertCallback.mock.calls.length).toBeGreaterThan(0);
    });

    test('should handle multiple alert callbacks', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      performanceMonitor.onAlert(callback1);
      performanceMonitor.onAlert(callback2);
      
      const vitals: WebVitals = {
        lcp: 5000,
        fid: 50,
        cls: 0.05,
        ttfb: 500,
        fcp: 1000,
        tti: 3000,
        tbt: 200
      };

      performanceMonitor.checkPerformanceBudgets(vitals);
      
      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });
  });

  describe('Memory Management', () => {
    test('should get memory usage when available', () => {
      // Mock performance.memory
      (global.performance as any).memory = {
        usedJSHeapSize: 50 * 1024 * 1024, // 50MB
        totalJSHeapSize: 100 * 1024 * 1024,
        jsHeapSizeLimit: 2000 * 1024 * 1024
      };

      const memoryUsage = performanceMonitor.getMemoryUsage();
      expect(memoryUsage).toBe(50); // 50MB
    });

    test('should return 0 when memory API unavailable', () => {
      delete (global.performance as any).memory;
      
      const memoryUsage = performanceMonitor.getMemoryUsage();
      expect(memoryUsage).toBe(0);
    });
  });

  describe('Network Performance', () => {
    test('should calculate network payload', () => {
      mockPerformanceEntries.mockReturnValue([
        { transferSize: 1000 },
        { transferSize: 2000 },
        { transferSize: 500 }
      ]);

      const payload = performanceMonitor.getNetworkPayload();
      expect(payload).toBe(3500);
    });

    test('should handle missing transferSize', () => {
      mockPerformanceEntries.mockReturnValue([
        { transferSize: undefined },
        { transferSize: 1000 },
        {}
      ]);

      const payload = performanceMonitor.getNetworkPayload();
      expect(payload).toBe(1000);
    });
  });

  describe('Data Export', () => {
    test('should export all metrics', () => {
      const exported = performanceMonitor.exportMetrics();
      
      expect(exported).toHaveProperty('sessionId');
      expect(exported).toHaveProperty('timestamp');
      expect(exported).toHaveProperty('metrics');
      expect(exported).toHaveProperty('budget');
      
      expect(typeof exported.sessionId).toBe('string');
      expect(typeof exported.timestamp).toBe('number');
      expect(typeof exported.metrics).toBe('object');
    });

    test('should generate performance report', () => {
      const report = performanceMonitor.generatePerformanceReport();
      
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('vitals');
      expect(report).toHaveProperty('mobileMetrics');
      expect(report).toHaveProperty('budgetStatus');
      expect(report).toHaveProperty('recommendations');
      expect(report).toHaveProperty('alerts');
    });
  });

  describe('Camera Performance Tracking', () => {
    test('should track camera initialization time', () => {
      // Mock getUserMedia
      const mockGetUserMedia = jest.fn().mockResolvedValue({});
      Object.defineProperty(global.navigator, 'mediaDevices', {
        writable: true,
        value: { getUserMedia: mockGetUserMedia }
      });

      performanceMonitor.trackCameraPerformance();
      
      // Verify that getUserMedia is wrapped
      expect(global.navigator.mediaDevices.getUserMedia).toBeDefined();
      expect(global.navigator.mediaDevices.getUserMedia).not.toBe(mockGetUserMedia);
    });

    test('should alert on slow camera initialization', async () => {
      const alertCallback = jest.fn();
      performanceMonitor.onAlert(alertCallback);

      // Mock slow getUserMedia (over 3 seconds)
      const slowGetUserMedia = jest.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 3500));
        return {};
      });

      Object.defineProperty(global.navigator, 'mediaDevices', {
        writable: true,
        value: { getUserMedia: slowGetUserMedia }
      });

      performanceMonitor.trackCameraPerformance();
      
      // Trigger camera request
      await global.navigator.mediaDevices.getUserMedia({ video: true });
      
      expect(alertCallback).toHaveBeenCalled();
    });
  });
});