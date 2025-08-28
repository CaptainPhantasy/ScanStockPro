import OpenAI from 'openai';
import { Foundation_To_Features } from '../../shared/contracts/agent-interfaces';
import { supabaseAdmin } from '../../agent1-foundation/database/supabase-client';
import {
  BusinessContext,
  ProductRecognition,
  ExtractedProduct,
  OpenAIUsage,
  AIUsageRecord,
  ImageMetadata
} from './types';

export class RealOpenAIService {
  private openaiClient: OpenAI;
  private rateLimiter: Map<string, number[]> = new Map();

  constructor(private foundation: Foundation_To_Features) {
    // Initialize with the real OpenAI API key
    this.openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || 'your_openai_api_key_here',
      maxRetries: 3,
      timeout: 30000
    });
  }

  // Test the connection and get available models
  async testConnection(): Promise<{ success: boolean; models?: string[]; error?: string }> {
    try {
      const models = await this.openaiClient.models.list();
      const modelNames = models.data.map(model => model.id);
      return {
        success: true,
        models: modelNames.filter(name => name.includes('gpt')).slice(0, 10) // Show first 10 GPT models
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Real product recognition from image
  async recognizeProduct(
    imageBase64: string,
    businessContext: BusinessContext
  ): Promise<ProductRecognition> {
    const startTime = Date.now();

    try {
      // Check rate limits (50 requests per minute)
      await this.checkRateLimit(businessContext.businessId, 50);

      // Optimize image for API efficiency
      const optimizedImage = await this.optimizeImage(imageBase64);
      const imageMetadata = this.getImageMetadata(imageBase64, optimizedImage);

      // Build context-aware prompt
      const prompt = this.buildRecognitionPrompt(businessContext);

      console.log('🔄 Calling OpenAI Vision API...');

      // Call OpenAI Vision API with real credentials
      const response = await this.openaiClient.chat.completions.create({
        model: "gpt-4o-mini", // Cost-effective vision model
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
                url: `data:image/jpeg;base64,${optimizedImage}`,
                detail: "low" // Save tokens and cost
              }
            }
          ]
        }],
        max_tokens: 300,
        temperature: 0.1,
        response_format: { type: "json_object" }
      });

      console.log('✅ OpenAI API call successful');
      
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

      // Track usage in database
      await this.recordUsage(businessContext.businessId, response.usage, 'product_recognition');

      console.log('🎉 Product recognition completed:', {
        productName: extracted.name,
        confidence,
        tokensUsed: result.tokensUsed
      });

      return result;

    } catch (error: any) {
      console.error('❌ OpenAI API call failed:', error);
      await this.handleAPIError(error, businessContext.businessId);
      throw error;
    }
  }

  // Generate product descriptions using AI
  async generateProductDescriptions(
    productNames: string[],
    businessContext: BusinessContext
  ): Promise<Map<string, string>> {
    const descriptions = new Map<string, string>();

    try {
      await this.checkRateLimit(businessContext.businessId, 50);

      const prompt = `Generate professional product descriptions for a ${businessContext.industry} business.
      
Products: ${productNames.join(', ')}

Return a JSON object with product names as keys and descriptions as values:
{
  "Product Name 1": "Professional description highlighting key features and benefits",
  "Product Name 2": "Another engaging description..."
}

Make descriptions:
- Professional and informative
- 50-100 words each
- Tailored to ${businessContext.industry} customers
- Include key features and benefits`;

      console.log('🔄 Generating product descriptions...');

      const response = await this.openaiClient.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1000,
        temperature: 0.3,
        response_format: { type: "json_object" }
      });

      const parsed = JSON.parse(response.choices[0].message.content || '{}');
      
      Object.entries(parsed).forEach(([name, desc]) => {
        descriptions.set(name, desc as string);
      });

      await this.recordUsage(businessContext.businessId, response.usage, 'description_generation');

      console.log('✅ Generated descriptions for', descriptions.size, 'products');

    } catch (error: any) {
      console.error('❌ Description generation failed:', error);
    }

    return descriptions;
  }

  // Smart product categorization
  async categorizeProducts(
    productNames: string[],
    businessContext: BusinessContext
  ): Promise<{ [productName: string]: string }> {
    try {
      await this.checkRateLimit(businessContext.businessId, 50);

      const prompt = `Categorize these products for a ${businessContext.industry} business:

Products: ${productNames.join(', ')}

${businessContext.customCategories ? `
Preferred categories: ${businessContext.customCategories.join(', ')}
` : ''}

Return a JSON object with product names as keys and categories as values:
{
  "Product Name 1": "Category Name",
  "Product Name 2": "Category Name"
}

Use logical, consistent categories appropriate for inventory management.`;

      console.log('🔄 Categorizing products...');

      const response = await this.openaiClient.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 500,
        temperature: 0.1,
        response_format: { type: "json_object" }
      });

      const categories = JSON.parse(response.choices[0].message.content || '{}');
      
      await this.recordUsage(businessContext.businessId, response.usage, 'categorization');

      console.log('✅ Categorized', Object.keys(categories).length, 'products');
      
      return categories;

    } catch (error: any) {
      console.error('❌ Categorization failed:', error);
      return {};
    }
  }

  // Natural language search for products
  async searchProducts(
    query: string,
    productData: Array<{ name: string; category: string; description?: string }>,
    businessContext: BusinessContext
  ): Promise<Array<{ name: string; relevance: number; reasoning: string }>> {
    try {
      await this.checkRateLimit(businessContext.businessId, 50);

      const products = productData.map(p => `${p.name} (${p.category})`).join(', ');

      const prompt = `Find products matching this search query: "${query}"

Available products: ${products}

Return a JSON object with an array of matching products, ranked by relevance:
{
  "results": [
    {
      "name": "Product Name",
      "relevance": 0.95,
      "reasoning": "Why this product matches the query"
    }
  ]
}

Consider semantic similarity, not just exact keyword matches. Include products with relevance > 0.5.`;

      console.log('🔄 Searching products with AI...');

      const response = await this.openaiClient.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 600,
        temperature: 0.2,
        response_format: { type: "json_object" }
      });

      const parsed = JSON.parse(response.choices[0].message.content || '{}');
      const results = parsed.results || [];

      await this.recordUsage(businessContext.businessId, response.usage, 'search');

      console.log('✅ Found', results.length, 'matching products');
      
      return results;

    } catch (error: any) {
      console.error('❌ AI search failed:', error);
      return [];
    }
  }

  // Private helper methods

  private async checkRateLimit(businessId: string, limit: number = 50): Promise<void> {
    const now = Date.now();
    const windowStart = now - 60000; // 1 minute window

    if (!this.rateLimiter.has(businessId)) {
      this.rateLimiter.set(businessId, []);
    }

    const requests = this.rateLimiter.get(businessId)!;
    
    // Remove old requests outside the window
    const recentRequests = requests.filter(time => time > windowStart);
    this.rateLimiter.set(businessId, recentRequests);

    if (recentRequests.length >= limit) {
      throw new Error(`Rate limit exceeded. Maximum ${limit} requests per minute.`);
    }

    // Add current request
    recentRequests.push(now);
  }

  private async optimizeImage(imageBase64: string): Promise<string> {
    // For now, return the original image
    // In production, implement actual image compression
    return imageBase64;
  }

  private getImageMetadata(original: string, optimized: string): ImageMetadata {
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

  private parseAIResponse(content: string): ExtractedProduct {
    try {
      const parsed = JSON.parse(content);
      return {
        name: parsed.name || 'Unknown Product',
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
      console.error('Failed to parse AI response:', error);
      return {
        name: 'Parse Error',
        category: 'Uncategorized',
        attributes: {}
      };
    }
  }

  private calculateConfidence(extracted: ExtractedProduct, response: any): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence based on extracted fields
    if (extracted.name && extracted.name !== 'Unknown Product') confidence += 0.2;
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

    try {
      const record: Omit<AIUsageRecord, 'id' | 'created_at'> = {
        business_id: businessId,
        user_id: null, // Would be set from context
        feature,
        tokens_used: usage.total_tokens || 0,
        prompt_tokens: usage.prompt_tokens || 0,
        completion_tokens: usage.completion_tokens || 0,
        cost_estimate: this.calculateCost(usage),
        model: 'gpt-4o-mini',
        metadata: { usage }
      };

      // Store in Supabase
      const { error } = await supabaseAdmin
        .from('ai_usage')
        .insert(record);

      if (error) {
        console.warn('Failed to record AI usage:', error.message);
      } else {
        console.log('✅ AI usage recorded:', {
          tokens: record.tokens_used,
          cost: record.cost_estimate.toFixed(4)
        });
      }
    } catch (error) {
      console.warn('Failed to record usage:', error);
    }
  }

  private calculateCost(usage: any): number {
    if (!usage) return 0;

    // OpenAI pricing for gpt-4o-mini (as of late 2024)
    const inputCostPer1k = 0.00015;  // $0.150 per 1M input tokens
    const outputCostPer1k = 0.0006;  // $0.600 per 1M output tokens
    
    const inputCost = (usage.prompt_tokens || 0) * inputCostPer1k / 1000;
    const outputCost = (usage.completion_tokens || 0) * outputCostPer1k / 1000;

    return inputCost + outputCost;
  }

  private async handleAPIError(error: any, businessId: string): Promise<void> {
    console.error('OpenAI API Error:', {
      message: error.message,
      code: error.code,
      status: error.status
    });

    // Log error for monitoring
    try {
      await supabaseAdmin.from('ai_usage').insert({
        business_id: businessId,
        feature: 'product_recognition',
        tokens_used: 0,
        prompt_tokens: 0,
        completion_tokens: 0,
        cost_estimate: 0,
        model: 'error',
        metadata: { error: error.message }
      });
    } catch (logError) {
      console.warn('Failed to log API error:', logError);
    }
  }

  // Get usage statistics for a business
  async getUsageStats(businessId: string, days: number = 30): Promise<{
    totalTokens: number;
    totalCost: number;
    requestCount: number;
    dailyBreakdown: Array<{ date: string; tokens: number; cost: number; requests: number }>;
  }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabaseAdmin
        .from('ai_usage')
        .select('*')
        .eq('business_id', businessId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Failed to fetch usage stats:', error);
        return { totalTokens: 0, totalCost: 0, requestCount: 0, dailyBreakdown: [] };
      }

      const stats = {
        totalTokens: 0,
        totalCost: 0,
        requestCount: data.length,
        dailyBreakdown: [] as Array<{ date: string; tokens: number; cost: number; requests: number }>
      };

      // Calculate totals and daily breakdown
      const dailyStats = new Map<string, { tokens: number; cost: number; requests: number }>();

      data.forEach(record => {
        stats.totalTokens += record.tokens_used;
        stats.totalCost += record.cost_estimate;

        const date = new Date(record.created_at).toISOString().split('T')[0];
        if (!dailyStats.has(date)) {
          dailyStats.set(date, { tokens: 0, cost: 0, requests: 0 });
        }
        
        const dayStats = dailyStats.get(date)!;
        dayStats.tokens += record.tokens_used;
        dayStats.cost += record.cost_estimate;
        dayStats.requests += 1;
      });

      stats.dailyBreakdown = Array.from(dailyStats.entries()).map(([date, stats]) => ({
        date,
        ...stats
      }));

      return stats;
    } catch (error) {
      console.error('Error fetching usage stats:', error);
      return { totalTokens: 0, totalCost: 0, requestCount: 0, dailyBreakdown: [] };
    }
  }
}