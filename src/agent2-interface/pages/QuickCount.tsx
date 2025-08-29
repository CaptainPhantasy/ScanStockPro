'use client';

import { useState, useCallback, useRef } from 'react';
import { ScannerLayout } from '../layouts/ScannerLayout';
import { BarcodeScanner } from '../camera/BarcodeScanner';
import { QuantityControl } from '../components/mobile/QuantityControl';
import { useOffline } from '../hooks/useOffline';
import type { Product, BarcodeData } from '../../shared/contracts/agent-interfaces';

interface CountEntry {
  id: string;
  product: Product;
  quantity: number;
  timestamp: Date;
  location?: string;
  notes?: string;
}

// Mock product lookup - will be replaced by Agent 3 integration
const MOCK_PRODUCT_LOOKUP = (barcode: string): Product | null => {
  const mockProducts: Record<string, Product> = {
    '123456789012': {
      id: '1',
      name: 'Wireless Bluetooth Headphones',
      sku: 'WH-BT-001',
      barcode: '123456789012',
      currentQuantity: 45,
    },
    '123456789013': {
      id: '2',
      name: 'USB-C Cable 3ft',
      sku: 'USB-C-3FT',
      barcode: '123456789013',
      currentQuantity: 120,
    },
  };
  
  return mockProducts[barcode] || null;
};

export default function QuickCount() {
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [counts, setCounts] = useState<CountEntry[]>([]);
  const [isScanning, setIsScanning] = useState(true);
  const [scanMode, setScanMode] = useState<'barcode' | 'image'>('barcode');
  
  const { queueOperation } = useOffline();
  const locationInputRef = useRef<HTMLInputElement>(null);

  const handleScanComplete = useCallback(async (barcodeData: BarcodeData) => {
    console.log('Barcode scanned in QuickCount:', barcodeData);
    
    // Look up product by barcode
    const product = MOCK_PRODUCT_LOOKUP(barcodeData.barcode);
    
    if (product) {
      setCurrentProduct(product);
      setIsScanning(false);
      // Auto-focus location input
      setTimeout(() => locationInputRef.current?.focus(), 100);
    } else {
      // Product not found - show error or create new product flow
      alert('Product not found. Please add this product first.');
      // TODO: Integrate with Agent 3 for new product creation
    }
  }, []);

  const handleSubmitCount = useCallback(async () => {
    if (!currentProduct) return;
    
    const countEntry: CountEntry = {
      id: Date.now().toString(),
      product: currentProduct,
      quantity,
      timestamp: new Date(),
      location: location || undefined,
      notes: notes || undefined,
    };
    
    // Add to local counts
    setCounts(prev => [countEntry, ...prev]);
    
    // Queue for offline sync
    queueOperation({
      type: 'count',
      data: {
        productId: currentProduct.id,
        quantity,
        location,
        notes,
        timestamp: countEntry.timestamp.toISOString(),
      },
      maxRetries: 5, // Counts are critical, retry more
    });
    
    // Reset form
    setCurrentProduct(null);
    setQuantity(1);
    setLocation('');
    setNotes('');
    setIsScanning(true);
    
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 50, 100]);
    }
    
    console.log('Count submitted:', countEntry);
  }, [currentProduct, quantity, location, notes, queueOperation]);

  const handleCancel = useCallback(() => {
    setCurrentProduct(null);
    setQuantity(1);
    setLocation('');
    setNotes('');
    setIsScanning(true);
  }, []);

  const handleExit = useCallback(() => {
    // Navigate back or close
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/';
    }
  }, []);

  return (
    <ScannerLayout>
      {isScanning ? (
        /* Scanner Mode */
        <div className="relative h-full">
          <BarcodeScanner
            onScanComplete={handleScanComplete}
            scanMode={scanMode}
            className="h-full"
          />
          
          {/* Top Controls */}
          <div className="absolute top-0 left-0 right-0 safe-top z-10">
            <div className="flex justify-between items-center p-warehouse-md">
              <button
                onClick={handleExit}
                className="
                  thumb-zone bg-black/50 backdrop-blur-xs
                  rounded-mobile-lg text-white
                  flex items-center justify-center
                "
                data-testid="quick-count-exit"
              >
                ←
              </button>
              
              <div className="bg-black/50 backdrop-blur-xs rounded-mobile-lg px-4 py-2">
                <h1 className="text-mobile-base font-semibold text-white">
                  Quick Count
                </h1>
              </div>
              
              <button
                onClick={() => setScanMode(scanMode === 'barcode' ? 'image' : 'barcode')}
                className="
                  thumb-zone bg-black/50 backdrop-blur-xs
                  rounded-mobile-lg text-white text-mobile-sm font-medium
                  flex items-center justify-center
                "
              >
                {scanMode === 'barcode' ? '📊' : '📷'}
              </button>
            </div>
          </div>
          
          {/* Recent Counts Overlay */}
          {counts.length > 0 && (
            <div className="absolute bottom-20 left-4 right-4">
              <div className="bg-black/50 backdrop-blur-xs rounded-mobile-lg p-warehouse-sm">
                <div className="text-white text-mobile-sm font-medium mb-2">
                  Recent Counts: {counts.length}
                </div>
                <div className="text-white text-mobile-xs opacity-80">
                  {counts[0].product.name}: {counts[0].quantity}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Count Entry Mode */
        <div className="h-full bg-white flex flex-col">
          {/* Header */}
          <div className="bg-warehouse-500 text-white safe-top">
            <div className="flex items-center justify-between p-warehouse-md">
              <button
                onClick={handleCancel}
                className="thumb-zone flex items-center justify-center"
              >
                ←
              </button>
              <h1 className="text-mobile-lg font-semibold">Enter Count</h1>
              <div className="thumb-zone" /> {/* Spacer */}
            </div>
          </div>
          
          {/* Product Info */}
          {currentProduct && (
            <div className="bg-white border-b border-neutral-200 p-warehouse-md">
              <h2 className="text-mobile-lg font-bold text-neutral-900 mb-1">
                {currentProduct.name}
              </h2>
              <div className="flex items-center gap-warehouse-md text-mobile-sm text-neutral-600">
                <span>SKU: {currentProduct.sku}</span>
                <span>Current: {currentProduct.currentQuantity}</span>
              </div>
            </div>
          )}
          
          {/* Form */}
          <div className="flex-1 p-warehouse-md space-y-warehouse-lg">
            {/* Quantity */}
            <div>
              <label className="block text-mobile-base font-semibold text-neutral-900 mb-warehouse-sm">
                Quantity Counted
              </label>
              <QuantityControl
                value={quantity}
                onChange={setQuantity}
                min={0}
                max={9999}
                className="w-full"
              />
            </div>
            
            {/* Location */}
            <div>
              <label className="block text-mobile-base font-semibold text-neutral-900 mb-warehouse-sm">
                Location (Optional)
              </label>
              <input
                ref={locationInputRef}
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Shelf A-1, Bin 23"
                className="
                  w-full p-warehouse-sm border border-neutral-200 rounded-mobile
                  text-mobile-base placeholder-neutral-500
                  focus:border-warehouse-500 focus:outline-none focus:ring-2 focus:ring-warehouse-200
                "
                data-testid="location-input"
              />
            </div>
            
            {/* Notes */}
            <div>
              <label className="block text-mobile-base font-semibold text-neutral-900 mb-warehouse-sm">
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional observations..."
                rows={3}
                className="
                  w-full p-warehouse-sm border border-neutral-200 rounded-mobile
                  text-mobile-base placeholder-neutral-500 resize-none
                  focus:border-warehouse-500 focus:outline-none focus:ring-2 focus:ring-warehouse-200
                "
                data-testid="notes-input"
              />
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="p-warehouse-md safe-bottom border-t border-neutral-200">
            <div className="flex gap-warehouse-sm">
              <button
                onClick={handleCancel}
                className="
                  flex-1 py-warehouse-md px-warehouse-lg
                  bg-neutral-100 hover:bg-neutral-200
                  active:bg-neutral-300 active:scale-95
                  text-neutral-700 text-mobile-base font-semibold
                  rounded-mobile-lg transition-all duration-150
                "
                data-testid="cancel-count"
              >
                Cancel
              </button>
              
              <button
                onClick={handleSubmitCount}
                className="
                  flex-2 py-warehouse-md px-warehouse-lg
                  bg-warehouse-500 hover:bg-warehouse-600
                  active:bg-warehouse-700 active:scale-95
                  text-white text-mobile-base font-semibold
                  rounded-mobile-lg transition-all duration-150
                "
                data-testid="submit-count"
              >
                Submit Count: {quantity}
              </button>
            </div>
          </div>
        </div>
      )}
    </ScannerLayout>
  );
}