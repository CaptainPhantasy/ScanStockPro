import { test, expect } from '@playwright/test';

test.describe('Database Setup Verification', () => {
  test('should have all required tables created', async ({ page }) => {
    // Navigate to a page that can execute database queries
    await page.goto('/api/health');
    
    // This would typically be an API endpoint that checks database health
    // For now, we'll verify the expected response structure
    const response = await page.waitForResponse('**/api/health');
    const data = await response.json();
    
    expect(data.status).toBe('healthy');
    expect(data.tables).toBeDefined();
    expect(data.policies).toBeDefined();
    expect(data.functions).toBeDefined();
  });

  test('should have RLS policies enabled on all tables', async ({ page }) => {
    await page.goto('/api/health');
    
    const response = await page.waitForResponse('**/api/health');
    const data = await response.json();
    
    const requiredTables = [
      'businesses', 'team_members', 'products', 'product_categories',
      'inventory_counts', 'counting_sessions', 'sync_queue', 'ai_usage'
    ];
    
    requiredTables.forEach(table => {
      expect(data.tables[table]).toBeDefined();
      expect(data.tables[table].rls_enabled).toBe(true);
    });
  });

  test('should have all required functions created', async ({ page }) => {
    await page.goto('/api/health');
    
    const response = await page.waitForResponse('**/api/health');
    const data = await response.json();
    
    const requiredFunctions = [
      'update_updated_at_column', 'update_product_quantity',
      'track_product_access', 'get_products_mobile', 'process_sync_batch'
    ];
    
    requiredFunctions.forEach(func => {
      expect(data.functions[func]).toBeDefined();
      expect(data.functions[func].status).toBe('active');
    });
  });

  test('should have real-time subscriptions configured', async ({ page }) => {
    await page.goto('/api/health');
    
    const response = await page.waitForResponse('**/api/health');
    const data = await response.json();
    
    expect(data.realtime).toBeDefined();
    expect(data.realtime.status).toBe('active');
    
    const realtimeTables = ['inventory_counts', 'products', 'counting_sessions', 'ai_usage'];
    realtimeTables.forEach(table => {
      expect(data.realtime.tables[table]).toBe(true);
    });
  });
});
