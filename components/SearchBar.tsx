'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface SearchResult {
  id: string;
  type: 'product' | 'category' | 'location' | 'scan';
  title: string;
  subtitle: string;
  href: string;
  icon: string;
}

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Mock search results - replace with actual search API
  const mockResults: SearchResult[] = [
    {
      id: '1',
      type: 'product',
      title: 'iPhone 15 Pro',
      subtitle: 'Electronics • In Stock: 25',
      href: '/products/iphone-15-pro',
      icon: '📱'
    },
    {
      id: '2',
      type: 'product',
      title: 'MacBook Air M2',
      subtitle: 'Electronics • In Stock: 12',
      href: '/products/macbook-air-m2',
      icon: '💻'
    },
    {
      id: '3',
      type: 'category',
      title: 'Electronics',
      subtitle: 'Category • 156 products',
      href: '/products?category=electronics',
      icon: '⚡'
    },
    {
      id: '4',
      type: 'location',
      title: 'Warehouse A - Section 5',
      subtitle: 'Location • 45 products',
      href: '/inventory?location=warehouse-a-section-5',
      icon: '📍'
    },
    {
      id: '5',
      type: 'scan',
      title: 'Recent Scan #12345',
      subtitle: 'Today at 2:30 PM',
      href: '/scans/12345',
      icon: '📷'
    }
  ];

  // Search function
  useEffect(() => {
    if (query.trim().length === 0) {
      setResults([]);
      setIsOpen(false);
      setSelectedIndex(-1);
      return;
    }

    if (query.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      setSelectedIndex(-1);
      return;
    }

    setIsLoading(true);

    // Simulate API delay
    const searchTimeout = setTimeout(() => {
      const filtered = mockResults.filter(item =>
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.subtitle.toLowerCase().includes(query.toLowerCase())
      );
      setResults(filtered);
      setIsOpen(true);
      setSelectedIndex(-1);
      setIsLoading(false);
    }, 150);

    return () => clearTimeout(searchTimeout);
  }, [query]);

  // Close search when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        inputRef.current &&
        resultsRef.current &&
        !inputRef.current.contains(event.target as Node) &&
        !resultsRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setSelectedIndex(prev => 
          prev < results.length - 1 ? prev + 1 : prev
        );
        break;
      
      case 'ArrowUp':
        event.preventDefault();
        setSelectedIndex(prev => prev > -1 ? prev - 1 : -1);
        break;
      
      case 'Enter':
        event.preventDefault();
        if (selectedIndex >= 0) {
          handleResultClick(results[selectedIndex]);
        } else if (results.length > 0) {
          handleResultClick(results[0]);
        }
        break;
      
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const handleResultClick = (result: SearchResult) => {
    setQuery('');
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.blur();
    router.push(result.href);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (results.length > 0) {
      handleResultClick(results[0]);
    } else if (query.trim()) {
      // Navigate to general search results page
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <div className="relative w-full max-w-md">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg 
              className="h-5 w-5 text-gray-400" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
              />
            </svg>
          </div>
          
          <input
            ref={inputRef}
            type="text"
            placeholder="Search products, categories..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => query.length >= 2 && setIsOpen(true)}
            className="block w-full pl-10 pr-12 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            autoComplete="off"
            spellCheck="false"
          />

          {/* Loading Spinner */}
          {isLoading && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-indigo-500 rounded-full"></div>
            </div>
          )}

          {/* Clear Button */}
          {query && !isLoading && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setIsOpen(false);
                setSelectedIndex(-1);
                inputRef.current?.focus();
              }}
              className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-gray-700"
            >
              <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Keyboard Shortcuts Hint */}
        <div className="absolute right-0 top-full mt-1 text-xs text-gray-400 hidden md:block">
          <kbd className="inline-flex items-center px-2 py-1 border border-gray-200 rounded text-xs font-mono bg-gray-50">
            ⌘K
          </kbd>
          {" "}to search
        </div>
      </form>

      {/* Search Results Dropdown */}
      {isOpen && results.length > 0 && (
        <div
          ref={resultsRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 max-h-96 overflow-auto z-50"
        >
          <div className="py-2">
            {results.map((result, index) => (
              <button
                key={result.id}
                type="button"
                onClick={() => handleResultClick(result)}
                className={`w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                  index === selectedIndex ? 'bg-indigo-50' : ''
                }`}
              >
                <span className="text-lg">{result.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {result.title}
                  </p>
                  <p className="text-sm text-gray-500 truncate">
                    {result.subtitle}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800 capitalize">
                    {result.type}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* View All Results */}
          {query && (
            <div className="border-t border-gray-100 px-4 py-3">
              <button
                type="button"
                onClick={() => {
                  router.push(`/search?q=${encodeURIComponent(query)}`);
                  setQuery('');
                  setIsOpen(false);
                  setSelectedIndex(-1);
                }}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                View all results for "{query}"
              </button>
            </div>
          )}
        </div>
      )}

      {/* No Results */}
      {isOpen && query.length >= 2 && !isLoading && results.length === 0 && (
        <div
          ref={resultsRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50"
        >
          <div className="px-4 py-6 text-center">
            <p className="text-sm text-gray-500">No results found for "{query}"</p>
            <p className="text-xs text-gray-400 mt-1">
              Try searching for products, categories, or locations
            </p>
          </div>
        </div>
      )}
    </div>
  );
}