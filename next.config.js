const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  sw: 'sw.js',
  buildExcludes: [/middleware-manifest\.json$/],
  maximumFileSizeToCacheInBytes: 3000000, // 3MB for mobile optimization
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/api\.openai\.com\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'openai-api-cache',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60 // 24 hours
        }
      }
    },
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'supabase-api-cache',
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 60 * 60 // 1 hour
        }
      }
    }
  ]
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode for better error detection
  reactStrictMode: true,
  
  // Enable SWC minification for better performance
  swcMinify: true,
  
  // Experimental features for mobile optimization
  experimental: {
    // Server components for better performance
    appDir: true,
    
    // Optimize CSS for mobile
    optimizeCss: true,
    
    // Bundle analyzer for size optimization
    bundlePagesRouterDependencies: true,
    
    // Modern JavaScript compilation
    esmExternals: true
  },
  
  // Image optimization for mobile
  images: {
    domains: ['tbzjbmvklhdkvvcaansg.supabase.co'], // Supabase storage
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;"
  },
  
  // Headers for security and mobile optimization
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          // CORS headers for mobile app
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.NEXT_PUBLIC_APP_URL || '*'
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS'
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-Requested-With'
          },
          // Mobile performance headers
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=60, stale-while-revalidate=30'
          },
          // Security headers
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          }
        ]
      },
      {
        source: '/(.*)',
        headers: [
          // PWA headers
          {
            key: 'X-PWA-Enabled',
            value: 'true'
          },
          // Mobile viewport
          {
            key: 'X-Mobile-Optimized',
            value: 'true'
          }
        ]
      }
    ]
  },
  
  // Redirects for mobile app routing
  async redirects() {
    return [
      {
        source: '/app',
        destination: '/dashboard',
        permanent: true
      },
      {
        source: '/mobile',
        destination: '/',
        permanent: false
      }
    ]
  },
  
  // Rewrites for API versioning
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: '/api/:path*'
      }
    ]
  },
  
  // Environment variables for build-time optimization
  env: {
    AGENT_1_VERSION: '1.0.0',
    BUILD_TIMESTAMP: new Date().toISOString(),
    MOBILE_FIRST: 'true'
  },
  
  // Webpack configuration for mobile optimization
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Mobile-specific optimizations
    if (!isServer) {
      // Reduce bundle size for mobile
      config.resolve.alias = {
        ...config.resolve.alias,
        // Use lighter alternatives for mobile
        '@': require('path').resolve(__dirname, 'src'),
      }
      
      // Split chunks for better mobile loading
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            maxSize: 200000 // 200KB max chunks for mobile
          },
          supabase: {
            test: /[\\/]node_modules[\\/]@supabase[\\/]/,
            name: 'supabase',
            chunks: 'all',
            priority: 10
          },
          react: {
            test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
            name: 'react',
            chunks: 'all',
            priority: 10
          }
        }
      }
    }
    
    // Add environment-specific configurations
    config.plugins.push(
      new webpack.DefinePlugin({
        __MOBILE_BUILD__: JSON.stringify(true),
        __AGENT_1_FOUNDATION__: JSON.stringify(true)
      })
    )
    
    return config
  },
  
  // Performance budgets for mobile
  performanceBudgets: [
    {
      path: '/',
      maxSize: '500kb'
    },
    {
      path: '/dashboard',
      maxSize: '800kb'
    }
  ],
  
  // Compression for mobile networks
  compress: true,
  
  // Generate etags for better caching
  generateEtags: true,
  
  // Disable x-powered-by header for security
  poweredByHeader: false,
  
  // Trailing slashes configuration
  trailingSlash: false,
  
  // TypeScript configuration
  typescript: {
    // Don't fail build on TypeScript errors (for development speed)
    ignoreBuildErrors: process.env.NODE_ENV === 'development'
  },
  
  // ESLint configuration
  eslint: {
    // Don't fail build on ESLint errors (for development speed)
    ignoreDuringBuilds: process.env.NODE_ENV === 'development'
  },
  
  // Output configuration for deployment
  output: 'standalone',
  
  // Asset prefix for CDN support
  assetPrefix: process.env.NEXT_PUBLIC_ASSET_PREFIX || '',
  
  // Base path for subdirectory deployment
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  
  // DevIndicators configuration
  devIndicators: {
    buildActivity: true,
    buildActivityPosition: 'bottom-right'
  }
}

module.exports = withPWA(nextConfig)