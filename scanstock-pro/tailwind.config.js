module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      screens: {
        // mobile-first breakpoints
        'xs': '375px',   // iPhone SE
        'sm': '414px',   // iPhone Plus
        'md': '768px',   // iPad
        'lg': '1024px',  // iPad Pro
        'xl': '1280px',  // Desktop (rarely used)
      },
      spacing: {
        // Touch-friendly spacing
        'touch': '48px',  // Minimum touch target
        'thumb': '64px',  // Thumb-zone spacing
        // Safe areas for iOS
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
        // Warehouse-specific spacing
        'warehouse-xs': '4px',
        'warehouse-sm': '8px',
        'warehouse-md': '16px',
        'warehouse-lg': '24px',
        'warehouse-xl': '32px',
      },
      fontSize: {
        // Mobile-optimized font sizes (prevent zoom on iOS)
        'mobile-xs': ['12px', { lineHeight: '16px', fontWeight: '500' }],
        'mobile-sm': ['14px', { lineHeight: '20px', fontWeight: '500' }],
        'mobile-base': ['16px', { lineHeight: '24px', fontWeight: '500' }],
        'mobile-lg': ['18px', { lineHeight: '28px', fontWeight: '600' }],
        'mobile-xl': ['20px', { lineHeight: '32px', fontWeight: '600' }],
        'mobile-2xl': ['24px', { lineHeight: '36px', fontWeight: '700' }],
      },
      colors: {
        // Warehouse-optimized color palette (high contrast)
        warehouse: {
          // Primary (high contrast blue)
          50: '#eff6ff',
          100: '#dbeafe', 
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6', // Primary blue
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        // Success (bright green for confirmations)
        success: {
          500: '#10b981',
          600: '#059669',
          700: '#047857',
        },
        // Warning (amber for cautions)
        warning: {
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },
        // Error (red for problems)
        error: {
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
        },
        // Neutral (warehouse grays)
        neutral: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
        }
      },
      borderRadius: {
        // Mobile-friendly border radius
        'mobile': '8px',
        'mobile-lg': '12px',
        'mobile-xl': '16px',
      },
      animation: {
        // Warehouse-specific animations
        'scan-pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'shake': 'shake 0.5s ease-in-out',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        slideDown: {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-4px)' },
          '75%': { transform: 'translateX(4px)' }
        }
      },
      backdropBlur: {
        xs: '2px',
      }
    }
  },
  plugins: [
    // Safe area plugin for iOS devices
    function({ addUtilities }) {
      const safeAreaUtilities = {
        '.safe-top': {
          paddingTop: 'env(safe-area-inset-top)',
        },
        '.safe-bottom': {
          paddingBottom: 'env(safe-area-inset-bottom)',
        },
        '.safe-left': {
          paddingLeft: 'env(safe-area-inset-left)',
        },
        '.safe-right': {
          paddingRight: 'env(safe-area-inset-right)',
        },
        '.safe-x': {
          paddingLeft: 'env(safe-area-inset-left)',
          paddingRight: 'env(safe-area-inset-right)',
        },
        '.safe-y': {
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        },
        '.safe-all': {
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          paddingLeft: 'env(safe-area-inset-left)',
          paddingRight: 'env(safe-area-inset-right)',
        },
        // Thumb-zone utilities
        '.thumb-zone': {
          minHeight: '64px',
          minWidth: '64px',
        },
        '.touch-zone': {
          minHeight: '48px',
          minWidth: '48px',
        }
      };
      
      addUtilities(safeAreaUtilities);
    }
  ]
}
