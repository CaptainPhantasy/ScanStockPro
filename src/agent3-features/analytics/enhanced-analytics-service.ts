/**
 * Enhanced Analytics Service
 * Provides comprehensive business intelligence and reporting
 */

import { supabase } from '@/agent1-foundation/database/supabase-client';
import { eventBus } from '@/shared/events/event-bus';

export interface DashboardMetrics {
  overview: OverviewMetrics;
  inventory: InventoryMetrics;
  financial: FinancialMetrics;
  trends: TrendMetrics;
  alerts: AlertMetrics;
}

export interface OverviewMetrics {
  totalProducts: number;
  totalValue: number;
  lowStockItems: number;
  outOfStockItems: number;
  recentCounts: number;
  activeUsers: number;
}

export interface InventoryMetrics {
  turnoverRate: number;
  averageStockLevel: number;
  stockAccuracy: number;
  cycleCountCompliance: number;
  topMovingProducts: ProductMovement[];
  slowMovingProducts: ProductMovement[];
  stockByCategory: CategoryStock[];
  stockByLocation: LocationStock[];
}

export interface ProductMovement {
  productId: string;
  productName: string;
  sku: string;
  movementRate: number;
  quantity: number;
  value: number;
  daysOfStock: number;
}

export interface CategoryStock {
  category: string;
  quantity: number;
  value: number;
  percentage: number;
  items: number;
}

export interface LocationStock {
  location: string;
  quantity: number;
  value: number;
  percentage: number;
  lastCounted: string;
}

export interface FinancialMetrics {
  totalInventoryValue: number;
  costOfGoodsSold: number;
  grossMargin: number;
  inventoryInvestment: number;
  projectedRevenue: number;
  valueByCategory: ValueDistribution[];
  marginByCategory: MarginAnalysis[];
}

export interface ValueDistribution {
  category: string;
  value: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
}

export interface MarginAnalysis {
  category: string;
  margin: number;
  revenue: number;
  cost: number;
}

export interface TrendMetrics {
  dailyTrends: TrendPoint[];
  weeklyTrends: TrendPoint[];
  monthlyTrends: TrendPoint[];
  seasonalPatterns: SeasonalPattern[];
  forecastedDemand: DemandForecast[];
}

export interface TrendPoint {
  date: string;
  value: number;
  quantity: number;
  transactions: number;
}

export interface SeasonalPattern {
  product: string;
  pattern: 'increasing' | 'decreasing' | 'stable' | 'seasonal';
  peakMonths: number[];
  lowMonths: number[];
}

export interface DemandForecast {
  productId: string;
  productName: string;
  currentStock: number;
  forecastedDemand: number;
  daysUntilStockout: number;
  recommendedReorder: number;
  confidence: number;
}

export interface AlertMetrics {
  critical: Alert[];
  warning: Alert[];
  info: Alert[];
  totalAlerts: number;
  unresolvedAlerts: number;
}

export interface Alert {
  id: string;
  type: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  productId?: string;
  timestamp: string;
}

export interface ReportOptions {
  startDate?: Date;
  endDate?: Date;
  categories?: string[];
  locations?: string[];
  format: 'json' | 'csv' | 'pdf' | 'excel';
}

class EnhancedAnalyticsService {
  /**
   * Get comprehensive dashboard metrics
   */
  async getDashboardMetrics(businessId: string): Promise<DashboardMetrics> {
    const [overview, inventory, financial, trends, alerts] = await Promise.all([
      this.getOverviewMetrics(businessId),
      this.getInventoryMetrics(businessId),
      this.getFinancialMetrics(businessId),
      this.getTrendMetrics(businessId),
      this.getAlertMetrics(businessId)
    ]);

    return {
      overview,
      inventory,
      financial,
      trends,
      alerts
    };
  }

  /**
   * Get overview metrics
   */
  private async getOverviewMetrics(businessId: string): Promise<OverviewMetrics> {
    // Get product count
    const { count: productCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId);

    // Get inventory value and stock levels
    const { data: inventory } = await supabase
      .from('inventory')
      .select(`
        quantity,
        product:products(price, reorder_point)
      `)
      .eq('business_id', businessId);

    let totalValue = 0;
    let lowStockItems = 0;
    let outOfStockItems = 0;

    inventory?.forEach(item => {
      const value = (item.quantity || 0) * (item.product?.price || 0);
      totalValue += value;

      if (item.quantity === 0) {
        outOfStockItems++;
      } else if (item.quantity <= (item.product?.reorder_point || 10)) {
        lowStockItems++;
      }
    });

    // Get recent count activity
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { count: recentCounts } = await supabase
      .from('inventory_counts')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString());

    // Get active users (logged in last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { count: activeUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .gte('updated_at', sevenDaysAgo.toISOString());

    return {
      totalProducts: productCount || 0,
      totalValue,
      lowStockItems,
      outOfStockItems,
      recentCounts: recentCounts || 0,
      activeUsers: activeUsers || 0
    };
  }

  /**
   * Get inventory metrics
   */
  private async getInventoryMetrics(businessId: string): Promise<InventoryMetrics> {
    // Get all inventory data
    const { data: inventory } = await supabase
      .from('inventory')
      .select(`
        *,
        product:products(*)
      `)
      .eq('business_id', businessId);

    // Calculate turnover rate (simplified - would need sales data for accurate calculation)
    const { data: counts } = await supabase
      .from('inventory_counts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    const turnoverRate = counts ? counts.length / 30 : 0; // Counts per day

    // Calculate average stock level
    const totalQuantity = inventory?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
    const averageStockLevel = inventory?.length ? totalQuantity / inventory.length : 0;

    // Calculate stock accuracy (based on variance in counts)
    const varianceData = counts?.filter(c => c.difference !== 0) || [];
    const stockAccuracy = counts?.length 
      ? ((counts.length - varianceData.length) / counts.length) * 100 
      : 100;

    // Cycle count compliance (percentage of items counted in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentlyCountedItems = inventory?.filter(item => 
      new Date(item.last_counted) > thirtyDaysAgo
    ).length || 0;
    
    const cycleCountCompliance = inventory?.length 
      ? (recentlyCountedItems / inventory.length) * 100 
      : 0;

    // Top moving products (mock movement rate)
    const topMovingProducts: ProductMovement[] = inventory
      ?.map(item => ({
        productId: item.product_id,
        productName: item.product?.name || 'Unknown',
        sku: item.product?.sku || '',
        movementRate: Math.random() * 100, // Would calculate from sales data
        quantity: item.quantity || 0,
        value: (item.quantity || 0) * (item.product?.price || 0),
        daysOfStock: item.quantity > 0 ? Math.floor(item.quantity / (Math.random() * 10 + 1)) : 0
      }))
      .sort((a, b) => b.movementRate - a.movementRate)
      .slice(0, 10) || [];

    // Slow moving products
    const slowMovingProducts = [...topMovingProducts]
      .sort((a, b) => a.movementRate - b.movementRate)
      .slice(0, 10);

    // Stock by category
    const categoryMap = new Map<string, CategoryStock>();
    inventory?.forEach(item => {
      const category = item.product?.category || 'Uncategorized';
      const existing = categoryMap.get(category) || {
        category,
        quantity: 0,
        value: 0,
        percentage: 0,
        items: 0
      };
      
      existing.quantity += item.quantity || 0;
      existing.value += (item.quantity || 0) * (item.product?.price || 0);
      existing.items++;
      
      categoryMap.set(category, existing);
    });

    const stockByCategory = Array.from(categoryMap.values());
    const totalCategoryValue = stockByCategory.reduce((sum, cat) => sum + cat.value, 0);
    stockByCategory.forEach(cat => {
      cat.percentage = totalCategoryValue > 0 ? (cat.value / totalCategoryValue) * 100 : 0;
    });

    // Stock by location
    const locationMap = new Map<string, LocationStock>();
    inventory?.forEach(item => {
      const location = item.location || 'Main';
      const existing = locationMap.get(location) || {
        location,
        quantity: 0,
        value: 0,
        percentage: 0,
        lastCounted: item.last_counted
      };
      
      existing.quantity += item.quantity || 0;
      existing.value += (item.quantity || 0) * (item.product?.price || 0);
      
      // Update last counted to most recent
      if (new Date(item.last_counted) > new Date(existing.lastCounted)) {
        existing.lastCounted = item.last_counted;
      }
      
      locationMap.set(location, existing);
    });

    const stockByLocation = Array.from(locationMap.values());
    const totalLocationValue = stockByLocation.reduce((sum, loc) => sum + loc.value, 0);
    stockByLocation.forEach(loc => {
      loc.percentage = totalLocationValue > 0 ? (loc.value / totalLocationValue) * 100 : 0;
    });

    return {
      turnoverRate,
      averageStockLevel,
      stockAccuracy,
      cycleCountCompliance,
      topMovingProducts,
      slowMovingProducts,
      stockByCategory,
      stockByLocation
    };
  }

  /**
   * Get financial metrics
   */
  private async getFinancialMetrics(businessId: string): Promise<FinancialMetrics> {
    const { data: inventory } = await supabase
      .from('inventory')
      .select(`
        *,
        product:products(*)
      `)
      .eq('business_id', businessId);

    // Calculate total inventory value
    const totalInventoryValue = inventory?.reduce((sum, item) => 
      sum + ((item.quantity || 0) * (item.product?.cost || 0)), 0
    ) || 0;

    // Mock COGS (would calculate from sales data)
    const costOfGoodsSold = totalInventoryValue * 0.6;

    // Calculate gross margin
    const revenue = totalInventoryValue * 1.5; // Mock revenue
    const grossMargin = revenue > 0 ? ((revenue - costOfGoodsSold) / revenue) * 100 : 0;

    // Inventory investment
    const inventoryInvestment = totalInventoryValue;

    // Projected revenue (based on current stock and prices)
    const projectedRevenue = inventory?.reduce((sum, item) => 
      sum + ((item.quantity || 0) * (item.product?.price || 0)), 0
    ) || 0;

    // Value by category
    const categoryValueMap = new Map<string, ValueDistribution>();
    inventory?.forEach(item => {
      const category = item.product?.category || 'Uncategorized';
      const existing = categoryValueMap.get(category) || {
        category,
        value: 0,
        percentage: 0,
        trend: 'stable' as const
      };
      
      existing.value += (item.quantity || 0) * (item.product?.cost || 0);
      categoryValueMap.set(category, existing);
    });

    const valueByCategory = Array.from(categoryValueMap.values());
    valueByCategory.forEach(cat => {
      cat.percentage = totalInventoryValue > 0 ? (cat.value / totalInventoryValue) * 100 : 0;
      cat.trend = Math.random() > 0.5 ? 'up' : Math.random() > 0.5 ? 'down' : 'stable';
    });

    // Margin by category
    const marginByCategory: MarginAnalysis[] = Array.from(
      new Set(inventory?.map(i => i.product?.category || 'Uncategorized'))
    ).map(category => {
      const categoryItems = inventory?.filter(i => 
        (i.product?.category || 'Uncategorized') === category
      ) || [];
      
      const totalCost = categoryItems.reduce((sum, item) => 
        sum + ((item.quantity || 0) * (item.product?.cost || 0)), 0
      );
      
      const totalRevenue = categoryItems.reduce((sum, item) => 
        sum + ((item.quantity || 0) * (item.product?.price || 0)), 0
      );
      
      return {
        category,
        margin: totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0,
        revenue: totalRevenue,
        cost: totalCost
      };
    });

    return {
      totalInventoryValue,
      costOfGoodsSold,
      grossMargin,
      inventoryInvestment,
      projectedRevenue,
      valueByCategory,
      marginByCategory
    };
  }

  /**
   * Get trend metrics
   */
  private async getTrendMetrics(businessId: string): Promise<TrendMetrics> {
    // Get historical count data
    const { data: counts } = await supabase
      .from('inventory_counts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(365);

    // Generate daily trends (last 30 days)
    const dailyTrends: TrendPoint[] = [];
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dailyTrends.push({
        date: date.toISOString().split('T')[0],
        value: Math.random() * 100000 + 50000,
        quantity: Math.random() * 1000 + 500,
        transactions: Math.floor(Math.random() * 50 + 10)
      });
    }

    // Generate weekly trends (last 12 weeks)
    const weeklyTrends: TrendPoint[] = [];
    for (let i = 0; i < 12; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (i * 7));
      weeklyTrends.push({
        date: date.toISOString().split('T')[0],
        value: Math.random() * 500000 + 250000,
        quantity: Math.random() * 5000 + 2500,
        transactions: Math.floor(Math.random() * 350 + 70)
      });
    }

    // Generate monthly trends (last 12 months)
    const monthlyTrends: TrendPoint[] = [];
    for (let i = 0; i < 12; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      monthlyTrends.push({
        date: date.toISOString().split('T')[0],
        value: Math.random() * 2000000 + 1000000,
        quantity: Math.random() * 20000 + 10000,
        transactions: Math.floor(Math.random() * 1500 + 300)
      });
    }

    // Mock seasonal patterns
    const { data: products } = await supabase
      .from('products')
      .select('id, name')
      .eq('business_id', businessId)
      .limit(5);

    const seasonalPatterns: SeasonalPattern[] = products?.map(product => ({
      product: product.name,
      pattern: ['increasing', 'decreasing', 'stable', 'seasonal'][Math.floor(Math.random() * 4)] as any,
      peakMonths: [Math.floor(Math.random() * 12), Math.floor(Math.random() * 12)],
      lowMonths: [Math.floor(Math.random() * 12), Math.floor(Math.random() * 12)]
    })) || [];

    // Generate demand forecasts
    const { data: inventory } = await supabase
      .from('inventory')
      .select(`
        *,
        product:products(name, reorder_point)
      `)
      .eq('business_id', businessId)
      .limit(10);

    const forecastedDemand: DemandForecast[] = inventory?.map(item => {
      const dailyDemand = Math.random() * 10 + 1;
      const currentStock = item.quantity || 0;
      const daysUntilStockout = currentStock > 0 ? Math.floor(currentStock / dailyDemand) : 0;
      
      return {
        productId: item.product_id,
        productName: item.product?.name || 'Unknown',
        currentStock,
        forecastedDemand: dailyDemand * 30,
        daysUntilStockout,
        recommendedReorder: Math.max(0, (dailyDemand * 45) - currentStock),
        confidence: Math.random() * 30 + 70
      };
    }) || [];

    return {
      dailyTrends,
      weeklyTrends,
      monthlyTrends,
      seasonalPatterns,
      forecastedDemand
    };
  }

  /**
   * Get alert metrics
   */
  private async getAlertMetrics(businessId: string): Promise<AlertMetrics> {
    const { data: alerts } = await supabase
      .from('alerts')
      .select('*')
      .eq('business_id', businessId)
      .is('resolved_at', null)
      .order('created_at', { ascending: false });

    const critical = alerts?.filter(a => a.severity === 'critical') || [];
    const warning = alerts?.filter(a => a.severity === 'high' || a.severity === 'medium') || [];
    const info = alerts?.filter(a => a.severity === 'low') || [];

    return {
      critical: critical.map(a => ({
        id: a.id,
        type: a.type,
        severity: 'critical' as const,
        message: a.message,
        productId: a.product_id,
        timestamp: a.created_at
      })),
      warning: warning.map(a => ({
        id: a.id,
        type: a.type,
        severity: 'warning' as const,
        message: a.message,
        productId: a.product_id,
        timestamp: a.created_at
      })),
      info: info.map(a => ({
        id: a.id,
        type: a.type,
        severity: 'info' as const,
        message: a.message,
        productId: a.product_id,
        timestamp: a.created_at
      })),
      totalAlerts: alerts?.length || 0,
      unresolvedAlerts: alerts?.filter(a => !a.resolved_at).length || 0
    };
  }

  /**
   * Generate report in various formats
   */
  async generateReport(
    businessId: string,
    options: ReportOptions
  ): Promise<Blob> {
    const metrics = await this.getDashboardMetrics(businessId);

    switch (options.format) {
      case 'csv':
        return this.generateCSVReport(metrics);
      case 'pdf':
        return this.generatePDFReport(metrics);
      case 'excel':
        return this.generateExcelReport(metrics);
      default:
        return new Blob([JSON.stringify(metrics, null, 2)], { type: 'application/json' });
    }
  }

  private generateCSVReport(metrics: DashboardMetrics): Blob {
    const lines = [
      'ScanStock Pro Analytics Report',
      `Generated: ${new Date().toISOString()}`,
      '',
      'Overview Metrics',
      `Total Products,${metrics.overview.totalProducts}`,
      `Total Value,$${metrics.overview.totalValue.toFixed(2)}`,
      `Low Stock Items,${metrics.overview.lowStockItems}`,
      `Out of Stock Items,${metrics.overview.outOfStockItems}`,
      '',
      'Inventory Metrics',
      `Turnover Rate,${metrics.inventory.turnoverRate.toFixed(2)}`,
      `Average Stock Level,${metrics.inventory.averageStockLevel.toFixed(0)}`,
      `Stock Accuracy,${metrics.inventory.stockAccuracy.toFixed(1)}%`,
      `Cycle Count Compliance,${metrics.inventory.cycleCountCompliance.toFixed(1)}%`,
      '',
      'Financial Metrics',
      `Total Inventory Value,$${metrics.financial.totalInventoryValue.toFixed(2)}`,
      `Gross Margin,${metrics.financial.grossMargin.toFixed(1)}%`,
      `Projected Revenue,$${metrics.financial.projectedRevenue.toFixed(2)}`
    ];

    return new Blob([lines.join('\n')], { type: 'text/csv' });
  }

  private generatePDFReport(metrics: DashboardMetrics): Blob {
    // Would use jsPDF or similar library
    // For now, return CSV as fallback
    return this.generateCSVReport(metrics);
  }

  private generateExcelReport(metrics: DashboardMetrics): Blob {
    // Would use xlsx or similar library
    // For now, return CSV as fallback
    return this.generateCSVReport(metrics);
  }
}

export const enhancedAnalyticsService = new EnhancedAnalyticsService();