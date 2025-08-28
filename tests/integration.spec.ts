import { test, expect } from '@playwright/test';

test.describe('ScanStock Pro Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/');
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', 'user@example.com');
    await page.fill('[data-testid="password-input"]', 'SecurePass123!');
    await page.click('[data-testid="login-submit"]');
    
    // Wait for dashboard to load
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
  });

  test.describe('4-Agent Workflow Integration', () => {
    test('should complete full product lifecycle with all agents', async ({ page }) => {
      // Agent 1: Foundation - Create business and setup
      await page.goto('/business/setup');
      await page.fill('[data-testid="business-name"]', 'Test Business');
      await page.fill('[data-testid="business-address"]', '123 Test St');
      await page.fill('[data-testid="business-phone"]', '555-0123');
      await page.click('[data-testid="save-business"]');
      
      // Should redirect to team setup
      await expect(page).toHaveURL(/\/team\/setup/);
      
      // Add team member
      await page.fill('[data-testid="member-email"]', 'team@example.com');
      await page.selectOption('[data-testid="member-role"]', 'user');
      await page.click('[data-testid="add-member"]');
      
      // Agent 2: Mobile Interface - Test mobile responsiveness
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Navigate to products
      await page.goto('/products');
      await expect(page.locator('[data-testid="mobile-header"]')).toBeVisible();
      await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible();
      
      // Agent 3: Business Features - Create product with AI
      await page.click('[data-testid="add-product"]');
      
      // Use AI recognition
      const fileInput = page.locator('[data-testid="product-image-input"]');
      await fileInput.setInputFiles('tests/fixtures/test-product.jpg');
      
      // Should show AI recognition results
      await expect(page.locator('[data-testid="recognition-results"]')).toBeVisible();
      
      // Fill product details
      await page.fill('[data-testid="product-name"]', 'AI Recognized Product');
      await page.fill('[data-testid="product-sku"]', 'AI-001');
      await page.fill('[data-testid="product-price"]', '99.99');
      
      // Save product
      await page.click('[data-testid="save-product"]');
      
      // Agent 4: Quality & Integration - Test sync and validation
      await page.goto('/inventory/count');
      
      // Count the new product
      await page.click('[data-testid="product-selector"]');
      await page.click('text=AI Recognized Product');
      await page.fill('[data-testid="count-quantity"]', '25');
      await page.click('[data-testid="submit-count"]');
      
      // Should sync immediately
      await expect(page.locator('[data-testid="sync-status"]')).toContainText('Synced');
      
      // Verify in dashboard
      await page.goto('/dashboard');
      await expect(page.locator('[data-testid="inventory-summary"]')).toBeVisible();
      await expect(page.locator('text=AI Recognized Product')).toBeVisible();
    });

    test('should handle agent conflicts and resolve them', async ({ page }) => {
      // Create a product
      await page.goto('/products/new');
      await page.fill('[data-testid="product-name"]', 'Conflict Test Product');
      await page.fill('[data-testid="product-sku"]', 'CONF-001');
      await page.fill('[data-testid="product-price"]', '50.00');
      await page.click('[data-testid="save-product"]');
      
      // Simulate concurrent edits from different agents
      // Agent 2 (Mobile) tries to edit
      await page.goto('/products');
      await page.click('text=Conflict Test Product');
      await page.click('[data-testid="edit-button"]');
      await page.fill('[data-testid="product-price"]', '60.00');
      
      // Simulate Agent 3 (Business) also editing
      await page.route('**/api/products/*', route => {
        route.fulfill({
          status: 409,
          body: JSON.stringify({ 
            error: 'Conflict detected',
            conflictingChanges: {
              price: { current: '55.00', incoming: '60.00' }
            }
          })
        });
      });
      
      // Try to save
      await page.click('[data-testid="save-button"]');
      
      // Should show conflict resolution
      await expect(page.locator('[data-testid="conflict-resolution"]')).toBeVisible();
      
      // Should show conflicting changes
      await expect(page.locator('[data-testid="conflicting-changes"]')).toBeVisible();
      
      // Should allow choosing resolution strategy
      await page.click('[data-testid="resolve-conflict"]');
      await expect(page.locator('[data-testid="resolution-options"]')).toBeVisible();
    });
  });

  test.describe('Real-Time Sync Integration', () => {
    test('should sync changes across multiple browser sessions', async ({ page, context }) => {
      // Create a product in first session
      await page.goto('/products/new');
      await page.fill('[data-testid="product-name"]', 'Sync Test Product');
      await page.fill('[data-testid="product-sku"]', 'SYNC-001');
      await page.fill('[data-testid="product-price"]', '75.00');
      await page.click('[data-testid="save-product"]');
      
      // Open second browser session
      const page2 = await context.newPage();
      await page2.goto('/');
      await page2.click('[data-testid="login-button"]');
      await page2.fill('[data-testid="email-input"]', 'user@example.com');
      await page2.fill('[data-testid="password-input"]', 'SecurePass123!');
      await page2.click('[data-testid="login-submit"]');
      
      // Navigate to products in second session
      await page2.goto('/products');
      
      // Should see the new product (real-time sync)
      await expect(page2.locator('text=Sync Test Product')).toBeVisible();
      
      // Edit product in second session
      await page2.click('text=Sync Test Product');
      await page2.click('[data-testid="edit-button"]');
      await page2.fill('[data-testid="product-price"]', '80.00');
      await page2.click('[data-testid="save-button"]');
      
      // Should sync to first session
      await page.reload();
      await expect(page.locator('[data-testid="product-price"]')).toContainText('80.00');
    });

    test('should handle offline sync queue properly', async ({ page }) => {
      // Go offline
      await page.route('**/*', route => {
        route.abort();
      });
      
      // Create product while offline
      await page.goto('/products/new');
      await page.fill('[data-testid="product-name"]', 'Offline Product');
      await page.fill('[data-testid="product-sku"]', 'OFF-001');
      await page.fill('[data-testid="product-price"]', '45.00');
      await page.click('[data-testid="save-product"]');
      
      // Should show offline indicator
      await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
      
      // Should queue the product
      await expect(page.locator('[data-testid="queued-product"]')).toBeVisible();
      
      // Go back online
      await page.unroute('**/*');
      
      // Navigate to sync page
      await page.goto('/sync');
      
      // Should show queued items
      await expect(page.locator('[data-testid="queued-items"]')).toBeVisible();
      
      // Sync now
      await page.click('[data-testid="sync-now"]');
      
      // Should process queue
      await expect(page.locator('[data-testid="sync-progress"]')).toBeVisible();
      
      // Should complete sync
      await expect(page.locator('[data-testid="sync-complete"]')).toBeVisible();
      
      // Verify product was created
      await page.goto('/products');
      await expect(page.locator('text=Offline Product')).toBeVisible();
    });

    test('should sync inventory counts in real-time', async ({ page, context }) => {
      // Create product
      await page.goto('/products/new');
      await page.fill('[data-testid="product-name"]', 'Count Sync Product');
      await page.fill('[data-testid="product-sku"]', 'COUNT-001');
      await page.fill('[data-testid="product-price"]', '30.00');
      await page.click('[data-testid="save-product"]');
      
      // Open second session
      const page2 = await context.newPage();
      await page2.goto('/');
      await page2.click('[data-testid="login-button"]');
      await page2.fill('[data-testid="email-input"]', 'user@example.com');
      await page2.fill('[data-testid="password-input"]', 'SecurePass123!');
      await page2.click('[data-testid="login-submit"]');
      
      // Count product in second session
      await page2.goto('/inventory/count');
      await page2.click('[data-testid="product-selector"]');
      await page2.click('text=Count Sync Product');
      await page2.fill('[data-testid="count-quantity"]', '100');
      await page2.click('[data-testid="submit-count"]');
      
      // Should sync to first session
      await page.reload();
      await page.goto('/products');
      await page.click('text=Count Sync Product');
      await expect(page.locator('[data-testid="current-quantity"]')).toContainText('100');
    });
  });

  test.describe('End-to-End User Journeys', () => {
    test('should complete warehouse manager workflow', async ({ page }) => {
      // 1. Start inventory count session
      await page.goto('/inventory/sessions/new');
      await page.fill('[data-testid="session-name"]', 'Monthly Warehouse Count');
      await page.fill('[data-testid="session-description"]', 'Complete monthly inventory count');
      await page.click('[data-testid="save-session"]');
      
      // 2. Scan products with barcode scanner
      await page.goto('/inventory/scan');
      await page.click('[data-testid="manual-entry"]');
      await page.fill('[data-testid="barcode-input"]', '1234567890123');
      await page.click('[data-testid="lookup-product"]');
      
      // 3. Count products
      await page.fill('[data-testid="count-quantity"]', '150');
      await page.fill('[data-testid="count-location"]', 'Warehouse A');
      await page.click('[data-testid="submit-count"]');
      
      // 4. Generate report
      await page.goto('/reports/inventory');
      await page.selectOption('[data-testid="report-type"]', 'cycle-count');
      await page.fill('[data-testid="start-date"]', '2024-01-01');
      await page.fill('[data-testid="end-date"]', '2024-12-31');
      await page.click('[data-testid="generate-report"]');
      
      // 5. Export report
      await page.click('[data-testid="export-pdf"]');
      
      // Should complete workflow
      await expect(page.locator('[data-testid="report-content"]')).toBeVisible();
    });

    test('should complete retail store workflow', async ({ page }) => {
      // 1. Receive shipment
      await page.goto('/inventory/receive');
      await page.fill('[data-testid="po-number"]', 'PO-2024-001');
      await page.fill('[data-testid="supplier"]', 'Test Supplier');
      
      // 2. Scan received items
      await page.click('[data-testid="scan-received"]');
      await page.fill('[data-testid="barcode-input"]', '1234567890123');
      await page.fill('[data-testid="received-quantity"]', '50');
      await page.click('[data-testid="add-received"]');
      
      // 3. Update inventory
      await page.click('[data-testid="update-inventory"]');
      
      // 4. Check low stock alerts
      await page.goto('/dashboard');
      await expect(page.locator('[data-testid="low-stock-alerts"]')).toBeVisible();
      
      // 5. Create restock order
      await page.click('[data-testid="create-restock-order"]');
      await expect(page.locator('[data-testid="restock-form"]')).toBeVisible();
    });

    test('should complete field service workflow', async ({ page }) => {
      // 1. Download offline data
      await page.goto('/sync/download');
      await page.click('[data-testid="download-inventory"]');
      
      // Should show download progress
      await expect(page.locator('[data-testid="download-progress"]')).toBeVisible();
      
      // 2. Go offline
      await page.route('**/*', route => {
        route.abort();
      });
      
      // 3. Perform field counts
      await page.goto('/inventory/count');
      await page.click('[data-testid="product-selector"]');
      await page.click('text=Test Product');
      await page.fill('[data-testid="count-quantity"]', '25');
      await page.click('[data-testid="submit-count"]');
      
      // Should queue for sync
      await expect(page.locator('[data-testid="queued-count"]')).toBeVisible();
      
      // 4. Go back online and sync
      await page.unroute('**/*');
      await page.goto('/sync');
      await page.click('[data-testid="sync-now"]');
      
      // Should complete sync
      await expect(page.locator('[data-testid="sync-complete"]')).toBeVisible();
    });
  });

  test.describe('Performance and Scalability', () => {
    test('should handle large product catalogs', async ({ page }) => {
      // Create multiple products
      for (let i = 1; i <= 50; i++) {
        await page.goto('/products/new');
        await page.fill('[data-testid="product-name"]', `Bulk Product ${i}`);
        await page.fill('[data-testid="product-sku"]', `BULK-${i.toString().padStart(3, '0')}`);
        await page.fill('[data-testid="product-price"]', (Math.random() * 100).toFixed(2));
        await page.click('[data-testid="save-product"]');
        
        // Wait for save to complete
        await page.waitForTimeout(100);
      }
      
      // Navigate to product list
      await page.goto('/products');
      
      // Should show pagination
      await expect(page.locator('[data-testid="pagination"]')).toBeVisible();
      
      // Should load quickly
      const loadTime = await page.evaluate(() => {
        return performance.now();
      });
      
      expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds
    });

    test('should handle concurrent user operations', async ({ page, context }) => {
      // Create product in first session
      await page.goto('/products/new');
      await page.fill('[data-testid="product-name"]', 'Concurrent Product');
      await page.fill('[data-testid="product-sku"]', 'CONC-001');
      await page.fill('[data-testid="product-price"]', '40.00');
      await page.click('[data-testid="save-product"]');
      
      // Open multiple concurrent sessions
      const sessions = [];
      for (let i = 0; i < 5; i++) {
        const newPage = await context.newPage();
        await newPage.goto('/');
        await newPage.click('[data-testid="login-button"]');
        await newPage.fill('[data-testid="email-input"]', 'user@example.com');
        await newPage.fill('[data-testid="password-input"]', 'SecurePass123!');
        await newPage.click('[data-testid="login-submit"]');
        sessions.push(newPage);
      }
      
      // All sessions should access the same product
      for (const session of sessions) {
        await session.goto('/products');
        await expect(session.locator('text=Concurrent Product')).toBeVisible();
      }
      
      // Close sessions
      for (const session of sessions) {
        await session.close();
      }
    });

    test('should maintain performance under load', async ({ page }) => {
      // Measure initial page load time
      const startTime = Date.now();
      await page.goto('/dashboard');
      const initialLoadTime = Date.now() - startTime;
      
      // Perform multiple operations
      for (let i = 0; i < 10; i++) {
        await page.goto('/products');
        await page.goto('/inventory/count');
        await page.goto('/reports/inventory');
        await page.goto('/dashboard');
      }
      
      // Measure final page load time
      const finalStartTime = Date.now();
      await page.goto('/dashboard');
      const finalLoadTime = Date.now() - finalStartTime;
      
      // Performance should not degrade significantly
      const performanceRatio = finalLoadTime / initialLoadTime;
      expect(performanceRatio).toBeLessThan(2); // Should not be more than 2x slower
    });
  });

  test.describe('Error Recovery and Resilience', () => {
    test('should recover from network failures', async ({ page }) => {
      // Start creating a product
      await page.goto('/products/new');
      await page.fill('[data-testid="product-name"]', 'Network Test Product');
      await page.fill('[data-testid="product-sku"]', 'NET-001');
      await page.fill('[data-testid="product-price"]', '35.00');
      
      // Simulate network failure
      await page.route('**/api/products', route => {
        route.abort();
      });
      
      // Try to save
      await page.click('[data-testid="save-button"]');
      
      // Should show network error
      await expect(page.locator('[data-testid="network-error"]')).toBeVisible();
      
      // Should offer retry option
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
      
      // Restore network and retry
      await page.unroute('**/api/products');
      await page.click('[data-testid="retry-button"]');
      
      // Should save successfully
      await expect(page).toHaveURL(/\/products/);
      await expect(page.locator('text=Network Test Product')).toBeVisible();
    });

    test('should handle database connection issues', async ({ page }) => {
      // Simulate database connection failure
      await page.route('**/api/**', route => {
        route.fulfill({
          status: 503,
          body: JSON.stringify({ error: 'Database connection failed' })
        });
      });
      
      // Try to access products
      await page.goto('/products');
      
      // Should show database error
      await expect(page.locator('[data-testid="database-error"]')).toBeVisible();
      
      // Should offer offline mode
      await expect(page.locator('[data-testid="offline-mode"]')).toBeVisible();
      
      // Should allow switching to offline mode
      await page.click('[data-testid="switch-offline"]');
      await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
    });

    test('should maintain data integrity during failures', async ({ page }) => {
      // Create product
      await page.goto('/products/new');
      await page.fill('[data-testid="product-name"]', 'Integrity Test Product');
      await page.fill('[data-testid="product-sku"]', 'INT-001');
      await page.fill('[data-testid="product-price"]', '55.00');
      await page.click('[data-testid="save-product"]');
      
      // Verify product was created
      await expect(page).toHaveURL(/\/products/);
      await expect(page.locator('text=Integrity Test Product')).toBeVisible();
      
      // Simulate failure during edit
      await page.click('text=Integrity Test Product');
      await page.click('[data-testid="edit-button"]');
      await page.fill('[data-testid="product-price"]', '65.00');
      
      // Simulate failure
      await page.route('**/api/products/*', route => {
        route.abort();
      });
      
      // Try to save
      await page.click('[data-testid="save-button"]');
      
      // Should show error
      await expect(page.locator('[data-testid="save-error"]')).toBeVisible();
      
      // Original data should be preserved
      await page.reload();
      await expect(page.locator('[data-testid="product-price"]')).toContainText('55.00');
    });
  });
});
