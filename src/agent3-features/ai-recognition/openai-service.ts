import OpenAI from 'openai';
import { Foundation_To_Features, ProductSchema } from '../../shared/contracts/agent-interfaces';
import {
  BusinessContext,
  ProductRecognition,
  ExtractedProduct,
  OpenAIUsage,
  AIUsageRecord,
  CategorizedProducts,
  SearchResult,
  NLSearchQuery,
  OpenAIConfig,
  ClientAPIKeySettings,
  AIServiceError,
  ImageOptimization,
  CacheKey,
  CachedRecognition,
  ImageMetadata
} from './types';

export class OpenAIService {
  private openaiClient: OpenAI | null = null;
  private currentConfig: OpenAIConfig;
  private rateLimiter: Map<string, number[]> = new Map();
  private cache: Map<string, CachedRecognition> = new Map();

  constructor(private foundation: Foundation_To_Features) {
    this.currentConfig = {
      model: 'gpt-4o-mini',
      maxTokens: 500,
      temperature: 0.1,
      imageDetail: 'low',
      enableBatching: true,
      rateLimitPerMinute: 50,
      retryAttempts: 3,
      timeoutMs: 30000
    };
  }

  // Initialize with client's encrypted API key
  async initialize(businessId: string): Promise<void> {
    try {
      const keySettings = await this.getClientKeySettings(businessId);
      
      if (!keySettings || !keySettings.isActive) {
        throw new Error('No active OpenAI API key found for business');
      }

      const apiKey = await this.decryptApiKey(keySettings.encryptedApiKey);
      
      this.openaiClient = new OpenAI({
        apiKey: apiKey,
        maxRetries: this.currentConfig.retryAttempts,
        timeout: this.currentConfig.timeoutMs
      });

      // Test the connection
      await this.testConnection();
      
    } catch (error: any) {
      throw new AIServiceError({
        code: 'API_KEY_INVALID',
        message: `Failed to initialize OpenAI client: ${error.message}`,
        originalError: error
      });
    }
  }

  // Product recognition from image
  async recognizeProduct(
    imageBase64: string,
    businessContext: BusinessContext
  ): Promise<ProductRecognition> {
    if (!this.openaiClient) {
      throw new Error('OpenAI client not initialized');
    }

    const startTime = Date.now();

    try {
      // Check rate limits
      await this.checkRateLimit(businessContext.businessId);

      // Check cache first
      const cacheKey = await this.generateCacheKey(imageBase64, businessContext);
      const cached = await this.getCachedResult(cacheKey);
      if (cached) {
        cached.hitCount++;
        return cached.result;
      }

      // Optimize image for API efficiency
      const optimizedImage = await this.optimizeImage(imageBase64);
      const imageMetadata = await this.getImageMetadata(imageBase64, optimizedImage.data);

      // Build context-aware prompt
      const prompt = this.buildRecognitionPrompt(businessContext);

      // Call OpenAI Vision API
      const response = await this.openaiClient.chat.completions.create({
        model: this.currentConfig.model,
        messages: [{
          role: "user",
          content: [
            {
              type: "text",
              text: prompt
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${optimizedImage.data}`,
                detail: this.currentConfig.imageDetail
              }
            }
          ]
        }],
        max_tokens: this.currentConfig.maxTokens,
        temperature: this.currentConfig.temperature,
        response_format: { type: "json_object" }
      });

      // Parse and structure response
      const extracted = this.parseAIResponse(response.choices[0].message.content || '{}');
      
      // Calculate confidence based on response quality
      const confidence = this.calculateConfidence(extracted, response);

      const result: ProductRecognition = {
        product: extracted,
        confidence,
        tokensUsed: response.usage?.total_tokens || 0,
        timestamp: Date.now(),
        processingTime: Date.now() - startTime,
        imageMetadata
      };

      // Track usage for client
      await this.recordUsage(businessContext.businessId, response.usage, 'product_recognition');

      // Cache the result
      await this.cacheResult(cacheKey, result);

      return result;

    } catch (error: any) {
      await this.handleAPIError(error, businessContext.businessId);
      throw error;
    }
  }

  // Auto-categorization using AI
  async categorizeProducts(
    products: ProductSchema[],
    businessContext: BusinessContext
  ): Promise<CategorizedProducts> {
    if (!this.openaiClient) {
      throw new Error('OpenAI client not initialized');
    }

    try {
      // Check rate limits
      await this.checkRateLimit(businessContext.businessId);

      // Batch products for efficiency
      const batches = this.currentConfig.enableBatching ? 
        this.batchProducts(products, 50) : [products];

      const allCategories: any[] = [];
      const uncategorized: string[] = [];
      const suggestions: any[] = [];

      for (const batch of batches) {
        const prompt = this.buildCategorizationPrompt(batch, businessContext);

        const response = await this.openaiClient.chat.completions.create({
          model: this.currentConfig.model,
          messages: [{ role: "user", content: prompt }],
          max_tokens: Math.min(this.currentConfig.maxTokens * 2, 4000),
          temperature: 0.1,
          response_format: { type: "json_object" }
        });

        const batchResult = this.parseCategorization(response.choices[0].message.content || '{}');
        
        allCategories.push(...batchResult.categories);
        uncategorized.push(...batchResult.uncategorized);
        suggestions.push(...batchResult.suggestions);

        // Track usage
        await this.recordUsage(businessContext.businessId, response.usage, 'categorization');
      }

      // Merge and deduplicate categories
      const mergedCategories = this.mergeCategories(allCategories);
      const overallConfidence = this.calculateCategorizationConfidence(mergedCategories);

      return {
        categories: mergedCategories,
        uncategorized,
        confidence: overallConfidence,
        suggestions
      };

    } catch (error: any) {
      await this.handleAPIError(error, businessContext.businessId);
      throw error;
    }
  }

  // Natural language search
  async searchProducts(
    query: NLSearchQuery,
    products: ProductSchema[]
  ): Promise<SearchResult[]> {
    if (!this.openaiClient) {
      throw new Error('OpenAI client not initialized');
    }

    try {
      // For efficiency, use embedding-based search for large datasets
      if (products.length > 100) {
        return this.embeddingBasedSearch(query, products);
      }

      // Use GPT for smaller datasets with more context
      const prompt = this.buildSearchPrompt(query, products);

      const response = await this.openaiClient.chat.completions.create({
        model: 'gpt-3.5-turbo', // Faster for search
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1000,
        temperature: 0.1,
        response_format: { type: "json_object" }
      });

      const searchResults = this.parseSearchResults(response.choices[0].message.content || '{}');

      // Track usage if context is available
      if (query.context?.businessId) {
        await this.recordUsage(query.context.businessId, response.usage, 'search');
      }

      return searchResults;

    } catch (error: any) {
      if (query.context?.businessId) {
        await this.handleAPIError(error, query.context.businessId);
      }
      throw error;
    }
  }

  // Generate product descriptions
  async generateProductDescriptions(
    products: ProductSchema[],
    businessContext: BusinessContext
  ): Promise<Map<string, string>> {
    if (!this.openaiClient) {
      throw new Error('OpenAI client not initialized');
    }

    const descriptions = new Map<string, string>();

    try {
      // Process in batches
      const batches = this.batchProducts(products, 10);

      for (const batch of batches) {
        const prompt = this.buildDescriptionPrompt(batch, businessContext);

        const response = await this.openaiClient.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [{ role: "user", content: prompt }],
          max_tokens: 2000,
          temperature: 0.3, // Slightly more creative for descriptions
          response_format: { type: "json_object" }
        });

        const batchDescriptions = this.parseDescriptions(response.choices[0].message.content || '{}');
        
        Object.entries(batchDescriptions).forEach(([productId, description]) => {
          descriptions.set(productId, description);
        });

        // Track usage
        await this.recordUsage(businessContext.businessId, response.usage, 'descriptions');
      }

    } catch (error: any) {
      await this.handleAPIError(error, businessContext.businessId);
      throw error;
    }

    return descriptions;
  }

  // Usage tracking and monitoring
  async getUsageStats(businessId: string, period: 'day' | 'month' | 'year' = 'month'): Promise<{
    totalTokens: number;
    totalCost: number;
    requestCount: number;
    featureBreakdown: Record<string, { tokens: number; cost: number }>;
  }> {
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case 'day':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }

    // This would query the usage records from the database
    const records = await this.getUsageRecords(businessId, startDate, endDate);
    
    const stats = {
      totalTokens: 0,
      totalCost: 0,
      requestCount: records.length,
      featureBreakdown: {} as Record<string, { tokens: number; cost: number }>
    };

    records.forEach(record => {
      stats.totalTokens += record.tokensUsed;
      stats.totalCost += record.costEstimate;

      if (!stats.featureBreakdown[record.feature]) {
        stats.featureBreakdown[record.feature] = { tokens: 0, cost: 0 };
      }
      
      stats.featureBreakdown[record.feature].tokens += record.tokensUsed;
      stats.featureBreakdown[record.feature].cost += record.costEstimate;
    });

    return stats;
  }

  // Private helper methods

  private async optimizeImage(imageBase64: string): Promise<{ data: string; metadata: any }> {
    // Implement image compression and optimization
    // This would use a library like Sharp or Canvas to resize/compress
    const optimization: ImageOptimization = {
      targetSize: 512000, // 512KB
      quality: 85,
      format: 'jpeg',
      maxDimensions: { width: 1024, height: 1024 }
    };

    // For now, return the original image
    // In production, implement actual optimization
    return {
      data: imageBase64,
      metadata: optimization
    };
  }

  private async getImageMetadata(original: string, optimized: string): Promise<ImageMetadata> {
    const originalSize = Math.ceil(original.length * 0.75); // Base64 overhead
    const optimizedSize = Math.ceil(optimized.length * 0.75);

    return {
      originalSize,
      optimizedSize,
      dimensions: { width: 1024, height: 1024 }, // Would be calculated from actual image
      format: 'jpeg',
      compressionRatio: originalSize > 0 ? optimizedSize / originalSize : 1
    };
  }

  private buildRecognitionPrompt(context: BusinessContext): string {
    const customCategories = context.customCategories?.length ? 
      `Custom categories for this business: ${context.customCategories.join(', ')}` : '';

    const brandNames = context.brandNames?.length ?
      `Known brands in inventory: ${context.brandNames.join(', ')}` : '';

    return `You are an AI assistant helping with inventory management for a ${context.industry} business.
    
    Analyze this product image and extract the following information in JSON format:
    {
      "name": "product name",
      "brand": "brand name if visible",
      "category": "product category",
      "subcategory": "more specific category if applicable",
      "size": "size or quantity if visible on packaging",
      "quantity": "number of units if visible",
      "barcode": "barcode number if clearly visible",
      "description": "brief description of the product",
      "attributes": {
        "color": "color if relevant",
        "material": "material if relevant",
        "other_attributes": "any other relevant attributes"
      },
      "suggestedSKU": "suggested SKU based on product details"
    }

    ${customCategories}
    ${brandNames}

    Language: ${context.preferences.language}
    Measurement units: ${context.preferences.measurementUnits}

    Focus on accuracy and only include information you can clearly see in the image.`;
  }

  private buildCategorizationPrompt(products: ProductSchema[], context: BusinessContext): string {
    const productList = products.map(p => `${p.id}: ${p.name} (${p.sku})`).join('\n');

    return `Categorize these products into logical categories for a ${context.industry} business:

    ${productList}

    Return a JSON object with this structure:
    {
      "categories": [
        {
          "name": "Category Name",
          "description": "Brief description",
          "productIds": ["id1", "id2"],
          "confidence": 0.9
        }
      ],
      "uncategorized": ["id3"],
      "suggestions": [
        {
          "productId": "id4",
          "suggestedCategories": [
            {
              "name": "Suggested Category",
              "confidence": 0.8,
              "reasoning": "Why this category fits"
            }
          ]
        }
      ]
    }

    Create hierarchical categories when appropriate and aim for balanced category sizes.`;
  }

  private buildSearchPrompt(query: NLSearchQuery, products: ProductSchema[]): string {
    const productList = products.map(p => 
      `${p.id}: ${p.name} - ${p.category} (SKU: ${p.sku}, Barcode: ${p.barcode})`
    ).join('\n');

    const filters = query.filters ? JSON.stringify(query.filters) : 'none';

    return `Search these products based on the natural language query: "${query.query}"

    Products:
    ${productList}

    Filters: ${filters}

    Return a JSON object with matching products ranked by relevance:
    {
      "results": [
        {
          "productId": "id",
          "relevanceScore": 0.95,
          "matchedFields": ["name", "category"],
          "snippet": "Brief explanation of why this matches"
        }
      ]
    }

    Consider semantic similarity, not just exact keyword matches.`;
  }

  private buildDescriptionPrompt(products: ProductSchema[], context: BusinessContext): string {
    const productList = products.map(p => 
      `${p.id}: ${p.name} - Category: ${p.category}, SKU: ${p.sku}`
    ).join('\n');

    return `Generate compelling product descriptions for these ${context.industry} products:

    ${productList}

    Return a JSON object:
    {
      "descriptions": {
        "product_id_1": "Engaging product description highlighting key features and benefits",
        "product_id_2": "Another description..."
      }
    }

    Make descriptions:
    - Professional and informative
    - Tailored to ${context.industry} customers
    - 50-150 words each
    - Include key features and benefits
    - Use ${context.preferences.language} language`;
  }

  private parseAIResponse(content: string): ExtractedProduct {
    try {
      const parsed = JSON.parse(content);
      return {
        name: parsed.name || '',
        brand: parsed.brand,
        category: parsed.category || 'Uncategorized',
        subcategory: parsed.subcategory,
        size: parsed.size,
        quantity: parsed.quantity,
        barcode: parsed.barcode,
        description: parsed.description,
        attributes: parsed.attributes || {},
        suggestedSKU: parsed.suggestedSKU
      };
    } catch (error) {
      throw new Error(`Failed to parse AI response: ${error}`);
    }
  }

  private calculateConfidence(extracted: ExtractedProduct, response: any): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence based on extracted fields
    if (extracted.name) confidence += 0.2;
    if (extracted.brand) confidence += 0.1;
    if (extracted.category && extracted.category !== 'Uncategorized') confidence += 0.1;
    if (extracted.barcode) confidence += 0.1;

    // Consider response quality indicators
    const responseLength = response.choices[0]?.message?.content?.length || 0;
    if (responseLength > 100) confidence += 0.1;

    return Math.min(confidence, 1.0);
  }

  private async recordUsage(
    businessId: string, 
    usage: any, 
    feature: 'product_recognition' | 'categorization' | 'search' | 'description_generation'
  ): Promise<void> {
    if (!usage) return;

    const record: AIUsageRecord = {
      id: this.generateId(),
      businessId,
      feature,
      tokensUsed: usage.total_tokens || 0,
      promptTokens: usage.prompt_tokens || 0,
      completionTokens: usage.completion_tokens || 0,
      costEstimate: this.calculateCost(usage),
      model: this.currentConfig.model,
      timestamp: new Date()
    };

    // Store in database
    await this.storeUsageRecord(record);

    // Update client's monthly usage
    await this.updateClientUsage(businessId, record);
  }

  private calculateCost(usage: any): number {
    if (!usage) return 0;

    // OpenAI pricing (as of late 2023, would need to be updated)
    const pricing = {
      'gpt-4o': { input: 0.005, output: 0.015 },
      'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
      'gpt-4-turbo': { input: 0.01, output: 0.03 },
      'gpt-3.5-turbo': { input: 0.0015, output: 0.002 }
    };

    const modelPricing = pricing[this.currentConfig.model] || pricing['gpt-3.5-turbo'];
    
    const inputCost = (usage.prompt_tokens || 0) * modelPricing.input / 1000;
    const outputCost = (usage.completion_tokens || 0) * modelPricing.output / 1000;

    return inputCost + outputCost;
  }

  private async checkRateLimit(businessId: string): Promise<void> {
    const now = Date.now();
    const windowStart = now - 60000; // 1 minute window

    if (!this.rateLimiter.has(businessId)) {
      this.rateLimiter.set(businessId, []);
    }

    const requests = this.rateLimiter.get(businessId)!;
    
    // Remove old requests outside the window
    const recentRequests = requests.filter(time => time > windowStart);
    this.rateLimiter.set(businessId, recentRequests);

    if (recentRequests.length >= this.currentConfig.rateLimitPerMinute) {
      throw new AIServiceError({
        code: 'RATE_LIMIT',
        message: `Rate limit exceeded. Maximum ${this.currentConfig.rateLimitPerMinute} requests per minute.`,
        retryAfter: 60 - Math.floor((now - recentRequests[0]) / 1000)
      });
    }

    // Add current request
    recentRequests.push(now);
  }

  private async testConnection(): Promise<void> {
    if (!this.openaiClient) return;

    try {
      await this.openaiClient.models.list();
    } catch (error) {
      throw new Error('Failed to connect to OpenAI API');
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Placeholder methods - would be implemented with actual database/storage calls
  private async getClientKeySettings(businessId: string): Promise<ClientAPIKeySettings | null> { return null; }
  private async decryptApiKey(encryptedKey: string): Promise<string> { return ''; }
  private async generateCacheKey(image: string, context: BusinessContext): Promise<CacheKey> { return {} as any; }
  private async getCachedResult(key: CacheKey): Promise<CachedRecognition | null> { return null; }
  private async cacheResult(key: CacheKey, result: ProductRecognition): Promise<void> {}
  private async handleAPIError(error: any, businessId: string): Promise<void> {}
  private batchProducts(products: ProductSchema[], batchSize: number): ProductSchema[][] { return [products]; }
  private parseCategorization(content: string): any { return { categories: [], uncategorized: [], suggestions: [] }; }
  private mergeCategories(categories: any[]): any[] { return categories; }
  private calculateCategorizationConfidence(categories: any[]): number { return 0.8; }
  private async embeddingBasedSearch(query: NLSearchQuery, products: ProductSchema[]): Promise<SearchResult[]> { return []; }
  private parseSearchResults(content: string): SearchResult[] { return []; }
  private parseDescriptions(content: string): Record<string, string> { return {}; }
  private async getUsageRecords(businessId: string, start: Date, end: Date): Promise<AIUsageRecord[]> { return []; }
  private async storeUsageRecord(record: AIUsageRecord): Promise<void> {}
  private async updateClientUsage(businessId: string, record: AIUsageRecord): Promise<void> {}
}