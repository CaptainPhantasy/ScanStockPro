'use client';

import { useRef, useCallback, useEffect, RefObject } from 'react';

interface GestureConfig {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onLongPress?: () => void;
  onPinch?: (scale: number) => void;
  onPullToRefresh?: () => void;
  swipeThreshold?: number;
  longPressThreshold?: number;
  pinchThreshold?: number;
  pullToRefreshThreshold?: number;
}

interface TouchPoint {
  x: number;
  y: number;
  timestamp: number;
}

interface PinchData {
  distance: number;
  center: { x: number; y: number };
}

export const useGestures = (
  elementRef: RefObject<HTMLElement>,
  config: GestureConfig = {}
) => {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onLongPress,
    onPinch,
    onPullToRefresh,
    swipeThreshold = 50,
    longPressThreshold = 500,
    pinchThreshold = 0.1,
    pullToRefreshThreshold = 100,
  } = config;

  const touchStartRef = useRef<TouchPoint | null>(null);
  const touchCurrentRef = useRef<TouchPoint | null>(null);
  const longPressTimeoutRef = useRef<NodeJS.Timeout>();
  const initialPinchRef = useRef<PinchData | null>(null);
  const currentPinchRef = useRef<PinchData | null>(null);
  const isLongPressingRef = useRef(false);
  const isPinchingRef = useRef(false);

  const hapticFeedback = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if ('vibrate' in navigator) {
      const patterns = {
        light: [25],
        medium: [50],
        heavy: [100],
      };
      navigator.vibrate(patterns[type]);
    }
  }, []);

  const getDistance = useCallback((touch1: Touch, touch2: Touch) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  const getCenter = useCallback((touch1: Touch, touch2: Touch) => {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2,
    };
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now(),
    };
    
    touchCurrentRef.current = { ...touchStartRef.current };
    
    // Handle multi-touch for pinch
    if (e.touches.length === 2 && onPinch) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      
      initialPinchRef.current = {
        distance: getDistance(touch1, touch2),
        center: getCenter(touch1, touch2),
      };
      
      isPinchingRef.current = true;
      
      // Clear long press when starting pinch
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
        longPressTimeoutRef.current = undefined;
      }
    } else {
      // Single touch - setup long press
      if (onLongPress) {
        isLongPressingRef.current = false;
        longPressTimeoutRef.current = setTimeout(() => {
          if (touchStartRef.current && touchCurrentRef.current) {
            const dx = touchCurrentRef.current.x - touchStartRef.current.x;
            const dy = touchCurrentRef.current.y - touchStartRef.current.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Only trigger long press if finger hasn't moved much
            if (distance < 10) {
              isLongPressingRef.current = true;
              hapticFeedback('heavy');
              onLongPress();
            }
          }
        }, longPressThreshold);
      }
    }
  }, [onLongPress, onPinch, longPressThreshold, getDistance, getCenter, hapticFeedback]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!touchStartRef.current) return;

    const touch = e.touches[0];
    touchCurrentRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now(),
    };

    // Handle pinch gesture
    if (e.touches.length === 2 && isPinchingRef.current && initialPinchRef.current && onPinch) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      
      currentPinchRef.current = {
        distance: getDistance(touch1, touch2),
        center: getCenter(touch1, touch2),
      };
      
      const scale = currentPinchRef.current.distance / initialPinchRef.current.distance;
      
      // Only trigger if scale change is significant
      if (Math.abs(scale - 1) > pinchThreshold) {
        onPinch(scale);
      }
    } else {
      // Single touch - check for movement (cancel long press)
      const dx = touchCurrentRef.current.x - touchStartRef.current.x;
      const dy = touchCurrentRef.current.y - touchStartRef.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > 10 && longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
        longPressTimeoutRef.current = undefined;
      }

      // Pull to refresh detection (only at top of page)
      if (onPullToRefresh && touchStartRef.current.y < 100 && dy > 0) {
        const scrollY = window.scrollY || document.documentElement.scrollTop;
        if (scrollY === 0 && dy > pullToRefreshThreshold) {
          hapticFeedback('medium');
          onPullToRefresh();
        }
      }
    }
  }, [onPinch, onPullToRefresh, getDistance, getCenter, pinchThreshold, pullToRefreshThreshold, hapticFeedback]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    // Clear long press timeout
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = undefined;
    }

    // Don't process swipes if long press occurred or pinch was active
    if (isLongPressingRef.current || isPinchingRef.current) {
      isPinchingRef.current = false;
      isLongPressingRef.current = false;
      initialPinchRef.current = null;
      currentPinchRef.current = null;
      return;
    }

    if (!touchStartRef.current || !touchCurrentRef.current) return;

    const dx = touchCurrentRef.current.x - touchStartRef.current.x;
    const dy = touchCurrentRef.current.y - touchStartRef.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const duration = touchCurrentRef.current.timestamp - touchStartRef.current.timestamp;
    const velocity = distance / duration; // pixels per ms

    // Only process as swipe if distance exceeds threshold and velocity is reasonable
    if (distance > swipeThreshold && velocity > 0.1) {
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      hapticFeedback('light');

      // Determine primary direction
      if (absDx > absDy) {
        // Horizontal swipe
        if (dx > 0 && onSwipeRight) {
          onSwipeRight();
        } else if (dx < 0 && onSwipeLeft) {
          onSwipeLeft();
        }
      } else {
        // Vertical swipe
        if (dy > 0 && onSwipeDown) {
          onSwipeDown();
        } else if (dy < 0 && onSwipeUp) {
          onSwipeUp();
        }
      }
    }

    // Reset state
    touchStartRef.current = null;
    touchCurrentRef.current = null;
    isPinchingRef.current = false;
    isLongPressingRef.current = false;
    initialPinchRef.current = null;
    currentPinchRef.current = null;
  }, [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, swipeThreshold, hapticFeedback]);

  // Attach event listeners
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // Add passive option for better performance
    const options = { passive: false };

    element.addEventListener('touchstart', handleTouchStart, options);
    element.addEventListener('touchmove', handleTouchMove, options);
    element.addEventListener('touchend', handleTouchEnd, options);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      
      // Cleanup timeouts
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
      }
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Return utilities for manual control
  return {
    hapticFeedback,
    isLongPressing: isLongPressingRef.current,
    isPinching: isPinchingRef.current,
  };
};