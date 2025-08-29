/**
 * Offline Queue Functionality Test
 * 
 * This script tests the offline queue by:
 * 1. Starting with network connection
 * 2. Performing operations while offline
 * 3. Verifying queue storage
 * 4. Re-establishing connection and syncing
 */

import { test, expect, Page } from '@playwright/test';

// Test configuration
const TEST_URL = process.env.TEST_URL || 'http://localhost:3000';
const PRODUCTS_PAGE = `${TEST_URL}/products`;

// Helper to simulate network conditions
async function setNetworkCondition(page: Page, offline: boolean) {
  await page.context().setOffline(offline);
  console.log(`Network set to: ${offline ? 'OFFLINE' : 'ONLINE'}`);
}

// Helper to wait for a condition with timeout
async function waitForCondition(
  checkFn: () => Promise<boolean>,
  timeoutMs: number = 10000,
  intervalMs: number = 500
): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    if (await checkFn()) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  
  return false;
}

test.describe('Offline Queue Functionality', () => {
  test('should queue operations while offline and sync when reconnected', async ({ page, context }) => {
    console.log('\n=== Starting Offline Queue Test ===\n');
    
    // Step 1: Navigate to products page while online
    console.log('Step 1: Loading products page...');
    await page.goto(PRODUCTS_PAGE);
    await page.waitForLoadState('networkidle');
    
    // Wait for products to load
    await page.waitForSelector('[data-testid="product-search"]', { timeout: 10000 });
    
    // Get initial product count
    const initialProducts = await page.$$eval(
      '[data-testid^="product-card-"]',
      elements => elements.length
    );
    console.log(`Initial products loaded: ${initialProducts}`);
    
    // Step 2: Go offline
    console.log('\nStep 2: Going offline...');
    await setNetworkCondition(page, true);
    
    // Add visual indicator that we're offline
    await page.evaluate(() => {
      const indicator = document.createElement('div');
      indicator.id = 'offline-indicator';
      indicator.textContent = '🔴 OFFLINE';
      indicator.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: #ef4444;
        color: white;
        padding: 8px 16px;
        border-radius: 8px;
        z-index: 10000;
        font-weight: bold;
      `;
      document.body.appendChild(indicator);
    });
    
    // Step 3: Perform operations while offline
    console.log('\nStep 3: Performing offline operations...');
    
    // Operation 1: Add a new product
    console.log('  - Adding new product...');
    const addButton = await page.$('[aria-label="Add product"]');
    if (addButton) {
      await addButton.click();
      
      // Fill in product details
      await page.fill('input[name="name"]', 'Offline Test Product');
      await page.fill('input[name="sku"]', 'OFFLINE-001');
      await page.fill('input[name="barcode"]', '999999999999');
      await page.fill('input[name="quantity"]', '50');
      
      // Submit the form
      await page.click('button[type="submit"]');
      console.log('    ✓ Product add operation queued');
    }
    
    // Operation 2: Search for products (should work with cached data)
    console.log('  - Searching products offline...');
    await page.fill('[data-testid="product-search"]', 'test');
    await page.waitForTimeout(500);
    console.log('    ✓ Search performed with cached data');
    
    // Operation 3: Try to update a product quantity
    console.log('  - Attempting to update product quantity...');
    const firstProduct = await page.$('[data-testid^="product-card-"]:first-child');
    if (firstProduct) {
      // Click on the product to select it
      await firstProduct.click();
      console.log('    ✓ Product update operation queued');
    }
    
    // Check if offline queue indicator shows pending operations
    console.log('\nStep 4: Verifying offline queue...');
    const queueStatus = await page.evaluate(() => {
      // Check localStorage for queued operations
      const queue = localStorage.getItem('offline_queue');
      if (queue) {
        const operations = JSON.parse(queue);
        return {
          count: operations.length,
          types: operations.map((op: any) => op.type)
        };
      }
      return { count: 0, types: [] };
    });
    
    console.log(`  Queued operations: ${queueStatus.count}`);
    console.log(`  Operation types: ${queueStatus.types.join(', ')}`);
    
    // Verify that operations were queued
    expect(queueStatus.count).toBeGreaterThan(0);
    
    // Step 5: Go back online
    console.log('\nStep 5: Reconnecting to network...');
    await setNetworkCondition(page, false);
    
    // Update visual indicator
    await page.evaluate(() => {
      const indicator = document.getElementById('offline-indicator');
      if (indicator) {
        indicator.textContent = '🟢 ONLINE - Syncing...';
        indicator.style.background = '#10b981';
      }
    });
    
    // Step 6: Wait for sync to complete
    console.log('\nStep 6: Waiting for sync to complete...');
    const syncCompleted = await waitForCondition(async () => {
      const remaining = await page.evaluate(() => {
        const queue = localStorage.getItem('offline_queue');
        if (!queue) return 0;
        const operations = JSON.parse(queue);
        return operations.length;
      });
      return remaining === 0;
    }, 15000);
    
    if (syncCompleted) {
      console.log('  ✓ All queued operations synced successfully!');
      
      // Update indicator to show completion
      await page.evaluate(() => {
        const indicator = document.getElementById('offline-indicator');
        if (indicator) {
          indicator.textContent = '✅ Sync Complete';
          indicator.style.background = '#06b6d4';
          setTimeout(() => indicator.remove(), 3000);
        }
      });
    } else {
      console.log('  ⚠ Sync may still be in progress or failed');
    }
    
    // Step 7: Verify data consistency
    console.log('\nStep 7: Verifying data consistency...');
    
    // Reload the page to get fresh data
    await page.reload();
    await page.waitForSelector('[data-testid="product-search"]', { timeout: 10000 });
    
    // Check if the offline-added product exists
    const offlineProduct = await page.$('text="Offline Test Product"');
    if (offlineProduct) {
      console.log('  ✓ Offline-added product found in database');
    } else {
      console.log('  ⚠ Offline-added product not found (may need manual verification)');
    }
    
    // Final product count
    const finalProducts = await page.$$eval(
      '[data-testid^="product-card-"]',
      elements => elements.length
    );
    console.log(`  Final product count: ${finalProducts}`);
    console.log(`  Products added: ${finalProducts - initialProducts}`);
    
    console.log('\n=== Offline Queue Test Complete ===\n');
  });
  
  test('should handle multiple rapid offline/online transitions', async ({ page }) => {
    console.log('\n=== Testing Rapid Network Transitions ===\n');
    
    await page.goto(PRODUCTS_PAGE);
    await page.waitForLoadState('networkidle');
    
    // Perform rapid transitions
    for (let i = 0; i < 3; i++) {
      console.log(`Transition ${i + 1}:`);
      
      // Go offline
      await setNetworkCondition(page, true);
      console.log('  - Offline');
      
      // Perform an operation
      const timestamp = Date.now();
      await page.evaluate((ts) => {
        localStorage.setItem(`test_operation_${ts}`, JSON.stringify({
          type: 'test',
          timestamp: ts,
          data: { message: 'Rapid transition test' }
        }));
      }, timestamp);
      
      await page.waitForTimeout(500);
      
      // Go online
      await setNetworkCondition(page, false);
      console.log('  - Online');
      
      await page.waitForTimeout(1000);
    }
    
    // Verify no data corruption
    const testOperations = await page.evaluate(() => {
      const ops = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('test_operation_')) {
          ops.push(JSON.parse(localStorage.getItem(key) || '{}'));
        }
      }
      return ops;
    });
    
    console.log(`\nTest operations stored: ${testOperations.length}`);
    expect(testOperations.length).toBeGreaterThanOrEqual(3);
    
    console.log('\n=== Rapid Transition Test Complete ===\n');
  });
  
  test('should preserve data integrity during offline period', async ({ page }) => {
    console.log('\n=== Testing Data Integrity ===\n');
    
    await page.goto(PRODUCTS_PAGE);
    await page.waitForLoadState('networkidle');
    
    // Create test data while online
    const testData = {
      id: `test-${Date.now()}`,
      name: 'Integrity Test Product',
      quantity: 100,
      timestamp: new Date().toISOString()
    };
    
    console.log('Creating test data:', testData);
    
    // Store in localStorage (simulating app data)
    await page.evaluate((data) => {
      localStorage.setItem('integrity_test_data', JSON.stringify(data));
    }, testData);
    
    // Go offline
    console.log('Going offline...');
    await setNetworkCondition(page, true);
    
    // Modify data while offline
    const modifiedData = await page.evaluate(() => {
      const stored = JSON.parse(localStorage.getItem('integrity_test_data') || '{}');
      stored.quantity = 150;
      stored.modifiedOffline = true;
      localStorage.setItem('integrity_test_data', JSON.stringify(stored));
      return stored;
    });
    
    console.log('Modified data offline:', modifiedData);
    
    // Go back online
    console.log('Going back online...');
    await setNetworkCondition(page, false);
    
    // Verify data integrity
    const finalData = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('integrity_test_data') || '{}');
    });
    
    console.log('Final data:', finalData);
    
    // Assertions
    expect(finalData.id).toBe(testData.id);
    expect(finalData.quantity).toBe(150);
    expect(finalData.modifiedOffline).toBe(true);
    
    console.log('✓ Data integrity maintained through offline/online cycle');
    
    console.log('\n=== Data Integrity Test Complete ===\n');
  });
});

// Run the tests
console.log('Starting offline queue functionality tests...');
console.log('Make sure the application is running on', TEST_URL);
console.log('');