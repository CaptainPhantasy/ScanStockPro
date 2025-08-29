import { NextRequest, NextResponse } from 'next/server';
import { OpenAIService } from '../../../src/agent3-features/ai-recognition/openai-service';
import { Foundation_To_Features } from '../../../src/shared/contracts/agent-interfaces';
import { supabaseAdmin } from '../../../src/agent1-foundation/database/supabase-client';

// Mock foundation interface for the service
const mockFoundation: Foundation_To_Features = {
  supabaseClient: supabaseAdmin,
  authUser: null,
  database: {
    products: {
      create: async () => ({ id: '1', name: 'Product' } as any),
      update: async () => ({ id: '1', name: 'Product' } as any),
      delete: async () => true,
      findById: async () => null,
      findByBarcode: async () => null,
      findMany: async () => [],
      count: async () => 0,
    },
    inventory: {
      createCount: async () => ({ id: '1' } as any),
      getLatestCount: async () => null,
      getCountHistory: async () => [],
    },
  },
  realtime: {
    subscribe: () => ({ unsubscribe: () => {} }),
    broadcast: async () => {},
  },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image, businessContext } = body;

    if (!image) {
      return NextResponse.json(
        { error: 'Image data is required' },
        { status: 400 }
      );
    }

    // Initialize the OpenAI service
    const openAIService = new OpenAIService(mockFoundation);
    
    // Initialize with business context
    const businessId = businessContext?.businessId || 'demo-business';
    
    try {
      await openAIService.initialize(businessId);
    } catch (initError: any) {
      console.error('OpenAI initialization failed:', initError);
      
      // Check if it's an API key issue
      if (initError.message?.includes('API key') || initError.code === 'API_KEY_INVALID') {
        return NextResponse.json(
          { 
            error: 'OpenAI API key not configured. Please add your API key in settings.',
            code: 'API_KEY_MISSING' 
          },
          { status: 401 }
        );
      }
      
      return NextResponse.json(
        { error: 'AI service initialization failed. Please check your configuration.' },
        { status: 503 }
      );
    }

    // Perform product recognition
    const result = await openAIService.recognizeProduct(
      image,
      businessContext || {
        businessId: 'demo-business',
        industry: 'retail',
        preferences: {
          language: 'English',
          measurementUnits: 'imperial',
        },
      }
    );

    // Return the recognition result
    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error: any) {
    console.error('AI recognition error:', error);
    
    // Handle specific OpenAI errors
    if (error.message?.includes('API key')) {
      return NextResponse.json(
        { 
          error: 'Invalid API key. Please check your OpenAI API key configuration.',
          code: 'API_KEY_INVALID'
        },
        { status: 401 }
      );
    }
    
    if (error.message?.includes('Rate limit') || error.code === 'RATE_LIMIT') {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded. Please try again in a moment.',
          code: 'RATE_LIMIT',
          retryAfter: error.retryAfter || 60
        },
        { status: 429 }
      );
    }

    if (error.message?.includes('timeout')) {
      return NextResponse.json(
        { 
          error: 'Request timed out. The image may be too large or complex.',
          code: 'TIMEOUT'
        },
        { status: 408 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Failed to process image. Please try again.',
        code: 'PROCESSING_ERROR',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId') || 'demo-business';
    
    // Initialize the OpenAI service to test connection
    const openAIService = new OpenAIService(mockFoundation);
    
    try {
      await openAIService.initialize(businessId);
      
      // Get usage stats if requested
      if (searchParams.get('stats') === 'true') {
        const period = searchParams.get('period') as 'day' | 'month' | 'year' || 'month';
        const stats = await openAIService.getUsageStats(businessId, period);
        
        return NextResponse.json({
          status: 'ready',
          message: 'AI recognition service is configured and ready',
          stats,
        });
      }
      
      return NextResponse.json({
        status: 'ready',
        message: 'AI recognition service is configured and ready',
        features: [
          'product_recognition',
          'categorization', 
          'search',
          'description_generation'
        ],
      });
      
    } catch (initError: any) {
      if (initError.code === 'API_KEY_INVALID' || initError.message?.includes('API key')) {
        return NextResponse.json({
          status: 'not_configured',
          message: 'OpenAI API key not configured',
          code: 'API_KEY_MISSING',
          instructions: 'Please add your OpenAI API key in the settings page'
        }, { status: 503 });
      }
      
      throw initError;
    }
    
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      message: 'Failed to check AI service status',
      error: error.message,
    }, { status: 500 });
  }
}

// Endpoint for categorizing products
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { products, businessContext } = body;

    if (!products || !Array.isArray(products)) {
      return NextResponse.json(
        { error: 'Products array is required' },
        { status: 400 }
      );
    }

    // Initialize the OpenAI service
    const openAIService = new OpenAIService(mockFoundation);
    const businessId = businessContext?.businessId || 'demo-business';
    
    await openAIService.initialize(businessId);

    // Perform categorization
    const result = await openAIService.categorizeProducts(
      products,
      businessContext || {
        businessId: 'demo-business',
        industry: 'retail',
        preferences: {
          language: 'English',
          measurementUnits: 'imperial',
        },
      }
    );

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error: any) {
    console.error('Categorization error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to categorize products',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}