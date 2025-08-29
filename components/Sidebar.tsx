'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function Sidebar({ isCollapsed = false, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();

  const mainNavItems = [
    { href: '/dashboard', label: 'Dashboard', icon: '📊', description: 'Overview and stats' },
    { href: '/scan', label: 'Quick Scan', icon: '📷', description: 'Scan products now' },
    { href: '/products', label: 'Products', icon: '📦', description: 'Manage inventory' },
    { href: '/inventory', label: 'Inventory', icon: '📋', description: 'Stock levels' },
    { href: '/counting', label: 'Counting', icon: '🔢', description: 'Count sessions' },
    { href: '/analytics', label: 'Analytics', icon: '📈', description: 'Reports & insights' },
  ];

  const quickActions = [
    { href: '/products/new', label: 'Add Product', icon: '➕', description: 'Create new product' },
    { href: '/counting/new', label: 'Start Count', icon: '🎯', description: 'Begin counting session' },
    { href: '/ai/recognize', label: 'AI Recognition', icon: '🤖', description: 'Identify products' },
  ];

  const recentItems = [
    { href: '/products/iphone-15', label: 'iPhone 15 Pro', icon: '📱', description: 'Last scanned' },
    { href: '/products/macbook-air', label: 'MacBook Air', icon: '💻', description: '2 hours ago' },
    { href: '/products/airpods-pro', label: 'AirPods Pro', icon: '🎧', description: 'Yesterday' },
  ];

  const supportItems = [
    { href: '/help', label: 'Help Center', icon: '❓', description: 'Get support' },
    { href: '/settings', label: 'Settings', icon: '⚙️', description: 'App preferences' },
    { href: '/feedback', label: 'Feedback', icon: '💬', description: 'Share feedback' },
  ];

  const isActivePage = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/');
  };

  const NavItem = ({ item, showDescription = true }: { item: typeof mainNavItems[0], showDescription?: boolean }) => (
    <Link
      href={item.href}
      className={`group flex items-center space-x-3 px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
        isActivePage(item.href)
          ? 'bg-indigo-100 text-indigo-700 shadow-sm'
          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
      } ${isCollapsed ? 'justify-center' : ''}`}
      title={isCollapsed ? item.label : undefined}
    >
      <span className={`text-lg ${isCollapsed ? '' : 'flex-shrink-0'}`}>
        {item.icon}
      </span>
      
      {!isCollapsed && (
        <div className="flex-1 min-w-0">
          <p className="truncate">{item.label}</p>
          {showDescription && (
            <p className="text-xs text-gray-500 truncate">{item.description}</p>
          )}
        </div>
      )}
      
      {isActivePage(item.href) && (
        <div className="w-1 h-6 bg-indigo-500 rounded-full"></div>
      )}
    </Link>
  );

  return (
    <aside className={`bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-64'
    }`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        {!isCollapsed && (
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Navigation</h2>
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                title="Collapse sidebar"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>
            )}
          </div>
        )}
        
        {isCollapsed && onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="w-full p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            title="Expand sidebar"
          >
            <svg className="w-4 h-4 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>

      {/* Main Navigation */}
      <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {/* Primary Navigation */}
        <div className="space-y-1">
          {mainNavItems.map((item) => (
            <NavItem key={item.href} item={item} />
          ))}
        </div>

        {/* Quick Actions */}
        {!isCollapsed && (
          <>
            <div className="pt-6">
              <h3 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Quick Actions
              </h3>
              <div className="space-y-1">
                {quickActions.map((item) => (
                  <NavItem key={item.href} item={item} showDescription={false} />
                ))}
              </div>
            </div>

            {/* Recent Items */}
            <div className="pt-6">
              <h3 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Recent
              </h3>
              <div className="space-y-1">
                {recentItems.map((item) => (
                  <NavItem key={item.href} item={item} showDescription={false} />
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Stats Card */}
      {!isCollapsed && (
        <div className="p-3">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg p-4 text-white">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-lg">📊</span>
              <h3 className="font-medium">Today's Stats</h3>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="opacity-90">Scans:</span>
                <span className="font-medium">42</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-90">Products:</span>
                <span className="font-medium">127</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-90">Low Stock:</span>
                <span className="font-medium text-yellow-200">3</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Support Section */}
      <div className="p-3 border-t border-gray-200">
        {!isCollapsed && (
          <div className="space-y-1">
            {supportItems.map((item) => (
              <NavItem key={item.href} item={item} showDescription={false} />
            ))}
          </div>
        )}
        
        {isCollapsed && (
          <div className="flex flex-col space-y-2">
            {supportItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                title={item.label}
              >
                <span className="text-lg block text-center">{item.icon}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Upgrade Prompt */}
      {!isCollapsed && (
        <div className="p-3 border-t border-gray-200">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-lg">⭐</span>
              <h3 className="text-sm font-medium text-gray-900">Upgrade to Pro</h3>
            </div>
            <p className="text-xs text-gray-600 mb-3">
              Unlock advanced analytics and AI features.
            </p>
            <Link
              href="/billing"
              className="block w-full text-center bg-indigo-600 text-white text-xs font-medium py-2 px-3 rounded-md hover:bg-indigo-700 transition-colors"
            >
              Upgrade Now
            </Link>
          </div>
        </div>
      )}
    </aside>
  );
}