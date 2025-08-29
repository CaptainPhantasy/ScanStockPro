'use client';

import { useState, useCallback } from 'react';
import { BarcodeScanner } from '@/agent2-interface/components/BarcodeScanner';

export default function ScanPage() {
  const [scannedCode, setScannedCode] = useState<string>('');
  const [manualCode, setManualCode] = useState('');
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookupProduct = useCallback(async (barcode: string) => {
    if (!barcode) return;
    
    setLoading(true);
    setError(null);
    setProduct(null);
    
    try {
      const response = await fetch(`/api/products?barcode=${barcode}&mobile=true`);
      const data = await response.json();
      
      if (data.data && data.data.length > 0) {
        setProduct(data.data[0]);
      } else {
        setError('Product not found. Would you like to add it?');
      }
    } catch (err) {
      console.error('Product lookup failed:', err);
      setError('Failed to look up product');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleScanSuccess = useCallback((code: string) => {
    setScannedCode(code);
    setManualCode(code);
    lookupProduct(code);
  }, [lookupProduct]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode) {
      setScannedCode(manualCode);
      lookupProduct(manualCode);
    }
  };

  const handleUpdateQuantity = async (newQuantity: number) => {
    if (!product) return;
    
    try {
      const response = await fetch('/api/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: product.id,
          quantity: newQuantity
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setProduct(data.data);
      }
    } catch (err) {
      console.error('Failed to update quantity:', err);
    }
  };

  const handleAddProduct = () => {
    // Navigate to add product page with barcode pre-filled
    window.location.href = `/products/new?barcode=${scannedCode}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="px-4 py-3">
          <h1 className="text-xl font-bold">Barcode Scanner</h1>
        </div>
      </div>

      <div className="p-4 max-w-md mx-auto">
        {/* Scanner Component */}
        <BarcodeScanner
          onScanSuccess={handleScanSuccess}
          onScanError={setError}
          className="mb-6"
        />

        {/* Manual Entry */}
        <form onSubmit={handleManualSubmit} className="mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Enter barcode manually"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Lookup
            </button>
          </div>
        </form>

        {/* Last Scanned */}
        {scannedCode && (
          <div className="mb-6 p-3 bg-gray-100 rounded-lg">
            <p className="text-sm text-gray-600">Last scanned:</p>
            <p className="font-mono font-bold">{scannedCode}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
            {error.includes('not found') && scannedCode && (
              <button
                onClick={handleAddProduct}
                className="mt-3 w-full py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                Add New Product
              </button>
            )}
          </div>
        )}

        {/* Product Details */}
        {product && !loading && (
          <div className="bg-white rounded-lg shadow-md p-4">
            {product.image_url && (
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-48 object-cover rounded-lg mb-4"
              />
            )}
            
            <h2 className="text-lg font-bold mb-2">{product.name}</h2>
            
            <div className="space-y-2 text-sm">
              {product.barcode && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Barcode:</span>
                  <span className="font-mono">{product.barcode}</span>
                </div>
              )}
              
              {product.sku && (
                <div className="flex justify-between">
                  <span className="text-gray-600">SKU:</span>
                  <span>{product.sku}</span>
                </div>
              )}
              
              {product.category && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Category:</span>
                  <span>{product.category}</span>
                </div>
              )}
              
              {product.price !== null && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Price:</span>
                  <span className="font-bold">${product.price.toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Quantity Controls */}
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Quantity:</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleUpdateQuantity(Math.max(0, product.quantity - 1))}
                    className="w-10 h-10 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center"
                  >
                    -
                  </button>
                  <span className="w-16 text-center font-bold text-lg">
                    {product.quantity}
                  </span>
                  <button
                    onClick={() => handleUpdateQuantity(product.quantity + 1)}
                    className="w-10 h-10 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => window.location.href = `/products/${product.id}`}
                className="flex-1 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                View Details
              </button>
              <button
                onClick={() => setProduct(null)}
                className="flex-1 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Scan Another
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t">
        <div className="grid grid-cols-4 py-2">
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="flex flex-col items-center py-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs mt-1">Home</span>
          </button>
          
          <button
            className="flex flex-col items-center py-2 text-blue-500"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            <span className="text-xs mt-1">Scan</span>
          </button>
          
          <button
            onClick={() => window.location.href = '/products'}
            className="flex flex-col items-center py-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <span className="text-xs mt-1">Products</span>
          </button>
          
          <button
            onClick={() => window.location.href = '/settings'}
            className="flex flex-col items-center py-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-xs mt-1">Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
}