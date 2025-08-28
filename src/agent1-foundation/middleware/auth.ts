import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '../config/supabase'

export interface AuthenticatedRequest extends NextRequest {
  user: {
    id: string
    email: string
    role: string
  }
  business: {
    id: string
    name: string
    subscription_tier: string
    permissions: Record<string, boolean>
  }
}

/**
 * Authentication middleware for API routes
 * Verifies user authentication and business context
 */
export async function withAuth(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>,
  options: {
    requirePermission?: string
    allowedRoles?: ('admin' | 'user' | 'viewer')[]
  } = {}
) {
  return async (request: NextRequest) => {
    try {
      const supabase = createRouteHandlerClient<Database>({ cookies })
      
      // Verify authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }

      // Get user's business context and permissions
      const { data: teamMember, error: teamError } = await supabase
        .from('team_members')
        .select(`
          business_id,
          role,
          permissions,
          status,
          businesses:business_id (
            id,
            name,
            subscription_tier
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()

      if (teamError || !teamMember) {
        return NextResponse.json(
          { error: 'No business access found' },
          { status: 403 }
        )
      }

      // Check role permissions if specified
      if (options.allowedRoles && !options.allowedRoles.includes(teamMember.role)) {
        return NextResponse.json(
          { error: 'Insufficient role permissions' },
          { status: 403 }
        )
      }

      // Check specific permission if required
      if (options.requirePermission && !teamMember.permissions[options.requirePermission]) {
        return NextResponse.json(
          { error: `Missing required permission: ${options.requirePermission}` },
          { status: 403 }
        )
      }

      // Add user and business context to request
      const authenticatedRequest = request as AuthenticatedRequest
      authenticatedRequest.user = {
        id: user.id,
        email: user.email || '',
        role: teamMember.role
      }
      authenticatedRequest.business = {
        id: teamMember.businesses.id,
        name: teamMember.businesses.name,
        subscription_tier: teamMember.businesses.subscription_tier,
        permissions: teamMember.permissions
      }

      return await handler(authenticatedRequest)
    } catch (error) {
      console.error('Auth middleware error:', error)
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 500 }
      )
    }
  }
}

/**
 * Rate limiting middleware for mobile API endpoints
 */
export async function withRateLimit(
  handler: Function,
  options: {
    maxRequests: number
    windowMs: number
    keyGenerator?: (req: NextRequest) => string
  }
) {
  const requests = new Map<string, { count: number; resetTime: number }>()
  
  return async (request: NextRequest) => {
    try {
      const key = options.keyGenerator 
        ? options.keyGenerator(request)
        : request.ip || 'anonymous'
      
      const now = Date.now()
      const userRequests = requests.get(key)
      
      if (!userRequests || now > userRequests.resetTime) {
        // Reset window
        requests.set(key, {
          count: 1,
          resetTime: now + options.windowMs
        })
      } else if (userRequests.count >= options.maxRequests) {
        // Rate limit exceeded
        return NextResponse.json(
          { 
            error: 'Rate limit exceeded',
            retryAfter: Math.ceil((userRequests.resetTime - now) / 1000)
          },
          { 
            status: 429,
            headers: {
              'Retry-After': Math.ceil((userRequests.resetTime - now) / 1000).toString(),
              'X-RateLimit-Limit': options.maxRequests.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': new Date(userRequests.resetTime).toISOString()
            }
          }
        )
      } else {
        // Increment count
        userRequests.count++
      }

      return await handler(request)
    } catch (error) {
      console.error('Rate limit middleware error:', error)
      return await handler(request)
    }
  }
}

/**
 * Mobile-optimized response middleware
 * Compresses and optimizes API responses for mobile clients
 */
export function withMobileOptimization(handler: Function) {
  return async (request: NextRequest) => {
    const response = await handler(request)
    
    // Check if client is mobile
    const userAgent = request.headers.get('user-agent') || ''
    const isMobile = /mobile|android|iphone|ipad|phone/i.test(userAgent)
    
    if (isMobile && response.headers.get('content-type')?.includes('application/json')) {
      // Add mobile-specific headers
      response.headers.set('X-Mobile-Optimized', 'true')
      response.headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=30')
      
      // Compress large responses
      const contentLength = response.headers.get('content-length')
      if (contentLength && parseInt(contentLength) > 10000) {
        response.headers.set('Content-Encoding', 'gzip')
      }
    }
    
    return response
  }
}

/**
 * Error handling middleware
 */
export function withErrorHandling(handler: Function) {
  return async (request: NextRequest) => {
    try {
      return await handler(request)
    } catch (error) {
      console.error('API Error:', error)
      
      // Don't expose internal errors to clients
      const isDevelopment = process.env.NODE_ENV === 'development'
      
      return NextResponse.json(
        {
          error: 'Internal server error',
          ...(isDevelopment && { details: error instanceof Error ? error.message : 'Unknown error' })
        },
        { status: 500 }
      )
    }
  }
}

/**
 * Combined middleware for API routes
 * Applies authentication, rate limiting, mobile optimization, and error handling
 */
export function createAPIHandler(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>,
  options: {
    requireAuth?: boolean
    requirePermission?: string
    allowedRoles?: ('admin' | 'user' | 'viewer')[]
    rateLimit?: {
      maxRequests: number
      windowMs: number
    }
  } = { requireAuth: true }
) {
  let composedHandler = handler
  
  // Apply error handling (outermost)
  composedHandler = withErrorHandling(composedHandler)
  
  // Apply mobile optimization
  composedHandler = withMobileOptimization(composedHandler)
  
  // Apply rate limiting if configured
  if (options.rateLimit) {
    composedHandler = withRateLimit(composedHandler, options.rateLimit)
  }
  
  // Apply authentication if required
  if (options.requireAuth !== false) {
    composedHandler = withAuth(composedHandler, {
      requirePermission: options.requirePermission,
      allowedRoles: options.allowedRoles
    })
  }
  
  return composedHandler
}