# ScanStock Pro - Deployment Guide

Complete production deployment guide for the mobile-first PWA inventory management system.

## Prerequisites

### Required Software
- **Node.js**: 18.x or higher
- **Docker**: 24.x or higher with Docker Compose
- **PostgreSQL**: 14.x or higher
- **Redis**: 6.x or higher
- **Git**: Latest version

### Required Accounts & Services
- **Supabase Account**: For database and authentication
- **Stripe Account**: For subscription billing
- **OpenAI Account**: For AI product recognition
- **Domain**: With SSL certificate capability
- **Cloud Provider**: AWS/Google Cloud/Vercel (recommended)

## Environment Configuration

### 1. Environment Variables

Create `.env.production` file:

```bash
# Application
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_APP_NAME="ScanStock Pro"
NODE_ENV=production

# Database (Supabase)
DATABASE_URL=postgresql://username:password@host:port/database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Authentication
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-nextauth-secret-32-chars-min

# Stripe Billing
STRIPE_PUBLISHABLE_KEY=pk_live_your-stripe-publishable-key
STRIPE_SECRET_KEY=sk_live_your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# OpenAI
OPENAI_API_KEY=sk-your-openai-api-key

# Security
ENCRYPTION_SECRET=your-32-character-encryption-secret
JWT_SECRET=your-jwt-secret

# Redis Cache
REDIS_URL=redis://username:password@host:port

# Monitoring
SENTRY_DSN=https://your-sentry-dsn
LOG_LEVEL=info
```

### 2. Supabase Setup

#### Database Tables
```sql
-- Execute in Supabase SQL Editor

-- Businesses table
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  subscription TEXT DEFAULT 'free',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users table (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  email TEXT NOT NULL,
  business_id UUID REFERENCES businesses(id),
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  sku TEXT NOT NULL,
  barcode TEXT NOT NULL,
  category TEXT,
  business_id UUID REFERENCES businesses(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(barcode, business_id),
  UNIQUE(sku, business_id)
);

-- Inventory table
CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) NOT NULL,
  quantity INTEGER DEFAULT 0,
  location TEXT,
  last_counted TIMESTAMP WITH TIME ZONE,
  business_id UUID REFERENCES businesses(id) NOT NULL,
  user_id UUID REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inventory history for tracking changes
CREATE TABLE inventory_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) NOT NULL,
  old_quantity INTEGER,
  new_quantity INTEGER,
  change_reason TEXT,
  location TEXT,
  notes TEXT,
  business_id UUID REFERENCES businesses(id) NOT NULL,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_products_business_id ON products(business_id);
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_inventory_product_id ON inventory(product_id);
CREATE INDEX idx_inventory_business_id ON inventory(business_id);
CREATE INDEX idx_inventory_history_product_id ON inventory_history(product_id);

-- Row Level Security
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own business" ON businesses
  FOR SELECT USING (id IN (
    SELECT business_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can view business products" ON products
  FOR SELECT USING (business_id IN (
    SELECT business_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can manage business inventory" ON inventory
  FOR ALL USING (business_id IN (
    SELECT business_id FROM profiles WHERE id = auth.uid()
  ));
```

#### Real-time Subscriptions
```sql
-- Enable real-time for inventory updates
ALTER PUBLICATION supabase_realtime ADD TABLE inventory;
ALTER PUBLICATION supabase_realtime ADD TABLE products;
```

### 3. Stripe Configuration

#### Webhooks
Configure webhook endpoint: `https://your-domain.com/api/webhooks/stripe`

Required events:
- `customer.subscription.created`
- `customer.subscription.updated` 
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `checkout.session.completed`

#### Products & Prices
```javascript
// Create in Stripe Dashboard or via API
const products = [
  {
    name: "Starter Plan",
    id: "starter",
    prices: [{
      id: "price_starter_monthly",
      unit_amount: 2900, // $29.00
      currency: "usd",
      recurring: { interval: "month" }
    }]
  },
  {
    name: "Professional Plan", 
    id: "professional",
    prices: [{
      id: "price_professional_monthly",
      unit_amount: 9900, // $99.00
      currency: "usd", 
      recurring: { interval: "month" }
    }]
  }
];
```

## Deployment Options

### Option 1: Vercel (Recommended)

#### 1. Install Vercel CLI
```bash
npm i -g vercel
```

#### 2. Configure Project
```bash
# In project root
vercel login
vercel init
```

#### 3. Environment Variables
```bash
# Add via Vercel dashboard or CLI
vercel env add SUPABASE_URL
vercel env add SUPABASE_ANON_KEY
vercel env add STRIPE_SECRET_KEY
# ... add all environment variables
```

#### 4. Deploy
```bash
vercel --prod
```

#### 5. Domain Configuration
```bash
vercel domains add your-domain.com
```

### Option 2: Docker Deployment

#### 1. Dockerfile
```dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
```

#### 2. Docker Compose
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - SUPABASE_URL=${SUPABASE_URL}
      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
    depends_on:
      - redis
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80" 
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped

volumes:
  redis_data:
```

#### 3. Nginx Configuration
```nginx
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:3000;
    }

    # Redirect HTTP to HTTPS
    server {
        listen 80;
        server_name your-domain.com;
        return 301 https://$host$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name your-domain.com;

        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
        ssl_prefer_server_ciphers off;
        
        # Security headers
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Frame-Options DENY always;
        add_header X-Content-Type-Options nosniff always;
        add_header X-XSS-Protection "1; mode=block" always;

        location / {
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # WebSocket support
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
        }

        # PWA service worker
        location /service-worker.js {
            proxy_pass http://app;
            add_header Cache-Control "no-cache, no-store, must-revalidate";
        }

        # API routes with rate limiting
        location /api/ {
            proxy_pass http://app;
            
            # Rate limiting
            limit_req zone=api burst=20 nodelay;
            limit_req_status 429;
        }
    }
    
    # Rate limiting zone
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
}
```

## Health Checks & Monitoring

### 1. Health Check Endpoints

Create `pages/api/health.ts`:
```typescript
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const checks = {
    server: 'ok',
    database: 'checking...',
    redis: 'checking...',
    stripe: 'checking...',
  };

  // Add actual health checks
  return res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks
  });
}
```

### 2. Monitoring Setup

#### Sentry Error Tracking
```bash
npm install @sentry/nextjs
```

```javascript
// sentry.client.config.js
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
```

#### Prometheus Metrics
```typescript
// pages/api/metrics.ts
import client from 'prom-client';

const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequests = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [register]
});

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Content-Type', register.contentType);
  res.send(register.metrics());
}
```

## Security Hardening

### 1. Security Headers (Already implemented in Agent 4)
- Content Security Policy
- HSTS
- X-Frame-Options
- X-Content-Type-Options

### 2. Rate Limiting
- API endpoints: 100 req/min per IP
- Authentication: 5 req/min per IP
- Webhook endpoints: No limit (authenticated)

### 3. SSL/TLS Configuration
- TLS 1.2+ only
- Strong cipher suites
- Certificate pinning for mobile apps

## Performance Optimization

### 1. Caching Strategy
```typescript
// Redis caching
const cacheConfig = {
  user_sessions: '1h',
  product_data: '24h', 
  inventory_counts: '5m',
  api_responses: '15m'
};
```

### 2. CDN Configuration
- Static assets via CDN
- Image optimization
- Gzip compression
- Browser caching headers

### 3. Database Optimization
- Connection pooling
- Read replicas for reports
- Proper indexing
- Query optimization

## Backup & Recovery

### 1. Database Backups
```bash
# Daily automated backups
pg_dump $DATABASE_URL | gzip > backup_$(date +%Y%m%d).sql.gz
```

### 2. Application Backups
- Code repository (Git)
- Environment configurations
- SSL certificates
- User uploads (if any)

### 3. Disaster Recovery Plan
1. Database restoration: < 1 hour RTO
2. Application deployment: < 30 minutes RTO
3. DNS failover: < 5 minutes RTO

## Rollback Procedures

### 1. Application Rollback
```bash
# Vercel
vercel rollback

# Docker
docker-compose down
docker-compose up -d --scale app=0
docker-compose up -d previous_image
```

### 2. Database Rollback
```bash
# Run migration rollback
npm run migrate:rollback

# Or restore from backup
psql $DATABASE_URL < backup_previous.sql
```

### 3. Feature Flags
Use environment variables to disable features:
```bash
FEATURE_AI_RECOGNITION=false
FEATURE_COLLABORATION=false
```

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check Node.js version compatibility
   - Verify all environment variables
   - Clear npm cache: `npm cache clean --force`

2. **Database Connection**
   - Verify connection string format
   - Check firewall rules
   - Test with psql client

3. **Stripe Webhook Failures**
   - Verify webhook URL is accessible
   - Check webhook secret configuration
   - Review webhook event logs

4. **Performance Issues**
   - Monitor Core Web Vitals
   - Check database query performance
   - Review CDN configuration

### Log Analysis
```bash
# Application logs
docker-compose logs -f app

# Database slow queries
# Check Supabase dashboard

# Nginx access logs
docker-compose logs -f nginx
```

## Maintenance

### Regular Tasks
- **Daily**: Monitor error rates and performance
- **Weekly**: Review security logs and update dependencies
- **Monthly**: Database maintenance and backup verification
- **Quarterly**: Security audit and penetration testing

### Updates
1. Test in staging environment
2. Schedule maintenance window
3. Deploy during low-traffic hours
4. Monitor for 24 hours post-deployment

This deployment guide ensures a production-ready, secure, and scalable deployment of ScanStock Pro.