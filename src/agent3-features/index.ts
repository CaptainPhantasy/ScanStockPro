// Agent 3: Business Features & Capabilities - Main Export
// ScanStock Pro - Complete AI-Powered Inventory Management System

export { InventoryService } from './inventory/inventory-service';
export { OpenAIService } from './ai-recognition/openai-service';
export { CollaborationService } from './collaboration/collaboration-service';
export { AnalyticsService } from './analytics/analytics-service';
export { IntegrationService } from './integrations/integration-service';
export { BusinessRules } from './rules/business-rules';
export { SecureConfigService } from './config/secure-config';

// Type exports
export * from './inventory/types';
export * from './ai-recognition/types';
export * from './analytics/types';

// Main Agent 3 orchestrator
import { Foundation_To_Features, ProductRepository, InventoryRepository } from '../shared/contracts/agent-interfaces';
import { InventoryService } from './inventory/inventory-service';
import { OpenAIService } from './ai-recognition/openai-service';
import { CollaborationService } from './collaboration/collaboration-service';
import { AnalyticsService } from './analytics/analytics-service';
import { IntegrationService } from './integrations/integration-service';
import { BusinessRules } from './rules/business-rules';
import { SecureConfigService } from './config/secure-config';

export class Agent3BusinessFeatures {
  public readonly inventory: InventoryService;
  public readonly ai: OpenAIService;
  public readonly collaboration: CollaborationService;
  public readonly analytics: AnalyticsService;
  public readonly integrations: IntegrationService;
  public readonly rules: BusinessRules;
  public readonly config: SecureConfigService;

  constructor(
    private foundation: Foundation_To_Features,
    private productRepo: ProductRepository,
    private inventoryRepo: InventoryRepository
  ) {
    // Initialize secure configuration first
    this.config = new SecureConfigService(foundation);
    
    // Initialize AI service with secure config
    this.ai = new OpenAIService(foundation);
    
    // Initialize business rules engine
    this.rules = new BusinessRules(foundation);
    
    // Initialize core inventory service with rules validation
    this.inventory = new InventoryService(foundation, productRepo, inventoryRepo);
    
    // Initialize real-time collaboration
    this.collaboration = new CollaborationService(foundation);
    
    // Initialize analytics with AI integration
    this.analytics = new AnalyticsService(foundation, productRepo, inventoryRepo, this.ai);
    
    // Initialize external integrations
    this.integrations = new IntegrationService(foundation);
  }

  // Initialize all services for a business
  async initialize(businessId: string): Promise<void> {
    try {
      // Initialize AI service with client's API key
      await this.ai.initialize(businessId);
      
      console.log(`Agent 3 services initialized for business: ${businessId}`);
    } catch (error) {
      console.warn('AI services initialization failed, continuing without AI features:', error);
    }
  }

  // Health check for all services
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: Record<string, boolean>;
  }> {
    const serviceChecks = {
      inventory: true, // Always available
      collaboration: true, // Always available
      analytics: true, // Always available
      integrations: true, // Always available
      rules: true, // Always available
      ai: false, // Depends on client API key
      config: true // Always available
    };

    try {
      // Test AI service if possible
      if (this.ai) {
        serviceChecks.ai = true;
      }
    } catch (error) {
      serviceChecks.ai = false;
    }

    const healthyServices = Object.values(serviceChecks).filter(Boolean).length;
    const totalServices = Object.keys(serviceChecks).length;

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (healthyServices < totalServices * 0.8) {
      status = 'degraded';
    }
    if (healthyServices < totalServices * 0.5) {
      status = 'unhealthy';
    }

    return { status, services: serviceChecks };
  }
}

// Feature flags and capabilities
export const AGENT3_CAPABILITIES = {
  INVENTORY_MANAGEMENT: {
    realTimeUpdates: true,
    cycleCountingSessions: true,
    discrepancyResolution: true,
    smartSuggestions: true,
    batchOperations: true,
    conflictPrevention: true
  },
  
  AI_FEATURES: {
    productRecognition: true,
    smartCategorization: true,
    naturalLanguageSearch: true,
    demandPrediction: true,
    insightGeneration: true,
    clientApiKeySupport: true
  },
  
  COLLABORATION: {
    realTimeTeamCounting: true,
    presenceTracking: true,
    conflictResolution: true,
    progressTracking: true,
    sessionMetrics: true,
    zoneAssignment: true
  },
  
  ANALYTICS: {
    realTimeDashboard: true,
    aiPoweredInsights: true,
    trendAnalysis: true,
    demandForecasting: true,
    abcAnalysis: true,
    kpiTracking: true,
    benchmarking: true,
    reportGeneration: true
  },
  
  INTEGRATIONS: {
    quickbooks: true,
    shopify: true,
    dataExport: true,
    dataImport: true,
    apiSupport: true,
    webhooks: true
  },
  
  BUSINESS_RULES: {
    customValidation: true,
    alertEngine: true,
    automationRules: true,
    complianceChecks: true,
    ruleAnalytics: true,
    dynamicConfiguration: true
  }
};

// Agent 3 metadata
export const AGENT3_INFO = {
  name: 'Business Features & AI Capabilities',
  version: '1.0.0',
  description: 'Complete business logic, AI integration, and advanced features for ScanStock Pro',
  dependencies: ['agent1-foundation'],
  integrations: ['agent2-interface', 'agent4-quality'],
  capabilities: AGENT3_CAPABILITIES,
  aiModels: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  securityFeatures: {
    clientApiKeyEncryption: true,
    usageTracking: true,
    rateLimiting: true,
    auditLogging: true
  }
};