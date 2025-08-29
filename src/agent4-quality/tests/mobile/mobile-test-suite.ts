import { Page, Browser, BrowserContext, expect } from '@playwright/test';

export interface DeviceConfig {
  name: string;
  viewport: { width: number; height: number };
  userAgent?: string;
  deviceScaleFactor?: number;
  hasTouch?: boolean;
}

export interface TouchTarget {
  selector: string;
  expectedMinSize: number;
}

export interface WebVitals {
  fcp: number; // First Contentful Paint
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  ttfb: number; // Time to First Byte
}

export interface MobileMetrics {
  batteryUsage: number;
  memoryUsage: number;
  networkPayload: number;
  offlineSyncTime: number;
  cameraInitTime: number;
}

export class MobileTestSuite {
  devices: DeviceConfig[] = [
    { 
      name: 'iPhone SE', 
      viewport: { width: 375, height: 667 },
      deviceScaleFactor: 2,
      hasTouch: true
    },
    { 
      name: 'iPhone 14', 
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
      hasTouch: true
    },
    { 
      name: 'Galaxy S22', 
      viewport: { width: 360, height: 800 },
      deviceScaleFactor: 3,
      hasTouch: true
    },
    { 
      name: 'iPad Air', 
      viewport: { width: 768, height: 1024 },
      deviceScaleFactor: 2,
      hasTouch: true
    },
  ];

  constructor(private page: Page) {}

  // Core mobile test validations
  async validateTouchTargets(): Promise<void> {
    const touchTargets: TouchTarget[] = [
      { selector: '[data-testid="scan-button"]', expectedMinSize: 48 },
      { selector: '[data-testid="quantity-increase"]', expectedMinSize: 44 },
      { selector: '[data-testid="quantity-decrease"]', expectedMinSize: 44 },
      { selector: '[data-testid="submit-count"]', expectedMinSize: 48 },
      { selector: '[data-testid="menu-toggle"]', expectedMinSize: 48 },
    ];

    for (const target of touchTargets) {
      const element = this.page.locator(target.selector);
      await expect(element).toBeVisible();
      
      const box = await element.boundingBox();
      if (box) {
        expect(box.width).toBeGreaterThanOrEqual(target.expectedMinSize);
        expect(box.height).toBeGreaterThanOrEqual(target.expectedMinSize);
      }
    }
  }

  async testSwipeActions(): Promise<void> {
    // Test horizontal swipe for product navigation
    const productCard = this.page.locator('[data-testid="product-card"]').first();
    await expect(productCard).toBeVisible();

    const box = await productCard.boundingBox();
    if (box) {
      // Swipe left
      await this.page.mouse.move(box.x + box.width - 10, box.y + box.height / 2);
      await this.page.mouse.down();
      await this.page.mouse.move(box.x + 10, box.y + box.height / 2);
      await this.page.mouse.up();

      // Verify swipe action result
      await expect(this.page.locator('[data-testid="product-actions"]')).toBeVisible();
    }
  }

  async testLongPress(): Promise<void> {
    const productCard = this.page.locator('[data-testid="product-card"]').first();
    await expect(productCard).toBeVisible();

    // Long press (hold for 800ms)
    await productCard.hover();
    await this.page.mouse.down();
    await this.page.waitForTimeout(800);
    await this.page.mouse.up();

    // Verify context menu appears
    await expect(this.page.locator('[data-testid="context-menu"]')).toBeVisible();
  }

  async testPinchZoom(): Promise<void> {
    // Simulate pinch zoom on product image
    const productImage = this.page.locator('[data-testid="product-image"]').first();
    await expect(productImage).toBeVisible();

    const box = await productImage.boundingBox();
    if (box) {
      const centerX = box.x + box.width / 2;
      const centerY = box.y + box.height / 2;

      // Start pinch gesture (two fingers)
      await this.page.touchscreen.tap(centerX - 50, centerY);
      await this.page.touchscreen.tap(centerX + 50, centerY);
      
      // Zoom gesture simulation via JavaScript
      await this.page.evaluate(() => {
        const img = document.querySelector('[data-testid="product-image"]') as HTMLElement;
        if (img) {
          const event = new CustomEvent('zoom', { detail: { scale: 1.5 } });
          img.dispatchEvent(event);
        }
      });
    }
  }

  async testThumbReachability(): Promise<void> {
    // Test that critical actions are reachable with thumb on larger screens
    const scanButton = this.page.locator('[data-testid="scan-button"]');
    const submitButton = this.page.locator('[data-testid="submit-count"]');
    
    const scanBox = await scanButton.boundingBox();
    const submitBox = await submitButton.boundingBox();
    
    if (scanBox && submitBox) {
      // On phones, critical buttons should be in bottom 2/3 of screen
      const viewport = this.page.viewportSize();
      if (viewport && viewport.height > 600) {
        const thumbReachableArea = viewport.height * 0.67; // Bottom 2/3
        
        expect(scanBox.y).toBeLessThanOrEqual(thumbReachableArea);
        expect(submitBox.y).toBeLessThanOrEqual(thumbReachableArea);
      }
    }
  }

  async testCameraFlow(): Promise<void> {
    await this.testPermissionPrompt();
    await this.testPermissionDenied();
    await this.testCameraInitialization();
    await this.testBarcodeScanning();
  }

  async testPermissionPrompt(): Promise<void> {
    // Navigate to scanning page
    await this.page.goto('/scan');
    
    // Click scan button to trigger permission request
    await this.page.click('[data-testid="scan-button"]');
    
    // In real tests, we'd grant permission via browser context
    // Here we test the UI response to permission request
    await expect(this.page.locator('[data-testid="camera-permission-prompt"]')).toBeVisible();
  }

  async testPermissionDenied(): Promise<void> {
    // Simulate permission denied
    await this.page.context().clearPermissions();
    await this.page.goto('/scan');
    await this.page.click('[data-testid="scan-button"]');
    
    // Should show fallback UI
    await expect(this.page.locator('[data-testid="manual-entry-fallback"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="permission-help-text"]')).toBeVisible();
  }

  async testCameraInitialization(): Promise<void> {
    // Grant camera permission
    await this.page.context().grantPermissions(['camera']);
    
    const startTime = Date.now();
    
    await this.page.goto('/scan');
    await this.page.click('[data-testid="scan-button"]');
    
    // Wait for camera to initialize
    await expect(this.page.locator('[data-testid="camera-view"]')).toBeVisible();
    
    const initTime = Date.now() - startTime;
    expect(initTime).toBeLessThan(3000); // Should initialize within 3 seconds
  }

  async testBarcodeScanning(): Promise<void> {
    // Grant permissions
    await this.page.context().grantPermissions(['camera']);
    
    await this.page.goto('/scan');
    await this.page.click('[data-testid="scan-button"]');
    
    // Wait for camera view
    await expect(this.page.locator('[data-testid="camera-view"]')).toBeVisible();
    
    // Simulate barcode detection
    await this.page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('barcode-detected', {
        detail: { barcode: '1234567890123', format: 'EAN13' }
      }));
    });
    
    // Verify barcode was processed
    await expect(this.page.locator('[data-testid="scanned-barcode"]')).toContainText('1234567890123');
    await expect(this.page.locator('[data-testid="product-info"]')).toBeVisible();
  }

  async testOfflineMode(): Promise<void> {
    await this.goOffline();
    await this.testOfflineScanning();
    await this.testOfflineCount();
    await this.testQueueing();
    await this.goOnline();
    await this.testSyncQueue();
  }

  async goOffline(): Promise<void> {
    await this.page.context().setOffline(true);
    
    // Verify offline indicator appears
    await expect(this.page.locator('[data-testid="offline-indicator"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="offline-indicator"]')).toContainText('Offline');
  }

  async goOnline(): Promise<void> {
    await this.page.context().setOffline(false);
    
    // Wait for online status
    await this.page.waitForTimeout(1000);
    await expect(this.page.locator('[data-testid="offline-indicator"]')).not.toBeVisible();
  }

  async testOfflineScanning(): Promise<void> {
    // Ensure we're offline
    await this.page.context().setOffline(true);
    
    await this.page.goto('/scan');
    await this.page.click('[data-testid="scan-button"]');
    
    // Camera should still work offline
    await expect(this.page.locator('[data-testid="camera-view"]')).toBeVisible();
    
    // Simulate scan
    await this.page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('barcode-detected', {
        detail: { barcode: '9876543210987', format: 'EAN13' }
      }));
    });
    
    // Should show cached product data or allow manual entry
    await expect(
      this.page.locator('[data-testid="offline-product-entry"]')
    ).toBeVisible();
  }

  async testOfflineCount(): Promise<void> {
    // Simulate counting while offline
    await this.page.fill('[data-testid="quantity-input"]', '25');
    await this.page.fill('[data-testid="location-input"]', 'A-1-B');
    await this.page.fill('[data-testid="notes-input"]', 'Offline count test');
    
    await this.page.click('[data-testid="submit-count"]');
    
    // Should show queued status
    await expect(this.page.locator('[data-testid="count-queued"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="queue-count"]')).toContainText('1 pending');
  }

  async testQueueing(): Promise<void> {
    // Add multiple counts to queue
    for (let i = 0; i < 3; i++) {
      await this.page.evaluate((index) => {
        window.dispatchEvent(new CustomEvent('barcode-detected', {
          detail: { barcode: `12345678901${index}${index}`, format: 'EAN13' }
        }));
      }, i);
      
      await this.page.fill('[data-testid="quantity-input"]', `${10 + i}`);
      await this.page.click('[data-testid="submit-count"]');
    }
    
    // Verify queue count
    await expect(this.page.locator('[data-testid="queue-count"]')).toContainText('4 pending');
  }

  async testSyncQueue(): Promise<void> {
    // Go online
    await this.page.context().setOffline(false);
    
    // Wait for sync to start
    await expect(this.page.locator('[data-testid="sync-indicator"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="sync-indicator"]')).toContainText('Syncing');
    
    // Wait for sync to complete (with timeout)
    await expect(this.page.locator('[data-testid="queue-count"]')).toContainText('0 pending', {
      timeout: 10000
    });
    
    // Verify sync success message
    await expect(this.page.locator('[data-testid="sync-success"]')).toBeVisible();
  }

  async testMobilePerformance(): Promise<WebVitals> {
    // Throttle to 3G
    await this.throttleNetwork('3G');
    
    const startTime = Date.now();
    
    // Navigate and measure
    await this.page.goto('/dashboard');
    
    const metrics = await this.collectMetrics();
    
    // Validate performance budgets
    expect(metrics.fcp).toBeLessThan(2000);  // 2s for 3G
    expect(metrics.lcp).toBeLessThan(4000);  // 4s for 3G  
    expect(metrics.cls).toBeLessThan(0.1);   // Good CLS
    expect(metrics.ttfb).toBeLessThan(1000); // 1s TTFB
    
    return metrics;
  }

  async throttleNetwork(connection: '3G' | '4G' | 'slow-3G'): Promise<void> {
    const profiles = {
      'slow-3G': { download: 50000, upload: 50000, latency: 2000 },
      '3G': { download: 1600000, upload: 750000, latency: 150 },
      '4G': { download: 12000000, upload: 12000000, latency: 20 },
    };
    
    const profile = profiles[connection];
    await this.page.context().route('**/*', async (route) => {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, profile.latency));
      await route.continue();
    });
  }

  async collectMetrics(): Promise<WebVitals> {
    const metrics = await this.page.evaluate(() => {
      return new Promise<WebVitals>((resolve) => {
        // Use Performance Observer API
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          
          resolve({
            fcp: entries.find(e => e.name === 'first-contentful-paint')?.startTime || 0,
            lcp: entries.find(e => e.entryType === 'largest-contentful-paint')?.startTime || 0,
            fid: entries.find(e => e.entryType === 'first-input')?.processingStart || 0,
            cls: entries.find(e => e.entryType === 'layout-shift')?.value || 0,
            ttfb: navigation.responseStart - navigation.requestStart,
          });
        });
        
        observer.observe({ entryTypes: ['paint', 'largest-contentful-paint', 'first-input', 'layout-shift'] });
        
        // Fallback timeout
        setTimeout(() => {
          resolve({
            fcp: performance.now(),
            lcp: performance.now(),
            fid: 0,
            cls: 0,
            ttfb: 0,
          });
        }, 5000);
      });
    });
    
    return metrics;
  }

  async measureMobileMetrics(): Promise<MobileMetrics> {
    return {
      batteryUsage: await this.getBatteryConsumption(),
      memoryUsage: await this.getMemoryFootprint(),
      networkPayload: await this.getDataTransferred(),
      offlineSyncTime: await this.measureSyncDuration(),
      cameraInitTime: await this.getCameraStartupTime(),
    };
  }

  private async getBatteryConsumption(): Promise<number> {
    // Mock implementation - in real scenarios, use battery API
    return await this.page.evaluate(() => {
      // @ts-ignore - Battery API
      if ('getBattery' in navigator) {
        // @ts-ignore
        return navigator.getBattery().then(battery => battery.level);
      }
      return 1.0; // Mock full battery
    });
  }

  private async getMemoryFootprint(): Promise<number> {
    return await this.page.evaluate(() => {
      // @ts-ignore - Memory API
      if ('memory' in performance) {
        // @ts-ignore
        return performance.memory.usedJSHeapSize;
      }
      return 0;
    });
  }

  private async getDataTransferred(): Promise<number> {
    const responses = await this.page.evaluate(() => {
      return performance.getEntriesByType('resource')
        .reduce((total, entry) => {
          // @ts-ignore
          return total + (entry.transferSize || 0);
        }, 0);
    });
    return responses;
  }

  private async measureSyncDuration(): Promise<number> {
    // Mock sync measurement
    const startTime = Date.now();
    await this.page.waitForSelector('[data-testid="sync-indicator"]', { state: 'hidden', timeout: 30000 });
    return Date.now() - startTime;
  }

  private async getCameraStartupTime(): Promise<number> {
    const startTime = Date.now();
    await this.page.click('[data-testid="scan-button"]');
    await this.page.waitForSelector('[data-testid="camera-view"]', { timeout: 5000 });
    return Date.now() - startTime;
  }
}