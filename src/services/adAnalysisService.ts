import { NormalizedAdDataRow, AdMetric, DailyAdSummary, AdAnomaly } from '../types/briefing';

export interface AdFilters {
  adName?: string;
  adSlot?: string;
  advertiser?: string;
}

export function calculateDailySummary(data: NormalizedAdDataRow[], targetDate: string, filters?: AdFilters): DailyAdSummary {
  // Apply dimension filters
  let filteredData = data;
  if (filters) {
    if (filters.adName) {
      filteredData = filteredData.filter(d => d.ad?.toLowerCase().includes(filters.adName!.toLowerCase()));
    }
    if (filters.adSlot) {
      filteredData = filteredData.filter(d => d.adSlot?.toLowerCase().includes(filters.adSlot!.toLowerCase()));
    }
    if (filters.advertiser) {
      filteredData = filteredData.filter(d => d.advertiser?.toLowerCase().includes(filters.advertiser!.toLowerCase()));
    }
  }

  const dayData = filteredData.filter(d => d.date === targetDate);
  const prevDate = getOffsetDate(targetDate, -1);
  const prevDayData = filteredData.filter(d => d.date === prevDate);
  
  const historyData = filteredData.filter(d => d.date < targetDate);
  const sortedHistory = historyData.sort((a,b) => b.date.localeCompare(a.date));
  
  // Real 7 day range for trend
  const dates = Array.from(new Set(filteredData.map(d => d.date))).sort().reverse();
  const targetIdx = dates.indexOf(targetDate);
  const trendDates = targetIdx !== -1 ? dates.slice(targetIdx, Math.min(targetIdx + 7, dates.length)).reverse() : [];

  const totals = sumMetrics(dayData);
  const prevTotals = sumMetrics(prevDayData);
  const lastSevenHistory = sortedHistory.filter(d => {
      const idx = dates.indexOf(d.date);
      return idx > targetIdx && idx <= targetIdx + 7;
  });
  const avgTotals = averageMetrics(lastSevenHistory);

  const metrics: AdMetric[] = [
    createMetric('消耗', 'spend', totals.spend, prevTotals.spend, avgTotals.spend, true),
    createMetric('交易笔数', 'transactions', totals.transactions, prevTotals.transactions, avgTotals.transactions),
    createMetric('请求量', 'requests', totals.requests, prevTotals.requests, avgTotals.requests),
    createMetric('展示', 'impressions', totals.impressions, prevTotals.impressions, avgTotals.impressions),
    createMetric('点击', 'clicks', totals.clicks, prevTotals.clicks, avgTotals.clicks),
    createMetric('点击率', 'clicks', totals.impressions ? (totals.clicks / totals.impressions) : 0, 
      prevTotals.impressions ? (prevTotals.clicks / prevTotals.impressions) : 0, 
      avgTotals.impressions ? (avgTotals.clicks / avgTotals.impressions) : 0, false, true, 4),
    createMetric('转化数', 'conversions', totals.conversions, prevTotals.conversions, avgTotals.conversions),
    createMetric('转化率', 'conversions', totals.clicks ? (totals.conversions / totals.clicks) : 0,
      prevTotals.clicks ? (prevTotals.conversions / prevTotals.clicks) : 0,
      avgTotals.clicks ? (avgTotals.conversions / avgTotals.clicks) : 0, false, true, 4),
  ];

  // Add trend data to each metric
  metrics.forEach(m => {
    m.trendData = trendDates.map(date => {
      const dayRows = filteredData.filter(d => d.date === date);
      const dayTotals = sumMetrics(dayRows);
      let val = 0;
      if (m.label === '点击率') val = dayTotals.impressions ? (dayTotals.clicks / dayTotals.impressions) : 0;
      else if (m.label === '转化率') val = dayTotals.clicks ? (dayTotals.conversions / dayTotals.clicks) : 0;
      else val = (dayTotals as any)[m.key];
      
      return { date: date.split('-').slice(1).join('/'), value: val };
    });
  });

  const anomalies = detectAnomalies(metrics, totals, prevTotals, filteredData, targetDate);
  const recommendations = generateRecommendations(anomalies, metrics);

  return {
    date: targetDate,
    metrics,
    anomalies,
    recommendations
  };
}

function sumMetrics(rows: NormalizedAdDataRow[]) {
  return rows.reduce((acc, row) => ({
    spend: acc.spend + (row.spend || 0),
    transactions: acc.transactions + (row.transactions || 0),
    requests: acc.requests + (row.requests || 0),
    impressions: acc.impressions + (row.impressions || 0),
    clicks: acc.clicks + (row.clicks || 0),
    conversions: acc.conversions + (row.conversions || 0),
    revenue: acc.revenue + (row.revenue || 0),
  }), { spend: 0, transactions: 0, requests: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 });
}

function averageMetrics(data: NormalizedAdDataRow[]) {
  if (data.length === 0) return { spend: 0, transactions: 0, requests: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 };
  
  const dailySums = Object.values(data.reduce((acc, row) => {
    if (!acc[row.date]) acc[row.date] = { spend: 0, transactions: 0, requests: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 };
    acc[row.date].spend += (row.spend || 0);
    acc[row.date].transactions += (row.transactions || 0);
    acc[row.date].requests += (row.requests || 0);
    acc[row.date].impressions += (row.impressions || 0);
    acc[row.date].clicks += (row.clicks || 0);
    acc[row.date].conversions += (row.conversions || 0);
    acc[row.date].revenue += (row.revenue || 0);
    return acc;
  }, {} as Record<string, any>));

  const count = dailySums.length;
  return dailySums.reduce((acc, row) => ({
    spend: acc.spend + (row.spend / count),
    transactions: acc.transactions + (row.transactions / count),
    requests: acc.requests + (row.requests / count),
    impressions: acc.impressions + (row.impressions / count),
    clicks: acc.clicks + (row.clicks / count),
    conversions: acc.conversions + (row.conversions / count),
    revenue: acc.revenue + (row.revenue / count),
  }), { spend: 0, transactions: 0, requests: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 });
}

function createMetric(label: string, key: any, val: number, prev: number, avg: number, isCurrency = false, isPercentage = false, precision = 0): AdMetric {
  const change = prev ? ((val - prev) / prev) : undefined;
  const avgChange = avg ? ((val - avg) / avg) : undefined;
  
  let status: AdMetric['status'] = 'normal';
  if (change !== undefined) {
    const abs = Math.abs(change);
    if (abs > 0.5) status = 'critical';
    else if (abs > 0.35) status = 'warning';
    else if (abs > 0.2) status = 'notice';
  }

  return {
    label, key, value: val, prevValue: prev, avgIdValue: avg,
    change, avgChange, status,
    trend: change && change > 0.01 ? 'up' : change && change < -0.01 ? 'down' : 'neutral',
    isCurrency, isPercentage, precision
  };
}

function formatVal(m: AdMetric, prev = false) {
  const v = prev ? m.prevValue : m.value;
  if (v === undefined) return '-';
  if (m.isPercentage) return (v * 100).toFixed(2) + '%';
  if (m.isCurrency) return '¥' + v.toLocaleString(undefined, { minimumFractionDigits: m.precision, maximumFractionDigits: m.precision });
  return v.toLocaleString(undefined, { maximumFractionDigits: m.precision });
}

function detectAnomalies(metrics: AdMetric[], totals: any, prevTotals: any, data: NormalizedAdDataRow[], targetDate: string): AdAnomaly[] {
  const anomalies: AdAnomaly[] = [];

  const dayData = data.filter(d => d.date === targetDate);
  const prevDate = getOffsetDate(targetDate, -1);
  const prevDayData = data.filter(d => d.date === prevDate);

  metrics.forEach(m => {
    if (m.status !== 'normal') {
      const contributor = findPrimaryContributor(m.key, dayData, prevDayData);
      
      anomalies.push({
        id: `anomaly-${m.key}-${Math.random()}`,
        level: m.status === 'critical' ? 'high' : m.status === 'warning' ? 'medium' : 'low',
        scope: 'account',
        targetName: contributor ? `${contributor.type}: ${contributor.value}` : '账户整体',
        metricLabel: m.label,
        currentValue: formatVal(m),
        baselineValue: formatVal(m, true),
        changeRate: m.change || 0,
        reason: getReason(m, metrics, contributor),
        troubleshoot: getTroubleshoot(m, contributor),
        nextStep: getNextStep(m)
      });
    }
  });

  return anomalies;
}

function findPrimaryContributor(metricKey: string, currentData: NormalizedAdDataRow[], prevData: NormalizedAdDataRow[]) {
  if (!['spend', 'impressions', 'clicks', 'conversions', 'transactions'].includes(metricKey)) return null;

  const dimensions: (keyof NormalizedAdDataRow)[] = ['ad', 'adSlot', 'advertiser'];
  let bestContributor = null;
  let maxAbsDiff = 0;

  for (const dim of dimensions) {
    const currentMap = groupBy(currentData, dim, metricKey);
    const prevMap = groupBy(prevData, dim, metricKey);
    
    const allValues = new Set([...Object.keys(currentMap), ...Object.keys(prevMap)]);
    
    for (const val of allValues) {
      const cur = currentMap[val] || 0;
      const prev = prevMap[val] || 0;
      const diff = Math.abs(cur - prev);
      
      if (diff > maxAbsDiff && (cur > 0 || prev > 0)) {
        maxAbsDiff = diff;
        bestContributor = { type: dim === 'ad' ? '广告' : dim === 'adSlot' ? '广告位' : '广告主', value: val };
      }
    }
  }

  return bestContributor;
}

function groupBy(data: NormalizedAdDataRow[], dim: keyof NormalizedAdDataRow, metric: string) {
  return data.reduce((acc, row) => {
    const val = row[dim] as string;
    if (val) {
      acc[val] = (acc[val] || 0) + ((row as any)[metric] || 0);
    }
    return acc;
  }, {} as Record<string, number>);
}

function getReason(m: AdMetric, all: AdMetric[], contributor: any): string {
    const baseReason = m.label === '消耗' && m.trend === 'up' ? '预算放量但转化未跟上。' : 
                       m.label === '交易笔数' && m.trend === 'down' ? '订单量下滑严重。' :
                       `${m.label} 波动率为 ${Math.abs((m.change || 0) * 100).toFixed(0)}%。`;
    
    if (contributor) {
      return `${contributor.type} [${contributor.value}] 是导致波动的主要原因。${baseReason}`;
    }
    return baseReason;
}

function getTroubleshoot(m: AdMetric, contributor: any): string {
    const dimText = contributor ? `针对 ${contributor.type} [${contributor.value}] 进行专项排查。` : '进行全局维度拆解排查。';
    if (m.label === '消耗') return `${dimText} 确认是否有误操作或突发流量。`;
    if (m.label === '交易笔数') return `${dimText} 确认落地页及支付链路。`;
    return `${dimText} 核实数据统计是否存在延迟或遗漏。`;
}

function getNextStep(m: AdMetric): string {
    if (m.label === '消耗' && m.trend === 'up') return '暂时调低异常计划预算，观察效果。';
    return '持续监控当日实时数据，视情况手动干预。';
}

function generateRecommendations(anomalies: AdAnomaly[], metrics: AdMetric[]): string[] {
    const recs: string[] = [];
    const highAnomalies = anomalies.filter(a => a.level === 'high');
    
    if (highAnomalies.length > 0) {
        recs.push(`优先级 1：紧急排查 ${highAnomalies.map(a => a.metricLabel).join(', ')} 的异常波动。`);
    }

    if (recs.length === 0) {
        recs.push("昨日数据整体平稳，今日建议保持现状，小幅测试新素材。");
    }

    return recs;
}

function getOffsetDate(dateStr: string, offset: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + offset);
  return d.toISOString().split('T')[0];
}
