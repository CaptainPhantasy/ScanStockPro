'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import type { Product } from '../../../shared/contracts/agent-interfaces';

interface ProductCardProps {
  product: Product;
  onEdit?: (product: Product) => void;
  onDelete?: (product: Product) => void;
  onSelect?: (product: Product) => void;
  className?: string;
  showActions?: boolean;
}

export const ProductCard = ({
  product,
  onEdit,
  onDelete,
  onSelect,
  className = '',
  showActions = true,
}: ProductCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [swipeDistance, setSwipeDistance] = useState(0);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  
  const startXRef = useRef<number>(0);
  const currentXRef = useRef<number>(0);
  const isDraggingRef = useRef(false);
  const cardRef = useRef<HTMLDivElement>(null);

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

  // Touch handlers for swipe gestures
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!showActions) return;
    
    const touch = e.touches[0];
    startXRef.current = touch.clientX;
    currentXRef.current = touch.clientX;
    isDraggingRef.current = true;
  }, [showActions]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDraggingRef.current || !showActions) return;
    
    const touch = e.touches[0];
    currentXRef.current = touch.clientX;
    const distance = currentXRef.current - startXRef.current;
    
    // Limit swipe distance
    const maxDistance = 120;
    const clampedDistance = Math.max(-maxDistance, Math.min(maxDistance, distance));
    setSwipeDistance(clampedDistance);
  }, [showActions]);

  const handleTouchEnd = useCallback(() => {
    if (!isDraggingRef.current || !showActions) return;
    
    const distance = currentXRef.current - startXRef.current;
    const threshold = 80;
    
    if (distance > threshold && onEdit) {
      // Right swipe = edit
      onEdit(product);
      hapticFeedback('medium');
    } else if (distance < -threshold && onDelete) {
      // Left swipe = delete
      onDelete(product);
      hapticFeedback('heavy');
    }
    
    // Reset
    setSwipeDistance(0);
    isDraggingRef.current = false;
  }, [product, onEdit, onDelete, hapticFeedback, showActions]);

  const handleCardTap = useCallback(() => {
    if (Math.abs(swipeDistance) > 10) return; // Ignore if swiping
    
    if (onSelect) {
      onSelect(product);
      hapticFeedback('light');
    } else {
      setIsExpanded(!isExpanded);
      hapticFeedback('light');
    }
  }, [product, onSelect, swipeDistance, isExpanded, hapticFeedback]);

  const getStockLevelColor = useCallback((quantity: number) => {
    if (quantity === 0) return 'text-error-600 bg-error-50';
    if (quantity < 10) return 'text-warning-600 bg-warning-50';
    return 'text-success-600 bg-success-50';
  }, []);

  const getStockLevelLabel = useCallback((quantity: number) => {
    if (quantity === 0) return 'Out of Stock';
    if (quantity < 10) return 'Low Stock';
    return 'In Stock';
  }, []);

  return (
    <div
      ref={cardRef}
      className={`
        relative bg-white border border-neutral-200 rounded-mobile-lg
        overflow-hidden
        transition-all duration-200 ease-out
        active:bg-neutral-50
        ${className}
      `}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={handleCardTap}
      style={{
        transform: `translateX(${swipeDistance}px)`,
      }}
      data-testid="product-card"
    >
      {/* Swipe Actions Background */}
      {showActions && (
        <>
          {/* Edit action (right swipe) */}
          <div 
            className={`
              absolute left-0 top-0 bottom-0 w-20
              bg-warehouse-500 flex items-center justify-center
              transition-opacity duration-200
              ${swipeDistance > 40 ? 'opacity-100' : 'opacity-0'}
            `}
          >
            <span className="text-white text-mobile-lg">✏️</span>
          </div>
          
          {/* Delete action (left swipe) */}
          <div 
            className={`
              absolute right-0 top-0 bottom-0 w-20
              bg-error-500 flex items-center justify-center
              transition-opacity duration-200
              ${swipeDistance < -40 ? 'opacity-100' : 'opacity-0'}
            `}
          >
            <span className="text-white text-mobile-lg">🗑️</span>
          </div>
        </>
      )}

      {/* Card Content */}
      <div className="flex items-center p-warehouse-md gap-warehouse-md">
        {/* Product Image */}
        <div className="relative w-16 h-16 bg-neutral-100 rounded-mobile overflow-hidden flex-shrink-0">
          {!imageError ? (
            <Image
              src={`/api/products/${product.id}/image`}
              alt={product.name}
              fill
              sizes="64px"
              className={`
                object-cover transition-opacity duration-200
                ${isImageLoading ? 'opacity-0' : 'opacity-100'}
              `}
              onLoad={() => setIsImageLoading(false)}
              onError={() => {
                setIsImageLoading(false);
                setImageError(true);
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-neutral-400 text-2xl">
              📦
            </div>
          )}
          
          {isImageLoading && (
            <div className="absolute inset-0 bg-neutral-200 animate-pulse" />
          )}
        </div>

        {/* Product Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-mobile-base font-semibold text-neutral-900 truncate">
            {product.name}
          </h3>
          <p className="text-mobile-sm text-neutral-600 truncate">
            SKU: {product.sku}
          </p>
          {product.barcode && (
            <p className="text-mobile-xs text-neutral-500 truncate">
              📊 {product.barcode}
            </p>
          )}
        </div>

        {/* Stock Info */}
        <div className="flex flex-col items-end gap-1">
          <div className={`
            px-2 py-1 rounded-mobile text-mobile-xs font-medium
            ${getStockLevelColor(product.currentQuantity)}
          `}>
            {product.currentQuantity}
          </div>
          <span className="text-mobile-xs text-neutral-500">
            {getStockLevelLabel(product.currentQuantity)}
          </span>
        </div>

        {/* Expand Indicator */}
        <div className={`
          transition-transform duration-200 text-neutral-400
          ${isExpanded ? 'rotate-180' : 'rotate-0'}
        `}>
          ⌄
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-neutral-200 p-warehouse-md bg-neutral-50 animate-slide-down">
          <div className="grid grid-cols-2 gap-warehouse-md text-mobile-sm">
            <div>
              <span className="text-neutral-600">Category:</span>
              <p className="font-medium text-neutral-900">{product.category || 'Uncategorized'}</p>
            </div>
            <div>
              <span className="text-neutral-600">Last Updated:</span>
              <p className="font-medium text-neutral-900">
                {new Date().toLocaleDateString()}
              </p>
            </div>
          </div>
          
          {/* Quick Actions */}
          {showActions && (
            <div className="flex gap-warehouse-sm mt-warehouse-md">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit?.(product);
                }}
                className="
                  flex-1 py-2 px-4 bg-warehouse-100 text-warehouse-700
                  rounded-mobile text-mobile-sm font-medium
                  active:bg-warehouse-200 transition-colors
                "
                data-testid="product-edit-button"
              >
                ✏️ Edit
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete?.(product);
                }}
                className="
                  flex-1 py-2 px-4 bg-error-100 text-error-700
                  rounded-mobile text-mobile-sm font-medium
                  active:bg-error-200 transition-colors
                "
                data-testid="product-delete-button"
              >
                🗑️ Delete
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};