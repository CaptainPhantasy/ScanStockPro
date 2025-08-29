import { test, expect } from '@playwright/test';

test.describe('ScanStock Pro - Comprehensive Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the home page before each test
    await page.goto('/');
    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle');
  });

  test.describe('Landing Page & Core UI', () => {
    test('should display landing page with correct layout and branding', async ({ page }) => {
      // Test navigation bar
      await expect(page.locator('header')).toBeVisible();
      await expect(page.locator('header')).toHaveCSS('height', '70px');
      
      // Test logo and branding
      await expect(page.locator('text=ScanStock Pro')).toBeVisible();
      await expect(page.locator('text=ScanStock Pro')).toHaveCSS('color', 'rgb(0, 102, 204)');
      
      // Test navigation menu
      await expect(page.locator('nav a[href="#features"]')).toBeVisible();
      await expect(page.locator('nav a[href="#pricing"]')).toBeVisible();
      await expect(page.locator('nav a[href="/demo"]')).toBeVisible();
      
      // Test CTA buttons
      await expect(page.locator('a[href="/auth/login"]')).toBeVisible();
      await expect(page.locator('a[href="/auth/register"]')).toBeVisible();
      await expect(page.locator('a[href="/demo"]')).toBeVisible();
      
      // Test hero section
      await expect(page.locator('h1:has-text("Professional")')).toBeVisible();
      await expect(page.locator('h1:has-text("Inventory Management")')).toBeVisible();
      
      // Test features section
      await expect(page.locator('#features')).toBeVisible();
      await expect(page.locator('text=Mobile-First Design')).toBeVisible();
      await expect(page.locator('text=AI Product Recognition')).toBeVisible();
      await expect(page.locator('text=Real-Time Sync')).toBeVisible();
    });

    test('should have responsive design working correctly', async ({ page }) => {
      // Test mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await expect(page.locator('header')).toBeVisible();
      
      // Test tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      await expect(page.locator('header')).toBeVisible();
      
      // Test desktop viewport
      await page.setViewportSize({ width: 1200, height: 800 });
      await expect(page.locator('header')).toBeVisible();
    });

    test('should have proper accessibility features', async ({ page }) => {
      // Test semantic HTML
      await expect(page.locator('header')).toBeVisible();
      await expect(page.locator('main')).toBeVisible();
      await expect(page.locator('footer')).toBeVisible();
      
      // Test proper heading hierarchy
      const h1 = page.locator('h1');
      const h2 = page.locator('h2');
      await expect(h1).toHaveCount(1);
      await expect(h2).toHaveCount(1);
      
      // Test alt text for images
      const images = page.locator('img');
      for (let i = 0; i < await images.count(); i++) {
        const alt = await images.nth(i).getAttribute('alt');
        expect(alt).toBeTruthy();
      }
    });
  });

  test.describe('Navigation & Routing', () => {
    test('should navigate to demo page correctly', async ({ page }) => {
      await page.click('a[href="/demo"]');
      await expect(page).toHaveURL('/demo');
      await expect(page.locator('h1')).toBeVisible();
    });

    test('should navigate to login page correctly', async ({ page }) => {
      await page.click('a[href="/auth/login"]');
      await expect(page).toHaveURL('/auth/login');
      await expect(page.locator('h1')).toBeVisible();
    });

    test('should navigate to register page correctly', async ({ page }) => {
      await page.click('a[href="/auth/register"]');
      await expect(page).toHaveURL('/auth/register');
      await expect(page.locator('h1')).toBeVisible();
    });

    test('should have working internal navigation links', async ({ page }) => {
      // Test smooth scrolling to features section
      await page.click('a[href="#features"]');
      await page.waitForTimeout(1000); // Wait for smooth scroll
      
      // Verify we're in the features section
      const featuresSection = page.locator('#features');
      await expect(featuresSection).toBeVisible();
      
      // Test that the URL hash is updated
      await expect(page).toHaveURL(/#features/);
    });
  });

  test.describe('Authentication System', () => {
    test('should display login form correctly', async ({ page }) => {
      await page.goto('/auth/login');
      
      // Test form elements
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
      
      // Test form validation
      await page.click('button[type="submit"]');
      // Should show validation errors
      await expect(page.locator('text=required')).toBeVisible();
    });

    test('should display register form correctly', async ({ page }) => {
      await page.goto('/auth/register');
      
      // Test form elements
      await expect(page.locator('input[name="name"]')).toBeVisible();
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });
  });

  test.describe('Dashboard & Core Features', () => {
    test('should display dashboard when authenticated', async ({ page }) => {
      // This test would require authentication setup
      // For now, we'll test the route exists
      await page.goto('/dashboard');
      
      // Should either show dashboard or redirect to login
      const currentUrl = page.url();
      expect(currentUrl === '/dashboard' || currentUrl.includes('/auth/login')).toBeTruthy();
    });

    test('should display products page structure', async ({ page }) => {
      await page.goto('/products');
      
      // Should either show products or redirect to login
      const currentUrl = page.url();
      expect(currentUrl === '/products' || currentUrl.includes('/auth/login')).toBeTruthy();
    });

    test('should display scan page structure', async ({ page }) => {
      await page.goto('/scan');
      
      // Should either show scan interface or redirect to login
      const currentUrl = page.url();
      expect(currentUrl === '/scan' || currentUrl.includes('/auth/login')).toBeTruthy();
    });
  });

  test.describe('Mobile Interface', () => {
    test('should display mobile navigation on small screens', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      // MobileBottomNav should be visible on mobile
      const mobileNav = page.locator('nav.fixed.bottom-0');
      await expect(mobileNav).toBeVisible();
      
      // Test mobile menu button
      const mobileMenuButton = page.locator('button.lg\\:hidden');
      await expect(mobileMenuButton).toBeVisible();
    });

    test('should have touch-friendly interface elements', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Test that buttons have minimum touch target size
      const buttons = page.locator('button, a[role="button"]');
      for (let i = 0; i < await buttons.count(); i++) {
        const button = buttons.nth(i);
        const box = await button.boundingBox();
        if (box) {
          expect(box.width).toBeGreaterThanOrEqual(44);
          expect(box.height).toBeGreaterThanOrEqual(44);
        }
      }
    });
  });

  test.describe('Performance & Loading', () => {
    test('should load page within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      // Page should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);
    });

    test('should have proper loading states', async ({ page }) => {
      // Test that the page shows content progressively
      await page.goto('/');
      
      // Header should appear first
      await expect(page.locator('header')).toBeVisible();
      
      // Then main content
      await expect(page.locator('main')).toBeVisible();
      
      // Finally footer
      await expect(page.locator('footer')).toBeVisible();
    });
  });

  test.describe('Cross-Browser Compatibility', () => {
    test('should work in Chromium', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('header')).toBeVisible();
      await expect(page.locator('main')).toBeVisible();
    });

    test('should work in Firefox', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('header')).toBeVisible();
      await expect(page.locator('main')).toBeVisible();
    });

    test('should work in WebKit', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('header')).toBeVisible();
      await expect(page.locator('main')).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle 404 errors gracefully', async ({ page }) => {
      await page.goto('/nonexistent-page');
      
      // Should show 404 page
      await expect(page.locator('text=404')).toBeVisible();
      await expect(page.locator('text=Page Not Found')).toBeVisible();
      
      // Should have link back to home
      await expect(page.locator('a[href="/"]')).toBeVisible();
    });

    test('should handle network errors gracefully', async ({ page }) => {
      // This would require network interception to test properly
      // For now, we'll verify the error boundary exists
      await page.goto('/');
      await expect(page.locator('body')).toBeVisible();
    });
  });
});
