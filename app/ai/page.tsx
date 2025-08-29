'use client';

import { useState, useRef, useCallback } from 'react';
import { MobileLayout } from '../../src/agent2-interface/layouts/MobileLayout';
import { BottomNav } from '../../src/agent2-interface/components/mobile/BottomNav';
import { useOffline } from '../../src/agent2-interface/hooks/useOffline';
import type { Product } from '../../src/shared/contracts/agent-interfaces';

interface AIRecognitionResult {
  product: {
    name: string;
    brand?: string;
    category: string;
    subcategory?: string;
    size?: string;
    quantity?: string;
    barcode?: string;
    description?: string;
    attributes?: Record<string, any>;
    suggestedSKU?: string;
  };
  confidence: number;
  processingTime: number;
  tokensUsed: number;
}

export default function AIRecognitionPage() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recognitionResult, setRecognitionResult] = useState<AIRecognitionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [recentRecognitions, setRecentRecognitions] = useState<AIRecognitionResult[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { isOffline, queueOperation } = useOffline();

  const handleImageCapture = (file: File) => {
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
        setError(null);
        setRecognitionResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageCapture(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageCapture(file);
    }
  };

  const handleProcessImage = async () => {
    if (!selectedImage || isProcessing) return;

    setIsProcessing(true);
    setError(null);

    try {
      // Extract base64 data from data URL
      const base64Data = selectedImage.split(',')[1];

      // Call AI recognition API
      const response = await fetch('/api/ai/recognize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: base64Data,
          businessContext: {
            businessId: 'demo-business',
            industry: 'retail',
            preferences: {
              language: 'English',
              measurementUnits: 'imperial',
            },
          },
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setRecognitionResult(result);
        setRecentRecognitions(prev => [result, ...prev.slice(0, 4)]);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to process image');
      }
    } catch (error) {
      console.error('AI recognition failed:', error);
      setError('Failed to connect to AI service. Please try again.');
      
      if (isOffline) {
        setError('AI recognition requires an internet connection.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddProduct = async () => {
    if (!recognitionResult) return;

    const productData: Partial<Product> = {
      name: recognitionResult.product.name,
      sku: recognitionResult.product.suggestedSKU || '',
      barcode: recognitionResult.product.barcode || '',
      currentQuantity: parseInt(recognitionResult.product.quantity || '0'),
    };

    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...productData,
          metadata: {
            aiRecognized: true,
            confidence: recognitionResult.confidence,
            brand: recognitionResult.product.brand,
            category: recognitionResult.product.category,
            subcategory: recognitionResult.product.subcategory,
            attributes: recognitionResult.product.attributes,
          },
        }),
      });

      if (response.ok) {
        setShowAddProductModal(false);
        setSelectedImage(null);
        setRecognitionResult(null);
        
        // Navigate to products page
        window.location.href = '/products';
      }
    } catch (error) {
      console.error('Failed to add product:', error);
      
      if (isOffline) {
        queueOperation({
          type: 'product_create',
          data: productData,
          maxRetries: 3,
        });
        
        setShowAddProductModal(false);
        setSelectedImage(null);
        setRecognitionResult(null);
      }
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-100';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <MobileLayout>
      {/* Header */}
      <div className="bg-white border-b border-neutral-200 px-4 py-3">
        <h1 className="text-xl font-bold text-neutral-900">AI Recognition</h1>
        <p className="text-sm text-neutral-600">
          Take a photo to identify products automatically
        </p>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 pb-24">
        {/* Camera/Upload Section */}
        <div className="bg-white rounded-xl border border-neutral-200 p-4 mb-4">
          {!selectedImage ? (
            <div className="text-center">
              <div className="text-6xl mb-4">🤖</div>
              <h2 className="text-lg font-semibold text-neutral-900 mb-2">
                AI Product Recognition
              </h2>
              <p className="text-sm text-neutral-600 mb-6">
                Our AI can identify products, extract details, and suggest SKUs from photos
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 active:scale-95 transition-transform"
                >
                  <span>📷</span>
                  <span>Take Photo</span>
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 py-3 border border-neutral-200 rounded-xl font-medium flex items-center justify-center gap-2"
                >
                  <span>📁</span>
                  <span>Choose File</span>
                </button>
              </div>

              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleCameraCapture}
                className="hidden"
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          ) : (
            <div>
              {/* Selected Image Preview */}
              <div className="relative mb-4">
                <img
                  src={selectedImage}
                  alt="Selected product"
                  className="w-full h-64 object-contain bg-neutral-50 rounded-lg"
                />
                <button
                  onClick={() => {
                    setSelectedImage(null);
                    setRecognitionResult(null);
                    setError(null);
                  }}
                  className="absolute top-2 right-2 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center"
                >
                  ✕
                </button>
              </div>

              {/* Process Button */}
              {!recognitionResult && !error && (
                <button
                  onClick={handleProcessImage}
                  disabled={isProcessing}
                  className={`
                    w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2
                    ${isProcessing
                      ? 'bg-neutral-100 text-neutral-400'
                      : 'bg-blue-500 text-white active:scale-95'
                    }
                    transition-transform
                  `}
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin" />
                      <span>Analyzing image...</span>
                    </>
                  ) : (
                    <>
                      <span>🔍</span>
                      <span>Analyze with AI</span>
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <h3 className="font-medium text-red-900">Recognition Failed</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Recognition Result */}
        {recognitionResult && (
          <div className="bg-white rounded-xl border border-neutral-200 p-4 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-neutral-900">Recognition Result</h3>
              <div className={`px-2 py-1 rounded text-xs font-medium ${getConfidenceColor(recognitionResult.confidence)}`}>
                {Math.round(recognitionResult.confidence * 100)}% confidence
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm text-neutral-600">Product Name</label>
                <div className="font-medium text-neutral-900">{recognitionResult.product.name}</div>
              </div>

              {recognitionResult.product.brand && (
                <div>
                  <label className="text-sm text-neutral-600">Brand</label>
                  <div className="font-medium text-neutral-900">{recognitionResult.product.brand}</div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-neutral-600">Category</label>
                  <div className="font-medium text-neutral-900">{recognitionResult.product.category}</div>
                </div>

                {recognitionResult.product.subcategory && (
                  <div>
                    <label className="text-sm text-neutral-600">Subcategory</label>
                    <div className="font-medium text-neutral-900">{recognitionResult.product.subcategory}</div>
                  </div>
                )}
              </div>

              {recognitionResult.product.size && (
                <div>
                  <label className="text-sm text-neutral-600">Size/Quantity</label>
                  <div className="font-medium text-neutral-900">{recognitionResult.product.size}</div>
                </div>
              )}

              {recognitionResult.product.barcode && (
                <div>
                  <label className="text-sm text-neutral-600">Barcode</label>
                  <div className="font-mono text-sm text-neutral-900">{recognitionResult.product.barcode}</div>
                </div>
              )}

              {recognitionResult.product.suggestedSKU && (
                <div>
                  <label className="text-sm text-neutral-600">Suggested SKU</label>
                  <div className="font-mono text-sm text-neutral-900">{recognitionResult.product.suggestedSKU}</div>
                </div>
              )}

              {recognitionResult.product.description && (
                <div>
                  <label className="text-sm text-neutral-600">Description</label>
                  <div className="text-sm text-neutral-900">{recognitionResult.product.description}</div>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-neutral-100">
              <div className="flex items-center justify-between text-xs text-neutral-500">
                <span>Processing time: {recognitionResult.processingTime}ms</span>
                <span>Tokens used: {recognitionResult.tokensUsed}</span>
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowAddProductModal(true)}
                className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-medium active:scale-95 transition-transform"
              >
                Add to Inventory
              </button>
              <button
                onClick={() => {
                  setSelectedImage(null);
                  setRecognitionResult(null);
                }}
                className="py-3 px-4 border border-neutral-200 rounded-xl font-medium"
              >
                Try Another
              </button>
            </div>
          </div>
        )}

        {/* Recent Recognitions */}
        {recentRecognitions.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-3">Recent Recognitions</h3>
            <div className="space-y-3">
              {recentRecognitions.map((recognition, index) => (
                <div
                  key={index}
                  className="bg-white rounded-xl border border-neutral-200 p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-neutral-900">{recognition.product.name}</div>
                      <div className="text-sm text-neutral-600">
                        {recognition.product.category}
                        {recognition.product.brand && ` • ${recognition.product.brand}`}
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-medium ${getConfidenceColor(recognition.confidence)}`}>
                      {Math.round(recognition.confidence * 100)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Features List */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-neutral-900 mb-3">AI Capabilities</h3>
          <div className="space-y-3">
            <div className="bg-blue-50 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🏷️</span>
                <div>
                  <h4 className="font-medium text-neutral-900">Product Identification</h4>
                  <p className="text-sm text-neutral-600 mt-1">
                    Automatically identify products from photos with high accuracy
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">📝</span>
                <div>
                  <h4 className="font-medium text-neutral-900">Detail Extraction</h4>
                  <p className="text-sm text-neutral-600 mt-1">
                    Extract brand, size, quantity, and other attributes from packaging
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🔤</span>
                <div>
                  <h4 className="font-medium text-neutral-900">SKU Generation</h4>
                  <p className="text-sm text-neutral-600 mt-1">
                    Intelligent SKU suggestions based on product attributes
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">📊</span>
                <div>
                  <h4 className="font-medium text-neutral-900">Smart Categorization</h4>
                  <p className="text-sm text-neutral-600 mt-1">
                    Automatic categorization based on your business type
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Product Modal */}
      {showAddProductModal && recognitionResult && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-2xl p-6 animate-slide-up max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">Add Product to Inventory</h2>
            
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAddProduct();
              }}
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Product Name
                  </label>
                  <input
                    type="text"
                    defaultValue={recognitionResult.product.name}
                    className="w-full p-3 border border-neutral-200 rounded-xl"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      SKU
                    </label>
                    <input
                      type="text"
                      defaultValue={recognitionResult.product.suggestedSKU}
                      className="w-full p-3 border border-neutral-200 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Barcode
                    </label>
                    <input
                      type="text"
                      defaultValue={recognitionResult.product.barcode}
                      className="w-full p-3 border border-neutral-200 rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Initial Quantity
                  </label>
                  <input
                    type="number"
                    defaultValue={recognitionResult.product.quantity || 0}
                    className="w-full p-3 border border-neutral-200 rounded-xl"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Category
                  </label>
                  <input
                    type="text"
                    defaultValue={recognitionResult.product.category}
                    className="w-full p-3 border border-neutral-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  className="flex-1 py-3 border border-neutral-200 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-medium"
                >
                  Add to Inventory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <BottomNav />
    </MobileLayout>
  );
}