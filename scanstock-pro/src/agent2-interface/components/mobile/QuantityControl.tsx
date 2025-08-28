'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface QuantityControlProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  disabled?: boolean;
}

export const QuantityControl = ({
  value,
  onChange,
  min = 0,
  max = 9999,
  step = 1,
  className = '',
  disabled = false,
}: QuantityControlProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragStartValue, setDragStartValue] = useState(0);
  const longPressRef = useRef<NodeJS.Timeout>();
  const rapidUpdateRef = useRef<NodeJS.Timeout>();
  const containerRef = useRef<HTMLDivElement>(null);

  const hapticFeedback = useCallback(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate(25);
    }
  }, []);

  const clampValue = useCallback((newValue: number) => {
    return Math.min(Math.max(newValue, min), max);
  }, [min, max]);

  const updateValue = useCallback((newValue: number) => {
    const clamped = clampValue(newValue);
    if (clamped !== value) {
      onChange(clamped);
      hapticFeedback();
    }
  }, [value, onChange, clampValue, hapticFeedback]);

  const increment = useCallback(() => {
    updateValue(value + step);
  }, [value, step, updateValue]);

  const decrement = useCallback(() => {
    updateValue(value - step);
  }, [value, step, updateValue]);

  // Long press for rapid increment/decrement
  const startLongPress = useCallback((direction: 'increment' | 'decrement') => {
    const action = direction === 'increment' ? increment : decrement;
    
    longPressRef.current = setTimeout(() => {
      // Start rapid updates
      const rapidUpdate = () => {
        action();
        rapidUpdateRef.current = setTimeout(rapidUpdate, 100); // 10 per second
      };
      rapidUpdate();
    }, 500); // 500ms delay before rapid mode
  }, [increment, decrement]);

  const stopLongPress = useCallback(() => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
    }
    if (rapidUpdateRef.current) {
      clearTimeout(rapidUpdateRef.current);
    }
  }, []);

  // Touch drag functionality
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled) return;
    
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStartY(touch.clientY);
    setDragStartValue(value);
    hapticFeedback();
  }, [disabled, value, hapticFeedback]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || disabled) return;
    
    const touch = e.touches[0];
    const deltaY = dragStartY - touch.clientY; // Invert: up = positive
    const sensitivity = 2; // pixels per unit
    const deltaValue = Math.round(deltaY / sensitivity);
    
    updateValue(dragStartValue + deltaValue);
  }, [isDragging, disabled, dragStartY, dragStartValue, updateValue]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Voice input placeholder
  const handleVoiceInput = useCallback(() => {
    // TODO: Implement voice-to-number input
    hapticFeedback();
  }, [hapticFeedback]);

  // Direct input handling
  const handleDirectInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value) || 0;
    updateValue(newValue);
  }, [updateValue]);

  return (
    <div 
      ref={containerRef}
      className={`
        flex items-center justify-center gap-4
        bg-white border border-neutral-200 rounded-mobile-lg
        p-warehouse-md
        ${isDragging ? 'bg-warehouse-50' : ''}
        ${disabled ? 'opacity-50 pointer-events-none' : ''}
        ${className}
      `}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      data-testid="quantity-control"
    >
      {/* Decrement Button */}
      <button
        onMouseDown={() => startLongPress('decrement')}
        onMouseUp={stopLongPress}
        onMouseLeave={stopLongPress}
        onTouchStart={() => startLongPress('decrement')}
        onTouchEnd={stopLongPress}
        onClick={decrement}
        disabled={disabled || value <= min}
        className="
          thumb-zone bg-neutral-100 hover:bg-neutral-200
          active:bg-neutral-300 active:scale-95
          disabled:opacity-50 disabled:cursor-not-allowed
          rounded-mobile text-neutral-700
          flex items-center justify-center
          transition-all duration-150
          text-mobile-xl font-bold
          border border-neutral-300
        "
        data-testid="quantity-decrement"
      >
        −
      </button>

      {/* Current Value Display */}
      <div className="flex flex-col items-center min-w-24">
        <input
          type="number"
          value={value}
          onChange={handleDirectInput}
          disabled={disabled}
          min={min}
          max={max}
          className="
            text-mobile-2xl font-bold text-center
            bg-transparent border-none outline-none
            w-full text-warehouse-800
            appearance-none
            [-moz-appearance:textfield]
            [&::-webkit-outer-spin-button]:appearance-none
            [&::-webkit-inner-spin-button]:appearance-none
          "
          data-testid="quantity-input"
        />
        <div className="text-mobile-xs text-neutral-500 mt-1">
          Swipe ↕ or hold buttons
        </div>
      </div>

      {/* Increment Button */}
      <button
        onMouseDown={() => startLongPress('increment')}
        onMouseUp={stopLongPress}
        onMouseLeave={stopLongPress}
        onTouchStart={() => startLongPress('increment')}
        onTouchEnd={stopLongPress}
        onClick={increment}
        disabled={disabled || value >= max}
        className="
          thumb-zone bg-warehouse-100 hover:bg-warehouse-200
          active:bg-warehouse-300 active:scale-95
          disabled:opacity-50 disabled:cursor-not-allowed
          rounded-mobile text-warehouse-700
          flex items-center justify-center
          transition-all duration-150
          text-mobile-xl font-bold
          border border-warehouse-300
        "
        data-testid="quantity-increment"
      >
        +
      </button>

      {/* Voice Input Button */}
      <button
        onClick={handleVoiceInput}
        disabled={disabled}
        className="
          touch-zone bg-neutral-50 hover:bg-neutral-100
          active:bg-neutral-200 active:scale-95
          disabled:opacity-50 disabled:cursor-not-allowed
          rounded-mobile text-neutral-600
          flex items-center justify-center
          transition-all duration-150
          text-mobile-lg
          border border-neutral-200
          ml-2
        "
        data-testid="quantity-voice"
        title="Voice input (coming soon)"
      >
        🎤
      </button>
    </div>
  );
};