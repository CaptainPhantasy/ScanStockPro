'use client';

import { useState, useEffect, useId } from 'react';
import Link from 'next/link';

interface CountSession {
  id: string;
  name: string;
  location: string;
  startTime: string;
  status: 'active' | 'completed' | 'paused';
  itemsCounted: number;
  totalItems: number;
}

interface CountItem {
  id: string;
  productName: string;
  sku: string;
  expectedQuantity: number;
  actualQuantity: number;
  difference: number;
  notes: string;
}

const mockLocations = [
  { id: 'warehouse-a', name: 'Warehouse A', icon: '🏢' },
  { id: 'warehouse-b', name: 'Warehouse B', icon: '🏪' },
  { id: 'store-front', name: 'Store Front', icon: '🏪' },
  { id: 'back-room', name: 'Back Room', icon: '📦' },
  { id: 'receiving', name: 'Receiving Area', icon: '🚚' }
];

const mockProducts = [
  { id: '1', name: 'Wireless Bluetooth Headphones', sku: 'WH-001', expectedQuantity: 45 },
  { id: '2', name: 'Organic Cotton T-Shirt', sku: 'CT-002', expectedQuantity: 120 },
  { id: '3', name: 'Stainless Steel Water Bottle', sku: 'WB-003', expectedQuantity: 67 },
  { id: '4', name: 'LED Desk Lamp', sku: 'DL-004', expectedQuantity: 23 },
  { id: '5', name: 'Smartphone Case', sku: 'SC-005', expectedQuantity: 89 }
];

export default function CountingPage() {
  const [currentSession, setCurrentSession] = useState<CountSession | null>(null);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [sessionName, setSessionName] = useState('');
  const [countItems, setCountItems] = useState<CountItem[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState('');
  
  // Generate unique IDs
  const sessionNameId = useId();

  useEffect(() => {
    // Auto-generate session name
    const now = new Date();
    setSessionName(`Count - ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`);
  }, []);

  const startSession = () => {
    if (!selectedLocation || !sessionName.trim()) {
      alert('Please select a location and enter a session name');
      return;
    }

    const newSession: CountSession = {
      id: `session-${Date.now()}`,
      name: sessionName,
      location: selectedLocation,
      startTime: new Date().toISOString(),
      status: 'active',
      itemsCounted: 0,
      totalItems: mockProducts.length
    };

    setCurrentSession(newSession);
    
    // Initialize count items
    const initialItems = mockProducts.map(product => ({
      id: product.id,
      productName: product.name,
      sku: product.sku,
      expectedQuantity: product.expectedQuantity,
      actualQuantity: 0,
      difference: -product.expectedQuantity,
      notes: ''
    }));
    
    setCountItems(initialItems);
  };

  const pauseSession = () => {
    if (currentSession) {
      setCurrentSession({ ...currentSession, status: 'paused' });
    }
  };

  const resumeSession = () => {
    if (currentSession) {
      setCurrentSession({ ...currentSession, status: 'active' });
    }
  };

  const completeSession = () => {
    if (currentSession) {
      setCurrentSession({ ...currentSession, status: 'completed' });
      
      // Calculate summary
      const totalExpected = countItems.reduce((sum, item) => sum + item.expectedQuantity, 0);
      const totalActual = countItems.reduce((sum, item) => sum + item.actualQuantity, 0);
      const totalDifference = totalActual - totalExpected;
      
      alert(`Session completed!\n\nTotal Expected: ${totalExpected}\nTotal Actual: ${totalActual}\nDifference: ${totalDifference > 0 ? '+' : ''}${totalDifference}`);
    }
  };

  const simulateScan = () => {
    setIsScanning(true);
    setScanResult('Scanning...');
    
    setTimeout(() => {
      const randomProduct = mockProducts[Math.floor(Math.random() * mockProducts.length)];
      setScanResult(`Scanned: ${randomProduct.name} (${randomProduct.sku})`);
      setIsScanning(false);
    }, 2000);
  };

  const updateCount = (itemId: string, actualQuantity: number) => {
    setCountItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const difference = actualQuantity - item.expectedQuantity;
        return {
          ...item,
          actualQuantity,
          difference
        };
      }
      return item;
    }));

    // Update session count
    if (currentSession) {
      const countedItems = countItems.filter(item => item.actualQuantity > 0).length;
      setCurrentSession(prev => prev ? { ...prev, itemsCounted: countedItems } : null);
    }
  };

  const updateNotes = (itemId: string, notes: string) => {
    setCountItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, notes } : item
    ));
  };

  const getLocationName = (locationId: string) => {
    return mockLocations.find(loc => loc.id === locationId)?.name || locationId;
  };

  const getLocationIcon = (locationId: string) => {
    return mockLocations.find(loc => loc.id === locationId)?.icon || '📍';
  };

  if (!currentSession) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-8">
                <Link href="/" className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-[#0066cc] to-blue-700 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">S</span>
                  </div>
                  <span className="text-lg font-bold text-[#0066cc]">ScanStock Pro</span>
                </Link>
                <nav className="hidden md:flex space-x-6">
                  <Link href="/dashboard" className="text-gray-700 hover:text-[#0066cc] px-3 py-2 rounded-md text-sm font-medium transition-colors">
                    Dashboard
                  </Link>
                  <Link href="/products" className="text-gray-700 hover:text-[#0066cc] px-3 py-2 rounded-md text-sm font-medium transition-colors">
                    Products
                  </Link>
                  <Link href="/inventory" className="text-gray-700 hover:text-[#0066cc] px-3 py-2 rounded-md text-sm font-medium transition-colors">
                    Inventory
                  </Link>
                  <Link href="/counting" className="text-[#0066cc] px-3 py-2 rounded-md text-sm font-medium bg-blue-50">
                    Counting
                  </Link>
                </nav>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-[1200px] mx-auto px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Inventory Counting</h1>
            <p className="text-gray-600 mt-2">Start a new inventory count session to verify stock levels.</p>
          </div>

          {/* Start Session Form */}
          <div className="bg-white rounded-lg p-8 shadow-sm border border-gray-200 max-w-2xl mx-auto">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Start New Count Session</h2>
            
            <div className="space-y-6">
              <div>
                <label htmlFor={sessionNameId} className="block text-sm font-medium text-gray-700 mb-2">
                  Session Name
                </label>
                <input
                  id={sessionNameId}
                  type="text"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-[#0066cc] focus:border-[#0066cc]"
                  placeholder="Enter session name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Select Location
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {mockLocations.map((location) => (
                    <button
                      key={location.id}
                      type="button"
                      onClick={() => setSelectedLocation(location.id)}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        selectedLocation === location.id
                          ? 'border-[#0066cc] bg-blue-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="text-2xl mb-2">{location.icon}</div>
                      <div className="text-sm font-medium text-gray-900">{location.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={startSession}
                disabled={!selectedLocation || !sessionName.trim()}
                className="w-full bg-[#0066cc] text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Start Count Session
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <Link href="/" className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-[#0066cc] to-blue-700 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">S</span>
                </div>
                <span className="text-lg font-bold text-[#0066cc]">ScanStock Pro</span>
              </Link>
              <nav className="hidden md:flex space-x-6">
                <Link href="/dashboard" className="text-gray-700 hover:text-[#0066cc] px-3 py-2 rounded-md text-sm font-medium transition-colors">
                  Dashboard
                </Link>
                <Link href="/products" className="text-gray-700 hover:text-[#0066cc] px-3 py-2 rounded-md text-sm font-medium transition-colors">
                  Products
                </Link>
                <Link href="/inventory" className="text-gray-700 hover:text-[#0066cc] px-3 py-2 rounded-md text-sm font-medium transition-colors">
                  Inventory
                </Link>
                <Link href="/counting" className="text-[#0066cc] px-3 py-2 rounded-md text-sm font-medium bg-blue-50">
                  Counting
                </Link>
              </nav>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                currentSession.status === 'active' ? 'bg-green-100 text-green-800' :
                currentSession.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {currentSession.status === 'active' ? 'Active' :
                 currentSession.status === 'paused' ? 'Paused' : 'Completed'}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-6 lg:px-8 py-8">
        {/* Session Header */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{currentSession.name}</h1>
              <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                <span>{getLocationIcon(currentSession.location)} {getLocationName(currentSession.location)}</span>
                <span>Started: {new Date(currentSession.startTime).toLocaleString()}</span>
                <span>Items Counted: {currentSession.itemsCounted} / {currentSession.totalItems}</span>
              </div>
            </div>
            
            <div className="flex space-x-3 mt-4 md:mt-0">
              {currentSession.status === 'active' && (
                <>
                  <button
                    type="button"
                    onClick={pauseSession}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Pause
                  </button>
                  <button
                    type="button"
                    onClick={completeSession}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Complete
                  </button>
                </>
              )}
              {currentSession.status === 'paused' && (
                <>
                  <button
                    type="button"
                    onClick={resumeSession}
                    className="px-4 py-2 bg-[#0066cc] text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Resume
                  </button>
                  <button
                    type="button"
                    onClick={completeSession}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Complete
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Scanner Demo */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">📱 Product Scanner</h2>
          <div className="flex items-center space-x-4">
            <button
              type="button"
              onClick={simulateScan}
              disabled={isScanning}
              className="bg-[#0066cc] text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isScanning ? '🔍 Scanning...' : '📱 Simulate Scan'}
            </button>
            {scanResult && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-md">
                {scanResult}
              </div>
            )}
          </div>
        </div>

        {/* Count Items Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Count Items</h2>
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
                    Expected
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actual
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Difference
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {countItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{item.productName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                      {item.sku}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.expectedQuantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="number"
                        value={item.actualQuantity}
                        onChange={(e) => updateCount(item.id, parseInt(e.target.value) || 0)}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                        min="0"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${
                        item.difference === 0 ? 'text-green-600' :
                        item.difference > 0 ? 'text-blue-600' : 'text-red-600'
                      }`}>
                        {item.difference > 0 ? '+' : ''}{item.difference}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="text"
                        value={item.notes}
                        onChange={(e) => updateNotes(item.id, e.target.value)}
                        className="w-32 px-2 py-1 border border-gray-300 rounded text-sm"
                        placeholder="Add notes..."
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 text-center">
            <div className="text-2xl font-bold text-[#0066cc]">{currentSession.itemsCounted}</div>
            <div className="text-sm text-gray-600">Items Counted</div>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 text-center">
            <div className="text-2xl font-bold text-green-600">
              {countItems.filter(item => item.difference === 0).length}
            </div>
            <div className="text-sm text-gray-600">Exact Matches</div>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 text-center">
            <div className="text-2xl font-bold text-red-600">
              {countItems.filter(item => item.difference !== 0).length}
            </div>
            <div className="text-sm text-gray-600">Discrepancies</div>
          </div>
        </div>
      </main>
    </div>
  );
}