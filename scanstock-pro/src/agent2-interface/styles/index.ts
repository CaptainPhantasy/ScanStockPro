// Mobile styles for ScanStock Pro
// Agent 2 - Mobile Interface Styles

// Import mobile-specific CSS
import './mobile.css';

// Export style utilities if needed
export const mobileStyles = {
  // Style constants
  touchTarget: {
    minHeight: '48px',
    minWidth: '48px',
  },
  thumbZone: {
    minHeight: '64px', 
    minWidth: '64px',
  },
  
  // Safe area helpers
  safeArea: {
    top: 'env(safe-area-inset-top)',
    bottom: 'env(safe-area-inset-bottom)',
    left: 'env(safe-area-inset-left)',
    right: 'env(safe-area-inset-right)',
  },
  
  // Common mobile breakpoints
  breakpoints: {
    xs: '375px',   // iPhone SE
    sm: '414px',   // iPhone Plus  
    md: '768px',   // iPad
    lg: '1024px',  // iPad Pro
  },
};