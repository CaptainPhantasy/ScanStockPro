import { NextRequest, NextResponse } from 'next/server';
import { RealOpenAIService } from '../../../../src/agent3-features/ai-recognition/real-openai-service';
import { Foundation_To_Features } from '../../../../src/shared/contracts/agent-interfaces';
import { supabaseAdmin } from '../../../../src/agent1-foundation/database/supabase-client';

// Mock foundation interface for the service
const mockFoundation: Foundation_To_Features = {
  supabaseClient: supabaseAdmin,
  authUser: null,
  database: {
    products: {
      create: async () => ({ id: '1', name: 'Product' }),
      update: async () => ({ id: '1', name: 'Product' }),
      delete: async () => true,
      findById: async () => null,
      findByBarcode: async () => null,
      findMany: async () => [],
      count: async () => 0,
    },
    inventory: {
      createCount: async () => ({ id: '1' }),
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
    const openAIService = new RealOpenAIService(mockFoundation);

    // Test connection first
    const connectionTest = await openAIService.testConnection();
    if (!connectionTest.success) {
      console.error('OpenAI connection failed:', connectionTest.error);
      return NextResponse.json(
        { error: 'AI service temporarily unavailable. Please check your API key.' },
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
    return NextResponse.json(result);

  } catch (error: any) {
    console.error('AI recognition error:', error);
    
    // Handle specific OpenAI errors
    if (error.message?.includes('API key')) {
      return NextResponse.json(
        { error: 'Invalid API key. Please configure your OpenAI API key.' },
        { status: 401 }
      );
    }
    
    if (error.message?.includes('Rate limit')) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again in a moment.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to process image. Please try again.' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Test endpoint to check if AI service is configured
    const openAIService = new RealOpenAIService(mockFoundation);
    const connectionTest = await openAIService.testConnection();
    
    if (connectionTest.success) {
      return NextResponse.json({
        status: 'ready',
        message: 'AI recognition service is configured and ready',
        models: connectionTest.models,
      });
    } else {
      return NextResponse.json({
        status: 'not_configured',
        message: 'AI service requires configuration',
        error: connectionTest.error,
      }, { status: 503 });
    }
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      message: 'Failed to check AI service status',
      error: error.message,
    }, { status: 500 });
  }
}