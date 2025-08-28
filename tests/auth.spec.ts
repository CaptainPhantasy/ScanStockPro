import { test, expect } from '@playwright/test';

test.describe('Authentication System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.describe('User Registration', () => {
    test('should allow new user registration with valid email and password', async ({ page }) => {
      await page.click('[data-testid="signup-button"]');
      
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'SecurePass123!');
      await page.fill('[data-testid="confirm-password-input"]', 'SecurePass123!');
      await page.fill('[data-testid="business-name-input"]', 'Test Business');
      
      await page.click('[data-testid="register-submit"]');
      
      // Should redirect to business setup
      await expect(page).toHaveURL(/\/business\/setup/);
      await expect(page.locator('[data-testid="business-setup-form"]')).toBeVisible();
    });

    test('should validate password strength requirements', async ({ page }) => {
      await page.click('[data-testid="signup-button"]');
      
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'weak');
      
      // Should show password strength error
      await expect(page.locator('[data-testid="password-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="password-error"]')).toContainText('Password must be at least 8 characters');
    });

    test('should prevent duplicate email registration', async ({ page }) => {
      await page.click('[data-testid="signup-button"]');
      
      await page.fill('[data-testid="email-input"]', 'existing@example.com');
      await page.fill('[data-testid="password-input"]', 'SecurePass123!');
      await page.fill('[data-testid="confirm-password-input"]', 'SecurePass123!');
      await page.fill('[data-testid="business-name-input"]', 'Test Business');
      
      await page.click('[data-testid="register-submit"]');
      
      // Should show duplicate email error
      await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="email-error"]')).toContainText('Email already registered');
    });
  });

  test.describe('User Login', () => {
    test('should allow login with valid credentials', async ({ page }) => {
      await page.click('[data-testid="login-button"]');
      
      await page.fill('[data-testid="email-input"]', 'user@example.com');
      await page.fill('[data-testid="password-input"]', 'SecurePass123!');
      
      await page.click('[data-testid="login-submit"]');
      
      // Should redirect to dashboard
      await expect(page).toHaveURL(/\/dashboard/);
      await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.click('[data-testid="login-button"]');
      
      await page.fill('[data-testid="email-input"]', 'wrong@example.com');
      await page.fill('[data-testid="password-input"]', 'WrongPass123!');
      
      await page.click('[data-testid="login-submit"]');
      
      // Should show authentication error
      await expect(page.locator('[data-testid="auth-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="auth-error"]')).toContainText('Invalid credentials');
    });

    test('should handle forgot password flow', async ({ page }) => {
      await page.click('[data-testid="login-button"]');
      await page.click('[data-testid="forgot-password-link"]');
      
      await page.fill('[data-testid="email-input"]', 'user@example.com');
      await page.click('[data-testid="reset-password-submit"]');
      
      // Should show success message
      await expect(page.locator('[data-testid="reset-success"]')).toBeVisible();
      await expect(page.locator('[data-testid="reset-success"]')).toContainText('Password reset email sent');
    });
  });

  test.describe('Session Management', () => {
    test('should maintain session across page refreshes', async ({ page }) => {
      // Login first
      await page.click('[data-testid="login-button"]');
      await page.fill('[data-testid="email-input"]', 'user@example.com');
      await page.fill('[data-testid="password-input"]', 'SecurePass123!');
      await page.click('[data-testid="login-submit"]');
      
      // Verify logged in
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
      
      // Refresh page
      await page.reload();
      
      // Should still be logged in
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
      await expect(page).toHaveURL(/\/dashboard/);
    });

    test('should handle session expiration gracefully', async ({ page }) => {
      // Login first
      await page.click('[data-testid="login-button"]');
      await page.fill('[data-testid="email-input"]', 'user@example.com');
      await page.fill('[data-testid="password-input"]', 'SecurePass123!');
      await page.click('[data-testid="login-submit"]');
      
      // Simulate session expiration by clearing storage
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      
      // Try to access protected route
      await page.goto('/dashboard');
      
      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);
      await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
    });
  });

  test.describe('Role-Based Access Control', () => {
    test('should restrict admin functions to admin users only', async ({ page }) => {
      // Login as regular user
      await page.click('[data-testid="login-button"]');
      await page.fill('[data-testid="email-input"]', 'user@example.com');
      await page.fill('[data-testid="password-input"]', 'SecurePass123!');
      await page.click('[data-testid="login-submit"]');
      
      // Try to access admin panel
      await page.goto('/admin');
      
      // Should show access denied
      await expect(page.locator('[data-testid="access-denied"]')).toBeVisible();
      await expect(page.locator('[data-testid="access-denied"]')).toContainText('Access denied');
    });

    test('should allow admin users to access admin functions', async ({ page }) => {
      // Login as admin
      await page.click('[data-testid="login-button"]');
      await page.fill('[data-testid="email-input"]', 'admin@example.com');
      await page.fill('[data-testid="password-input"]', 'SecurePass123!');
      await page.click('[data-testid="login-submit"]');
      
      // Access admin panel
      await page.goto('/admin');
      
      // Should show admin dashboard
      await expect(page.locator('[data-testid="admin-dashboard"]')).toBeVisible();
      await expect(page.locator('[data-testid="user-management"]')).toBeVisible();
    });

    test('should enforce business isolation between users', async ({ page }) => {
      // Login as user from Business A
      await page.click('[data-testid="login-button"]');
      await page.fill('[data-testid="email-input"]', 'user@businessa.com');
      await page.fill('[data-testid="password-input"]', 'SecurePass123!');
      await page.click('[data-testid="login-submit"]');
      
      // Try to access data from Business B
      await page.goto('/products?business=business-b-id');
      
      // Should show no data or access denied
      await expect(page.locator('[data-testid="no-data"]')).toBeVisible();
    });
  });

  test.describe('Logout', () => {
    test('should properly logout user and clear session', async ({ page }) => {
      // Login first
      await page.click('[data-testid="login-button"]');
      await page.fill('[data-testid="email-input"]', 'user@example.com');
      await page.fill('[data-testid="password-input"]', 'SecurePass123!');
      await page.click('[data-testid="login-submit"]');
      
      // Verify logged in
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
      
      // Logout
      await page.click('[data-testid="user-menu"]');
      await page.click('[data-testid="logout-button"]');
      
      // Should redirect to home page
      await expect(page).toHaveURL('/');
      await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
      
      // Try to access protected route
      await page.goto('/dashboard');
      
      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);
    });
  });
});
