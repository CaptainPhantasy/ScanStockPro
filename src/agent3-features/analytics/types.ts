// Analytics and insights types

export interface DashboardMetrics {
  totalValue: number;
  totalValueChange: {
    value: number;
    percentage: number;
    period: 'day' | 'week' | 'month';
  };
  uniqueProducts: number;
  uniqueProductsChange: {
    value: number;
    percentage: number;
  };
  lowStockItems: number;
  outOfStockItems: number;
  turnoverRate: number;
  topMovers: TopMovingProduct[];
  predictions: DemandPrediction[];
  alertsSummary: AlertsSummary;
  activitySummary: ActivitySummary;
}

export interface TopMovingProduct {
  productId: string;
  productName: string;
  category: string;
  velocity: number; // units per day
  trend: 'increasing' | 'decreasing' | 'stable';
  changePercentage: number;
  revenue: number;
  margin: number;
}

export interface DemandPrediction {
  productId: string;
  productName: string;
  predictedDemand: number;
  confidence: number;
  timeHorizon: number; // days
  seasonality: SeasonalityData;
  recommendedAction: 'reorder' | 'reduce_stock' | 'monitor' | 'discontinue';
  reasoning: string;
}

export interface SeasonalityData {
  pattern: 'weekly' | 'monthly' | 'seasonal' | 'none';
  peakPeriods: string[];
  lowPeriods: string[];
  amplitude: number; // how much variation
}

export interface AlertsSummary {
  critical: number;
  high: number;
  medium: number;
  low: number;
  trending: Array<{
    type: string;
    count: number;
    trend: 'up' | 'down' | 'stable';
  }>;
}

export interface ActivitySummary {
  countsToday: number;
  countsThisWeek: number;
  activeUsers: number;
  activeSessions: number;
  averageSessionDuration: number;
  efficiency: EfficiencyMetrics;
}

export interface EfficiencyMetrics {
  countsPerHour: number;
  accuracyRate: number;
  discrepancyRate: number;
  completionRate: number;
}

// AI-powered insights
export interface Insight {
  id: string;
  type: InsightType;
  title: string;
  description: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  category: InsightCategory;
  data: any;
  actionable: boolean;
  recommendedActions: RecommendedAction[];
  generatedAt: Date;
  expiresAt?: Date;
  metadata: {
    aiModel: string;
    dataPoints: number;
    timeRange: string;
    businessContext: string;
  };
}

export type InsightType = 
  | 'slow_mover_detected'
  | 'stockout_prediction'
  | 'seasonal_opportunity'
  | 'inventory_imbalance'
  | 'cost_optimization'
  | 'demand_spike'
  | 'dead_stock'
  | 'reorder_optimization'
  | 'margin_improvement'
  | 'category_trend';

export type InsightCategory = 
  | 'inventory_optimization'
  | 'cost_management'
  | 'demand_forecasting'
  | 'operational_efficiency'
  | 'revenue_opportunity'
  | 'risk_management';

export interface RecommendedAction {
  action: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  estimatedImpact: {
    metric: string;
    change: number;
    timeframe: string;
  };
  difficulty: 'easy' | 'medium' | 'hard';
  cost: 'low' | 'medium' | 'high';
}

// Trend analysis
export interface TrendAnalysis {
  productId: string;
  period: 'week' | 'month' | 'quarter' | 'year';
  trend: TrendData;
  seasonality: SeasonalityData;
  forecast: ForecastData;
  anomalies: AnomalyDetection[];
  insights: string[];
}

export interface TrendData {
  direction: 'upward' | 'downward' | 'stable' | 'volatile';
  strength: number; // 0-1, how strong the trend is
  confidence: number; // 0-1, statistical confidence
  changeRate: number; // rate of change per period
  correlation: number; // -1 to 1, correlation with overall market
  volatility: number; // measure of variation
}

export interface ForecastData {
  predictions: Array<{
    date: Date;
    predicted: number;
    upperBound: number;
    lowerBound: number;
    confidence: number;
  }>;
  accuracy: {
    mae: number; // Mean Absolute Error
    mape: number; // Mean Absolute Percentage Error
    rmse: number; // Root Mean Square Error
  };
  model: string;
  trainingPeriod: string;
}

export interface AnomalyDetection {
  date: Date;
  actualValue: number;
  expectedValue: number;
  deviation: number;
  severity: 'minor' | 'moderate' | 'severe';
  possibleCauses: string[];
  confidence: number;
}

// Report generation
export interface Report {
  id: string;
  type: ReportType;
  title: string;
  businessId: string;
  generatedBy: string;
  generatedAt: Date;
  period: {
    start: Date;
    end: Date;
  };
  format: 'pdf' | 'excel' | 'csv' | 'json';
  data: any;
  fileUrl?: string;
  status: 'generating' | 'completed' | 'failed';
  metadata: {
    recordCount: number;
    filtersCriteria: any;
    executionTime: number;
  };
}

export type ReportType = 
  | 'inventory_summary'
  | 'movement_analysis'
  | 'discrepancy_report'
  | 'abc_analysis'
  | 'slow_moving_stock'
  | 'turnover_analysis'
  | 'cost_analysis'
  | 'demand_forecast'
  | 'cycle_count_summary'
  | 'variance_report';

export interface ReportTemplate {
  id: string;
  name: string;
  type: ReportType;
  description: string;
  defaultPeriod: string;
  defaultFilters: any;
  sections: ReportSection[];
  scheduling: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    recipients: string[];
  };
}

export interface ReportSection {
  id: string;
  title: string;
  type: 'chart' | 'table' | 'summary' | 'text' | 'insight';
  config: any;
  dataSource: string;
  filters?: any;
}

// Advanced analytics
export interface ABCAnalysis {
  productId: string;
  productName: string;
  category: 'A' | 'B' | 'C';
  revenue: number;
  revenuePercentage: number;
  cumulativePercentage: number;
  units: number;
  turnoverRate: number;
  profitMargin: number;
  classification: {
    reason: string;
    recommendation: string;
    managementStrategy: string;
  };
}

export interface CohortAnalysis {
  cohortId: string;
  cohortName: string;
  products: string[];
  acquisitionPeriod: Date;
  retentionData: Array<{
    period: number;
    retainedProducts: number;
    retentionRate: number;
    averageValue: number;
  }>;
  insights: string[];
}

export interface MarketBasketAnalysis {
  rules: AssociationRule[];
  frequentItemsets: Array<{
    items: string[];
    support: number;
    frequency: number;
  }>;
  crossSellingOpportunities: Array<{
    baseProduct: string;
    suggestedProduct: string;
    confidence: number;
    lift: number;
    expectedIncrease: number;
  }>;
}

export interface AssociationRule {
  antecedent: string[];
  consequent: string[];
  support: number;
  confidence: number;
  lift: number;
  conviction: number;
  interpretation: string;
}

// Performance tracking
export interface KPIMetrics {
  businessId: string;
  period: {
    start: Date;
    end: Date;
  };
  inventory: InventoryKPIs;
  operational: OperationalKPIs;
  financial: FinancialKPIs;
  quality: QualityKPIs;
}

export interface InventoryKPIs {
  inventoryTurnover: number;
  daysInventoryOutstanding: number;
  stockoutRate: number;
  fillRate: number;
  carryingCost: number;
  deadStockPercentage: number;
  inventoryAccuracy: number;
  averageAge: number;
}

export interface OperationalKPIs {
  countsPerDay: number;
  cycleCountAccuracy: number;
  timePerCount: number;
  userProductivity: number;
  sessionCompletionRate: number;
  discrepancyResolutionTime: number;
  systemUptime: number;
  responseTime: number;
}

export interface FinancialKPIs {
  totalInventoryValue: number;
  inventoryValueChange: number;
  costOfGoodsSold: number;
  grossMargin: number;
  inventoryWriteOffs: number;
  shrinkage: number;
  roi: number;
  profitability: number;
}

export interface QualityKPIs {
  countAccuracy: number;
  dataQuality: number;
  discrepancyRate: number;
  errorRate: number;
  completeness: number;
  timeliness: number;
  consistency: number;
  validationErrors: number;
}

// Benchmarking
export interface BenchmarkData {
  businessId: string;
  industry: string;
  businessSize: 'small' | 'medium' | 'large';
  metrics: KPIMetrics;
  benchmarks: {
    industryAverage: Partial<KPIMetrics>;
    topQuartile: Partial<KPIMetrics>;
    peerComparison: PeerComparison[];
  };
  gaps: Array<{
    metric: string;
    currentValue: number;
    benchmarkValue: number;
    gap: number;
    priority: 'high' | 'medium' | 'low';
    improvementSuggestions: string[];
  }>;
}

export interface PeerComparison {
  peerId: string; // Anonymized
  industry: string;
  size: string;
  metrics: Partial<KPIMetrics>;
  anonymizedName: string;
}

// Time series data
export interface TimeSeriesData {
  metric: string;
  productId?: string;
  businessId: string;
  dataPoints: TimeSeriesPoint[];
  aggregation: 'hourly' | 'daily' | 'weekly' | 'monthly';
  metadata: {
    source: string;
    quality: number;
    completeness: number;
  };
}

export interface TimeSeriesPoint {
  timestamp: Date;
  value: number;
  metadata?: Record<string, any>;
}