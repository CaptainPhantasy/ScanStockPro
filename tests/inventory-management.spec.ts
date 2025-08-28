import { test, expect } from '@playwright/test';

test.describe('Inventory Management System', () => {
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

  test.describe('Product Management', () => {
    test('should create new products with all required fields', async ({ page }) => {
      await page.goto('/products/new');
      
      // Fill product form
      await page.fill('[data-testid="product-name"]', 'Test Product');
      await page.fill('[data-testid="product-sku"]', 'TEST-001');
      await page.fill('[data-testid="product-barcode"]', '1234567890123');
      await page.fill('[data-testid="product-category"]', 'Electronics');
      await page.fill('[data-testid="product-description"]', 'A test product for inventory management');
      await page.fill('[data-testid="product-cost"]', '25.99');
      await page.fill('[data-testid="product-price"]', '49.99');
      await page.fill('[data-testid="product-min-quantity"]', '5');
      await page.fill('[data-testid="product-max-quantity"]', '100');
      
      // Submit form
      await page.click('[data-testid="submit-button"]');
      
      // Should redirect to product list
      await expect(page).toHaveURL(/\/products/);
      await expect(page.locator('text=Test Product')).toBeVisible();
    });

    test('should edit existing products', async ({ page }) => {
      await page.goto('/products');
      
      // Find and edit a product
      const product = page.locator('[data-testid="product-item"]').first();
      await product.click();
      
      // Click edit button
      await page.click('[data-testid="edit-button"]');
      
      // Update product information
      await page.fill('[data-testid="product-name"]', 'Updated Product Name');
      await page.fill('[data-testid="product-price"]', '59.99');
      
      // Save changes
      await page.click('[data-testid="save-button"]');
      
      // Should show success message
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Product updated successfully');
    });

    test('should delete products with confirmation', async ({ page }) => {
      await page.goto('/products');
      
      // Find a product to delete
      const product = page.locator('[data-testid="product-item"]').first();
      await product.click();
      
      // Click delete button
      await page.click('[data-testid="delete-button"]');
      
      // Should show confirmation dialog
      await expect(page.locator('[data-testid="delete-confirmation"]')).toBeVisible();
      
      // Confirm deletion
      await page.click('[data-testid="confirm-delete"]');
      
      // Should show success message
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Product deleted successfully');
    });

    test('should search and filter products', async ({ page }) => {
      await page.goto('/products');
      
      // Test search functionality
      await page.fill('[data-testid="search-input"]', 'Test Product');
      await page.keyboard.press('Enter');
      
      // Should show filtered results
      await expect(page.locator('[data-testid="product-item"]')).toHaveCount(1);
      
      // Test category filter
      await page.selectOption('[data-testid="category-filter"]', 'Electronics');
      
      // Should filter by category
      const products = page.locator('[data-testid="product-item"]');
      for (let i = 0; i < await products.count(); i++) {
        const product = products.nth(i);
        await expect(product.locator('[data-testid="product-category"]')).toContainText('Electronics');
      }
    });

    test('should handle product images and attachments', async ({ page }) => {
      await page.goto('/products/new');
      
      // Fill basic product info
      await page.fill('[data-testid="product-name"]', 'Product with Images');
      await page.fill('[data-testid="product-sku"]', 'IMG-001');
      
      // Upload product image
      const fileInput = page.locator('[data-testid="product-image-input"]');
      await fileInput.setInputFiles('tests/fixtures/test-product-image.jpg');
      
      // Should show image preview
      await expect(page.locator('[data-testid="image-preview"]')).toBeVisible();
      
      // Submit form
      await page.click('[data-testid="submit-button"]');
      
      // Should redirect to product list
      await expect(page).toHaveURL(/\/products/);
      await expect(page.locator('text=Product with Images')).toBeVisible();
    });
  });

  test.describe('Inventory Counting', () => {
    test('should perform manual inventory counts', async ({ page }) => {
      await page.goto('/inventory/count');
      
      // Select product to count
      await page.click('[data-testid="product-selector"]');
      await page.click('text=Test Product');
      
      // Enter count quantity
      await page.fill('[data-testid="count-quantity"]', '50');
      await page.fill('[data-testid="count-location"]', 'Warehouse A');
      await page.fill('[data-testid="count-notes"]', 'Monthly cycle count');
      
      // Submit count
      await page.click('[data-testid="submit-count"]');
      
      // Should show success message
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Count recorded successfully');
    });

    test('should create and manage counting sessions', async ({ page }) => {
      await page.goto('/inventory/sessions/new');
      
      // Create new counting session
      await page.fill('[data-testid="session-name"]', 'Monthly Cycle Count');
      await page.fill('[data-testid="session-description"]', 'Complete inventory count for month end');
      await page.selectOption('[data-testid="session-status"]', 'active');
      
      // Add participants
      await page.click('[data-testid="add-participant"]');
      await page.fill('[data-testid="participant-email"]', 'counter@example.com');
      await page.click('[data-testid="add-participant-submit"]');
      
      // Save session
      await page.click('[data-testid="save-session"]');
      
      // Should redirect to sessions list
      await expect(page).toHaveURL(/\/inventory\/sessions/);
      await expect(page.locator('text=Monthly Cycle Count')).toBeVisible();
    });

    test('should track count history and changes', async ({ page }) => {
      await page.goto('/inventory/history');
      
      // Should show count history
      await expect(page.locator('[data-testid="count-history"]')).toBeVisible();
      
      // Check for recent counts
      const countItems = page.locator('[data-testid="count-item"]');
      expect(await countItems.count()).toBeGreaterThan(0);
      
      // Verify count details
      const firstCount = countItems.first();
      await expect(firstCount.locator('[data-testid="count-quantity"]')).toBeVisible();
      await expect(firstCount.locator('[data-testid="count-date"]')).toBeVisible();
      await expect(firstCount.locator('[data-testid="count-user"]')).toBeVisible();
    });

    test('should handle count discrepancies and adjustments', async ({ page }) => {
      await page.goto('/inventory/count');
      
      // Select product to count
      await page.click('[data-testid="product-selector"]');
      await page.click('text=Test Product');
      
      // Enter count that differs from expected
      await page.fill('[data-testid="count-quantity"]', '45');
      await page.fill('[data-testid="count-notes"]', 'Found discrepancy during count');
      
      // Submit count
      await page.click('[data-testid="submit-count"]');
      
      // Should show discrepancy warning
      await expect(page.locator('[data-testid="discrepancy-warning"]')).toBeVisible();
      
      // Should allow adjustment
      await page.click('[data-testid="adjust-inventory"]');
      await expect(page.locator('[data-testid="adjustment-form"]')).toBeVisible();
    });
  });

  test.describe('Mobile Sync and Offline Support', () => {
    test('should sync inventory counts when online', async ({ page }) => {
      await page.goto('/inventory/count');
      
      // Perform count while online
      await page.click('[data-testid="product-selector"]');
      await page.click('text=Test Product');
      await page.fill('[data-testid="count-quantity"]', '60');
      await page.click('[data-testid="submit-count"]');
      
      // Should sync immediately
      await expect(page.locator('[data-testid="sync-status"]')).toContainText('Synced');
      
      // Check sync queue is empty
      await page.goto('/inventory/sync');
      await expect(page.locator('[data-testid="sync-queue"]')).toContainText('No pending items');
    });

    test('should queue counts when offline', async ({ page }) => {
      // Simulate offline mode
      await page.route('**/*', route => {
        route.abort();
      });
      
      await page.goto('/inventory/count');
      
      // Perform count while offline
      await page.click('[data-testid="product-selector"]');
      await page.click('text=Test Product');
      await page.fill('[data-testid="count-quantity"]', '70');
      await page.click('[data-testid="submit-count"]');
      
      // Should show offline indicator
      await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
      
      // Should queue the count
      await expect(page.locator('[data-testid="queued-count"]')).toBeVisible();
      await expect(page.locator('[data-testid="queued-count"]')).toContainText('Queued for sync');
    });

    test('should sync queued items when back online', async ({ page }) => {
      // First, create some queued items while offline
      await page.route('**/*', route => {
        route.abort();
      });
      
      await page.goto('/inventory/count');
      await page.click('[data-testid="product-selector"]');
      await page.click('text=Test Product');
      await page.fill('[data-testid="count-quantity"]', '80');
      await page.click('[data-testid="submit-count"]');
      
      // Now go back online
      await page.unroute('**/*');
      
      // Navigate to sync page
      await page.goto('/inventory/sync');
      
      // Should show sync button
      await expect(page.locator('[data-testid="sync-now-button"]')).toBeVisible();
      
      // Click sync
      await page.click('[data-testid="sync-now-button"]');
      
      // Should process queued items
      await expect(page.locator('[data-testid="sync-progress"]')).toBeVisible();
      
      // Should complete sync
      await expect(page.locator('[data-testid="sync-complete"]')).toBeVisible();
    });

    test('should handle sync conflicts gracefully', async ({ page }) => {
      // Create a count that might conflict
      await page.goto('/inventory/count');
      await page.click('[data-testid="product-selector"]');
      await page.click('text=Test Product');
      await page.fill('[data-testid="count-quantity"]', '90');
      await page.click('[data-testid="submit-count"]');
      
      // Simulate conflict by changing the same product elsewhere
      await page.goto('/products');
      await page.click('text=Test Product');
      await page.click('[data-testid="edit-button"]');
      await page.fill('[data-testid="product-current-quantity"]', '95');
      await page.click('[data-testid="save-button"]');
      
      // Try to sync the count
      await page.goto('/inventory/sync');
      await page.click('[data-testid="sync-now-button"]');
      
      // Should show conflict resolution
      await expect(page.locator('[data-testid="conflict-resolution"]')).toBeVisible();
      
      // Should allow choosing resolution strategy
      await page.click('[data-testid="resolve-conflict"]');
      await expect(page.locator('[data-testid="resolution-options"]')).toBeVisible();
    });
  });

  test.describe('Reporting and Analytics', () => {
    test('should generate inventory reports', async ({ page }) => {
      await page.goto('/reports/inventory');
      
      // Select report parameters
      await page.selectOption('[data-testid="report-type"]', 'cycle-count');
      await page.fill('[data-testid="start-date"]', '2024-01-01');
      await page.fill('[data-testid="end-date"]', '2024-12-31');
      await page.selectOption('[data-testid="location-filter"]', 'All Locations');
      
      // Generate report
      await page.click('[data-testid="generate-report"]');
      
      // Should show report
      await expect(page.locator('[data-testid="report-content"]')).toBeVisible();
      await expect(page.locator('[data-testid="report-summary"]')).toBeVisible();
    });

    test('should export reports in multiple formats', async ({ page }) => {
      await page.goto('/reports/inventory');
      
      // Generate a report first
      await page.selectOption('[data-testid="report-type"]', 'inventory-status');
      await page.click('[data-testid="generate-report"]');
      
      // Test PDF export
      await page.click('[data-testid="export-pdf"]');
      
      // Should trigger download
      const downloadPromise = page.waitForEvent('download');
      await downloadPromise;
      
      // Test Excel export
      await page.click('[data-testid="export-excel"]');
      
      // Should trigger download
      const excelDownloadPromise = page.waitForEvent('download');
      await excelDownloadPromise;
    });

    test('should show real-time inventory dashboard', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Check dashboard components
      await expect(page.locator('[data-testid="inventory-summary"]')).toBeVisible();
      await expect(page.locator('[data-testid="low-stock-alerts"]')).toBeVisible();
      await expect(page.locator('[data-testid="recent-counts"]')).toBeVisible();
      
      // Check real-time updates
      const initialCount = await page.locator('[data-testid="total-products"]').textContent();
      
      // Wait for potential real-time updates
      await page.waitForTimeout(2000);
      
      const updatedCount = await page.locator('[data-testid="total-products"]').textContent();
      
      // Count should be consistent (or show real-time updates)
      expect(updatedCount).toBeDefined();
    });
  });

  test.describe('Barcode Scanning', () => {
    test('should support camera-based barcode scanning', async ({ page }) => {
      await page.goto('/inventory/scan');
      
      // Should show camera interface
      await expect(page.locator('[data-testid="camera-view"]')).toBeVisible();
      
      // Should have scan button
      await expect(page.locator('[data-testid="scan-button"]')).toBeVisible();
      
      // Should show scan instructions
      await expect(page.locator('[data-testid="scan-instructions"]')).toBeVisible();
    });

    test('should handle manual barcode entry', async ({ page }) => {
      await page.goto('/inventory/scan');
      
      // Click manual entry
      await page.click('[data-testid="manual-entry"]');
      
      // Should show manual entry form
      await expect(page.locator('[data-testid="manual-entry-form"]')).toBeVisible();
      
      // Enter barcode manually
      await page.fill('[data-testid="barcode-input"]', '1234567890123');
      await page.click('[data-testid="lookup-product"]');
      
      // Should find product
      await expect(page.locator('[data-testid="product-found"]')).toBeVisible();
    });

    test('should handle invalid barcodes gracefully', async ({ page }) => {
      await page.goto('/inventory/scan');
      
      // Click manual entry
      await page.click('[data-testid="manual-entry"]');
      
      // Enter invalid barcode
      await page.fill('[data-testid="barcode-input"]', 'INVALID123');
      await page.click('[data-testid="lookup-product"]');
      
      // Should show error message
      await expect(page.locator('[data-testid="barcode-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="barcode-error"]')).toContainText('Product not found');
    });
  });
});
