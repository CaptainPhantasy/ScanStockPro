'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: string;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  const pathname = usePathname();

  // Auto-generate breadcrumbs from pathname if not provided
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const segments = pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [
      { label: 'Home', href: '/', icon: '🏠' }
    ];

    let currentPath = '';
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      
      // Format segment for display
      let label = segment.charAt(0).toUpperCase() + segment.slice(1);
      label = label.replace(/-/g, ' ');
      
      // Add icons for known pages
      let icon = '';
      switch (segment) {
        case 'dashboard':
          icon = '📊';
          break;
        case 'products':
          icon = '📦';
          break;
        case 'inventory':
          icon = '📋';
          break;
        case 'scan':
          icon = '📷';
          break;
        case 'analytics':
          icon = '📈';
          break;
        case 'counting':
          icon = '🔢';
          break;
        case 'settings':
          icon = '⚙️';
          break;
        case 'ai':
          icon = '🤖';
          break;
        case 'billing':
          icon = '💳';
          break;
        case 'help':
          icon = '❓';
          break;
        default:
          icon = '📄';
      }

      breadcrumbs.push({
        label,
        href: index === segments.length - 1 ? undefined : currentPath,
        icon
      });
    });

    return breadcrumbs;
  };

  const breadcrumbItems = items || generateBreadcrumbs();

  // Don't show breadcrumbs on home page
  if (pathname === '/' || breadcrumbItems.length <= 1) {
    return null;
  }

  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-500 py-3" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        {breadcrumbItems.map((item, index) => (
          <li key={index} className="flex items-center">
            {index > 0 && (
              <svg
                className="flex-shrink-0 h-4 w-4 text-gray-300 mx-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            )}
            
            {item.href ? (
              <Link
                href={item.href}
                className="flex items-center space-x-2 text-gray-500 hover:text-gray-700 transition-colors"
              >
                {item.icon && (
                  <span className="text-base">{item.icon}</span>
                )}
                <span className="hover:underline">{item.label}</span>
              </Link>
            ) : (
              <span className="flex items-center space-x-2 text-gray-900 font-medium">
                {item.icon && (
                  <span className="text-base">{item.icon}</span>
                )}
                <span>{item.label}</span>
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}