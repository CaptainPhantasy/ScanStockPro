import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '../../config/supabase'
import { z } from 'zod'

// Mobile-optimized validation schemas
const createProductSchema = z.object({
  name: z.string().min(1).max(255),
  barcode: z.string().optional(),
  sku: z.string().optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  current_quantity: z.number().int().min(0).default(0),
  min_quantity: z.number().int().min(0).default(0),
  max_quantity: z.number().int().min(0).optional(),
  unit_cost: z.number().optional(),
  sell_price: z.number().optional(),
  locations: z.array(z.string()).default([]),
  images: z.array(z.string()).default([])
})

const queryParamsSchema = z.object({
  limit: z.string().transform(val => Math.min(parseInt(val) || 20, 100)),
  offset: z.string().transform(val => parseInt(val) || 0),
  search: z.string().optional(),
  category: z.string().optional(),
  barcode: z.string().optional(),
  mobile: z.string().transform(val => val === 'true').optional()
})

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse query parameters
    const url = new URL(request.url)
    const queryParams = queryParamsSchema.parse({
      limit: url.searchParams.get('limit') || '20',
      offset: url.searchParams.get('offset') || '0',
      search: url.searchParams.get('search'),
      category: url.searchParams.get('category'),
      barcode: url.searchParams.get('barcode'),
      mobile: url.searchParams.get('mobile')
    })

    // Get user's business context
    const { data: teamMember } = await supabase
      .from('team_members')
      .select('business_id, role, permissions')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!teamMember) {
      return NextResponse.json({ error: 'No business access' }, { status: 403 })
    }

    // Build query based on mobile optimization
    let query = supabase
      .from('products')
      .select(
        queryParams.mobile 
          ? 'id, name, barcode, sku, current_quantity, category, images, updated_at' // Mobile-optimized fields
          : '*' // Full data for desktop
      )
      .eq('business_id', teamMember.business_id)
      .order('name')
      .range(queryParams.offset, queryParams.offset + queryParams.limit - 1)

    // Apply filters
    if (queryParams.search) {
      query = query.or(`name.ilike.%${queryParams.search}%,sku.ilike.%${queryParams.search}%,barcode.ilike.%${queryParams.search}%`)
    }

    if (queryParams.category) {
      query = query.eq('category', queryParams.category)
    }

    if (queryParams.barcode) {
      query = query.eq('barcode', queryParams.barcode)
    }

    const { data: products, error } = await query

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    // Mobile optimization: limit image data
    const optimizedProducts = queryParams.mobile 
      ? products?.map(product => ({
          ...product,
          images: Array.isArray(product.images) ? product.images.slice(0, 1) : [] // Only first image
        }))
      : products

    // Get total count for pagination (cached for mobile)
    const { count } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', teamMember.business_id)

    return NextResponse.json({
      data: optimizedProducts,
      pagination: {
        total: count || 0,
        limit: queryParams.limit,
        offset: queryParams.offset,
        has_more: (count || 0) > queryParams.offset + queryParams.limit
      }
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60', // 1 minute cache for mobile
        'X-Mobile-Optimized': queryParams.mobile ? 'true' : 'false'
      }
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's business context and permissions
    const { data: teamMember } = await supabase
      .from('team_members')
      .select('business_id, role, permissions')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!teamMember || !teamMember.permissions?.edit) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = createProductSchema.parse(body)

    // Check for duplicate barcode/SKU within business
    if (validatedData.barcode || validatedData.sku) {
      const { data: existingProducts } = await supabase
        .from('products')
        .select('id, barcode, sku')
        .eq('business_id', teamMember.business_id)
        .or(
          validatedData.barcode ? `barcode.eq.${validatedData.barcode}` : 'false.eq.true',
          validatedData.sku ? `sku.eq.${validatedData.sku}` : 'false.eq.true'
        )

      if (existingProducts && existingProducts.length > 0) {
        return NextResponse.json(
          { error: 'Product with this barcode or SKU already exists' },
          { status: 409 }
        )
      }
    }

    // Create product
    const { data: product, error } = await supabase
      .from('products')
      .insert({
        business_id: teamMember.business_id,
        ...validatedData
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
    }

    // Create initial inventory count record
    if (validatedData.current_quantity > 0) {
      await supabase
        .from('inventory_counts')
        .insert({
          product_id: product.id,
          quantity: validatedData.current_quantity,
          counted_by: user.id,
          device_info: {
            user_agent: request.headers.get('user-agent'),
            ip: request.ip,
            created_via: 'api'
          },
          offline_synced: true // API calls are always synced
        })
    }

    return NextResponse.json(
      { data: product },
      { 
        status: 201,
        headers: {
          'X-Resource-Created': product.id
        }
      }
    )

  } catch (error) {
    console.error('API error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}