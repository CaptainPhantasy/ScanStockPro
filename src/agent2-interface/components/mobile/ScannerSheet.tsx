'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { BarcodeScanner } from '../../camera/BarcodeScanner';
import { QuantityControl } from './QuantityControl';
import type { Product, BarcodeData } from '../../../shared/contracts/agent-interfaces';

interface ScannerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onScanComplete: (data: BarcodeData) => void;
  onCountSubmit: (product: Product, quantity: number) => void;
  currentProduct?: Product | null;
  className?: string;
}

export const ScannerSheet = ({
  isOpen,
  onClose,
  onScanComplete,
  onCountSubmit,
  currentProduct,
  className = '',
}: ScannerSheetProps) => {
  const [scanMode, setScanMode] = useState<'barcode' | 'image' | 'voice'>('barcode');
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  
  const sheetRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number>(0);
  const currentYRef = useRef<number>(0);

  const hapticFeedback = useCallback((intensity: 'light' | 'medium' | 'heavy' = 'light') => {
    if ('vibrate' in navigator) {
      const patterns = {
        light: [25],
        medium: [50],
        heavy: [100],
      };
      navigator.vibrate(patterns[intensity]);
    }
  }, []);

  // Handle swipe to close
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    startYRef.current = touch.clientY;
    currentYRef.current = touch.clientY;
    setIsDragging(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    
    const touch = e.touches[0];
    currentYRef.current = touch.clientY;
    const deltaY = currentYRef.current - startYRef.current;
    
    // Only allow downward drag to close
    if (deltaY > 0) {
      setDragOffset(deltaY);
    }
  }, [isDragging]);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;
    
    const deltaY = currentYRef.current - startYRef.current;
    const threshold = 100; // pixels
    
    if (deltaY > threshold) {
      onClose();
      hapticFeedback('medium');
    } else {
      // Snap back
      setDragOffset(0);
    }
    
    setIsDragging(false);
  }, [isDragging, onClose, hapticFeedback]);

  const handleScanComplete = useCallback((barcodeData: BarcodeData) => {
    onScanComplete(barcodeData);
    hapticFeedback('medium');
  }, [onScanComplete, hapticFeedback]);

  const handleSubmitCount = useCallback(() => {
    if (currentProduct) {
      onCountSubmit(currentProduct, quantity);
      setQuantity(1);
      setNotes('');
      hapticFeedback('heavy');
    }
  }, [currentProduct, quantity, onCountSubmit, hapticFeedback]);

  const toggleFlash = useCallback(() => {
    setIsFlashOn(!isFlashOn);
    hapticFeedback('light');
  }, [isFlashOn, hapticFeedback]);

  const toggleScanMode = useCallback(() => {
    const modes: ('barcode' | 'image' | 'voice')[] = ['barcode', 'image', 'voice'];
    const currentIndex = modes.indexOf(scanMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    setScanMode(nextMode);
    hapticFeedback('light');
  }, [scanMode, hapticFeedback]);

  // Reset state when sheet closes
  useEffect(() => {
    if (!isOpen) {
      setDragOffset(0);
      setIsDragging(false);
      setQuantity(1);
      setNotes('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className={`
        fixed inset-0 z-50 bg-black
        ${className}
      `}
      data-testid="scanner-sheet"
    >
      {/* Camera View */}
      <div className="relative h-full">
        <BarcodeScanner
          onScanComplete={handleScanComplete}
          flashEnabled={isFlashOn}
          scanMode={scanMode}
          className="h-full"
        />

        {/* Top Controls */}
        <div className="absolute top-0 left-0 right-0 safe-top">
          <div className="flex justify-between items-center p-warehouse-md">
            <button
              onClick={onClose}
              className="
                thumb-zone bg-black/50 backdrop-blur-xs
                rounded-mobile-lg text-white
                flex items-center justify-center
              "
              data-testid="scanner-close"
            >
              ✕
            </button>
            
            <div className="flex gap-warehouse-sm">
              <button
                onClick={toggleFlash}
                className={`
                  thumb-zone backdrop-blur-xs rounded-mobile-lg
                  flex items-center justify-center text-mobile-lg
                  ${isFlashOn 
                    ? 'bg-warning-500 text-white' 
                    : 'bg-black/50 text-white'
                  }
                `}
                data-testid="scanner-flash"
              >
                💡
              </button>
              
              <button
                onClick={toggleScanMode}
                className="
                  thumb-zone bg-black/50 backdrop-blur-xs
                  rounded-mobile-lg text-white
                  flex items-center justify-center text-mobile-sm font-medium
                "
                data-testid="scanner-mode"
              >
                {scanMode === 'barcode' ? '📊' : scanMode === 'image' ? '📷' : '🎤'}
              </button>
            </div>
          </div>
        </div>

        {/* Scan Indicator */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative">
            {/* Scan Frame */}
            <div className="
              w-64 h-64 border-4 border-warehouse-500 rounded-mobile-xl
              animate-scan-pulse
            ">
              {/* Corner indicators */}
              <div className="absolute -top-2 -left-2 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl-lg" />
              <div className="absolute -top-2 -right-2 w-6 h-6 border-t-4 border-r-4 border-white rounded-tr-lg" />
              <div className="absolute -bottom-2 -left-2 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl-lg" />
              <div className="absolute -bottom-2 -right-2 w-6 h-6 border-b-4 border-r-4 border-white rounded-br-lg" />
            </div>
            
            {/* Instructions */}
            <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2">
              <p className="text-white text-mobile-base font-medium bg-black/50 px-4 py-2 rounded-mobile-lg backdrop-blur-xs">
                {scanMode === 'barcode' ? 'Align barcode in frame' : 
                 scanMode === 'image' ? 'Capture product image' : 
                 'Tap and speak product name'}
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Controls Sheet */}
        <div
          ref={sheetRef}
          className="absolute bottom-0 left-0 right-0 bg-white rounded-t-mobile-xl shadow-2xl"
          style={{
            transform: `translateY(${dragOffset}px)`,
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Drag Handle */}
          <div className="flex justify-center py-warehouse-sm">
            <div className="w-12 h-1 bg-neutral-300 rounded-full" />
          </div>

          <div className="p-warehouse-md safe-bottom">
            {currentProduct ? (
              /* Product Found - Count Entry */
              <div className="space-y-warehouse-md">
                <div className="text-center">
                  <h2 className="text-mobile-xl font-bold text-neutral-900">
                    {currentProduct.name}
                  </h2>
                  <p className="text-mobile-sm text-neutral-600">
                    SKU: {currentProduct.sku} • Current: {currentProduct.currentQuantity}
                  </p>
                </div>

                <QuantityControl
                  value={quantity}
                  onChange={setQuantity}
                  className="w-full"
                />

                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes (optional)"
                  className="
                    w-full p-warehouse-sm border border-neutral-200 rounded-mobile
                    text-mobile-base resize-none
                    focus:border-warehouse-500 focus:outline-none focus:ring-2 focus:ring-warehouse-200
                  "
                  rows={2}
                  data-testid="scanner-notes"
                />

                <button
                  onClick={handleSubmitCount}
                  className="
                    w-full py-warehouse-md px-warehouse-lg
                    bg-warehouse-500 hover:bg-warehouse-600
                    active:bg-warehouse-700 active:scale-95
                    text-white text-mobile-lg font-semibold
                    rounded-mobile-lg transition-all duration-150
                  "
                  data-testid="scanner-submit"
                >
                  Submit Count: {quantity}
                </button>
              </div>
            ) : (
              /* No Product - Quick Actions */
              <div className="space-y-warehouse-md">
                <h2 className="text-mobile-lg font-semibold text-center text-neutral-900">
                  Quick Actions
                </h2>
                
                <div className="grid grid-cols-2 gap-warehouse-sm">
                  <button
                    className="
                      py-warehouse-md px-warehouse-sm
                      bg-neutral-100 hover:bg-neutral-200
                      active:bg-neutral-300 active:scale-95
                      rounded-mobile text-mobile-base font-medium
                      flex flex-col items-center gap-2
                      transition-all duration-150
                    "
                    data-testid="scanner-quick-count"
                  >
                    <span className="text-2xl">🔢</span>
                    Quick Count
                  </button>
                  
                  <button
                    className="
                      py-warehouse-md px-warehouse-sm
                      bg-neutral-100 hover:bg-neutral-200
                      active:bg-neutral-300 active:scale-95
                      rounded-mobile text-mobile-base font-medium
                      flex flex-col items-center gap-2
                      transition-all duration-150
                    "
                    data-testid="scanner-search"
                  >
                    <span className="text-2xl">🔍</span>
                    Search Products
                  </button>
                </div>
                
                <p className="text-mobile-sm text-neutral-600 text-center">
                  Swipe down to close scanner
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};