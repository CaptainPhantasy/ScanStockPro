import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Visual Regression Testing', () => {
  const screenshotDir = 'test-results/screenshots';
  
  test.beforeEach(async ({ page }) => {
    // Set consistent viewport for consistent screenshots
    await page.setViewportSize({ width: 1200, height: 800 });
  });

  test('landing page - desktop view', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Take full page screenshot
    await page.screenshot({
      path: path.join(screenshotDir, 'landing-page-desktop.png'),
      fullPage: true
    });
    
    // Verify key elements are visible
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('footer')).toBeVisible();
  });

  test('landing page - mobile view', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Take full page screenshot
    await page.screenshot({
      path: path.join(screenshotDir, 'landing-page-mobile.png'),
      fullPage: true
    });
    
    // Verify mobile-specific elements
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('nav.fixed.bottom-0')).toBeVisible();
  });

  test('landing page - tablet view', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Take full page screenshot
    await page.screenshot({
      path: path.join(screenshotDir, 'landing-page-tablet.png'),
      fullPage: true
    });
  });

  test('features section - detailed view', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Scroll to features section
    await page.evaluate(() => {
      document.getElementById('features')?.scrollIntoView();
    });
    await page.waitForTimeout(1000);
    
    // Take screenshot of features section
    const featuresSection = page.locator('#features');
    await featuresSection.screenshot({
      path: path.join(screenshotDir, 'features-section.png')
    });
    
    // Verify all feature cards are visible
    const featureCards = page.locator('#features .bg-white.rounded-lg');
    await expect(featureCards).toHaveCount(6);
  });

  test('navigation bar - detailed view', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of navigation bar
    const header = page.locator('header');
    await header.screenshot({
      path: path.join(screenshotDir, 'navigation-bar.png')
    });
    
    // Verify navigation elements
    await expect(page.locator('nav a[href="#features"]')).toBeVisible();
    await expect(page.locator('nav a[href="/demo"]')).toBeVisible();
    await expect(page.locator('a[href="/auth/login"]')).toBeVisible();
    await expect(page.locator('a[href="/auth/register"]')).toBeVisible();
  });

  test('hero section - detailed view', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of hero section
    const heroSection = page.locator('main > div:first-child');
    await heroSection.screenshot({
      path: path.join(screenshotDir, 'hero-section.png')
    });
    
    // Verify hero content
    await expect(page.locator('h1:has-text("Professional")')).toBeVisible();
    await expect(page.locator('h1:has-text("Inventory Management")')).toBeVisible();
  });

  test('demo page - desktop view', async ({ page }) => {
    await page.goto('/demo');
    await page.waitForLoadState('networkidle');
    
    // Take full page screenshot
    await page.screenshot({
      path: path.join(screenshotDir, 'demo-page-desktop.png'),
      fullPage: true
    });
    
    // Verify demo page content
    await expect(page.locator('h1')).toBeVisible();
  });

  test('login page - desktop view', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');
    
    // Take full page screenshot
    await page.screenshot({
      path: path.join(screenshotDir, 'login-page-desktop.png'),
      fullPage: true
    });
    
    // Verify login form elements
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('register page - desktop view', async ({ page }) => {
    await page.goto('/auth/register');
    await page.waitForLoadState('networkidle');
    
    // Take full page screenshot
    await page.screenshot({
      path: path.join(screenshotDir, 'register-page-desktop.png'),
      fullPage: true
    });
    
    // Verify register form elements
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('404 error page', async ({ page }) => {
    await page.goto('/nonexistent-page');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of 404 page
    await page.screenshot({
      path: path.join(screenshotDir, '404-error-page.png'),
      fullPage: true
    });
    
    // Verify 404 content
    await expect(page.locator('text=404')).toBeVisible();
    await expect(page.locator('text=Page Not Found')).toBeVisible();
  });

  test('mobile bottom navigation', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of mobile navigation
    const mobileNav = page.locator('nav.fixed.bottom-0');
    await mobileNav.screenshot({
      path: path.join(screenshotDir, 'mobile-bottom-nav.png')
    });
    
    // Verify mobile navigation elements
    await expect(mobileNav).toBeVisible();
    await expect(page.locator('text=Home')).toBeVisible();
    await expect(page.locator('text=Products')).toBeVisible();
    await expect(page.locator('text=Scan')).toBeVisible();
    await expect(page.locator('text=Reports')).toBeVisible();
    await expect(page.locator('text=More')).toBeVisible();
  });

  test('responsive breakpoints', async ({ page }) => {
    const breakpoints = [
      { name: 'mobile', width: 375, height: 667 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1200, height: 800 },
      { name: 'large-desktop', width: 1920, height: 1080 }
    ];
    
    for (const breakpoint of breakpoints) {
      await page.setViewportSize({ width: breakpoint.width, height: breakpoint.height });
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Take screenshot for each breakpoint
      await page.screenshot({
        path: path.join(screenshotDir, `responsive-${breakpoint.name}.png`),
        fullPage: true
      });
      
      // Verify basic layout works at each breakpoint
      await expect(page.locator('header')).toBeVisible();
      await expect(page.locator('main')).toBeVisible();
    }
  });
});
