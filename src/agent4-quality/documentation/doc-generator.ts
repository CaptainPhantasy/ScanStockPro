import fs from 'fs/promises';
import path from 'path';

export interface APIEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  description: string;
  parameters: Parameter[];
  responses: Response[];
  examples: Example[];
  authentication: boolean;
  rateLimit?: RateLimit;
}

export interface Parameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
  example?: any;
  validation?: ValidationRule[];
}

export interface Response {
  statusCode: number;
  description: string;
  schema: any;
  example?: any;
}

export interface Example {
  title: string;
  description: string;
  request?: any;
  response?: any;
}

export interface RateLimit {
  requests: number;
  window: string;
  tier: string;
}

export interface ValidationRule {
  type: string;
  value?: any;
  message: string;
}

export interface UserGuide {
  title: string;
  category: 'getting-started' | 'features' | 'troubleshooting' | 'advanced';
  content: string;
  images?: string[];
  videos?: string[];
  lastUpdated: Date;
}

export interface DeploymentGuide {
  prerequisites: string[];
  environments: string[];
  configuration: { [key: string]: any };
  monitoring: { [key: string]: any };
  rollback: { [key: string]: any };
}

export class DocumentationGenerator {
  private outputDir: string;
  private sourceDir: string;

  constructor(sourceDir: string = 'src', outputDir: string = 'docs') {
    this.sourceDir = sourceDir;
    this.outputDir = outputDir;
  }

  // API Documentation Generation
  async generateAPIDocs(): Promise<void> {
    console.log('Generating API documentation...');
    
    try {
      // Scan API routes
      const apiRoutes = await this.scanAPIRoutes();
      
      // Extract endpoint information
      const endpoints = await this.extractEndpointInfo(apiRoutes);
      
      // Generate OpenAPI spec
      const openApiSpec = this.generateOpenAPISpec(endpoints);
      
      // Generate Markdown documentation
      const markdownDocs = this.generateAPIMarkdown(endpoints);
      
      // Generate interactive documentation
      const interactiveDocs = this.generateInteractiveDocs(endpoints);
      
      // Write documentation files
      await this.writeDocumentationFiles({
        'api/openapi.yaml': this.yamlStringify(openApiSpec),
        'api/endpoints.md': markdownDocs,
        'api/interactive.html': interactiveDocs,
      });
      
      console.log('API documentation generated successfully');
      
    } catch (error) {
      console.error('Failed to generate API documentation:', error);
      throw error;
    }
  }

  // User Documentation Generation
  async createUserGuides(): Promise<void> {
    console.log('Creating user guides...');
    
    const guides: UserGuide[] = [
      {
        title: 'Getting Started with Mobile Scanning',
        category: 'getting-started',
        content: this.generateGettingStartedGuide(),
        images: ['mobile-scanning-overview.png', 'camera-permission.png'],
        videos: ['quick-start-tutorial.mp4'],
        lastUpdated: new Date(),
      },
      {
        title: 'One-Handed Operation Guide',
        category: 'features',
        content: this.generateOneHandedGuide(),
        images: ['thumb-zones.png', 'gesture-controls.png'],
        lastUpdated: new Date(),
      },
      {
        title: 'Offline Mode Instructions',
        category: 'features',
        content: this.generateOfflineModeGuide(),
        images: ['offline-indicator.png', 'sync-queue.png'],
        lastUpdated: new Date(),
      },
      {
        title: 'Team Collaboration Setup',
        category: 'features',
        content: this.generateCollaborationGuide(),
        images: ['team-session.png', 'real-time-updates.png'],
        lastUpdated: new Date(),
      },
      {
        title: 'AI Recognition Best Practices',
        category: 'advanced',
        content: this.generateAIGuide(),
        images: ['barcode-quality.png', 'lighting-tips.png'],
        lastUpdated: new Date(),
      },
      {
        title: 'Troubleshooting Common Issues',
        category: 'troubleshooting',
        content: this.generateTroubleshootingGuide(),
        images: ['camera-issues.png', 'network-problems.png'],
        lastUpdated: new Date(),
      },
    ];

    // Generate guide files
    for (const guide of guides) {
      const filename = `user-guides/${guide.category}/${guide.title.toLowerCase().replace(/\s+/g, '-')}.md`;
      const content = this.formatUserGuide(guide);
      
      await this.writeDocumentationFiles({
        [filename]: content,
      });
    }

    // Generate user guide index
    const indexContent = this.generateUserGuideIndex(guides);
    await this.writeDocumentationFiles({
      'user-guides/README.md': indexContent,
    });

    console.log('User guides created successfully');
  }

  // Developer Documentation Generation
  async generateDevDocs(): Promise<void> {
    console.log('Generating developer documentation...');

    const devDocs = {
      'developer/README.md': this.generateDeveloperOverview(),
      'developer/architecture.md': this.generateArchitectureDoc(),
      'developer/setup.md': this.generateSetupInstructions(),
      'developer/api-integration.md': this.generateAPIIntegrationGuide(),
      'developer/mobile-testing.md': this.generateMobileTestingGuide(),
      'developer/security-guidelines.md': this.generateSecurityGuidelines(),
      'developer/performance.md': this.generatePerformanceGuide(),
      'developer/contributing.md': this.generateContributingGuide(),
    };

    await this.writeDocumentationFiles(devDocs);
    
    console.log('Developer documentation generated successfully');
  }

  // Deployment Documentation
  createDeploymentGuide(): DeploymentGuide {
    return {
      prerequisites: [
        'Node.js 18+ installed',
        'Docker and Docker Compose',
        'PostgreSQL 14+',
        'Redis 6+',
        'Supabase account',
        'Stripe account',
        'OpenAI API key',
        'Domain with SSL certificate',
      ],
      
      environments: ['development', 'staging', 'production'],
      
      configuration: {
        environment_variables: {
          DATABASE_URL: 'PostgreSQL connection string',
          SUPABASE_URL: 'Supabase project URL',
          SUPABASE_ANON_KEY: 'Supabase anonymous key',
          SUPABASE_SERVICE_ROLE_KEY: 'Supabase service role key',
          NEXTAUTH_SECRET: 'NextAuth.js secret',
          NEXTAUTH_URL: 'Application URL',
          STRIPE_PUBLISHABLE_KEY: 'Stripe publishable key',
          STRIPE_SECRET_KEY: 'Stripe secret key',
          STRIPE_WEBHOOK_SECRET: 'Stripe webhook secret',
          OPENAI_API_KEY: 'OpenAI API key',
          REDIS_URL: 'Redis connection string',
          ENCRYPTION_SECRET: '32-character encryption secret',
        },
        
        nginx_config: this.getNginxConfig(),
        docker_compose: this.getDockerComposeConfig(),
        kubernetes: this.getKubernetesConfig(),
      },
      
      monitoring: {
        healthchecks: [
          'GET /api/health - Application health',
          'GET /api/health/db - Database connectivity',
          'GET /api/health/redis - Redis connectivity',
          'GET /api/health/stripe - Stripe webhook health',
        ],
        
        metrics_endpoints: [
          'GET /api/metrics - Prometheus metrics',
          'GET /api/metrics/performance - Performance metrics',
          'GET /api/metrics/usage - Usage statistics',
        ],
        
        alerting: {
          'High error rate': 'Alert when error rate > 1%',
          'Slow response times': 'Alert when avg response > 2s',
          'Database connection issues': 'Alert on DB connection failures',
          'Memory usage': 'Alert when memory usage > 85%',
        },
      },
      
      rollback: {
        database_migrations: 'Use migration rollback scripts',
        application_code: 'Deploy previous Docker image tag',
        feature_flags: 'Disable new features via configuration',
        traffic_routing: 'Route traffic back to previous version',
      },
    };
  }

  // Private helper methods for content generation
  private generateGettingStartedGuide(): string {
    return `# Getting Started with Mobile Scanning

Welcome to ScanStock Pro! This guide will help you get started with mobile inventory scanning in just a few minutes.

## Quick Start

### 1. Login and Setup
1. Open ScanStock Pro on your mobile device
2. Sign in with your business account
3. Grant camera permissions when prompted
4. You're ready to start scanning!

### 2. Your First Scan
1. Tap the large **Scan** button on the dashboard
2. Point your camera at a barcode
3. Wait for the green scanning frame to appear
4. The product information will load automatically

### 3. Recording Inventory Count
1. After scanning, adjust the quantity using the + and - buttons
2. Enter the storage location (e.g., "A-1-B")
3. Add notes if needed
4. Tap **Submit Count** to save

## Mobile-First Design

ScanStock Pro is designed specifically for warehouse workers using smartphones:

- **Large touch targets** - All buttons are at least 48px for easy tapping
- **One-handed operation** - Critical controls are within thumb reach
- **Offline capability** - Continue working without internet connection
- **Voice input** - Use voice commands for hands-free operation
- **Gesture controls** - Swipe and long-press for quick actions

## Camera Best Practices

For optimal barcode scanning:

- **Good lighting** - Ensure adequate lighting on the barcode
- **Steady hands** - Hold the device steady for better focus
- **Proper distance** - Keep 4-8 inches from the barcode
- **Clean lens** - Wipe camera lens regularly for clarity
- **Correct angle** - Hold device parallel to the barcode

## Troubleshooting

**Camera won't open?**
- Check app permissions in device settings
- Close other apps that might use the camera
- Restart the app if needed

**Barcode won't scan?**
- Ensure barcode is clean and undamaged
- Try different angles and distances
- Use manual entry if barcode is unreadable

**App feels slow?**
- Close unused browser tabs
- Clear app cache in settings
- Check internet connection

## Next Steps

- Learn about [offline mode](./offline-mode.md)
- Set up [team collaboration](./team-collaboration.md)
- Explore [advanced features](./advanced-features.md)
`;
  }

  private generateOneHandedGuide(): string {
    return `# One-Handed Operation Guide

ScanStock Pro is optimized for one-handed use, perfect for warehouse environments where you need to hold items while scanning.

## Thumb-Friendly Design

### Primary Action Zone
The most important buttons are positioned in the lower portion of the screen where your thumb naturally rests:

- **Scan Button** - Bottom center for easy access
- **Quantity Controls** - Within thumb reach
- **Submit Button** - Bottom right corner

### Secondary Actions
Less frequent actions are placed higher on the screen:
- Settings and menu items
- Navigation breadcrumbs
- Search functionality

## Gesture Controls

### Swipe Gestures
- **Swipe left on product cards** - Quick actions menu
- **Swipe right** - Go back to previous screen
- **Swipe up from bottom** - Access quick tools

### Long Press Actions
- **Long press product** - Context menu with options
- **Long press scan button** - Voice input mode
- **Long press quantity** - Bulk edit mode

## Voice Commands

When scanning hands-free:
- **"Scan"** - Start camera scanning
- **"Twenty five"** - Set quantity to 25
- **"Location A-1-B"** - Set storage location
- **"Submit"** - Save the count
- **"Next"** - Move to next item

## Accessibility Features

### Large Text Mode
- Increase font size in settings
- Better visibility in warehouse lighting
- Reduced eye strain during long shifts

### High Contrast Mode
- Enhanced visibility in poor lighting
- Better distinction between UI elements
- Reduced battery usage on OLED screens

## Tips for Efficiency

1. **Learn gestures** - Faster than tapping small buttons
2. **Use voice input** - Keep hands free for handling inventory
3. **Customize layout** - Move frequently used controls closer
4. **Practice common flows** - Muscle memory improves speed
5. **Use haptic feedback** - Feel confirmations without looking

## Common One-Handed Scenarios

### Scenario 1: Scanning while holding item
1. Hold item in non-dominant hand
2. Use thumb to tap scan button
3. Point camera at barcode on item
4. Use voice to enter quantity

### Scenario 2: Bulk inventory count
1. Enable batch mode in settings
2. Use gesture controls for navigation
3. Voice input for quantities
4. Quick swipe to submit counts

### Scenario 3: High shelves
1. Use voice commands for all input
2. Long press scan for continuous mode
3. Audio feedback for confirmations
4. Voice navigation between items

This design ensures productivity even in challenging warehouse conditions!
`;
  }

  private generateOfflineModeGuide(): string {
    return `# Offline Mode Instructions

ScanStock Pro's offline capabilities ensure you never lose productivity, even without internet connectivity.

## Automatic Offline Detection

The app automatically detects when you lose internet connection:
- Red "Offline" indicator appears in the top bar
- Queue counter shows pending sync items
- All core features remain fully functional

## Offline Capabilities

### Full Scanning Functionality
- Camera scanning works without internet
- Product lookup from cached database
- Quantity adjustments and notes
- Location entry and validation

### Data Storage
- All scans stored locally on device
- Encrypted local database
- Automatic queue management
- No data loss when offline

### Smart Caching
- Product information cached for 7 days
- Recent locations saved locally
- User preferences stored offline
- Image thumbnails cached

## Working Offline

### 1. Scanning Products
- Works exactly the same as online mode
- Cached product data loads instantly
- New products can be manually added

### 2. Managing Queue
- View pending sync items in queue
- Edit queued items before sync
- Delete incorrect entries
- Reorder sync priority

### 3. Bulk Operations
- Batch multiple scans offline
- Process entire sections without connectivity
- Efficient queue management
- Smart conflict resolution

## Sync Process

### Automatic Sync
When connection is restored:
1. Queue indicator shows "Syncing..."
2. Items upload in chronological order
3. Conflict resolution for duplicates
4. Success confirmation for each item

### Manual Sync
Force sync at any time:
- Tap the queue counter
- Select "Sync Now"
- Monitor progress in real-time
- Retry failed items

### Conflict Resolution
When the same item is counted multiple times:
- Most recent count takes precedence
- Option to merge or replace
- Detailed conflict information
- Manual resolution controls

## Best Practices

### Before Going Offline
1. **Sync recent data** - Ensure latest product info
2. **Check queue** - Clear any pending items
3. **Download updates** - Get latest product catalog
4. **Charge device** - Offline mode uses more battery

### While Offline
1. **Monitor queue size** - Don't let it get too large
2. **Regular saves** - App saves automatically
3. **Check timestamps** - Ensure accurate timing
4. **Battery management** - Use power saving mode

### After Reconnecting
1. **Wait for sync** - Don't close app during sync
2. **Verify uploads** - Check sync completion
3. **Resolve conflicts** - Handle any duplicates
4. **Update cache** - Refresh product database

## Troubleshooting

### Sync Failures
- Check internet connection stability
- Clear app cache if needed
- Retry individual failed items
- Contact support for persistent issues

### Queue Errors
- Restart app to refresh queue
- Check device storage space
- Verify data integrity
- Export queue data as backup

### Performance Issues
- Limit queue size to under 1000 items
- Regular sync prevents large queues
- Clear old cached data
- Update app for improvements

## Storage Limits

### Local Storage
- 50MB for cached products
- 10MB for queued scans
- 5MB for user preferences
- Automatic cleanup after sync

### Queue Management
- Maximum 1000 pending items
- Oldest items expire after 7 days
- Priority sync for recent items
- Export options for large queues

With offline mode, you can work confidently anywhere in your warehouse!
`;
  }

  // Additional helper methods...
  private async scanAPIRoutes(): Promise<string[]> {
    // Implementation to scan API route files
    return [];
  }

  private async extractEndpointInfo(routes: string[]): Promise<APIEndpoint[]> {
    // Implementation to extract endpoint information from route files
    return [];
  }

  private generateOpenAPISpec(endpoints: APIEndpoint[]): any {
    return {
      openapi: '3.0.0',
      info: {
        title: 'ScanStock Pro API',
        version: '1.0.0',
        description: 'Mobile-first inventory management API',
      },
      servers: [
        { url: 'https://api.scanstockpro.com', description: 'Production' },
        { url: 'https://staging-api.scanstockpro.com', description: 'Staging' },
      ],
      paths: {}, // Would be populated with endpoints
    };
  }

  private generateAPIMarkdown(endpoints: APIEndpoint[]): string {
    return '# API Documentation\n\nGenerated API documentation...';
  }

  private generateInteractiveDocs(endpoints: APIEndpoint[]): string {
    return '<html><!-- Interactive API documentation --></html>';
  }

  private yamlStringify(obj: any): string {
    return JSON.stringify(obj, null, 2); // Simplified YAML conversion
  }

  private async writeDocumentationFiles(files: { [filename: string]: string }): Promise<void> {
    for (const [filename, content] of Object.entries(files)) {
      const fullPath = path.join(this.outputDir, filename);
      const dir = path.dirname(fullPath);
      
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(fullPath, content, 'utf-8');
    }
  }

  private formatUserGuide(guide: UserGuide): string {
    return `---
title: ${guide.title}
category: ${guide.category}
last_updated: ${guide.lastUpdated.toISOString()}
images: ${JSON.stringify(guide.images || [])}
videos: ${JSON.stringify(guide.videos || [])}
---

${guide.content}
`;
  }

  private generateUserGuideIndex(guides: UserGuide[]): string {
    const categories = guides.reduce((acc, guide) => {
      if (!acc[guide.category]) acc[guide.category] = [];
      acc[guide.category].push(guide);
      return acc;
    }, {} as { [key: string]: UserGuide[] });

    let index = '# User Guides\n\n';
    
    for (const [category, categoryGuides] of Object.entries(categories)) {
      index += `## ${category.charAt(0).toUpperCase() + category.slice(1).replace('-', ' ')}\n\n`;
      
      for (const guide of categoryGuides) {
        const filename = `${guide.title.toLowerCase().replace(/\s+/g, '-')}.md`;
        index += `- [${guide.title}](./${category}/${filename})\n`;
      }
      
      index += '\n';
    }
    
    return index;
  }

  // Additional documentation generation methods...
  private generateDeveloperOverview(): string { return '# Developer Overview'; }
  private generateArchitectureDoc(): string { return '# Architecture'; }
  private generateSetupInstructions(): string { return '# Setup Instructions'; }
  private generateAPIIntegrationGuide(): string { return '# API Integration'; }
  private generateMobileTestingGuide(): string { return '# Mobile Testing'; }
  private generateSecurityGuidelines(): string { return '# Security Guidelines'; }
  private generatePerformanceGuide(): string { return '# Performance Guide'; }
  private generateContributingGuide(): string { return '# Contributing Guide'; }
  private generateCollaborationGuide(): string { return '# Collaboration Guide'; }
  private generateAIGuide(): string { return '# AI Recognition Guide'; }
  private generateTroubleshootingGuide(): string { return '# Troubleshooting'; }
  private getNginxConfig(): string { return 'nginx configuration'; }
  private getDockerComposeConfig(): string { return 'docker-compose configuration'; }
  private getKubernetesConfig(): string { return 'kubernetes configuration'; }
}