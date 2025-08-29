'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { MobileLayout } from '../layouts/MobileLayout';
import { ProductCard } from '../components/mobile/ProductCard';
import { useGestures } from '../hooks/useGestures';
import { useOffline } from '../hooks/useOffline';
import type { Product } from '../../shared/contracts/agent-interfaces';

// Mock products data - will be replaced by real data from Agent 3
const MOCK_PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Wireless Bluetooth Headphones',
    sku: 'WH-BT-001',
    barcode: '123456789012',
    currentQuantity: 45,
  },
  {
    id: '2',
    name: 'USB-C Cable 3ft',
    sku: 'USB-C-3FT',
    barcode: '123456789013',
    currentQuantity: 120,
  },
  {
    id: '3',
    name: 'Phone Case Clear TPU',
    sku: 'PC-CLR-TPU',
    barcode: '123456789014',
    currentQuantity: 8,
  },
  {
    id: '4',
    name: 'Wireless Charger Pad',
    sku: 'WC-PAD-001',
    barcode: '123456789015',
    currentQuantity: 0,
  },
  {
    id: '5',
    name: 'Screen Protector Glass',
    sku: 'SP-GLASS',
    barcode: '123456789016',
    currentQuantity: 67,
  },
];

const FILTER_OPTIONS = [
  { key: 'all', label: 'All', icon: '📦' },
  { key: 'low_stock', label: 'Low Stock', icon: '⚠️' },
  { key: 'out_of_stock', label: 'Out of Stock', icon: '❌' },
  { key: 'in_stock', label: 'In Stock', icon: '✅' },
];

export default function Products() {
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const { queueOperation } = useOffline();

  // Pull to refresh gesture
  useGestures(containerRef, {
    onPullToRefresh: handlePullToRefresh,
    pullToRefreshThreshold: 80,
  });

  async function handlePullToRefresh() {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    
    // Simulate refresh delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // TODO: Integrate with Agent 3 to refresh products
    console.log('Refreshing products...');
    
    setIsRefreshing(false);
  }

  const filteredProducts = products.filter(product => {
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        product.name.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query) ||
        product.barcode.includes(query);
      
      if (!matchesSearch) return false;
    }
    
    // Apply category filter
    switch (selectedFilter) {
      case 'low_stock':
        return product.currentQuantity > 0 && product.currentQuantity < 10;
      case 'out_of_stock':
        return product.currentQuantity === 0;
      case 'in_stock':
        return product.currentQuantity > 0;
      default:
        return true;
    }
  });

  const handleProductEdit = useCallback((product: Product) => {
    setSelectedProduct(product);
    // TODO: Open edit modal or navigate to edit page
    console.log('Edit product:', product);
  }, []);

  const handleProductDelete = useCallback(async (product: Product) => {
    // Confirm deletion
    if (!confirm(`Delete ${product.name}?`)) return;
    
    // Optimistically update UI
    setProducts(prev => prev.filter(p => p.id !== product.id));
    
    // Queue for offline sync
    queueOperation({
      type: 'product_delete',
      data: { id: product.id },
      maxRetries: 3,
    });
    
    console.log('Delete product:', product);
  }, [queueOperation]);

  const handleProductSelect = useCallback((product: Product) => {
    console.log('Select product:', product);
    // TODO: Navigate to product detail or open count modal
  }, []);

  const getFilterCount = useCallback((filterKey: string) => {
    return products.filter(product => {
      switch (filterKey) {
        case 'low_stock':
          return product.currentQuantity > 0 && product.currentQuantity < 10;
        case 'out_of_stock':
          return product.currentQuantity === 0;
        case 'in_stock':
          return product.currentQuantity > 0;
        default:
          return true;
      }
    }).length;
  }, [products]);

  return (
    <MobileLayout>
      {/* Header */}
      <div className="bg-white border-b border-neutral-200 safe-top">
        <div className="px-warehouse-md py-warehouse-sm">
          <h1 className="text-mobile-xl font-bold text-neutral-900 mb-warehouse-sm">
            Products
          </h1>
          
          {/* Search Bar */}
          <div className="relative mb-warehouse-md">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products, SKUs, or barcodes..."
              className="
                w-full py-3 px-4 pl-12
                bg-neutral-50 border border-neutral-200 rounded-mobile-lg
                text-mobile-base placeholder-neutral-500
                focus:bg-white focus:border-warehouse-500 focus:outline-none focus:ring-2 focus:ring-warehouse-200
                transition-all duration-200
              "
              data-testid="product-search"
            />
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-neutral-400">
              🔍
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                ✕
              </button>
            )}
          </div>
          
          {/* Filter Chips */}
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-warehouse-md px-warehouse-md">
            {FILTER_OPTIONS.map((filter) => {
              const isSelected = selectedFilter === filter.key;
              const count = getFilterCount(filter.key);
              
              return (
                <button
                  key={filter.key}
                  onClick={() => setSelectedFilter(filter.key)}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-mobile-lg
                    text-mobile-sm font-medium whitespace-nowrap
                    transition-all duration-200 active:scale-95
                    ${isSelected
                      ? 'bg-warehouse-500 text-white'
                      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                    }
                  `}
                  data-testid={`filter-${filter.key}`}
                >
                  <span>{filter.icon}</span>
                  <span>{filter.label}</span>
                  <span className={`
                    px-2 py-1 rounded-full text-xs
                    ${isSelected ? 'bg-white/20' : 'bg-neutral-200 text-neutral-600'}
                  `}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Products List */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {/* Pull to refresh indicator */}
        {isRefreshing && (
          <div className="flex justify-center py-warehouse-md">
            <div className="flex items-center gap-2 text-warehouse-600">
              <div className="w-4 h-4 border-2 border-warehouse-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-mobile-sm font-medium">Refreshing...</span>
            </div>
          </div>
        )}
        
        <div className="p-warehouse-md space-y-warehouse-sm">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onEdit={handleProductEdit}
              onDelete={handleProductDelete}
              onSelect={handleProductSelect}
              className="bg-white shadow-sm"
            />
          ))}
        </div>
        
        {/* Empty State */}
        {filteredProducts.length === 0 && !isRefreshing && (
          <div className="flex flex-col items-center justify-center py-warehouse-xl px-warehouse-md text-center">
            <div className="text-6xl mb-warehouse-md">
              {searchQuery ? '🔍' : '📦'}
            </div>
            <h3 className="text-mobile-lg font-semibold text-neutral-900 mb-warehouse-sm">
              {searchQuery ? 'No products found' : 'No products yet'}
            </h3>
            <p className="text-mobile-base text-neutral-600 mb-warehouse-lg">
              {searchQuery 
                ? `No products match "${searchQuery}"`
                : 'Start by adding products to your inventory'
              }
            </p>
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery('')}
                className="py-3 px-6 bg-warehouse-100 text-warehouse-700 rounded-mobile-lg font-medium"
              >
                Clear Search
              </button>
            ) : (
              <button className="py-3 px-6 bg-warehouse-500 text-white rounded-mobile-lg font-medium">
                Add Product
              </button>
            )}
          </div>
        )}
        
        {/* Pull to refresh hint */}
        {!isRefreshing && filteredProducts.length > 0 && (
          <div className="text-center py-warehouse-md">
            <p className="text-mobile-xs text-neutral-500">
              Pull down to refresh
            </p>
          </div>
        )}
      </div>
    </MobileLayout>
  );
}