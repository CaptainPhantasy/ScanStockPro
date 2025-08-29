import { SecurityService, VALIDATION_SCHEMAS, RATE_LIMITS } from '../../security/security-service';

describe('SecurityService', () => {
  let securityService: SecurityService;
  
  beforeEach(() => {
    securityService = new SecurityService({
      encryptionSecret: 'test-secret-key-32-characters-long!',
      jwtSecret: 'jwt-test-secret',
      rateLimitWindow: 900000, // 15 minutes
      rateLimitMax: 100,
      sessionTimeout: 3600000, // 1 hour
      passwordMinLength: 12,
      mfaRequired: false,
    });
  });

  describe('API Key Encryption', () => {
    const testApiKey = 'sk-test-key-1234567890abcdef';

    test('should encrypt and decrypt API key correctly', async () => {
      const encrypted = await securityService.encryptApiKey(testApiKey);
      expect(encrypted).not.toBe(testApiKey);
      expect(typeof encrypted).toBe('string');
      
      const decrypted = await securityService.decryptApiKey(encrypted);
      expect(decrypted).toBe(testApiKey);
    });

    test('should throw error for invalid API key', async () => {
      await expect(securityService.encryptApiKey('')).rejects.toThrow('Invalid API key provided');
      await expect(securityService.encryptApiKey(null as any)).rejects.toThrow('Invalid API key provided');
    });

    test('should throw error for invalid encrypted data', async () => {
      await expect(securityService.decryptApiKey('invalid-encrypted-data')).rejects.toThrow('Failed to decrypt API key');
      await expect(securityService.decryptApiKey('')).rejects.toThrow('Invalid encrypted API key provided');
    });

    test('should produce different encrypted strings for same input', async () => {
      const encrypted1 = await securityService.encryptApiKey(testApiKey);
      const encrypted2 = await securityService.encryptApiKey(testApiKey);
      expect(encrypted1).not.toBe(encrypted2);
      
      // But both should decrypt to the same value
      const decrypted1 = await securityService.decryptApiKey(encrypted1);
      const decrypted2 = await securityService.decryptApiKey(encrypted2);
      expect(decrypted1).toBe(testApiKey);
      expect(decrypted2).toBe(testApiKey);
    });
  });

  describe('Rate Limiting', () => {
    test('should allow requests within limit', async () => {
      const result = await securityService.checkRateLimit('test-user', RATE_LIMITS);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(99); // 100 - 1
      expect(typeof result.resetTime).toBe('number');
    });

    test('should block requests over limit', async () => {
      const identifier = 'test-user-blocked';
      
      // Make requests up to the limit
      for (let i = 0; i < 100; i++) {
        await securityService.checkRateLimit(identifier, RATE_LIMITS);
      }
      
      // Next request should be blocked
      const result = await securityService.checkRateLimit(identifier, RATE_LIMITS);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    test('should reset rate limit after window expires', async () => {
      const mockRateLimit = {
        free: {
          windowMs: 100, // Very short window for testing
          max: 2,
          message: 'Test limit',
          standardHeaders: true,
          legacyHeaders: false,
        }
      };

      const identifier = 'test-reset-user';
      
      // Use up the limit
      await securityService.checkRateLimit(identifier, mockRateLimit);
      await securityService.checkRateLimit(identifier, mockRateLimit);
      
      // Should be blocked
      let result = await securityService.checkRateLimit(identifier, mockRateLimit);
      expect(result.allowed).toBe(false);
      
      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Should be allowed again
      result = await securityService.checkRateLimit(identifier, mockRateLimit);
      expect(result.allowed).toBe(true);
    });
  });

  describe('Input Validation', () => {
    test('should validate login input correctly', () => {
      const validInput = {
        email: 'user@example.com',
        password: 'securePassword123!'
      };

      const result = securityService.validateInput(validInput, VALIDATION_SCHEMAS.login);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.sanitized?.email).toBe('user@example.com');
    });

    test('should reject invalid email format', () => {
      const invalidInput = {
        email: 'not-an-email',
        password: 'validPassword'
      };

      const result = securityService.validateInput(invalidInput, VALIDATION_SCHEMAS.login);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('email must be a valid email address');
    });

    test('should require mandatory fields', () => {
      const emptyInput = {};

      const result = securityService.validateInput(emptyInput, VALIDATION_SCHEMAS.login);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('email is required');
      expect(result.errors).toContain('password is required');
    });

    test('should sanitize XSS attempts', () => {
      const xssInput = {
        notes: '<script>alert("xss")</script>Test note'
      };

      const schema = {
        notes: { type: 'string' as const, maxLength: 500 }
      };

      const result = securityService.validateInput(xssInput, schema);
      expect(result.isValid).toBe(true);
      expect(result.sanitized?.notes).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;Test note');
    });

    test('should validate barcode format', () => {
      const validBarcode = { barcode: '1234567890123' };
      const invalidBarcode = { barcode: 'abc123' };

      const schema = { barcode: { type: 'barcode' as const, required: true }};

      const validResult = securityService.validateInput(validBarcode, schema);
      expect(validResult.isValid).toBe(true);
      expect(validResult.sanitized?.barcode).toBe('1234567890123');

      const invalidResult = securityService.validateInput(invalidBarcode, schema);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors[0]).toContain('must be a valid barcode format');
    });

    test('should validate quantity limits', () => {
      const validQuantity = { quantity: 25 };
      const negativeQuantity = { quantity: -5 };
      const tooLarge = { quantity: 9999999 };

      const schema = { quantity: { type: 'quantity' as const, required: true }};

      // Valid quantity
      let result = securityService.validateInput(validQuantity, schema);
      expect(result.isValid).toBe(true);
      expect(result.sanitized?.quantity).toBe(25);

      // Negative quantity
      result = securityService.validateInput(negativeQuantity, schema);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('must be a non-negative number');

      // Too large quantity
      result = securityService.validateInput(tooLarge, schema);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('exceeds maximum allowed quantity');
    });
  });

  describe('Password Security', () => {
    test('should hash password securely', async () => {
      const password = 'testPassword123!';
      const hashed = await securityService.hashPassword(password);
      
      expect(hashed).not.toBe(password);
      expect(hashed).toContain(':'); // Should contain salt:hash format
      expect(hashed.length).toBeGreaterThan(128); // Should be long due to salt + hash
    });

    test('should verify password correctly', async () => {
      const password = 'testPassword123!';
      const hashed = await securityService.hashPassword(password);
      
      const isValid = await securityService.verifyPassword(password, hashed);
      expect(isValid).toBe(true);
      
      const isInvalid = await securityService.verifyPassword('wrongPassword', hashed);
      expect(isInvalid).toBe(false);
    });

    test('should produce different hashes for same password', async () => {
      const password = 'testPassword123!';
      const hash1 = await securityService.hashPassword(password);
      const hash2 = await securityService.hashPassword(password);
      
      expect(hash1).not.toBe(hash2);
      
      // But both should verify correctly
      expect(await securityService.verifyPassword(password, hash1)).toBe(true);
      expect(await securityService.verifyPassword(password, hash2)).toBe(true);
    });
  });

  describe('Security Headers', () => {
    test('should generate comprehensive CSP headers', () => {
      const csp = securityService.getCSPHeaders();
      
      expect(csp['default-src']).toContain("'self'");
      expect(csp['script-src']).toContain('https://js.stripe.com');
      expect(csp['connect-src']).toContain('https://api.openai.com');
      expect(csp['connect-src']).toContain('https://api.stripe.com');
    });

    test('should generate security headers', () => {
      const headers = securityService.getSecurityHeaders();
      
      expect(headers['Content-Security-Policy']).toBeDefined();
      expect(headers['X-Content-Type-Options']).toBe('nosniff');
      expect(headers['X-XSS-Protection']).toBe('1; mode=block');
      expect(headers['X-Frame-Options']).toBe('DENY');
      expect(headers['Strict-Transport-Security']).toContain('max-age=31536000');
    });
  });

  describe('Token Generation', () => {
    test('should generate secure random tokens', () => {
      const token1 = securityService.generateSecureToken();
      const token2 = securityService.generateSecureToken();
      
      expect(token1).not.toBe(token2);
      expect(token1).toHaveLength(64); // 32 bytes = 64 hex chars
      expect(token2).toHaveLength(64);
      expect(/^[a-f0-9]+$/.test(token1)).toBe(true);
      expect(/^[a-f0-9]+$/.test(token2)).toBe(true);
    });

    test('should generate tokens of specified length', () => {
      const shortToken = securityService.generateSecureToken(8);
      expect(shortToken).toHaveLength(16); // 8 bytes = 16 hex chars
      
      const longToken = securityService.generateSecureToken(64);
      expect(longToken).toHaveLength(128); // 64 bytes = 128 hex chars
    });
  });

  describe('Session Validation', () => {
    test('should validate session tokens', async () => {
      // Mock a valid JWT-like token (simplified for testing)
      const mockToken = Buffer.from(JSON.stringify({
        userId: 'user-123',
        exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
      })).toString('base64');
      
      const fakeJWT = `header.${mockToken}.signature`;
      
      const result = await securityService.validateSession(fakeJWT);
      expect(result.valid).toBe(true);
      expect(result.userId).toBe('user-123');
    });

    test('should reject expired tokens', async () => {
      const expiredToken = Buffer.from(JSON.stringify({
        userId: 'user-123',
        exp: Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
      })).toString('base64');
      
      const fakeJWT = `header.${expiredToken}.signature`;
      
      const result = await securityService.validateSession(fakeJWT);
      expect(result.valid).toBe(false);
    });

    test('should reject invalid tokens', async () => {
      const result = await securityService.validateSession('invalid-token');
      expect(result.valid).toBe(false);
    });
  });
});