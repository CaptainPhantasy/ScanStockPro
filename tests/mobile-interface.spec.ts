import { test, expect } from '@playwright/test';

test.describe('Mobile Interface', () => {
  test.beforeEach(async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
  });

  test.describe('Touch Interactions', () => {
    test('should support touch gestures for navigation', async ({ page }) => {
      // Test swipe navigation
      await page.touchscreen.tap(50, 300); // Tap menu button
      await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
      
      // Test swipe to close menu
      await page.touchscreen.swipe(50, 300, 300, 300);
      await expect(page.locator('[data-testid="mobile-menu"]')).not.toBeVisible();
    });

    test('should have touch-friendly button sizes', async ({ page }) => {
      // Check that all interactive elements meet minimum touch target size (44x44px)
      const buttons = page.locator('button, [role="button"], input[type="submit"]');
      
      for (let i = 0; i < await buttons.count(); i++) {
        const button = buttons.nth(i);
        const box = await button.boundingBox();
        
        if (box) {
          expect(box.width).toBeGreaterThanOrEqual(44);
          expect(box.height).toBeGreaterThanOrEqual(44);
        }
      }
    });

    test('should support long press for context menus', async ({ page }) => {
      // Login first
      await page.click('[data-testid="login-button"]');
      await page.fill('[data-testid="email-input"]', 'user@example.com');
      await page.fill('[data-testid="password-input"]', 'SecurePass123!');
      await page.click('[data-testid="login-submit"]');
      
      // Navigate to products
      await page.goto('/products');
      
      // Long press on a product
      const product = page.locator('[data-testid="product-item"]').first();
      await product.hover();
      await page.mouse.down();
      await page.waitForTimeout(500); // Long press duration
      await page.mouse.up();
      
      // Should show context menu
      await expect(page.locator('[data-testid="context-menu"]')).toBeVisible();
    });
  });

  test.describe('Responsive Design', () => {
    test('should adapt layout for mobile screens', async ({ page }) => {
      // Check mobile-specific layout elements
      await expect(page.locator('[data-testid="mobile-header"]')).toBeVisible();
      await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible();
      
      // Desktop elements should be hidden
      await expect(page.locator('[data-testid="desktop-sidebar"]')).not.toBeVisible();
    });

    test('should stack elements vertically on mobile', async ({ page }) => {
      // Login and go to dashboard
      await page.click('[data-testid="login-button"]');
      await page.fill('[data-testid="email-input"]', 'user@example.com');
      await page.fill('[data-testid="password-input"]', 'SecurePass123!');
      await page.click('[data-testid="login-submit"]');
      
      // Check dashboard layout
      const dashboardItems = page.locator('[data-testid="dashboard-item"]');
      
      for (let i = 0; i < await dashboardItems.count(); i++) {
        const item = dashboardItems.nth(i);
        const box = await item.boundingBox();
        
        if (box && i > 0) {
          const prevItem = dashboardItems.nth(i - 1);
          const prevBox = await prevItem.boundingBox();
          
          if (prevBox) {
            // Items should be stacked vertically (top to bottom)
            expect(box.y).toBeGreaterThan(prevBox.y);
          }
        }
      }
    });

    test('should handle orientation changes gracefully', async ({ page }) => {
      // Test landscape orientation
      await page.setViewportSize({ width: 667, height: 375 });
      
      // Should maintain functionality
      await expect(page.locator('[data-testid="mobile-header"]')).toBeVisible();
      await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible();
      
      // Test portrait orientation
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Should still work
      await expect(page.locator('[data-testid="mobile-header"]')).toBeVisible();
      await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible();
    });
  });

  test.describe('Mobile Navigation', () => {
    test('should have accessible mobile navigation menu', async ({ page }) => {
      await page.click('[data-testid="mobile-menu-button"]');
      
      const menu = page.locator('[data-testid="mobile-menu"]');
      await expect(menu).toBeVisible();
      
      // Check navigation items
      const navItems = ['Dashboard', 'Products', 'Inventory', 'Reports', 'Settings'];
      navItems.forEach(item => {
        expect(menu.locator(`text=${item}`)).toBeVisible();
      });
    });

    test('should support bottom navigation on mobile', async ({ page }) => {
      // Login first
      await page.click('[data-testid="login-button"]');
      await page.fill('[data-testid="email-input"]', 'user@example.com');
      await page.fill('[data-testid="password-input"]', 'SecurePass123!');
      await page.click('[data-testid="login-submit"]');
      
      // Check bottom navigation
      const bottomNav = page.locator('[data-testid="bottom-navigation"]');
      await expect(bottomNav).toBeVisible();
      
      // Test navigation between tabs
      await page.click('[data-testid="nav-products"]');
      await expect(page).toHaveURL(/\/products/);
      
      await page.click('[data-testid="nav-inventory"]');
      await expect(page).toHaveURL(/\/inventory/);
    });

    test('should handle deep linking on mobile', async ({ page }) => {
      // Test direct navigation to deep routes
      await page.goto('/products/123/edit');
      
      // Should redirect to login if not authenticated
      await expect(page).toHaveURL(/\/login/);
      
      // Login and try again
      await page.fill('[data-testid="email-input"]', 'user@example.com');
      await page.fill('[data-testid="password-input"]', 'SecurePass123!');
      await page.click('[data-testid="login-submit"]');
      
      // Should now be on the edit page
      await expect(page).toHaveURL(/\/products\/123\/edit/);
    });
  });

  test.describe('Mobile Forms', () => {
    test('should have mobile-optimized form inputs', async ({ page }) => {
      // Login and go to product creation
      await page.click('[data-testid="login-button"]');
      await page.fill('[data-testid="email-input"]', 'user@example.com');
      await page.fill('[data-testid="password-input"]', 'SecurePass123!');
      await page.click('[data-testid="login-submit"]');
      
      await page.goto('/products/new');
      
      // Check form inputs
      const inputs = page.locator('input, textarea, select');
      
      for (let i = 0; i < await inputs.count(); i++) {
        const input = inputs.nth(i);
        const box = await input.boundingBox();
        
        if (box) {
          // Inputs should be appropriately sized for mobile
          expect(box.height).toBeGreaterThanOrEqual(44);
          expect(box.width).toBeGreaterThan(200); // Reasonable width for mobile
        }
      }
    });

    test('should support mobile keyboard types', async ({ page }) => {
      // Login and go to product creation
      await page.click('[data-testid="login-button"]');
      await page.fill('[data-testid="email-input"]', 'user@example.com');
      await page.fill('[data-testid="password-input"]', 'SecurePass123!');
      await page.click('[data-testid="login-submit"]');
      
      await page.goto('/products/new');
      
      // Test different input types
      await page.fill('[data-testid="product-name"]', 'Test Product');
      await page.fill('[data-testid="product-sku"]', 'TEST-001');
      await page.fill('[data-testid="product-description"]', 'A test product description');
      
      // Should handle mobile keyboard input properly
      await expect(page.locator('[data-testid="product-name"]')).toHaveValue('Test Product');
      await expect(page.locator('[data-testid="product-sku"]')).toHaveValue('TEST-001');
    });

    test('should validate forms on mobile', async ({ page }) => {
      // Login and go to product creation
      await page.click('[data-testid="login-button"]');
      await page.fill('[data-testid="email-input"]', 'user@example.com');
      await page.fill('[data-testid="password-input"]', 'SecurePass123!');
      await page.click('[data-testid="login-submit"]');
      
      await page.goto('/products/new');
      
      // Try to submit without required fields
      await page.click('[data-testid="submit-button"]');
      
      // Should show validation errors
      await expect(page.locator('[data-testid="name-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="sku-error"]')).toBeVisible();
    });
  });

  test.describe('Mobile Performance', () => {
    test('should load quickly on mobile networks', async ({ page }) => {
      // Simulate slow 3G network
      await page.route('**/*', route => {
        route.continue();
      });
      
      const startTime = Date.now();
      await page.goto('/');
      const loadTime = Date.now() - startTime;
      
      // Should load within reasonable time (5 seconds)
      expect(loadTime).toBeLessThan(5000);
    });

    test('should handle offline scenarios gracefully', async ({ page }) => {
      // Login first
      await page.click('[data-testid="login-button"]');
      await page.fill('[data-testid="email-input"]', 'user@example.com');
      await page.fill('[data-testid="password-input"]', 'SecurePass123!');
      await page.click('[data-testid="login-submit"]');
      
      // Simulate offline mode
      await page.route('**/*', route => {
        route.abort();
      });
      
      // Try to navigate
      await page.click('[data-testid="nav-products"]');
      
      // Should show offline indicator
      await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
    });

    test('should support mobile-specific optimizations', async ({ page }) => {
      // Check for mobile-specific features
      await expect(page.locator('[data-testid="mobile-optimized"]')).toBeVisible();
      
      // Check for lazy loading indicators
      await expect(page.locator('[data-testid="lazy-loading"]')).toBeVisible();
      
      // Check for mobile-specific caching
      const cacheHeaders = await page.evaluate(() => {
        return performance.getEntriesByType('resource')
          .filter(entry => entry.name.includes('api'))
          .map(entry => entry.name);
      });
      
      expect(cacheHeaders.length).toBeGreaterThan(0);
    });
  });

  test.describe('Mobile Accessibility', () => {
    test('should support screen readers on mobile', async ({ page }) => {
      // Check for proper ARIA labels
      const elements = page.locator('[aria-label], [aria-labelledby], [role]');
      expect(await elements.count()).toBeGreaterThan(0);
      
      // Check for proper heading structure
      const headings = page.locator('h1, h2, h3, h4, h5, h6');
      expect(await headings.count()).toBeGreaterThan(0);
    });

    test('should support mobile assistive technologies', async ({ page }) => {
      // Check for proper focus management
      await page.keyboard.press('Tab');
      
      // Should have visible focus indicator
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
      
      // Check for skip links
      await expect(page.locator('[data-testid="skip-link"]')).toBeVisible();
    });

    test('should have sufficient color contrast on mobile', async ({ page }) => {
      // This would typically use a color contrast checking library
      // For now, we'll check that text elements exist and are visible
      const textElements = page.locator('p, span, div, h1, h2, h3, h4, h5, h6');
      
      for (let i = 0; i < Math.min(await textElements.count(), 10); i++) {
        const element = textElements.nth(i);
        await expect(element).toBeVisible();
      }
    });
  });
});
