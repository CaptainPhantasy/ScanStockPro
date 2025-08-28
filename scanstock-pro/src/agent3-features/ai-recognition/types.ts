// AI Recognition types for OpenAI integration

export interface BusinessContext {
  businessId: string;
  industry: string;
  preferences: {
    language: string;
    currency: string;
    measurementUnits: 'metric' | 'imperial';
  };
  customCategories?: string[];
  brandNames?: string[];
}

export interface ProductRecognition {
  product: ExtractedProduct;
  confidence: number;
  tokensUsed: number;
  timestamp: number;
  processingTime: number;
  imageMetadata: ImageMetadata;
}

export interface ExtractedProduct {
  name: string;
  brand?: string;
  category: string;
  subcategory?: string;
  size?: string;
  quantity?: string;
  barcode?: string;
  description?: string;
  attributes: Record<string, string>;
  suggestedSKU?: string;
}

export interface ImageMetadata {
  originalSize: number;
  optimizedSize: number;
  dimensions: {
    width: number;
    height: number;
  };
  format: string;
  compressionRatio: number;
}

export interface OpenAIUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  model: string;
  request_id?: string;
}

export interface AIUsageRecord {
  id: string;
  businessId: string;
  userId?: string;
  feature: 'product_recognition' | 'categorization' | 'search' | 'description_generation';
  tokensUsed: number;
  promptTokens: number;
  completionTokens: number;
  costEstimate: number;
  model: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface CategorizedProducts {
  categories: ProductCategory[];
  uncategorized: string[];
  confidence: number;
  suggestions: CategorySuggestion[];
}

export interface ProductCategory {
  name: string;
  description: string;
  productIds: string[];
  subcategories?: ProductCategory[];
  confidence: number;
}

export interface CategorySuggestion {
  productId: string;
  suggestedCategories: Array<{
    name: string;
    confidence: number;
    reasoning: string;
  }>;
}

export interface SearchResult {
  productId: string;
  relevanceScore: number;
  matchedFields: string[];
  snippet?: string;
}

export interface NLSearchQuery {
  query: string;
  filters?: {
    category?: string;
    priceRange?: [number, number];
    inStock?: boolean;
    brand?: string;
  };
  context?: BusinessContext;
}

// Configuration and settings
export interface OpenAIConfig {
  model: 'gpt-4o' | 'gpt-4o-mini' | 'gpt-4-turbo' | 'gpt-3.5-turbo';
  maxTokens: number;
  temperature: number;
  imageDetail: 'low' | 'high' | 'auto';
  enableBatching: boolean;
  rateLimitPerMinute: number;
  retryAttempts: number;
  timeoutMs: number;
}

export interface ClientAPIKeySettings {
  businessId: string;
  encryptedApiKey: string;
  keyLastUpdated: Date;
  isActive: boolean;
  usage: {
    monthlyTokens: number;
    monthlyCost: number;
    lastResetDate: Date;
  };
  limits: {
    monthlyTokenLimit?: number;
    dailyTokenLimit?: number;
    maxCostPerMonth?: number;
  };
  allowedFeatures: Array<'product_recognition' | 'categorization' | 'search' | 'descriptions'>;
}

// Error handling
export interface AIServiceError {
  code: 'RATE_LIMIT' | 'API_KEY_INVALID' | 'INSUFFICIENT_CREDITS' | 'MODEL_ERROR' | 'NETWORK_ERROR';
  message: string;
  retryAfter?: number;
  tokensUsed?: number;
  originalError?: any;
}

// Optimization and caching
export interface ImageOptimization {
  targetSize: number; // bytes
  quality: number; // 0-100
  format: 'jpeg' | 'png' | 'webp';
  maxDimensions: {
    width: number;
    height: number;
  };
}

export interface CacheKey {
  imageHash: string;
  businessContext: string;
  modelVersion: string;
}

export interface CachedRecognition {
  key: CacheKey;
  result: ProductRecognition;
  expiresAt: Date;
  hitCount: number;
}