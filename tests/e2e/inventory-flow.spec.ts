import { test, expect, devices } from '@playwright/test';
import { MobileTestSuite } from '../scanstock-pro/src/agent4-quality/tests/mobile/mobile-test-suite';

// Configure for mobile testing
test.use(devices['iPhone 14']);

test.describe('Mobile Inventory Flow E2E Tests', () => {
  let mobileTestSuite: MobileTestSuite;

  test.beforeEach(async ({ page }) => {
    mobileTestSuite = new MobileTestSuite(page);
    
    // Set up test data and login
    await page.goto('/');
    await page.fill('[data-testid="email"]', 'test@warehouse.com');
    await page.fill('[data-testid="password"]', 'testpass123');
    await page.tap('[data-testid="login-button"]');
    
    // Wait for dashboard to load
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
  });

  test('Complete mobile inventory count workflow', async ({ page }) => {
    // Navigate to scanning
    await page.tap('[data-testid="scan-button"]');
    await expect(page.locator('[data-testid="scan-page"]')).toBeVisible();

    // Grant camera permission (simulated)
    await page.context().grantPermissions(['camera']);
    
    // Start camera
    await page.tap('[data-testid="start-camera"]');
    await expect(page.locator('[data-testid="camera-view"]')).toBeVisible();

    // Simulate barcode scan
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('barcode-detected', {
        detail: { 
          barcode: '1234567890123', 
          format: 'EAN13',
          confidence: 0.95 
        }
      }));
    });

    // Verify product is loaded
    await expect(page.locator('[data-testid="scanned-barcode"]')).toContainText('1234567890123');
    await expect(page.locator('[data-testid="product-name"]')).toBeVisible();

    // Adjust quantity with touch controls
    const quantityInput = page.locator('[data-testid="quantity-input"]');
    await expect(quantityInput).toBeVisible();
    
    await quantityInput.clear();
    await quantityInput.fill('45');

    // Add location
    await page.fill('[data-testid="location-input"]', 'A-2-C');
    
    // Add notes
    await page.fill('[data-testid="notes-input"]', 'Mobile E2E test count');

    // Submit count
    await page.tap('[data-testid="submit-count"]');

    // Verify success
    await expect(page.locator('[data-testid="count-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="sync-indicator"]')).toBeVisible();

    // Verify count appears in recent activity
    await page.tap('[data-testid="back-to-dashboard"]');
    await expect(page.locator('[data-testid="recent-activity"]')).toContainText('A-2-C');
  });

  test('Mobile offline functionality', async ({ page, context }) => {
    // Start online inventory session
    await page.tap('[data-testid="scan-button"]');
    await page.context().grantPermissions(['camera']);

    // Go offline
    await context.setOffline(true);
    
    // Verify offline indicator
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="offline-indicator"]')).toContainText('Offline');

    // Perform offline scanning
    await page.tap('[data-testid="start-camera"]');
    await expect(page.locator('[data-testid="camera-view"]')).toBeVisible();

    // Simulate multiple scans while offline
    const offlineScans = [
      { barcode: '1111111111111', quantity: '10', location: 'B-1-A' },
      { barcode: '2222222222222', quantity: '25', location: 'B-1-B' },
      { barcode: '3333333333333', quantity: '15', location: 'B-1-C' },
    ];

    for (const scan of offlineScans) {
      // Simulate scan
      await page.evaluate((scanData) => {
        window.dispatchEvent(new CustomEvent('barcode-detected', {
          detail: { barcode: scanData.barcode, format: 'EAN13' }
        }));
      }, scan);

      // Enter details
      await page.fill('[data-testid="quantity-input"]', scan.quantity);
      await page.fill('[data-testid="location-input"]', scan.location);
      await page.tap('[data-testid="submit-count"]');

      // Verify queued
      await expect(page.locator('[data-testid="count-queued"]')).toBeVisible();
    }

    // Check queue status
    await expect(page.locator('[data-testid="queue-count"]')).toContainText('3 pending');

    // Go back online
    await context.setOffline(false);
    
    // Wait for sync to complete
    await expect(page.locator('[data-testid="sync-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="sync-indicator"]')).toContainText('Syncing');
    
    // Verify all items synced
    await expect(page.locator('[data-testid="queue-count"]')).toContainText('0 pending', {
      timeout: 15000
    });
    
    await expect(page.locator('[data-testid="sync-success"]')).toBeVisible();
  });

  test('Touch interactions and gestures', async ({ page }) => {
    await page.goto('/products');
    
    // Test touch targets
    await mobileTestSuite.validateTouchTargets();
    
    // Test swipe actions on product cards
    await mobileTestSuite.testSwipeActions();
    
    // Test long press context menu
    await mobileTestSuite.testLongPress();
    
    // Test one-handed reachability
    await mobileTestSuite.testThumbReachability();
  });

  test('Camera permissions and error handling', async ({ page, context }) => {
    // Test permission denied scenario
    await context.clearPermissions();
    
    await page.goto('/scan');
    await page.tap('[data-testid="scan-button"]');
    
    // Should show permission prompt
    await expect(page.locator('[data-testid="camera-permission-prompt"]')).toBeVisible();
    
    // Should show fallback manual entry
    await expect(page.locator('[data-testid="manual-entry-fallback"]')).toBeVisible();
    
    // Test manual barcode entry
    await page.fill('[data-testid="manual-barcode-input"]', '9876543210987');
    await page.tap('[data-testid="manual-submit"]');
    
    await expect(page.locator('[data-testid="product-lookup-result"]')).toBeVisible();
  });

  test('Mobile performance and responsiveness', async ({ page }) => {
    // Test performance under throttled network
    const metrics = await mobileTestSuite.testMobilePerformance();
    
    // Validate Core Web Vitals
    expect(metrics.fcp).toBeLessThan(2500); // First Contentful Paint
    expect(metrics.lcp).toBeLessThan(4000); // Largest Contentful Paint
    expect(metrics.cls).toBeLessThan(0.1);  // Cumulative Layout Shift
    
    // Test responsiveness across different orientations
    await page.setViewportSize({ width: 390, height: 844 }); // Portrait
    await expect(page.locator('[data-testid="main-nav"]')).toBeVisible();
    
    await page.setViewportSize({ width: 844, height: 390 }); // Landscape
    await expect(page.locator('[data-testid="main-nav"]')).toBeVisible();
  });

  test('Collaborative counting session', async ({ page }) => {
    // Start a collaborative session
    await page.tap('[data-testid="team-count-button"]');
    await page.fill('[data-testid="session-name"]', 'Warehouse A Count');
    await page.tap('[data-testid="start-session"]');
    
    await expect(page.locator('[data-testid="session-active"]')).toBeVisible();
    await expect(page.locator('[data-testid="participant-count"]')).toContainText('1 participant');

    // Simulate scanning in collaborative mode
    await page.context().grantPermissions(['camera']);
    await page.tap('[data-testid="scan-button"]');
    
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('barcode-detected', {
        detail: { barcode: '5555555555555', format: 'EAN13' }
      }));
    });

    await page.fill('[data-testid="quantity-input"]', '30');
    await page.fill('[data-testid="location-input"]', 'COLLAB-1');
    await page.tap('[data-testid="submit-count"]');

    // Verify real-time updates
    await expect(page.locator('[data-testid="session-activity"]')).toContainText('COLLAB-1');
    await expect(page.locator('[data-testid="total-items-counted"]')).toContainText('1');
  });

  test('Voice input functionality (if supported)', async ({ page }) => {
    await page.goto('/scan');
    await page.context().grantPermissions(['camera', 'microphone']);
    
    // Test voice quantity input
    const voiceButton = page.locator('[data-testid="voice-input-button"]');
    if (await voiceButton.isVisible()) {
      await voiceButton.tap();
      
      // Simulate voice recognition result
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('voice-recognition', {
          detail: { transcript: 'twenty five', confidence: 0.9 }
        }));
      });
      
      await expect(page.locator('[data-testid="quantity-input"]')).toHaveValue('25');
    }
  });

  test('PWA installation and update flow', async ({ page }) => {
    // Test PWA install prompt (simulated)
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('beforeinstallprompt', {
        detail: { prompt: () => Promise.resolve({ outcome: 'accepted' }) }
      }));
    });
    
    if (await page.locator('[data-testid="install-app-prompt"]').isVisible()) {
      await page.tap('[data-testid="install-app"]');
      await expect(page.locator('[data-testid="install-success"]')).toBeVisible();
    }
    
    // Test app update notification
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('app-update-available'));
    });
    
    if (await page.locator('[data-testid="update-available"]').isVisible()) {
      await page.tap('[data-testid="update-app"]');
      await expect(page.locator('[data-testid="update-installing"]')).toBeVisible();
    }
  });

  test('Accessibility and screen reader support', async ({ page }) => {
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();
    
    // Test ARIA labels
    const scanButton = page.locator('[data-testid="scan-button"]');
    await expect(scanButton).toHaveAttribute('aria-label');
    
    // Test high contrast mode
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect(page.locator('body')).toHaveClass(/dark/);
    
    // Test text scaling
    await page.addStyleTag({
      content: `
        * { font-size: 150% !important; }
      `
    });
    
    // Verify layout still works with larger text
    await expect(page.locator('[data-testid="main-nav"]')).toBeVisible();
  });

  test('Battery optimization and background behavior', async ({ page }) => {
    // Test app behavior when backgrounded
    await page.evaluate(() => {
      // Simulate page visibility change
      Object.defineProperty(document, 'visibilityState', {
        writable: true,
        value: 'hidden'
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    
    // Verify camera is paused
    await expect(page.locator('[data-testid="camera-paused"]')).toBeVisible();
    
    // Bring back to foreground
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', {
        writable: true,
        value: 'visible'
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    
    // Verify camera resumes
    await expect(page.locator('[data-testid="camera-view"]')).toBeVisible();
  });
});

test.describe('Cross-device compatibility', () => {
  const mobileDevices = [
    'iPhone SE',
    'iPhone 14',
    'iPhone 14 landscape', 
    'Galaxy S9+',
    'iPad Pro'
  ];

  for (const deviceName of mobileDevices) {
    test(`Basic functionality on ${deviceName}`, async ({ page, playwright }) => {
      const device = devices[deviceName];
      const context = await playwright.chromium.launch().then(browser => 
        browser.newContext(device)
      );
      const devicePage = await context.newPage();
      const testSuite = new MobileTestSuite(devicePage);

      await devicePage.goto('/');
      
      // Login
      await devicePage.fill('[data-testid="email"]', 'test@warehouse.com');
      await devicePage.fill('[data-testid="password"]', 'testpass123');
      await devicePage.tap('[data-testid="login-button"]');
      
      // Basic navigation test
      await expect(devicePage.locator('[data-testid="dashboard"]')).toBeVisible();
      
      // Touch targets validation
      await testSuite.validateTouchTargets();
      
      // Performance check
      const metrics = await testSuite.collectMetrics();
      expect(metrics.fcp).toBeLessThan(3000); // 3s allowance for different devices
      
      await context.close();
    });
  }
});