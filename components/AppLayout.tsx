'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Navigation from './Navigation';
import Sidebar from './Sidebar';
import Breadcrumbs from './Breadcrumbs';

interface AppLayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
  showBreadcrumbs?: boolean;
}

export default function AppLayout({ 
  children, 
  showSidebar = false, 
  showBreadcrumbs = true 
}: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname();

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth < 1024) {
        setSidebarCollapsed(true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-collapse sidebar on mobile
  useEffect(() => {
    if (isMobile) {
      setSidebarCollapsed(true);
    }
  }, [isMobile]);

  // Don't show sidebar on landing pages
  const isLandingPage = pathname === '/' || pathname.startsWith('/auth/');
  const shouldShowSidebar = showSidebar && !isLandingPage && !isMobile;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header - Only on desktop or non-logged in mobile */}
      <Navigation />

      {/* Main Content Area with proper width constraints */}
      <main className="w-full">
        {/* Breadcrumbs */}
        {showBreadcrumbs && !isLandingPage && !isMobile && (
          <div className="bg-white border-b border-gray-200">
            <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
              <Breadcrumbs />
            </div>
          </div>
        )}

        {/* Page Content with max width constraint */}
        <div className={`${
          isLandingPage ? '' : isMobile ? 'px-4 py-4 pb-20' : 'max-w-[1200px] mx-auto px-6 py-8 lg:px-8'
        }`}>
          {children}
        </div>
      </main>

      {/* Removed mobile sidebar overlay and FAB buttons as we have bottom nav */}
    </div>
  );
}