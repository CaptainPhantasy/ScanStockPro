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
        min-h-screen flex flex-col bg-neutral-50
        ${isStandalone ? 'safe-all' : ''}
        ${className}
      `}
      data-testid="mobile-layout"
    >
      {/* Status Bar Safe Area */}
      <div className="safe-top bg-white" />
      
      {/* Main Content Area */}
      <main 
        className={`
          flex-1 overflow-y-auto
          ${showBottomNav ? 'pb-24' : 'pb-4'}
        `}
      >
        {children}
      </main>
      
      {/* Bottom Navigation */}
      {showBottomNav && <BottomNav />}
    </div>
  );
};