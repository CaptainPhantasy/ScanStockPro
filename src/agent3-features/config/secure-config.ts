// Secure configuration management for ScanStock Pro
// This handles encrypted storage and retrieval of sensitive credentials

import { Foundation_To_Features } from '../../shared/contracts/agent-interfaces';

export interface SecureCredentials {
  supabase: {
    url: string;
    anonKey: string;
    serviceRoleKey: string; // Encrypted storage only
  };
  openai: {
    apiKey: string; // Client-provided, encrypted
    organization?: string;
  };
  integrations: {
    quickbooks?: {
      clientId: string;
      clientSecret: string;
      redirectUri: string;
    };
    shopify?: {
      apiKey: string;
      apiSecret: string;
      scopes: string[];
    };
  };
}

export class SecureConfigService {
  constructor(private foundation: Foundation_To_Features) {}

  // Initialize with environment variables (never hardcode credentials)
  async initializeFromEnvironment(): Promise<SecureCredentials> {
    return {
      supabase: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        serviceRoleKey: await this.getEncryptedValue('SUPABASE_SERVICE_ROLE_KEY')
      },
      openai: {
        apiKey: await this.getEncryptedValue('OPENAI_API_KEY'),
        organization: process.env.OPENAI_ORGANIZATION
      },
      integrations: {
        quickbooks: process.env.QUICKBOOKS_CLIENT_ID ? {
          clientId: process.env.QUICKBOOKS_CLIENT_ID,
          clientSecret: await this.getEncryptedValue('QUICKBOOKS_CLIENT_SECRET'),
          redirectUri: process.env.QUICKBOOKS_REDIRECT_URI || ''
        } : undefined,
        shopify: process.env.SHOPIFY_API_KEY ? {
          apiKey: process.env.SHOPIFY_API_KEY,
          apiSecret: await this.getEncryptedValue('SHOPIFY_API_SECRET'),
          scopes: (process.env.SHOPIFY_SCOPES || '').split(',')
        } : undefined
      }
    };
  }

  // Store client's OpenAI key securely (encrypted)
  async storeClientOpenAIKey(
    businessId: string, 
    apiKey: string,
    userId: string
  ): Promise<void> {
    // Validate the API key first
    await this.validateOpenAIKey(apiKey);

    // Encrypt the key
    const encryptedKey = await this.foundation.utils.encryption.encrypt(apiKey);

    // Store with metadata
    await this.storeEncryptedCredential(businessId, 'openai_api_key', {
      encryptedValue: encryptedKey,
      addedBy: userId,
      addedAt: new Date(),
      lastUsed: null,
      usage: {
        totalRequests: 0,
        totalTokens: 0,
        monthlyCost: 0,
        lastReset: new Date()
      },
      isActive: true
    });
  }

  // Retrieve and decrypt client's OpenAI key
  async getClientOpenAIKey(businessId: string): Promise<string | null> {
    const credential = await this.getEncryptedCredential(businessId, 'openai_api_key');
    
    if (!credential || !credential.isActive) {
      return null;
    }

    // Decrypt and return
    return await this.foundation.utils.encryption.decrypt(credential.encryptedValue);
  }

  // Validate OpenAI API key
  private async validateOpenAIKey(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Invalid API key: ${response.status}`);
      }

      return true;
    } catch (error) {
      throw new Error(`OpenAI API key validation failed: ${error}`);
    }
  }

  // Generic encrypted storage methods
  private async getEncryptedValue(key: string): Promise<string> {
    const value = process.env[key];
    if (!value) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    
    // If the value is encrypted, decrypt it
    if (value.startsWith('encrypted:')) {
      return await this.foundation.utils.encryption.decrypt(value.substring(10));
    }
    
    return value;
  }

  private async storeEncryptedCredential(
    businessId: string, 
    credentialType: string, 
    data: any
  ): Promise<void> {
    // This would store in Supabase with proper encryption
    // Implementation would depend on your database schema
    console.log(`Storing encrypted credential for business ${businessId}: ${credentialType}`);
  }

  private async getEncryptedCredential(
    businessId: string, 
    credentialType: string
  ): Promise<any> {
    // This would retrieve from Supabase and decrypt
    // Implementation would depend on your database schema
    return null;
  }
}

// Environment configuration template
export const environmentTemplate = `
# ScanStock Pro Environment Configuration
# Copy this to .env.local and fill in your values

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# OpenAI Configuration (Optional - clients can provide their own)
OPENAI_API_KEY=your_openai_key_here
OPENAI_ORGANIZATION=your_org_id_here

# QuickBooks Integration (Optional)
QUICKBOOKS_CLIENT_ID=your_quickbooks_client_id_here
QUICKBOOKS_CLIENT_SECRET=your_quickbooks_client_secret_here
QUICKBOOKS_REDIRECT_URI=http://localhost:3000/api/auth/quickbooks

# Shopify Integration (Optional)
SHOPIFY_API_KEY=your_shopify_api_key_here
SHOPIFY_API_SECRET=your_shopify_api_secret_here
SHOPIFY_SCOPES=read_products,write_inventory

# Security
ENCRYPTION_KEY=generate_a_strong_32_character_key_here
JWT_SECRET=generate_a_strong_jwt_secret_here

# Development
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
`;

// Security best practices documentation
export const securityNotes = `
SECURITY BEST PRACTICES:

1. NEVER commit API keys or secrets to version control
2. Use environment variables for all sensitive data
3. Encrypt sensitive data at rest
4. Rotate credentials regularly
5. Use least-privilege access principles
6. Monitor API usage and set limits
7. Implement proper error handling that doesn't leak credentials
8. Use HTTPS in production
9. Validate all API keys before storing
10. Audit credential access regularly

CLIENT API KEY MANAGEMENT:
- Clients provide their own OpenAI API keys
- Keys are encrypted before storage
- Usage is tracked and limited
- Keys can be revoked/rotated by clients
- Never log or expose client keys
`;