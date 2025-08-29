import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Mobile-optimized validation schema
const inventoryCountSchema = z.object({
  productId: z.string(),
  product_id: z.string().optional(),
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
    const body = await request.json()
    const validatedData = inventoryCountSchema.parse(body)
    
    // For demo purposes, simulate inventory count
    const inventoryCount = {
      id: Date.now().toString(),
      product_id: validatedData.productId || validatedData.product_id,
      quantity: validatedData.quantity,
      previous_quantity: 0, // Mock previous quantity
      counted_by: 'demo-user',
      location: validatedData.location || 'default',
      notes: validatedData.notes,
      counted_at: new Date().toISOString(),
      device_info: validatedData.device_info || { created_via: 'api', user_agent: 'demo', ip: '127.0.0.1' },
      offline_synced: true
    }
    
    return NextResponse.json(
      { 
        data: inventoryCount,
        previous_quantity: 0,
        quantity_change: validatedData.quantity
      },
      { 
        status: 201,
        headers: {
          'X-Sync-Status': 'synced',
          'X-Count-ID': inventoryCount.id
        }
      }
    )

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



