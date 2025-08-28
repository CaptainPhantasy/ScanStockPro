import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

export interface SecurityConfig {
  encryptionSecret: string;
  jwtSecret: string;
  rateLimitWindow: number;
  rateLimitMax: number;
  sessionTimeout: number;
  passwordMinLength: number;
  mfaRequired: boolean;
}

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  message: string;
  standardHeaders: boolean;
  legacyHeaders: boolean;
}

export interface ValidationSchema {
  type: 'string' | 'number' | 'email' | 'barcode' | 'quantity';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  min?: number;
  max?: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitized?: any;
}

export interface CSPConfig {
  'default-src': string[];
  'script-src': string[];
  'style-src': string[];
  'img-src': string[];
  'connect-src': string[];
  'font-src': string[];
  'frame-src': string[];
  'media-src': string[];
}

export class SecurityService {
  private config: SecurityConfig;
  private rateLimitStore = new Map<string, { count: number; resetTime: number }>();

  constructor(config: SecurityConfig) {
    this.config = config;
  }

  // API Key Encryption with AES-256-GCM
  async encryptApiKey(apiKey: string): Promise<string> {
    try {
      if (!apiKey || typeof apiKey !== 'string') {
        throw new Error('Invalid API key provided');
      }

      const iv = crypto.randomBytes(16);
      const salt = crypto.randomBytes(64);
      
      // Derive key using PBKDF2 with high iteration count
      const key = crypto.pbkdf2Sync(
        this.config.encryptionSecret, 
        salt, 
        100000, // 100k iterations
        32, 
        'sha256'
      );

      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
      
      let encrypted = cipher.update(apiKey, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      // Combine: salt + iv + authTag + encrypted
      return Buffer.concat([
        salt,
        iv,
        authTag,
        Buffer.from(encrypted, 'hex')
      ]).toString('base64');

    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt API key');
    }
  }

  // API Key Decryption
  async decryptApiKey(encryptedApiKey: string): Promise<string> {
    try {
      if (!encryptedApiKey || typeof encryptedApiKey !== 'string') {
        throw new Error('Invalid encrypted API key provided');
      }

      const combined = Buffer.from(encryptedApiKey, 'base64');
      
      // Extract components
      const salt = combined.subarray(0, 64);
      const iv = combined.subarray(64, 80);
      const authTag = combined.subarray(80, 96);
      const encrypted = combined.subarray(96);

      // Derive key
      const key = crypto.pbkdf2Sync(
        this.config.encryptionSecret,
        salt,
        100000,
        32,
        'sha256'
      );

      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, null, 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;

    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt API key');
    }
  }

  // Rate Limiting Implementation
  async checkRateLimit(
    identifier: string,
    limits: { [tier: string]: RateLimitConfig }
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    
    // Determine user tier (this would come from user context)
    const tier = await this.getUserTier(identifier);
    const limit = limits[tier] || limits.free;

    const now = Date.now();
    const windowStart = now - limit.windowMs;
    
    // Clean old entries
    this.cleanExpiredEntries(windowStart);
    
    const key = `${identifier}:${Math.floor(now / limit.windowMs)}`;
    const entry = this.rateLimitStore.get(key);
    
    if (!entry) {
      this.rateLimitStore.set(key, {
        count: 1,
        resetTime: now + limit.windowMs
      });
      return {
        allowed: true,
        remaining: limit.max - 1,
        resetTime: now + limit.windowMs
      };
    }
    
    if (entry.count >= limit.max) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime
      };
    }
    
    entry.count++;
    return {
      allowed: true,
      remaining: limit.max - entry.count,
      resetTime: entry.resetTime
    };
  }

  // Input Validation and Sanitization
  validateInput(data: any, schemas: { [key: string]: ValidationSchema }): ValidationResult {
    const errors: string[] = [];
    const sanitized: any = {};

    for (const [field, schema] of Object.entries(schemas)) {
      const value = data[field];

      // Required field check
      if (schema.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field} is required`);
        continue;
      }

      // Skip validation for optional empty fields
      if (!schema.required && (value === undefined || value === null || value === '')) {
        continue;
      }

      // Type-specific validation
      switch (schema.type) {
        case 'string':
          sanitized[field] = this.validateString(value, schema, field, errors);
          break;
        
        case 'number':
          sanitized[field] = this.validateNumber(value, schema, field, errors);
          break;
          
        case 'email':
          sanitized[field] = this.validateEmail(value, field, errors);
          break;
          
        case 'barcode':
          sanitized[field] = this.validateBarcode(value, field, errors);
          break;
          
        case 'quantity':
          sanitized[field] = this.validateQuantity(value, schema, field, errors);
          break;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitized: errors.length === 0 ? sanitized : undefined
    };
  }

  // Authentication Security Helpers
  async hashPassword(password: string): Promise<string> {
    const salt = crypto.randomBytes(32);
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha256');
    return `${salt.toString('hex')}:${hash.toString('hex')}`;
  }

  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    const [saltHex, hashHex] = hashedPassword.split(':');
    const salt = Buffer.from(saltHex, 'hex');
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha256');
    return hash.toString('hex') === hashHex;
  }

  // Generate secure tokens
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  // Content Security Policy Headers
  getCSPHeaders(): CSPConfig {
    return {
      'default-src': ["'self'"],
      'script-src': [
        "'self'",
        "'unsafe-inline'", // Required for Next.js in development
        'https://js.stripe.com',
        'https://checkout.stripe.com'
      ],
      'style-src': [
        "'self'",
        "'unsafe-inline'", // Required for styled-components
        'https://fonts.googleapis.com'
      ],
      'img-src': [
        "'self'",
        'data:',
        'https:',
        'blob:'
      ],
      'connect-src': [
        "'self'",
        'https://api.openai.com',
        'https://api.stripe.com',
        'wss://realtime.supabase.co',
        process.env.NODE_ENV === 'development' ? 'ws://localhost:*' : ''
      ].filter(Boolean),
      'font-src': [
        "'self'",
        'https://fonts.gstatic.com'
      ],
      'frame-src': [
        'https://checkout.stripe.com',
        'https://js.stripe.com'
      ],
      'media-src': ["'self'", 'blob:']
    };
  }

  // Security Headers Middleware
  getSecurityHeaders(): Record<string, string> {
    const csp = this.getCSPHeaders();
    const cspString = Object.entries(csp)
      .map(([key, values]) => `${key} ${values.join(' ')}`)
      .join('; ');

    return {
      // Content Security Policy
      'Content-Security-Policy': cspString,
      
      // Prevent MIME type sniffing
      'X-Content-Type-Options': 'nosniff',
      
      // XSS Protection
      'X-XSS-Protection': '1; mode=block',
      
      // Prevent clickjacking
      'X-Frame-Options': 'DENY',
      
      // HSTS (HTTPS only)
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      
      // Referrer Policy
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      
      // Permissions Policy
      'Permissions-Policy': [
        'camera=(self)',
        'microphone=(self)',
        'geolocation=(self)',
        'accelerometer=(),',
        'gyroscope=(),',
        'magnetometer=(),',
        'payment=()'
      ].join(' ')
    };
  }

  // Audit logging
  async logSecurityEvent(event: {
    type: 'auth' | 'validation' | 'rate_limit' | 'encryption' | 'access';
    level: 'info' | 'warning' | 'error' | 'critical';
    userId?: string;
    ip?: string;
    userAgent?: string;
    details: any;
  }): Promise<void> {
    const logEntry = {
      timestamp: new Date().toISOString(),
      ...event,
      // Remove sensitive data
      details: this.sanitizeLogData(event.details)
    };

    // In production, send to logging service
    console.log('SECURITY_EVENT:', JSON.stringify(logEntry));
  }

  // Session management
  async validateSession(sessionToken: string): Promise<{ valid: boolean; userId?: string }> {
    try {
      // In a real implementation, validate JWT or session in database
      // This is a simplified example
      const decoded = this.decodeJWT(sessionToken);
      
      if (decoded.exp < Date.now() / 1000) {
        await this.logSecurityEvent({
          type: 'auth',
          level: 'warning',
          details: { reason: 'expired_session' }
        });
        return { valid: false };
      }

      return { valid: true, userId: decoded.userId };
    } catch (error) {
      await this.logSecurityEvent({
        type: 'auth',
        level: 'error',
        details: { error: error.message }
      });
      return { valid: false };
    }
  }

  // Private helper methods
  private cleanExpiredEntries(windowStart: number): void {
    for (const [key, entry] of this.rateLimitStore.entries()) {
      if (entry.resetTime < windowStart) {
        this.rateLimitStore.delete(key);
      }
    }
  }

  private async getUserTier(identifier: string): Promise<string> {
    // Mock implementation - in real app, query user's subscription tier
    return 'free'; // 'free' | 'starter' | 'professional'
  }

  private validateString(value: any, schema: ValidationSchema, field: string, errors: string[]): string {
    if (typeof value !== 'string') {
      errors.push(`${field} must be a string`);
      return '';
    }

    // XSS prevention - basic HTML entity encoding
    let sanitized = value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .trim();

    if (schema.minLength && sanitized.length < schema.minLength) {
      errors.push(`${field} must be at least ${schema.minLength} characters`);
    }

    if (schema.maxLength && sanitized.length > schema.maxLength) {
      errors.push(`${field} must not exceed ${schema.maxLength} characters`);
      sanitized = sanitized.substring(0, schema.maxLength);
    }

    if (schema.pattern && !schema.pattern.test(sanitized)) {
      errors.push(`${field} format is invalid`);
    }

    return sanitized;
  }

  private validateNumber(value: any, schema: ValidationSchema, field: string, errors: string[]): number {
    const num = Number(value);
    
    if (isNaN(num)) {
      errors.push(`${field} must be a valid number`);
      return 0;
    }

    if (schema.min !== undefined && num < schema.min) {
      errors.push(`${field} must be at least ${schema.min}`);
    }

    if (schema.max !== undefined && num > schema.max) {
      errors.push(`${field} must not exceed ${schema.max}`);
    }

    return num;
  }

  private validateEmail(value: any, field: string, errors: string[]): string {
    if (typeof value !== 'string') {
      errors.push(`${field} must be a string`);
      return '';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const sanitized = value.toLowerCase().trim();

    if (!emailRegex.test(sanitized)) {
      errors.push(`${field} must be a valid email address`);
    }

    return sanitized;
  }

  private validateBarcode(value: any, field: string, errors: string[]): string {
    if (typeof value !== 'string') {
      errors.push(`${field} must be a string`);
      return '';
    }

    const sanitized = value.replace(/\D/g, ''); // Remove non-digits
    
    // Common barcode formats
    const validLengths = [8, 12, 13, 14]; // EAN-8, UPC-A, EAN-13, GTIN-14
    
    if (!validLengths.includes(sanitized.length)) {
      errors.push(`${field} must be a valid barcode format`);
    }

    return sanitized;
  }

  private validateQuantity(value: any, schema: ValidationSchema, field: string, errors: string[]): number {
    const num = Number(value);
    
    if (isNaN(num) || num < 0) {
      errors.push(`${field} must be a non-negative number`);
      return 0;
    }

    // Reasonable quantity limits
    if (num > 999999) {
      errors.push(`${field} exceeds maximum allowed quantity`);
      return 999999;
    }

    return Math.floor(num); // Ensure integer
  }

  private sanitizeLogData(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const sanitized = { ...data };
    
    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'key'];
    
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  private decodeJWT(token: string): any {
    // Simplified JWT decode - in production use proper JWT library
    try {
      const payload = token.split('.')[1];
      return JSON.parse(Buffer.from(payload, 'base64').toString());
    } catch (error) {
      throw new Error('Invalid JWT token');
    }
  }
}

// Rate limiting configuration for different user tiers
export const RATE_LIMITS: { [tier: string]: RateLimitConfig } = {
  free: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  },
  starter: {
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: 'Rate limit exceeded for starter plan.',
    standardHeaders: true,
    legacyHeaders: false,
  },
  professional: {
    windowMs: 15 * 60 * 1000,
    max: 10000,
    message: 'Rate limit exceeded for professional plan.',
    standardHeaders: true,
    legacyHeaders: false,
  }
};

// Validation schemas for common endpoints
export const VALIDATION_SCHEMAS = {
  login: {
    email: { type: 'email' as const, required: true },
    password: { type: 'string' as const, required: true, minLength: 8 }
  },
  
  productScan: {
    barcode: { type: 'barcode' as const, required: true },
    quantity: { type: 'quantity' as const, required: true, min: 0 },
    location: { type: 'string' as const, maxLength: 50 },
    notes: { type: 'string' as const, maxLength: 500 }
  },

  userRegistration: {
    email: { type: 'email' as const, required: true },
    password: { type: 'string' as const, required: true, minLength: 12 },
    businessName: { type: 'string' as const, required: true, minLength: 2, maxLength: 100 }
  }
};