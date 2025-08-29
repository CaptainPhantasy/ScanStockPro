'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import UserMenu from './UserMenu';
import SearchBar from './SearchBar';

export default function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchRef = useRef<HTMLDivElement>(null);

  // Check if user is logged in and detect mobile
  useEffect(() => {
    // TODO: Implement actual auth check
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null;
    setIsLoggedIn(!!token);
    
    // Check for mobile viewport
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // CMD+K or Ctrl+K to focus search
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        const searchInput = searchRef.current?.querySelector('input');
        if (searchInput) {
          searchInput.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navigationItems = [
    { href: '/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/products', label: 'Products', icon: '📦' },
    { href: '/inventory', label: 'Inventory', icon: '📋' },
    { href: '/analytics', label: 'Analytics', icon: '📈' },
    { href: '/reports', label: 'Reports', icon: '📄' },
  ];

  const isActivePage = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/');
  };

  // Don't show desktop nav on mobile when logged in
  if (isMobile && isLoggedIn) {
    return null;
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50" style={{ height: '70px' }}>
      <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
        <div className="flex justify-between items-center h-[70px]">
          {/* Logo and Brand - Far Left */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#0066cc] to-blue-700 rounded-lg flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-xl">S</span>
              </div>
              <span className="text-xl font-bold text-[#0066cc]">ScanStock Pro</span>
            </Link>
          </div>

          {/* Desktop Navigation - Centered */}
          {isLoggedIn ? (
            <nav className="hidden lg:flex items-center space-x-1 absolute left-1/2 transform -translate-x-1/2">
              {navigationItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActivePage(item.href)
                      ? 'bg-[#0066cc] text-white shadow-md'
                      : 'text-gray-700 hover:text-[#0066cc] hover:bg-blue-50'
                  }`}
                >
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
          ) : (
            <nav className="hidden md:flex space-x-8">
              <Link 
                href="#features" 
                className="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                Features
              </Link>
              <Link 
                href="#pricing" 
                className="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                Pricing
              </Link>
              <Link 
                href="/demo" 
                className="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                Demo
              </Link>
            </nav>
          )}

          {/* Right side - User Menu & Settings */}
          <div className="flex items-center space-x-4">
            {isLoggedIn && (
              <>
                {/* Settings Icon */}
                <button
                  onClick={() => router.push('/settings')}
                  className="hidden lg:flex items-center justify-center w-10 h-10 rounded-lg text-gray-600 hover:text-[#0066cc] hover:bg-blue-50 transition-all duration-200"
                  aria-label="Settings"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>

                {/* User Menu */}
                <UserMenu />
              </>
            )}

            {!isLoggedIn && (
              <div className="flex items-center space-x-4">
                <Link 
                  href="/auth/login" 
                  className="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Sign In
                </Link>
                <Link 
                  href="/auth/register" 
                  className="bg-[#0066cc] text-white hover:bg-blue-700 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  Get Started
                </Link>
                <Link 
                  href="/demo" 
                  className="hidden sm:block bg-white text-[#0066cc] border border-[#0066cc] hover:bg-blue-50 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  Try Demo
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <div className="lg:hidden">
              <button
                type="button"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-gray-500 hover:text-gray-700 focus:outline-none focus:text-gray-700 p-2"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="lg:hidden bg-white border-t border-gray-200 shadow-lg">
          <div className="px-4 py-3 space-y-1">
            {/* Mobile Search */}
            {isLoggedIn && (
              <div className="mb-4">
                <SearchBar />
              </div>
            )}

            {/* Mobile Navigation Items */}
            {isLoggedIn ? (
              <>
                {navigationItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMenuOpen(false)}
                    className={`flex items-center space-x-3 px-3 py-3 rounded-md text-base font-medium ${
                      isActivePage(item.href)
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'text-gray-700 hover:text-indigo-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                ))}
                
                {/* Mobile Quick Scan */}
                <button
                  onClick={() => {
                    router.push('/scan');
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center space-x-3 bg-indigo-600 text-white hover:bg-indigo-700 px-3 py-3 rounded-md text-base font-medium"
                >
                  <span className="text-xl">📷</span>
                  <span>Quick Scan</span>
                </button>
              </>
            ) : (
              <>
                <Link 
                  href="#features" 
                  onClick={() => setIsMenuOpen(false)}
                  className="block px-3 py-3 text-gray-700 hover:text-indigo-600 hover:bg-gray-50 rounded-md text-base font-medium"
                >
                  Features
                </Link>
                <Link 
                  href="#pricing" 
                  onClick={() => setIsMenuOpen(false)}
                  className="block px-3 py-3 text-gray-700 hover:text-indigo-600 hover:bg-gray-50 rounded-md text-base font-medium"
                >
                  Pricing
                </Link>
                <Link 
                  href="/demo" 
                  onClick={() => setIsMenuOpen(false)}
                  className="block px-3 py-3 text-gray-700 hover:text-indigo-600 hover:bg-gray-50 rounded-md text-base font-medium"
                >
                  Demo
                </Link>
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <Link 
                    href="/auth/login" 
                    onClick={() => setIsMenuOpen(false)}
                    className="block px-3 py-3 text-gray-700 hover:text-indigo-600 hover:bg-gray-50 rounded-md text-base font-medium"
                  >
                    Sign In
                  </Link>
                  <Link 
                    href="/auth/register" 
                    onClick={() => setIsMenuOpen(false)}
                    className="block px-3 py-3 bg-indigo-600 text-white hover:bg-indigo-700 rounded-md text-base font-medium mt-2"
                  >
                    Get Started
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}