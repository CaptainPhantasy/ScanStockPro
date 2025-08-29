import { NextRequest, NextResponse } from 'next/server';
import { SecurityService, RATE_LIMITS, VALIDATION_SCHEMAS } from './security-service';

export interface SecurityContext {
  userId?: string;
  businessId?: string;
  userTier: 'free' | 'starter' | 'professional';
  ip: string;
  userAgent: string;
}

export class SecurityMiddleware {
  private securityService: SecurityService;

  constructor(securityService: SecurityService) {
    this.securityService = securityService;
  }

  // Main security middleware
  async middleware(request: NextRequest): Promise<NextResponse> {
    const response = NextResponse.next();
    
    // Add security headers to all responses
    this.addSecurityHeaders(response);

    // Skip security checks for static assets and health checks
    if (this.shouldSkipSecurityChecks(request.nextUrl.pathname)) {
      return response;
    }

    try {
      // Rate limiting
      const rateLimitResult = await this.checkRateLimit(request);
      if (!rateLimitResult.allowed) {
        return this.createRateLimitResponse(rateLimitResult);
      }

      // Authentication check for protected routes
      if (this.isProtectedRoute(request.nextUrl.pathname)) {
        const authResult = await this.checkAuthentication(request);
        if (!authResult.valid) {
          return this.createUnauthorizedResponse();
        }
      }

      // CSRF protection for state-changing operations
      if (this.isStateChangingRequest(request.method)) {
        const csrfResult = await this.checkCSRF(request);
        if (!csrfResult.valid) {
          return this.createCSRFErrorResponse();
        }
      }

      return response;

    } catch (error) {
      await this.securityService.logSecurityEvent({
        type: 'access',
        level: 'error',
        ip: this.getClientIP(request),
        userAgent: request.headers.get('user-agent') || 'unknown',
        details: { error: error.message, path: request.nextUrl.pathname }
      });

      return this.createErrorResponse('Internal security error');
    }
  }

  // API route security wrapper
  withSecurity(handler: Function) {
    return async (request: NextRequest, context: any) => {
      try {
        // Extract security context
        const securityContext = await this.extractSecurityContext(request);
        
        // Validate request based on endpoint
        const validationResult = await this.validateRequest(request, context);
        if (!validationResult.isValid) {
          return NextResponse.json(
            { error: 'Validation failed', details: validationResult.errors },
            { status: 400 }
          );
        }

        // Add security context to request
        (request as any).security = securityContext;
        (request as any).validatedData = validationResult.sanitized;

        // Call the actual handler
        return await handler(request, context);

      } catch (error) {
        await this.securityService.logSecurityEvent({
          type: 'access',
          level: 'error',
          details: { error: error.message, endpoint: request.nextUrl.pathname }
        });

        return NextResponse.json(
          { error: 'Security validation failed' },
          { status: 500 }
        );
      }
    };
  }

  // Protected route wrapper for pages
  withPageSecurity(Component: React.ComponentType<any>) {
    return (props: any) => {
      // This would be used in a higher-order component
      // to protect pages with client-side security checks
      return <Component {...props} />;
    };
  }

  private addSecurityHeaders(response: NextResponse): void {
    const headers = this.securityService.getSecurityHeaders();
    
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    // Additional headers for API responses
    response.headers.set('X-Request-ID', this.generateRequestId());
    response.headers.set('X-Response-Time', Date.now().toString());
  }

  private shouldSkipSecurityChecks(pathname: string): boolean {
    const skipPatterns = [
      /^\/_next\//,           // Next.js static assets
      /^\/favicon\./,         // Favicon
      /^\/api\/health$/,      // Health check
      /^\/api\/public\//,     // Public API endpoints
      /\.(ico|png|jpg|jpeg|gif|svg|css|js|woff|woff2)$/ // Static assets
    ];

    return skipPatterns.some(pattern => pattern.test(pathname));
  }

  private isProtectedRoute(pathname: string): boolean {
    const protectedPatterns = [
      /^\/dashboard/,
      /^\/scan/,
      /^\/inventory/,
      /^\/reports/,
      /^\/settings/,
      /^\/api\/(?!auth\/login|auth\/register|public\/)/
    ];

    return protectedPatterns.some(pattern => pattern.test(pathname));
  }

  private isStateChangingRequest(method: string): boolean {
    return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
  }

  private async checkRateLimit(request: NextRequest) {
    const ip = this.getClientIP(request);
    const identifier = `ip:${ip}`;
    
    return await this.securityService.checkRateLimit(identifier, RATE_LIMITS);
  }

  private async checkAuthentication(request: NextRequest): Promise<{ valid: boolean; userId?: string }> {
    const authHeader = request.headers.get('authorization');
    const sessionCookie = request.cookies.get('session')?.value;
    
    const token = authHeader?.replace('Bearer ', '') || sessionCookie;
    
    if (!token) {
      return { valid: false };
    }

    return await this.securityService.validateSession(token);
  }

  private async checkCSRF(request: NextRequest): Promise<{ valid: boolean }> {
    // Skip CSRF check for API requests with valid Bearer tokens
    if (request.headers.get('authorization')?.startsWith('Bearer ')) {
      return { valid: true };
    }

    const csrfToken = request.headers.get('x-csrf-token') || 
                     request.cookies.get('csrf-token')?.value;
    
    const sessionToken = request.cookies.get('session')?.value;
    
    if (!csrfToken || !sessionToken) {
      return { valid: false };
    }

    // In production, validate CSRF token against session
    // This is a simplified check
    return { valid: true };
  }

  private async extractSecurityContext(request: NextRequest): Promise<SecurityContext> {
    const ip = this.getClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    // Extract user info from session/token
    const authResult = await this.checkAuthentication(request);
    
    return {
      userId: authResult.userId,
      businessId: undefined, // Would be extracted from user data
      userTier: 'free', // Would be extracted from user subscription
      ip,
      userAgent
    };
  }

  private async validateRequest(request: NextRequest, context: any) {
    const pathname = request.nextUrl.pathname;
    
    // Get validation schema based on endpoint
    let schema = {};
    
    if (pathname.includes('/api/auth/login')) {
      schema = VALIDATION_SCHEMAS.login;
    } else if (pathname.includes('/api/products/scan')) {
      schema = VALIDATION_SCHEMAS.productScan;
    } else if (pathname.includes('/api/auth/register')) {
      schema = VALIDATION_SCHEMAS.userRegistration;
    }

    // Extract request body for validation
    let data = {};
    if (request.method !== 'GET') {
      try {
        const contentType = request.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          data = await request.json();
        } else if (contentType?.includes('application/x-www-form-urlencoded')) {
          const formData = await request.formData();
          data = Object.fromEntries(formData.entries());
        }
      } catch (error) {
        return { isValid: false, errors: ['Invalid request body'] };
      }
    }

    return this.securityService.validateInput(data, schema);
  }

  private getClientIP(request: NextRequest): string {
    // Handle various proxy headers
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    const cfConnectingIP = request.headers.get('cf-connecting-ip');
    
    if (cfConnectingIP) return cfConnectingIP;
    if (realIP) return realIP;
    if (forwardedFor) return forwardedFor.split(',')[0].trim();
    
    return request.ip || '127.0.0.1';
  }

  private generateRequestId(): string {
    return this.securityService.generateSecureToken(16);
  }

  private createRateLimitResponse(rateLimitResult: any): NextResponse {
    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        message: 'Too many requests, please try again later',
        retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
      },
      {
        status: 429,
        headers: {
          'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.resetTime.toString()
        }
      }
    );
  }

  private createUnauthorizedResponse(): NextResponse {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Authentication required' },
      { status: 401 }
    );
  }

  private createCSRFErrorResponse(): NextResponse {
    return NextResponse.json(
      { error: 'CSRF validation failed', message: 'Invalid or missing CSRF token' },
      { status: 403 }
    );
  }

  private createErrorResponse(message: string): NextResponse {
    return NextResponse.json(
      { error: 'Security error', message },
      { status: 500 }
    );
  }
}

// Utility decorators for API routes
export function requireAuth(handler: Function) {
  return async (request: NextRequest, context: any) => {
    const authHeader = request.headers.get('authorization');
    const sessionCookie = request.cookies.get('session')?.value;
    
    if (!authHeader && !sessionCookie) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return handler(request, context);
  };
}

export function requireRole(allowedRoles: string[]) {
  return function(handler: Function) {
    return async (request: NextRequest, context: any) => {
      // Extract user role from token/session
      const userRole = 'user'; // Mock - would extract from auth context
      
      if (!allowedRoles.includes(userRole)) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        );
      }

      return handler(request, context);
    };
  };
}

export function validateInput(schema: { [key: string]: any }) {
  return function(handler: Function) {
    return async (request: NextRequest, context: any) => {
      try {
        const data = await request.json();
        const securityService = new SecurityService({} as any); // Would use proper config
        
        const validation = securityService.validateInput(data, schema);
        
        if (!validation.isValid) {
          return NextResponse.json(
            { error: 'Validation failed', details: validation.errors },
            { status: 400 }
          );
        }

        (request as any).validatedData = validation.sanitized;
        return handler(request, context);
        
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid request body' },
          { status: 400 }
        );
      }
    };
  };
}