import React, { useState, useEffect } from 'react';
import { PerformanceMonitor, WebVitals, MobileMetrics, Alert, PerformanceReport } from './performance-monitor';

interface MetricCardProps {
  title: string;
  value: string | number;
  threshold: number;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  severity?: 'good' | 'warning' | 'critical';
}

interface AlertBannerProps {
  alerts: Alert[];
  onDismiss: (alertId: string) => void;
}

interface ChartProps {
  data: { timestamp: number; value: number }[];
  title: string;
  color: string;
  threshold?: number;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  threshold,
  unit = '',
  trend = 'stable',
  severity = 'good'
}) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-50 border-red-200 text-red-800';
      case 'warning': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default: return 'bg-green-50 border-green-200 text-green-800';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return '↗️';
      case 'down': return '↘️';
      default: return '→';
    }
  };

  return (
    <div className={`p-6 rounded-lg border ${getSeverityColor(severity)}`}>
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-sm font-medium opacity-75">{title}</h3>
        <span className="text-lg">{getTrendIcon(trend)}</span>
      </div>
      
      <div className="mb-2">
        <span className="text-2xl font-bold">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </span>
        <span className="text-sm ml-1">{unit}</span>
      </div>
      
      <div className="text-xs opacity-75">
        Threshold: {threshold.toLocaleString()}{unit}
      </div>
      
      {/* Progress bar */}
      <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full transition-all duration-300"
          style={{
            width: `${Math.min((Number(value) / threshold) * 100, 100)}%`,
            backgroundColor: severity === 'critical' ? '#ef4444' : 
                           severity === 'warning' ? '#f59e0b' : '#10b981'
          }}
        />
      </div>
    </div>
  );
};

const AlertBanner: React.FC<AlertBannerProps> = ({ alerts, onDismiss }) => {
  if (alerts.length === 0) return null;

  const criticalAlerts = alerts.filter(a => a.severity === 'critical');
  const highAlerts = alerts.filter(a => a.severity === 'high');

  return (
    <div className="space-y-2 mb-6">
      {criticalAlerts.map(alert => (
        <div key={alert.id} className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center">
                <span className="text-red-600 mr-2">🚨</span>
                <span className="font-medium text-red-800">Critical Alert</span>
              </div>
              <p className="text-red-700 mt-1">{alert.message}</p>
              <p className="text-red-600 text-sm mt-1">
                {new Date(alert.timestamp).toLocaleTimeString()}
              </p>
            </div>
            <button
              onClick={() => onDismiss(alert.id)}
              className="text-red-400 hover:text-red-600"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
      
      {highAlerts.map(alert => (
        <div key={alert.id} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center">
                <span className="text-yellow-600 mr-2">⚠️</span>
                <span className="font-medium text-yellow-800">High Priority</span>
              </div>
              <p className="text-yellow-700 mt-1">{alert.message}</p>
              <p className="text-yellow-600 text-sm mt-1">
                {new Date(alert.timestamp).toLocaleTimeString()}
              </p>
            </div>
            <button
              onClick={() => onDismiss(alert.id)}
              className="text-yellow-400 hover:text-yellow-600"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

const SimpleChart: React.FC<ChartProps> = ({ data, title, color, threshold }) => {
  const maxValue = Math.max(...data.map(d => d.value), threshold || 0);
  const chartHeight = 120;

  return (
    <div className="bg-white p-4 rounded-lg border">
      <h3 className="text-sm font-medium mb-3">{title}</h3>
      
      <div className="relative" style={{ height: chartHeight }}>
        {/* Threshold line */}
        {threshold && (
          <div
            className="absolute w-full border-t border-red-300 border-dashed"
            style={{
              top: `${chartHeight - (threshold / maxValue) * chartHeight}px`
            }}
          >
            <span className="text-xs text-red-500 bg-white px-1">
              Threshold: {threshold}
            </span>
          </div>
        )}
        
        {/* Data line */}
        <svg width="100%" height={chartHeight} className="absolute">
          <polyline
            fill="none"
            stroke={color}
            strokeWidth="2"
            points={data.map((d, i) => 
              `${(i / (data.length - 1)) * 100}%,${chartHeight - (d.value / maxValue) * chartHeight}`
            ).join(' ')}
          />
          
          {/* Data points */}
          {data.map((d, i) => (
            <circle
              key={i}
              cx={`${(i / (data.length - 1)) * 100}%`}
              cy={chartHeight - (d.value / maxValue) * chartHeight}
              r="3"
              fill={color}
            />
          ))}
        </svg>
      </div>
      
      {/* X-axis labels */}
      <div className="flex justify-between text-xs text-gray-500 mt-2">
        <span>{new Date(data[0]?.timestamp).toLocaleTimeString()}</span>
        <span>{new Date(data[data.length - 1]?.timestamp).toLocaleTimeString()}</span>
      </div>
    </div>
  );
};

export const MetricsDashboard: React.FC = () => {
  const [performanceMonitor] = useState(() => new PerformanceMonitor());
  const [vitals, setVitals] = useState<WebVitals | null>(null);
  const [mobileMetrics, setMobileMetrics] = useState<MobileMetrics | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [report, setReport] = useState<PerformanceReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Historical data for charts
  const [vitalsHistory, setVitalsHistory] = useState<{
    lcp: { timestamp: number; value: number }[];
    fid: { timestamp: number; value: number }[];
    cls: { timestamp: number; value: number }[];
  }>({
    lcp: [],
    fid: [],
    cls: []
  });

  useEffect(() => {
    const initializeMonitoring = async () => {
      setIsLoading(true);
      
      try {
        // Enable RUM
        performanceMonitor.enableRealUserMonitoring();
        
        // Set up alert listener
        performanceMonitor.onAlert((alert) => {
          setAlerts(prev => [...prev, alert]);
        });

        // Measure initial metrics
        const webVitals = await performanceMonitor.measureWebVitals();
        const mobileMets = await performanceMonitor.measureMobileMetrics();
        const performanceReport = performanceMonitor.generatePerformanceReport();

        setVitals(webVitals);
        setMobileMetrics(mobileMets);
        setReport(performanceReport);

        // Update historical data
        const timestamp = Date.now();
        setVitalsHistory(prev => ({
          lcp: [...prev.lcp.slice(-19), { timestamp, value: webVitals.lcp }],
          fid: [...prev.fid.slice(-19), { timestamp, value: webVitals.fid }],
          cls: [...prev.cls.slice(-19), { timestamp, value: webVitals.cls * 1000 }], // Scale for visibility
        }));

      } catch (error) {
        console.error('Failed to initialize performance monitoring:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeMonitoring();

    // Set up periodic updates
    const interval = setInterval(async () => {
      try {
        const newVitals = await performanceMonitor.measureWebVitals();
        const newMobileMetrics = await performanceMonitor.measureMobileMetrics();
        
        setVitals(newVitals);
        setMobileMetrics(newMobileMetrics);
        
        // Update charts
        const timestamp = Date.now();
        setVitalsHistory(prev => ({
          lcp: [...prev.lcp.slice(-19), { timestamp, value: newVitals.lcp }],
          fid: [...prev.fid.slice(-19), { timestamp, value: newVitals.fid }],
          cls: [...prev.cls.slice(-19), { timestamp, value: newVitals.cls * 1000 }],
        }));
      } catch (error) {
        console.error('Failed to update metrics:', error);
      }
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [performanceMonitor]);

  const dismissAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  const getSeverity = (value: number, threshold: number): 'good' | 'warning' | 'critical' => {
    if (value > threshold * 1.5) return 'critical';
    if (value > threshold) return 'warning';
    return 'good';
  };

  const exportMetrics = () => {
    const data = performanceMonitor.exportMetrics();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-metrics-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading performance metrics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Performance Dashboard</h1>
          <p className="text-gray-600">Real-time mobile-first performance monitoring</p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={exportMetrics}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Export Metrics
          </button>
          
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-600">Live</span>
          </div>
        </div>
      </div>

      {/* Alerts */}
      <AlertBanner alerts={alerts} onDismiss={dismissAlert} />

      {/* Core Web Vitals */}
      {vitals && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Core Web Vitals</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <MetricCard
              title="Largest Contentful Paint"
              value={Math.round(vitals.lcp)}
              threshold={2500}
              unit="ms"
              severity={getSeverity(vitals.lcp, 2500)}
            />
            
            <MetricCard
              title="First Input Delay"
              value={Math.round(vitals.fid)}
              threshold={100}
              unit="ms"
              severity={getSeverity(vitals.fid, 100)}
            />
            
            <MetricCard
              title="Cumulative Layout Shift"
              value={vitals.cls.toFixed(3)}
              threshold={0.1}
              severity={getSeverity(vitals.cls, 0.1)}
            />
            
            <MetricCard
              title="Time to First Byte"
              value={Math.round(vitals.ttfb)}
              threshold={800}
              unit="ms"
              severity={getSeverity(vitals.ttfb, 800)}
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <SimpleChart
              data={vitalsHistory.lcp}
              title="LCP Over Time"
              color="#ef4444"
              threshold={2500}
            />
            
            <SimpleChart
              data={vitalsHistory.fid}
              title="FID Over Time"
              color="#f59e0b"
              threshold={100}
            />
            
            <SimpleChart
              data={vitalsHistory.cls}
              title="CLS Over Time (×1000)"
              color="#8b5cf6"
              threshold={100}
            />
          </div>
        </div>
      )}

      {/* Mobile Metrics */}
      {mobileMetrics && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Mobile Performance</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Memory Usage"
              value={Math.round(mobileMetrics.memoryUsage)}
              threshold={100}
              unit="MB"
              severity={getSeverity(mobileMetrics.memoryUsage, 100)}
            />
            
            <MetricCard
              title="Network Payload"
              value={Math.round(mobileMetrics.networkPayload / 1024)}
              threshold={1024}
              unit="KB"
              severity={getSeverity(mobileMetrics.networkPayload / 1024, 1024)}
            />
            
            <MetricCard
              title="Camera Init Time"
              value={Math.round(mobileMetrics.cameraInitTime)}
              threshold={3000}
              unit="ms"
              severity={getSeverity(mobileMetrics.cameraInitTime, 3000)}
            />
            
            <MetricCard
              title="Frame Rate"
              value={Math.round(mobileMetrics.framerate)}
              threshold={30}
              unit="fps"
              severity={mobileMetrics.framerate < 30 ? 'warning' : 'good'}
            />
          </div>
        </div>
      )}

      {/* Performance Score */}
      {report && (
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-xl font-semibold mb-4">Performance Score</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-green-600 mb-2">
                {Math.round((vitals.lcp < 2500 ? 25 : 0) + 
                           (vitals.fid < 100 ? 25 : 0) + 
                           (vitals.cls < 0.1 ? 25 : 0) + 
                           (vitals.ttfb < 800 ? 25 : 0))}
              </div>
              <div className="text-gray-600">Overall Score</div>
            </div>
            
            <div className="space-y-3">
              <div className="text-sm font-medium">Performance Breakdown</div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>LCP</span>
                  <span className={vitals.lcp < 2500 ? 'text-green-600' : 'text-red-600'}>
                    {vitals.lcp < 2500 ? 'Good' : 'Poor'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>FID</span>
                  <span className={vitals.fid < 100 ? 'text-green-600' : 'text-red-600'}>
                    {vitals.fid < 100 ? 'Good' : 'Poor'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>CLS</span>
                  <span className={vitals.cls < 0.1 ? 'text-green-600' : 'text-red-600'}>
                    {vitals.cls < 0.1 ? 'Good' : 'Poor'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="text-sm font-medium">Recommendations</div>
              <div className="space-y-2 text-sm text-gray-600">
                {vitals.lcp > 2500 && <div>• Optimize image loading</div>}
                {vitals.fid > 100 && <div>• Reduce JavaScript execution</div>}
                {vitals.cls > 0.1 && <div>• Reserve space for dynamic content</div>}
                {vitals.ttfb > 800 && <div>• Improve server response time</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Debug Info */}
      <details className="bg-gray-50 rounded-lg p-4">
        <summary className="cursor-pointer font-medium">Debug Information</summary>
        <pre className="mt-4 text-xs bg-white p-4 rounded border overflow-auto">
          {JSON.stringify({ vitals, mobileMetrics, alerts: alerts.length }, null, 2)}
        </pre>
      </details>
    </div>
  );
};