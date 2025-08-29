'use client';

import { ReactNode, useEffect, useState } from 'react';
import { BottomNav } from '../components/mobile/BottomNav';

interface MobileLayoutProps {
  children: ReactNode;
  showBottomNav?: boolean;
  className?: string;
}

export const MobileLayout = ({ 
  children, 
  showBottomNav = true,
  className = '' 
}: MobileLayoutProps) => {
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Detect if running as PWA
    const checkStandalone = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                         (window.navigator as any).standalone ||
                         document.referrer.includes('android-app://');
      setIsStandalone(isStandalone);
    };

    checkStandalone();
    window.addEventListener('resize', checkStandalone);
    
    return () => window.removeEventListener('resize', checkStandalone);
  }, []);

  return (
    <div 
      className={`
        min-h-screen flex flex-col bg-gradient-to-br from-neutral-50 to-neutral-100
        ${isStandalone ? 'safe-all' : ''}
        ${className}
      `}
      data-testid="mobile-layout"
    >
      {/* Status Bar Safe Area */}
      <div className="safe-top bg-white/80 backdrop-blur-sm" />
      
      {/* Enhanced Responsive Container Wrapper */}
      <div className="flex-1 flex flex-col w-full max-w-full md:max-w-4xl lg:max-w-6xl xl:max-w-7xl 2xl:max-w-7xl mx-auto">
        {/* Enhanced Main Content Area */}
        <main 
          className={`
            flex-1 overflow-y-auto scroll-smooth
            ${showBottomNav ? 'pb-24 lg:pb-6' : 'pb-4'}
          `}
        >
          {children}
        </main>
        
        {/* Bottom Navigation - Hidden on large screens */}
        {showBottomNav && (
          <div className="lg:hidden">
            <BottomNav />
          </div>
        )}
        
        {/* Desktop Navigation Replacement */}
        {showBottomNav && (
          <div className="hidden lg:block fixed top-4 right-4 z-50">
            <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 p-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">S</span>
                </div>
                <span className="text-sm font-medium text-gray-700 mr-2">ScanStock</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};