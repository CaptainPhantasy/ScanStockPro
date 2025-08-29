'use client';

import { useState, useCallback } from 'react';
import { MobileLayout } from '../layouts/MobileLayout';
import { ScannerSheet } from '../components/mobile/ScannerSheet';
import { ProductCard } from '../components/mobile/ProductCard';
import { useOffline } from '../hooks/useOffline';
import { usePWA } from '../pwa/register';
import type { Product, BarcodeData } from '../../shared/contracts/agent-interfaces';

// Mock recent scans - will be replaced by real data from Agent 3
const MOCK_RECENT_SCANS: Product[] = [
  {
    id: '1',
    name: 'Wireless Headphones',
    sku: 'WH-001',
    barcode: '123456789012',
    currentQuantity: 45,
  },
  {
    id: '2',
    name: 'USB-C Cable 3ft',
    sku: 'USB-C-3',
    barcode: '123456789013',
    currentQuantity: 120,
  },
  {
    id: '3',
    name: 'Phone Case Clear',
    sku: 'PC-CLR-001',
    barcode: '123456789014',
    currentQuantity: 8,
  },
];

export default function Home() {
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [recentScans, setRecentScans] = useState<Product[]>(MOCK_RECENT_SCANS);
  
  const { isOffline, queueLength, syncQueue } = useOffline();
  const { isInstalled, canInstall, install } = usePWA();

  const handleOpenScanner = useCallback(() => {
    setIsScannerOpen(true);
  }, []);

  const handleCloseScanner = useCallback(() => {
    setIsScannerOpen(false);
    setCurrentProduct(null);
  }, []);

  const handleScanComplete = useCallback(async (barcodeData: BarcodeData) => {
    console.log('Barcode scanned:', barcodeData);
    
    // TODO: Integrate with Agent 3 to find product by barcode
    // For now, simulate finding a product
    const foundProduct = MOCK_RECENT_SCANS.find(p => p.barcode === barcodeData.barcode);
    
    if (foundProduct) {
      setCurrentProduct(foundProduct);
    } else {
      // Product not found - create new product flow
      const newProduct: Product = {
        id: Date.now().toString(),
        name: 'Unknown Product',
        sku: 'NEW-' + Date.now(),
        barcode: barcodeData.barcode,
        currentQuantity: 0,
      };
      setCurrentProduct(newProduct);
    }
  }, []);

  const handleCountSubmit = useCallback((product: Product, quantity: number) => {
    console.log('Count submitted:', { product, quantity });
    
    // TODO: Integrate with Agent 3 to submit count
    // Update local state
    setRecentScans(prev => {
      const updated = prev.map(p => 
        p.id === product.id 
          ? { ...p, currentQuantity: quantity }
          : p
      );
      
      // Add to recent scans if not already there
      if (!prev.find(p => p.id === product.id)) {
        updated.unshift({ ...product, currentQuantity: quantity });
      }
      
      return updated.slice(0, 5); // Keep only 5 recent scans
    });
    
    setIsScannerOpen(false);
    setCurrentProduct(null);
  }, []);

  const handleProductSelect = useCallback((product: Product) => {
    setCurrentProduct(product);
    setIsScannerOpen(true);
  }, []);

  return (
    <MobileLayout>
      {/* Header */}
      <div className="bg-white border-b border-neutral-200 px-warehouse-md py-warehouse-sm safe-top">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-mobile-xl font-bold text-neutral-900">
              ScanStock Pro
            </h1>
            <p className="text-mobile-sm text-neutral-600">
              Ready to scan
            </p>
          </div>
          
          <div className="flex items-center gap-warehouse-sm">
            {/* Offline indicator */}
            {isOffline && (
              <div className="flex items-center gap-1 px-2 py-1 bg-warning-100 rounded-mobile text-warning-700">
                <div className="w-2 h-2 bg-warning-500 rounded-full" />
                <span className="text-mobile-xs font-medium">Offline</span>
              </div>
            )}
            
            {/* Sync queue indicator */}
            {queueLength > 0 && (
              <button
                onClick={syncQueue}
                className="flex items-center gap-1 px-2 py-1 bg-warehouse-100 rounded-mobile text-warehouse-700"
              >
                <div className="w-2 h-2 bg-warehouse-500 rounded-full animate-pulse" />
                <span className="text-mobile-xs font-medium">{queueLength}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Install App Prompt */}
      {canInstall && !isInstalled && (
        <div className="bg-warehouse-50 border-b border-warehouse-200 p-warehouse-md">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-mobile-base font-semibold text-warehouse-900">
                Install ScanStock Pro
              </h3>
              <p className="text-mobile-sm text-warehouse-600">
                Add to your home screen for faster access
              </p>
            </div>
            <button
              onClick={install}
              className="ml-warehouse-sm py-2 px-4 bg-warehouse-500 text-white rounded-mobile text-mobile-sm font-medium"
            >
              Install
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 p-warehouse-md">
        {/* Quick Action Cards */}
        <div className="grid grid-cols-2 gap-warehouse-md mb-warehouse-lg">
          <button
            onClick={handleOpenScanner}
            className="
              p-warehouse-lg bg-warehouse-500 hover:bg-warehouse-600
              active:bg-warehouse-700 active:scale-95
              rounded-mobile-lg text-white
              flex flex-col items-center gap-warehouse-sm
              transition-all duration-150
            "
            data-testid="scan-button"
          >
            <div className="text-4xl">📷</div>
            <span className="text-mobile-base font-semibold">Scan Barcode</span>
            <span className="text-mobile-xs opacity-90">Tap to open scanner</span>
          </button>
          
          <button
            className="
              p-warehouse-lg bg-neutral-100 hover:bg-neutral-200
              active:bg-neutral-300 active:scale-95
              rounded-mobile-lg text-neutral-700
              flex flex-col items-center gap-warehouse-sm
              transition-all duration-150
            "
            data-testid="quick-count-button"
          >
            <div className="text-4xl">🔢</div>
            <span className="text-mobile-base font-semibold">Quick Count</span>
            <span className="text-mobile-xs opacity-70">Manual entry</span>
          </button>
        </div>

        {/* Recent Scans */}
        <div className="mb-warehouse-lg">
          <div className="flex items-center justify-between mb-warehouse-md">
            <h2 className="text-mobile-lg font-semibold text-neutral-900">
              Recent Scans
            </h2>
            <button className="text-mobile-sm text-warehouse-600 font-medium">
              View All
            </button>
          </div>
          
          <div className="space-y-warehouse-sm">
            {recentScans.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onSelect={handleProductSelect}
                showActions={false}
                className="bg-white shadow-sm"
              />
            ))}
          </div>
          
          {recentScans.length === 0 && (
            <div className="bg-neutral-50 rounded-mobile-lg p-warehouse-lg text-center">
              <div className="text-4xl mb-warehouse-sm">📱</div>
              <p className="text-mobile-base text-neutral-600 mb-warehouse-xs">
                No scans yet
              </p>
              <p className="text-mobile-sm text-neutral-500">
                Tap the scan button to get started
              </p>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-warehouse-md">
          <div className="bg-white rounded-mobile-lg p-warehouse-md border border-neutral-200">
            <div className="text-mobile-sm text-neutral-600 mb-1">Today's Scans</div>
            <div className="text-mobile-xl font-bold text-neutral-900">0</div>
          </div>
          
          <div className="bg-white rounded-mobile-lg p-warehouse-md border border-neutral-200">
            <div className="text-mobile-sm text-neutral-600 mb-1">Total Products</div>
            <div className="text-mobile-xl font-bold text-neutral-900">0</div>
          </div>
        </div>
      </div>

      {/* Scanner Sheet */}
      <ScannerSheet
        isOpen={isScannerOpen}
        onClose={handleCloseScanner}
        onScanComplete={handleScanComplete}
        onCountSubmit={handleCountSubmit}
        currentProduct={currentProduct}
      />
    </MobileLayout>
  );
}