'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface NavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  badge?: number;
}

interface BottomNavProps {
  className?: string;
}

export const BottomNav = ({ className = '' }: BottomNavProps) => {
  const router = useRouter();
  const pathname = usePathname();

  const navItems: NavItem[] = [
    {
      id: 'scan',
      label: 'Scan',
      icon: '📷',
      path: '/',
    },
    {
      id: 'products',
      label: 'Products',
      icon: '📦',
      path: '/products',
    },
    {
      id: 'count',
      label: 'Count',
      icon: '🔢',
      path: '/count',
    },
    {
      id: 'history',
      label: 'History',
      icon: '📋',
      path: '/history',
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: '👤',
      path: '/profile',
    },
  ];

  const handleNavigation = (path: string) => {
    // Add haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
    router.push(path);
  };

  return (
    <nav 
      className={`
        fixed bottom-0 left-0 right-0 z-50
        bg-white border-t border-neutral-200
        safe-bottom
        ${className}
      `}
      data-testid="bottom-nav"
    >
      <div className="flex justify-around items-center h-20 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          
          return (
            <button
              key={item.id}
              onClick={() => handleNavigation(item.path)}
              className={`
                relative flex flex-col items-center justify-center
                thumb-zone rounded-mobile-lg
                transition-all duration-200 ease-out
                active:scale-95 active:bg-neutral-100
                ${isActive 
                  ? 'text-warehouse-600' 
                  : 'text-neutral-500 active:text-warehouse-600'
                }
              `}
              data-testid={`nav-${item.id}`}
            >
              {/* Badge */}
              {item.badge && (
                <div className="absolute -top-1 -right-1 bg-error-500 text-white text-xs rounded-full min-w-5 h-5 flex items-center justify-center px-1">
                  {item.badge > 99 ? '99+' : item.badge}
                </div>
              )}
              
              {/* Icon */}
              <div className={`
                text-2xl mb-1 
                ${isActive ? 'animate-pulse' : ''}
              `}>
                {item.icon}
              </div>
              
              {/* Label */}
              <span className="text-mobile-xs font-medium">
                {item.label}
              </span>
              
              {/* Active indicator */}
              {isActive && (
                <div className="absolute bottom-0 w-8 h-1 bg-warehouse-600 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};