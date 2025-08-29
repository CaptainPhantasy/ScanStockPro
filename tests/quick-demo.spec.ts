import { test, expect } from '@playwright/test';

test.describe('Quick Demo Test Suite', () => {
  test('landing page loads correctly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Take a screenshot
    await page.screenshot({ path: 'test-results/landing-page-demo.png', fullPage: true });
    
    // Test basic elements
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('footer')).toBeVisible();
    
    // Test branding
    await expect(page.locator('text=ScanStock Pro')).toBeVisible();
    
    // Test navigation elements
    await expect(page.locator('a[href="/demo"]')).toBeVisible();
    await expect(page.locator('a[href="/auth/login"]')).toBeVisible();
    await expect(page.locator('a[href="/auth/register"]')).toBeVisible();
  });

  test('demo page works', async ({ page }) => {
    await page.goto('/demo');
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/demo-page-demo.png' });
    
    // Test demo page content
    await expect(page.locator('text=Demo - ScanStock Pro')).toBeVisible();
    await expect(page.locator('text=Product Recognition Demo')).toBeVisible();
    await expect(page.locator('text=Camera integration coming soon')).toBeVisible();
  });

  test('login page works', async ({ page }) => {
    await page.goto('/auth/login');
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/login-page-demo.png' });
    
    // Test login form elements
    await expect(page.locator('text=Sign in to your account')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('register page works', async ({ page }) => {
    await page.goto('/auth/register');
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/register-page-demo.png' });
    
    // Test register form elements
    await expect(page.locator('text=Create your account')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('responsive design works', async ({ page }) => {
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.screenshot({ path: 'test-results/mobile-view-demo.png', fullPage: true });
    
    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.screenshot({ path: 'test-results/tablet-view-demo.png', fullPage: true });
    
    // Test desktop view
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.screenshot({ path: 'test-results/desktop-view-demo.png', fullPage: true });
  });

  test('navigation between pages works', async ({ page }) => {
    await page.goto('/');
    
    // Test demo link
    await page.click('a[href="/demo"]');
    await expect(page).toHaveURL('/demo');
    
    // Test back to home
    await page.click('a[href="/"]');
    await expect(page).toHaveURL('/');
    
    // Test login link
    await page.click('a[href="/auth/login"]');
    await expect(page).toHaveURL('/auth/login');
    
    // Test register link
    await page.click('a[href="/auth/register"]');
    await expect(page).toHaveURL('/auth/register');
  });

  test('mobile navigation component works', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Check if mobile navigation is visible (it should be on mobile)
    const mobileNav = page.locator('[data-testid="mobile-nav"], .mobile-nav, nav');
    if (await mobileNav.isVisible()) {
      await page.screenshot({ path: 'test-results/mobile-nav-demo.png' });
    }
    
    // Test that the page is responsive
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
  });

  test('features section displays correctly', async ({ page }) => {
    await page.goto('/');
    
    // Scroll to features section
    await page.evaluate(() => {
      document.getElementById('features')?.scrollIntoView();
    });
    
    await page.waitForTimeout(500);
    
    // Take screenshot of features section
    await page.screenshot({ path: 'test-results/features-section-demo.png' });
    
    // Test feature cards
    await expect(page.locator('text=Mobile-First Design')).toBeVisible();
    await expect(page.locator('text=AI Product Recognition')).toBeVisible();
    await expect(page.locator('text=Real-Time Sync')).toBeVisible();
  });
});
