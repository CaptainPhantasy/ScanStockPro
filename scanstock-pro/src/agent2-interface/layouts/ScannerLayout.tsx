'use client';

import { ReactNode, useEffect, useState } from 'react';

interface ScannerLayoutProps {
  children: ReactNode;
  className?: string;
}

export const ScannerLayout = ({ 
  children,
  className = '' 
}: ScannerLayoutProps) => {
  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    
    // Prevent scrolling while in scanner mode
    document.body.style.overflow = 'hidden';
    
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div 
      className={`
        fixed inset-0 z-50 bg-black
        flex flex-col
        ${isLandscape ? 'landscape' : 'portrait'}
        ${className}
      `}
      data-testid="scanner-layout"
    >
      {/* Safe Area for Status Bar */}
      <div className="safe-top" />
      
      {/* Scanner Content */}
      <div className="flex-1 relative overflow-hidden">
        {children}
      </div>
      
      {/* Safe Area for Home Indicator */}
      <div className="safe-bottom" />
    </div>
  );
};