import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '../../../../src/agent1-foundation/config/supabase'
import { z } from 'zod'

// Mobile-optimized validation schema
const inventoryCountSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.number().int().min(0),
  location: z.string().optional(),
  notes: z.string().max(500).optional(),
  session_id: z.string().uuid().optional(),
  
  // Mobile-specific fields
  device_info: z.object({
    device_id: z.string().optional(),
    device_type: z.string().optional(),
    app_version: z.string().optional(),
    network_quality: z.enum(['excellent', 'good', 'poor', 'offline']).optional()
  }).optional(),
  
  gps_coordinates: z.object({
    latitude: z.number(),
    longitude: z.number(),
    accuracy: z.number()
  }).optional(),
  
  images: z.array(z.string()).max(3).default([]), // Max 3 evidence photos
  voice_notes: z.array(z.string()).max(1).default([]), // Max 1 voice note
  
  // Offline sync fields
  offline_timestamp: z.string().datetime().optional(),
  sync_priority: z.number().int().min(1).max(10).default(1),
  
  // Conflict resolution
  client_timestamp: z.string().datetime().optional(),
  expected_previous_quantity: z.number().int().optional()
})

const batchCountSchema = z.object({
  counts: z.array(inventoryCountSchema).max(50), // Max 50 counts per batch for mobile
  session_id: z.string().uuid().optional(),
  sync_metadata: z.object({
    device_id: z.string(),
    batch_id: z.string(),
    offline_duration_ms: z.number().optional(),
    network_quality: z.string().optional()
  })
})

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

    if (!teamMember || !teamMember.permissions?.count) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    
    // Handle batch counts (for offline sync)
    if (body.counts && Array.isArray(body.counts)) {
      return await handleBatchCount(supabase, user, teamMember, body)
    }
    
    // Handle single count
    return await handleSingleCount(supabase, user, teamMember, body)

  } catch (error) {
    console.error('Inventory count API error:', error)
    
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

async function handleSingleCount(supabase: any, user: any, teamMember: any, body: any) {
  const validatedData = inventoryCountSchema.parse(body)
  
  // Verify product belongs to user's business
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('id, current_quantity, name')
    .eq('id', validatedData.product_id)
    .eq('business_id', teamMember.business_id)
    .single()

  if (productError || !product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  // Check for conflicts (mobile optimistic updates)
  if (validatedData.expected_previous_quantity !== undefined) {
    if (product.current_quantity !== validatedData.expected_previous_quantity) {
      return NextResponse.json({
        error: 'Conflict detected',
        conflict_data: {
          expected: validatedData.expected_previous_quantity,
          actual: product.current_quantity,
          product_name: product.name
        }
      }, { status: 409 })
    }
  }

  // Create inventory count record
  const { data: inventoryCount, error } = await supabase
    .from('inventory_counts')
    .insert({
      product_id: validatedData.product_id,
      quantity: validatedData.quantity,
      previous_quantity: product.current_quantity,
      counted_by: user.id,
      location: validatedData.location,
      notes: validatedData.notes,
      session_id: validatedData.session_id,
      device_info: {
        ...validatedData.device_info,
        user_agent: request.headers.get('user-agent'),
        ip: request.ip,
        timestamp: new Date().toISOString()
      },
      gps_coordinates: validatedData.gps_coordinates,
      images: validatedData.images,
      voice_notes: validatedData.voice_notes,
      network_quality: validatedData.device_info?.network_quality,
      sync_priority: validatedData.sync_priority,
      offline_synced: true, // API calls are always synced
      counted_at: validatedData.offline_timestamp || new Date().toISOString()
    })
    .select()
    .single()

  if (error) {
    console.error('Database error:', error)
    return NextResponse.json({ error: 'Failed to record count' }, { status: 500 })
  }

  // Real-time notification will be sent via trigger

  return NextResponse.json(
    { 
      data: inventoryCount,
      previous_quantity: product.current_quantity,
      quantity_change: validatedData.quantity - product.current_quantity
    },
    { 
      status: 201,
      headers: {
        'X-Sync-Status': 'synced',
        'X-Count-ID': inventoryCount.id
      }
    }
  )
}

async function handleBatchCount(supabase: any, user: any, teamMember: any, body: any) {
  const validatedData = batchCountSchema.parse(body)
  
  const results = {
    processed: 0,
    failed: 0,
    conflicts: 0,
    errors: [] as any[],
    count_ids: [] as string[]
  }

  // Process each count in the batch
  for (const countData of validatedData.counts) {
    try {
      // Verify product belongs to user's business
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('id, current_quantity, name')
        .eq('id', countData.product_id)
        .eq('business_id', teamMember.business_id)
        .single()

      if (productError || !product) {
        results.failed++
        results.errors.push({
          product_id: countData.product_id,
          error: 'Product not found'
        })
        continue
      }

      // Check for conflicts
      if (countData.expected_previous_quantity !== undefined) {
        if (product.current_quantity !== countData.expected_previous_quantity) {
          results.conflicts++
          results.errors.push({
            product_id: countData.product_id,
            error: 'Conflict detected',
            conflict_data: {
              expected: countData.expected_previous_quantity,
              actual: product.current_quantity,
              product_name: product.name
            }
          })
          continue
        }
      }

      // Create inventory count record
      const { data: inventoryCount, error } = await supabase
        .from('inventory_counts')
        .insert({
          product_id: countData.product_id,
          quantity: countData.quantity,
          previous_quantity: product.current_quantity,
          counted_by: user.id,
          location: countData.location,
          notes: countData.notes,
          session_id: countData.session_id || validatedData.session_id,
          device_info: {
            ...countData.device_info,
            batch_id: validatedData.sync_metadata.batch_id,
            device_id: validatedData.sync_metadata.device_id,
            user_agent: request.headers.get('user-agent'),
            ip: request.ip
          },
          gps_coordinates: countData.gps_coordinates,
          images: countData.images,
          voice_notes: countData.voice_notes,
          network_quality: countData.device_info?.network_quality,
          sync_priority: countData.sync_priority,
          offline_synced: true,
          counted_at: countData.offline_timestamp || new Date().toISOString()
        })
        .select('id')
        .single()

      if (error) {
        results.failed++
        results.errors.push({
          product_id: countData.product_id,
          error: 'Database insert failed'
        })
      } else {
        results.processed++
        results.count_ids.push(inventoryCount.id)
      }

    } catch (error) {
      results.failed++
      results.errors.push({
        product_id: countData.product_id,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  return NextResponse.json(
    { 
      batch_result: results,
      sync_metadata: validatedData.sync_metadata
    },
    { 
      status: results.failed === 0 ? 201 : 207, // 207 Multi-Status if some failed
      headers: {
        'X-Batch-Size': validatedData.counts.length.toString(),
        'X-Processed': results.processed.toString(),
        'X-Failed': results.failed.toString(),
        'X-Conflicts': results.conflicts.toString()
      }
    }
  )
}

// GET endpoint for retrieving recent counts
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const productId = url.searchParams.get('product_id')
    const sessionId = url.searchParams.get('session_id')
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100)
    const offset = parseInt(url.searchParams.get('offset') || '0')

    // Get user's business context
    const { data: teamMember } = await supabase
      .from('team_members')
      .select('business_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!teamMember) {
      return NextResponse.json({ error: 'No business access' }, { status: 403 })
    }

    // Build query
    let query = supabase
      .from('inventory_counts')
      .select(`
        id,
        quantity,
        previous_quantity,
        location,
        notes,
        counted_at,
        counted_by,
        device_info,
        images,
        session_id,
        products:product_id (id, name, barcode, sku)
      `)
      .order('counted_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (productId) {
      query = query.eq('product_id', productId)
    }
    
    if (sessionId) {
      query = query.eq('session_id', sessionId)
    } else {
      // Only show counts for products in user's business
      query = query.in('product_id', 
        supabase
          .from('products')
          .select('id')
          .eq('business_id', teamMember.business_id)
      )
    }

    const { data: counts, error } = await query

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    return NextResponse.json({
      data: counts,
      pagination: {
        limit,
        offset,
        has_more: counts.length === limit
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