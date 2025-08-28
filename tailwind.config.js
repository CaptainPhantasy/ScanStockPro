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
      },
      fontSize: {
        // Mobile-optimized font sizes
        'mobile-xs': ['12px', '16px'],
        'mobile-sm': ['14px', '20px'],
        'mobile-base': ['16px', '24px'],
        'mobile-lg': ['18px', '28px'],
        'mobile-xl': ['20px', '32px'],
      }
    }
  },
  plugins: []
}
