'use client';

import { useState } from 'react';
import Link from 'next/link';

interface DemoProduct {
  id: string;
  name: string;
  sku: string;
  category: string;
  stock: number;
  price: number;
  image: string;
}

const demoProducts: DemoProduct[] = [
  {
    id: '1',
    name: 'Wireless Bluetooth Headphones',
    sku: 'WH-001',
    category: 'Electronics',
    stock: 45,
    price: 89.99,
    image: '🎧'
  },
  {
    id: '2',
    name: 'Organic Cotton T-Shirt',
    sku: 'CT-002',
    category: 'Clothing',
    stock: 120,
    price: 24.99,
    image: '👕'
  },
  {
    id: '3',
    name: 'Stainless Steel Water Bottle',
    sku: 'WB-003',
    category: 'Home & Garden',
    stock: 67,
    price: 19.99,
    image: '🥤'
  },
  {
    id: '4',
    name: 'LED Desk Lamp',
    sku: 'DL-004',
    category: 'Home & Garden',
    stock: 23,
    price: 34.99,
    image: '💡'
  }
];

export default function DemoPage() {
  const [scannedProducts, setScannedProducts] = useState<DemoProduct[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<DemoProduct | null>(null);

  const simulateScan = () => {
    setIsScanning(true);
    setScanResult('Scanning...');
    
    setTimeout(() => {
      const randomProduct = demoProducts[Math.floor(Math.random() * demoProducts.length)];
      setScannedProducts(prev => [...prev, randomProduct]);
      setScanResult(`Scanned: ${randomProduct.name}`);
      setIsScanning(false);
    }, 2000);
  };

  const updateStock = (productId: string, newStock: number) => {
    setScannedProducts(prev => 
      prev.map(p => p.id === productId ? { ...p, stock: newStock } : p)
    );
  };

  const removeProduct = (productId: string) => {
    setScannedProducts(prev => prev.filter(p => p.id !== productId));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-[#0066cc] to-blue-700 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <span className="text-lg font-bold text-[#0066cc]">ScanStock Pro</span>
            </Link>
            <div className="flex items-center space-x-4">
              <Link href="/auth/login" className="text-gray-700 hover:text-[#0066cc] px-3 py-2 rounded-md text-sm font-medium transition-colors">
                Sign In
              </Link>
              <Link href="/auth/register" className="bg-[#0066cc] text-white hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Try ScanStock Pro Demo
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Experience the power of AI-powered inventory management with our interactive demo.
            Scan products, manage stock levels, and see real-time updates in action.
          </p>
        </div>

        {/* Demo Features Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Scanner Demo */}
          <div className="bg-white rounded-lg p-6 shadow-lg border border-gray-200">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">📱 Product Scanner</h2>
            <p className="text-gray-600 mb-6">
              Simulate barcode scanning and AI product recognition. Click the scan button to see it in action!
            </p>
            
            <div className="space-y-4">
              <button
                onClick={simulateScan}
                disabled={isScanning}
                className="w-full bg-[#0066cc] text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isScanning ? '🔍 Scanning...' : '📱 Simulate Scan'}
              </button>
              
              {scanResult && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
                  {scanResult}
                </div>
              )}
            </div>
          </div>

          {/* Inventory Management */}
          <div className="bg-white rounded-lg p-6 shadow-lg border border-gray-200">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">📊 Inventory Management</h2>
            <p className="text-gray-600 mb-6">
              Manage your scanned products with real-time stock updates and product information.
            </p>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-[#0066cc] mb-2">
                {scannedProducts.length}
              </div>
              <div className="text-gray-600">Products Scanned</div>
            </div>
          </div>
        </div>

        {/* Scanned Products Table */}
        {scannedProducts.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Scanned Products</h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      SKU
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stock
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {scannedProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="text-2xl mr-3">{product.image}</div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{product.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {product.sku}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {product.category}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          value={product.stock}
                          onChange={(e) => updateStock(product.id, parseInt(e.target.value) || 0)}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                          min="0"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${product.price.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => removeProduct(product.id)}
                          className="text-red-600 hover:text-red-900 transition-colors"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CTA Section */}
        <div className="text-center mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Ready to get started?
          </h2>
          <p className="text-gray-600 mb-6">
            Create your account and start managing your inventory with ScanStock Pro.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/register"
              className="inline-flex items-center justify-center px-8 py-3 text-lg font-semibold rounded-lg text-white bg-[#0066cc] hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
            >
              Start Free Trial
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex items-center justify-center px-8 py-3 text-lg font-semibold rounded-lg text-[#0066cc] bg-white hover:bg-gray-50 border-2 border-[#0066cc] transition-colors shadow-md hover:shadow-lg"
            >
              Sign In
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
