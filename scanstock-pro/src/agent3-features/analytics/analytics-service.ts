import { Foundation_To_Features, ProductRepository, InventoryRepository, ProductSchema } from '../../shared/contracts/agent-interfaces';
import { OpenAIService } from '../ai-recognition/openai-service';
import {
  DashboardMetrics,
  Insight,
  InsightType,
  TrendAnalysis,
  Report,
  ReportType,
  ABCAnalysis,
  KPIMetrics,
  TimeSeriesData,
  DemandPrediction,
  TopMovingProduct,
  BenchmarkData
} from './types';

export class AnalyticsService {
  constructor(
    private foundation: Foundation_To_Features,
    private productRepo: ProductRepository,
    private inventoryRepo: InventoryRepository,
    private openaiService: OpenAIService
  ) {}

  // Real-time dashboard metrics
  async getDashboardMetrics(businessId: string): Promise<DashboardMetrics> {
    const [inventory, trends, alerts, activity] = await Promise.all([
      this.getInventoryMetrics(businessId),
      this.getTrendAnalysis(businessId),
      this.getActiveAlerts(businessId),
      this.getActivitySummary(businessId)
    ]);

    return {
      totalValue: inventory.totalValue,
      totalValueChange: inventory.totalValueChange,
      uniqueProducts: inventory.uniqueProducts,
      uniqueProductsChange: inventory.uniqueProductsChange,
      lowStockItems: alerts.lowStock,
      outOfStockItems: alerts.outOfStock,
      turnoverRate: trends.averageTurnoverRate,
      topMovers: trends.topProducts,
      predictions: await this.generateDemandPredictions(businessId, 10),
      alertsSummary: alerts.summary,
      activitySummary: activity
    };
  }

  // AI-powered insights generation
  async generateInsights(businessId: string): Promise<Insight[]> {
    const [historicalData, currentMetrics, marketData] = await Promise.all([
      this.getHistoricalData(businessId, 90), // 90 days
      this.getCurrentMetrics(businessId),
      this.getMarketContext(businessId)
    ]);

    const insights: Insight[] = [];

    // Generate different types of insights
    const [slowMovers, stockoutPredictions, seasonalOpportunities, costOptimizations] = await Promise.all([
      this.analyzeSlowMovers(historicalData),
      this.predictStockouts(historicalData, currentMetrics),
      this.identifySeasonality(historicalData),
      this.analyzeCostOptimization(historicalData, currentMetrics)
    ]);

    insights.push(...slowMovers, ...stockoutPredictions, ...seasonalOpportunities, ...costOptimizations);

    // Use AI for advanced pattern recognition
    const aiInsights = await this.generateAIInsights(businessId, historicalData, currentMetrics);
    insights.push(...aiInsights);

    // Filter by confidence threshold and relevance
    return insights
      .filter(insight => insight.confidence > 0.7)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 20); // Top 20 insights
  }

  // Advanced AI insights using OpenAI
  private async generateAIInsights(
    businessId: string,
    historicalData: any,
    currentMetrics: any
  ): Promise<Insight[]> {
    try {
      await this.openaiService.initialize(businessId);

      const prompt = this.buildInsightsPrompt(historicalData, currentMetrics);
      
      // Use OpenAI to generate insights
      const response = await this.callOpenAIForInsights(prompt);
      
      return this.parseAIInsights(response);
    } catch (error) {
      console.warn('AI insights generation failed, using fallback analysis:', error);
      return this.generateFallbackInsights(historicalData, currentMetrics);
    }
  }

  // Trend analysis with forecasting
  async analyzeTrends(
    productId: string,
    period: 'week' | 'month' | 'quarter' = 'month'
  ): Promise<TrendAnalysis> {
    const timeRange = this.getTimeRange(period);
    const history = await this.inventoryRepo.getHistory(productId, timeRange.days);
    const product = await this.productRepo.findById(productId);

    if (!product || history.length < 7) {
      throw new Error('Insufficient data for trend analysis');
    }

    // Calculate trend direction and strength
    const trendData = this.calculateTrend(history);
    
    // Detect seasonality patterns
    const seasonality = this.detectSeasonality(history);
    
    // Generate forecast
    const forecast = await this.generateForecast(history, 30); // 30 days ahead
    
    // Detect anomalies
    const anomalies = this.detectAnomalies(history);
    
    // Generate insights
    const insights = await this.generateTrendInsights(product, trendData, seasonality, forecast);

    return {
      productId,
      period,
      trend: trendData,
      seasonality,
      forecast,
      anomalies,
      insights
    };
  }

  // Demand predictions with ML
  async generateDemandPredictions(
    businessId: string,
    limit: number = 50
  ): Promise<DemandPrediction[]> {
    const products = await this.getTopProducts(businessId, limit);
    const predictions: DemandPrediction[] = [];

    for (const product of products) {
      try {
        const history = await this.inventoryRepo.getHistory(product.id, 90);
        const seasonality = this.detectSeasonality(history);
        const baselineDemand = this.calculateBaselineDemand(history);
        const seasonalAdjustment = this.calculateSeasonalAdjustment(seasonality);
        
        const predictedDemand = Math.round(baselineDemand * seasonalAdjustment);
        const confidence = this.calculatePredictionConfidence(history, seasonality);
        
        // Determine recommended action
        const currentStock = history[0]?.quantity || 0;
        const recommendedAction = this.getRecommendedAction(currentStock, predictedDemand, product);
        
        predictions.push({
          productId: product.id,
          productName: product.name,
          predictedDemand,
          confidence,
          timeHorizon: 30,
          seasonality,
          recommendedAction,
          reasoning: this.generateReasoningText(recommendedAction, currentStock, predictedDemand)
        });
      } catch (error) {
        console.warn(`Failed to generate prediction for product ${product.id}:`, error);
      }
    }

    return predictions.sort((a, b) => b.confidence - a.confidence);
  }

  // ABC Analysis
  async performABCAnalysis(businessId: string): Promise<ABCAnalysis[]> {
    const products = await this.getProductsWithRevenue(businessId);
    
    // Sort by revenue descending
    products.sort((a, b) => b.revenue - a.revenue);
    
    const totalRevenue = products.reduce((sum, p) => sum + p.revenue, 0);
    let cumulativeRevenue = 0;
    
    return products.map(product => {
      cumulativeRevenue += product.revenue;
      const cumulativePercentage = (cumulativeRevenue / totalRevenue) * 100;
      
      let category: 'A' | 'B' | 'C';
      let managementStrategy: string;
      
      if (cumulativePercentage <= 80) {
        category = 'A';
        managementStrategy = 'Tight control, frequent reviews, close supplier relationships';
      } else if (cumulativePercentage <= 95) {
        category = 'B';
        managementStrategy = 'Moderate control, periodic reviews, economic order quantities';
      } else {
        category = 'C';
        managementStrategy = 'Simple controls, annual reviews, large order quantities';
      }

      return {
        productId: product.id,
        productName: product.name,
        category,
        revenue: product.revenue,
        revenuePercentage: (product.revenue / totalRevenue) * 100,
        cumulativePercentage,
        units: product.units,
        turnoverRate: product.turnoverRate,
        profitMargin: product.profitMargin,
        classification: {
          reason: `${category} items represent ${category === 'A' ? '80%' : category === 'B' ? '15%' : '5%'} of revenue`,
          recommendation: this.getABCRecommendation(category, product),
          managementStrategy
        }
      };
    });
  }

  // Report generation
  async generateReport(
    businessId: string,
    type: ReportType,
    format: 'pdf' | 'excel' | 'csv' | 'json' = 'pdf',
    options: {
      startDate?: Date;
      endDate?: Date;
      productIds?: string[];
      categories?: string[];
    } = {}
  ): Promise<Report> {
    const report: Report = {
      id: this.generateId(),
      type,
      title: this.getReportTitle(type),
      businessId,
      generatedBy: 'system', // Would be actual user ID
      generatedAt: new Date(),
      period: {
        start: options.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: options.endDate || new Date()
      },
      format,
      data: null,
      status: 'generating',
      metadata: {
        recordCount: 0,
        filtersCriteria: options,
        executionTime: 0
      }
    };

    const startTime = Date.now();

    try {
      // Generate report data based on type
      report.data = await this.generateReportData(type, businessId, options);
      report.metadata.recordCount = this.getRecordCount(report.data);
      
      // Format the data
      if (format !== 'json') {
        report.fileUrl = await this.formatReportData(report.data, format, type);
      }
      
      report.status = 'completed';
      report.metadata.executionTime = Date.now() - startTime;
      
    } catch (error) {
      report.status = 'failed';
      console.error('Report generation failed:', error);
    }

    await this.saveReport(report);
    return report;
  }

  // KPI tracking
  async calculateKPIs(businessId: string, period?: { start: Date; end: Date }): Promise<KPIMetrics> {
    const defaultPeriod = {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: new Date()
    };
    
    const actualPeriod = period || defaultPeriod;
    
    const [inventory, operational, financial, quality] = await Promise.all([
      this.calculateInventoryKPIs(businessId, actualPeriod),
      this.calculateOperationalKPIs(businessId, actualPeriod),
      this.calculateFinancialKPIs(businessId, actualPeriod),
      this.calculateQualityKPIs(businessId, actualPeriod)
    ]);

    return {
      businessId,
      period: actualPeriod,
      inventory,
      operational,
      financial,
      quality
    };
  }

  // Benchmarking
  async getBenchmarkData(businessId: string): Promise<BenchmarkData> {
    const business = await this.getBusinessInfo(businessId);
    const metrics = await this.calculateKPIs(businessId);
    
    // Get industry benchmarks (this would typically come from a benchmarking service)
    const industryBenchmarks = await this.getIndustryBenchmarks(business.industry, business.size);
    const peerComparisons = await this.getPeerComparisons(business.industry, business.size);
    
    const gaps = this.identifyPerformanceGaps(metrics, industryBenchmarks);

    return {
      businessId,
      industry: business.industry,
      businessSize: business.size,
      metrics,
      benchmarks: {
        industryAverage: industryBenchmarks.average,
        topQuartile: industryBenchmarks.topQuartile,
        peerComparison: peerComparisons
      },
      gaps
    };
  }

  // Private helper methods
  private async getInventoryMetrics(businessId: string) {
    // Implementation would query actual inventory data
    return {
      totalValue: 150000,
      totalValueChange: { value: 5000, percentage: 3.4, period: 'month' as const },
      uniqueProducts: 1250,
      uniqueProductsChange: { value: 25, percentage: 2.0 }
    };
  }

  private async getTrendAnalysis(businessId: string) {
    return {
      averageTurnoverRate: 4.2,
      topProducts: [] as TopMovingProduct[]
    };
  }

  private async getActiveAlerts(businessId: string) {
    return {
      lowStock: 15,
      outOfStock: 3,
      summary: {
        critical: 3,
        high: 15,
        medium: 8,
        low: 2,
        trending: [
          { type: 'low_stock', count: 15, trend: 'up' as const }
        ]
      }
    };
  }

  private async getActivitySummary(businessId: string) {
    return {
      countsToday: 45,
      countsThisWeek: 312,
      activeUsers: 8,
      activeSessions: 2,
      averageSessionDuration: 45,
      efficiency: {
        countsPerHour: 12,
        accuracyRate: 0.98,
        discrepancyRate: 0.02,
        completionRate: 0.95
      }
    };
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Placeholder implementations - would be expanded with actual algorithms
  private async getHistoricalData(businessId: string, days: number): Promise<any> { return {}; }
  private async getCurrentMetrics(businessId: string): Promise<any> { return {}; }
  private async getMarketContext(businessId: string): Promise<any> { return {}; }
  private async analyzeSlowMovers(data: any): Promise<Insight[]> { return []; }
  private async predictStockouts(historical: any, current: any): Promise<Insight[]> { return []; }
  private async identifySeasonality(data: any): Promise<Insight[]> { return []; }
  private async analyzeCostOptimization(historical: any, current: any): Promise<Insight[]> { return []; }
  private buildInsightsPrompt(historical: any, current: any): string { return ''; }
  private async callOpenAIForInsights(prompt: string): Promise<any> { return {}; }
  private parseAIInsights(response: any): Insight[] { return []; }
  private generateFallbackInsights(historical: any, current: any): Insight[] { return []; }
  private getTimeRange(period: string): { days: number } { return { days: 30 }; }
  private calculateTrend(history: any[]): any { return {}; }
  private detectSeasonality(history: any[]): any { return {}; }
  private async generateForecast(history: any[], days: number): Promise<any> { return {}; }
  private detectAnomalies(history: any[]): any[] { return []; }
  private async generateTrendInsights(product: any, trend: any, seasonality: any, forecast: any): Promise<string[]> { return []; }
  private async getTopProducts(businessId: string, limit: number): Promise<ProductSchema[]> { return []; }
  private calculateBaselineDemand(history: any[]): number { return 0; }
  private calculateSeasonalAdjustment(seasonality: any): number { return 1; }
  private calculatePredictionConfidence(history: any[], seasonality: any): number { return 0.8; }
  private getRecommendedAction(current: number, predicted: number, product: any): any { return 'monitor'; }
  private generateReasoningText(action: any, current: number, predicted: number): string { return ''; }
  private async getProductsWithRevenue(businessId: string): Promise<any[]> { return []; }
  private getABCRecommendation(category: string, product: any): string { return ''; }
  private getReportTitle(type: ReportType): string { return type.replace(/_/g, ' ').toUpperCase(); }
  private async generateReportData(type: ReportType, businessId: string, options: any): Promise<any> { return {}; }
  private getRecordCount(data: any): number { return 0; }
  private async formatReportData(data: any, format: string, type: ReportType): Promise<string> { return ''; }
  private async saveReport(report: Report): Promise<void> {}
  private async calculateInventoryKPIs(businessId: string, period: any): Promise<any> { return {}; }
  private async calculateOperationalKPIs(businessId: string, period: any): Promise<any> { return {}; }
  private async calculateFinancialKPIs(businessId: string, period: any): Promise<any> { return {}; }
  private async calculateQualityKPIs(businessId: string, period: any): Promise<any> { return {}; }
  private async getBusinessInfo(businessId: string): Promise<any> { return {}; }
  private async getIndustryBenchmarks(industry: string, size: string): Promise<any> { return {}; }
  private async getPeerComparisons(industry: string, size: string): Promise<any[]> { return []; }
  private identifyPerformanceGaps(metrics: any, benchmarks: any): any[] { return []; }
}