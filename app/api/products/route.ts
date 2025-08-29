import { NextRequest, NextResponse } from 'next/server';
import { productService } from '@/agent3-features/products/product-service';
import { z } from 'zod';

// Validation schemas
const createProductSchema = z.object({
  name: z.string().min(1).max(255),
  barcode: z.string().optional(),
  sku: z.string().optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  quantity: z.number().int().min(0).default(0),
  min_stock: z.number().int().min(0).default(0),
  max_stock: z.number().int().min(0).optional(),
  cost: z.number().optional(),
  price: z.number().optional(),
  location: z.string().optional(),
  supplier: z.string().optional(),
  image_url: z.string().url().optional()
});

const updateProductSchema = createProductSchema.partial().extend({
  id: z.string().uuid()
});

const queryParamsSchema = z.object({
  page: z.string().transform(val => Math.max(parseInt(val || '1'), 1)).optional(),
  limit: z.string().transform(val => Math.min(parseInt(val || '20'), 100)).optional(),
  search: z.string().optional(),
  barcode: z.string().optional(),
  mobile: z.string().transform(val => val === 'true').optional()
});

// Mock business ID for now (will be replaced with auth)
const DEMO_BUSINESS_ID = 'demo-business-001';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const params = queryParamsSchema.parse({
      page: url.searchParams.get('page') || '1',
      limit: url.searchParams.get('limit') || '20',
      search: url.searchParams.get('search') || undefined,
      barcode: url.searchParams.get('barcode') || undefined,
      mobile: url.searchParams.get('mobile') || 'false'
    });

    // For now, return mock data to avoid database issues
    // TODO: Fix database policy recursion issue
    if (params.mobile) {
      return NextResponse.json({
        data: [
          { id: '1', name: 'Product 1', barcode: '123456', quantity: 10, price: 29.99, category: 'Electronics' },
          { id: '2', name: 'Product 2', barcode: '234567', quantity: 5, price: 19.99, category: 'Office' },
          { id: '3', name: 'Product 3', barcode: '345678', quantity: 0, price: 39.99, category: 'Electronics' },
          { id: '4', name: 'Product 4', barcode: '456789', quantity: 2, price: 49.99, category: 'Supplies' },
          { id: '5', name: 'Product 5', barcode: '567890', quantity: 15, price: 9.99, category: 'Office' }
        ],
        pagination: {
          page: params.page || 1,
          limit: params.limit || 5,
          total: 5,
          totalPages: 1
        },
        success: true
      });
    }

    // Handle barcode search
    if (params.barcode) {
      const product = await productService.getProductByBarcode(params.barcode, DEMO_BUSINESS_ID);
      return NextResponse.json({ 
        data: product ? [product] : [],
        total: product ? 1 : 0
      });
    }

    // Handle text search
    if (params.search) {
      const products = await productService.searchProducts(params.search, DEMO_BUSINESS_ID);
      return NextResponse.json({ 
        data: products,
        total: products.length
      });
    }

    // Get paginated products
    const result = await productService.getProducts(
      DEMO_BUSINESS_ID,
      params.page || 1,
      params.limit || 20
    );

    // Mobile optimization: reduce data size
    const optimizedData = params.mobile 
      ? result.products.map(product => ({
          id: product.id,
          name: product.name,
          barcode: product.barcode,
          quantity: product.quantity,
          category: product.category,
          price: product.price,
          image_url: product.image_url
        }))
      : result.products;

    return NextResponse.json({
      data: optimizedData,
      pagination: {
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
        limit: params.limit || 20
      }
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=30',
        'X-Mobile-Optimized': params.mobile ? 'true' : 'false'
      }
    });

  } catch (error) {
    console.error('GET /api/products error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createProductSchema.parse(body);

    const product = await productService.createProduct(validatedData, DEMO_BUSINESS_ID);

    return NextResponse.json(
      { data: product },
      { 
        status: 201,
        headers: {
          'X-Resource-Created': product.id
        }
      }
    );

  } catch (error) {
    console.error('POST /api/products error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = updateProductSchema.parse(body);

    const product = await productService.updateProduct(validatedData, DEMO_BUSINESS_ID);

    return NextResponse.json({ data: product });

  } catch (error) {
    console.error('PUT /api/products error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Product ID required' },
        { status: 400 }
      );
    }

    await productService.deleteProduct(id, DEMO_BUSINESS_ID);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('DELETE /api/products error:', error);
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    );
  }
}