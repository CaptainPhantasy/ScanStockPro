'use client';

import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50" style={{ height: '70px' }}>
        <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-[70px]">
            <div className="flex items-center">
              <Link href="/" className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[#0066cc] to-blue-700 rounded-lg flex items-center justify-center shadow-md">
                  <span className="text-white font-bold text-xl">S</span>
                </div>
                <span className="text-xl font-bold text-[#0066cc]">ScanStock Pro</span>
              </Link>
            </div>
            
            <nav className="hidden md:flex space-x-8">
              <Link href="/dashboard" className="text-gray-700 hover:text-[#0066cc] px-3 py-2 rounded-md text-sm font-medium transition-colors">
                Dashboard
              </Link>
              <Link href="/products" className="text-gray-700 hover:text-[#0066cc] px-3 py-2 rounded-md text-sm font-medium transition-colors">
                Products
              </Link>
              <Link href="/inventory" className="text-gray-700 hover:text-[#0066cc] px-3 py-2 rounded-md text-sm font-medium transition-colors">
                Inventory
              </Link>
              <Link href="/analytics" className="text-gray-700 hover:text-[#0066cc] px-3 py-2 rounded-md text-sm font-medium transition-colors">
                Analytics
              </Link>
              <Link href="/reports" className="text-gray-700 hover:text-[#0066cc] px-3 py-2 rounded-md text-sm font-medium transition-colors">
                Reports
              </Link>
            </nav>
            
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-4">
                <Link href="/auth/login" className="text-gray-700 hover:text-[#0066cc] px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200">
                  Sign In
                </Link>
                <Link href="/auth/register" className="bg-[#0066cc] text-white hover:bg-blue-700 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 shadow-md hover:shadow-lg">
                  Get Started
                </Link>
                <Link href="/demo" className="hidden sm:block bg-white text-[#0066cc] border border-[#0066cc] hover:bg-blue-50 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md">
                  Try Demo
                </Link>
              </div>
              
              <div className="lg:hidden">
                <button type="button" className="text-gray-500 hover:text-gray-700 focus:outline-none focus:text-gray-700 p-2">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="relative">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 py-16 lg:py-24">
          <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="text-center lg:text-left">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 leading-tight">
                  Professional
                  <span className="block text-[#0066cc] mt-2">Inventory Management</span>
                </h1>
                <p className="mt-6 text-lg lg:text-xl text-gray-600 leading-relaxed">
                  Transform your business operations with AI-powered product recognition, real-time synchronization, and mobile-optimized workflows designed for modern teams.
                </p>
                <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                  <Link href="/dashboard" className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold rounded-lg text-white bg-[#0066cc] hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl">
                    View Dashboard
                  </Link>
                  <Link href="/demo" className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold rounded-lg text-[#0066cc] bg-white hover:bg-gray-50 border-2 border-[#0066cc] transition-all duration-200 shadow-md hover:shadow-lg">
                    Try Demo
                  </Link>
                </div>
              </div>
              
              <div className="hidden lg:block">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-600 rounded-2xl transform rotate-3 opacity-10"></div>
                  <div className="relative bg-white rounded-2xl shadow-2xl p-8 border border-gray-200">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b pb-4">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-[#0066cc] rounded"></div>
                          <div className="h-4 w-24 bg-gray-200 rounded"></div>
                        </div>
                        <div className="flex space-x-2">
                          <div className="w-8 h-8 bg-gray-100 rounded"></div>
                          <div className="w-8 h-8 bg-gray-100 rounded"></div>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-3">
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3">
                          <div className="h-8 w-8 bg-blue-200 rounded mb-2"></div>
                          <div className="h-3 w-16 bg-blue-200 rounded"></div>
                        </div>
                        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3">
                          <div className="h-8 w-8 bg-green-200 rounded mb-2"></div>
                          <div className="h-3 w-16 bg-green-200 rounded"></div>
                        </div>
                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3">
                          <div className="h-8 w-8 bg-purple-200 rounded mb-2"></div>
                          <div className="h-3 w-16 bg-purple-200 rounded"></div>
                        </div>
                        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-3">
                          <div className="h-8 w-8 bg-orange-200 rounded mb-2"></div>
                          <div className="h-3 w-16 bg-orange-200 rounded"></div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-4 w-full bg-gray-100 rounded"></div>
                        <div className="h-4 w-5/6 bg-gray-100 rounded"></div>
                        <div className="h-4 w-4/6 bg-gray-100 rounded"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <section id="features" className="py-16 lg:py-24 bg-white">
          <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
                Everything You Need to Manage Inventory
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                From barcode scanning to AI-powered recognition, ScanStock Pro provides all the tools your team needs to streamline inventory operations.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg p-6 hover:shadow-lg transition-all duration-300 border border-gray-200" style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-[#0066cc] rounded-lg flex items-center justify-center mb-4">
                  <span className="text-2xl">📱</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Mobile-First Design</h3>
                <p className="text-gray-600 mb-4">
                  Built for one-handed operation with touch-optimized interfaces and offline capabilities.
                </p>
                <ul className="text-sm text-gray-500 space-y-1">
                  <li>✓ Touch-optimized interface</li>
                  <li>✓ Offline functionality</li>
                  <li>✓ PWA installation</li>
                </ul>
              </div>
              
              <div className="bg-white rounded-lg p-6 hover:shadow-lg transition-all duration-300 border border-gray-200" style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-2xl">🤖</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">AI Product Recognition</h3>
                <p className="text-gray-600 mb-4">
                  Use your camera to instantly identify products with OpenAI-powered recognition.
                </p>
                <ul className="text-sm text-gray-500 space-y-1">
                  <li>✓ Image recognition</li>
                  <li>✓ Automatic categorization</li>
                  <li>✓ Smart descriptions</li>
                </ul>
              </div>
              
              <div className="bg-white rounded-lg p-6 hover:shadow-lg transition-all duration-300 border border-gray-200" style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-2xl">🔄</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Real-Time Sync</h3>
                <p className="text-gray-600 mb-4">
                  Offline-first design with automatic synchronization when connection is restored.
                </p>
                <ul className="text-sm text-gray-500 space-y-1">
                  <li>✓ Real-time updates</li>
                  <li>✓ Conflict resolution</li>
                  <li>✓ Multi-device sync</li>
                </ul>
              </div>
              
              <div className="bg-white rounded-lg p-6 hover:shadow-lg transition-all duration-300 border border-gray-200" style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-2xl">📊</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Advanced Analytics</h3>
                <p className="text-gray-600 mb-4">
                  Get insights into your inventory with detailed reports and trend analysis.
                </p>
                <ul className="text-sm text-gray-500 space-y-1">
                  <li>✓ Stock level tracking</li>
                  <li>✓ Movement history</li>
                  <li>✓ Performance metrics</li>
                </ul>
              </div>
              
              <div className="bg-white rounded-lg p-6 hover:shadow-lg transition-all duration-300 border border-gray-200" style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <div className="w-14 h-14 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-2xl">📷</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Barcode Scanning</h3>
                <p className="text-gray-600 mb-4">
                  Fast and accurate barcode scanning with support for multiple formats.
                </p>
                <ul className="text-sm text-gray-500 space-y-1">
                  <li>✓ Multiple barcode types</li>
                  <li>✓ Batch scanning</li>
                  <li>✓ Auto-focus camera</li>
                </ul>
              </div>
              
              <div className="bg-white rounded-lg p-6 hover:shadow-lg transition-all duration-300 border border-gray-200" style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <div className="w-14 h-14 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-2xl">🔐</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Enterprise Security</h3>
                <p className="text-gray-600 mb-4">
                  Enterprise-grade security with role-based access and audit trails.
                </p>
                <ul className="text-sm text-gray-500 space-y-1">
                  <li>✓ User permissions</li>
                  <li>✓ Audit logging</li>
                  <li>✓ Data encryption</li>
                </ul>
              </div>
            </div>
            
            <div className="text-center mt-16">
              <Link href="/demo" className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold rounded-lg text-white bg-[#0066cc] hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl">
                See All Features in Action
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-gray-800">
        <div className="max-w-[1200px] mx-auto py-12 px-6 lg:px-8">
          <div className="text-center">
            <p className="text-gray-400">© 2024 ScanStock Pro. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
