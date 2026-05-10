
/**
 * Core Ad Data types
 */
export interface RawAdDataRow {
  [key: string]: string | number | undefined;
}

export interface NormalizedAdDataRow {
  date: string; // YYYY-MM-DD
  account?: string;
  campaign?: string;
  adGroup?: string;
  ad?: string;
  adSlot?: string;
  advertiser?: string;
  spend: number;
  transactions: number;
  requests: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
}

export interface AdMetric {
  label: string;
  key: keyof NormalizedAdDataRow;
  value: number;
  prevValue?: number;
  avgIdValue?: number; // 7-day average
  change?: number; // percent vs prev
  avgChange?: number; // percent vs avg
  status: 'normal' | 'notice' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'neutral';
  trendData?: { date: string; value: number }[];
  isCurrency?: boolean;
  isPercentage?: boolean;
  precision?: number;
}

export interface DailyAdSummary {
  date: string;
  metrics: AdMetric[];
  anomalies: AdAnomaly[];
  recommendations: string[];
}

export interface AdAnomaly {
  id: string;
  level: 'high' | 'medium' | 'low';
  scope: 'account' | 'campaign' | 'adGroup' | 'ad' | 'creative';
  targetName: string;
  metricLabel: string;
  currentValue: string;
  baselineValue: string;
  changeRate: number;
  reason: string;
  troubleshoot: string;
  nextStep: string;
}

export interface IndustryNews {
  id: string;
  title: string;
  source: string;
  time: string;
  summary: string;
  tags: string[];
  impact: string;
  suggestion: string;
  url?: string;
}

export interface AiUpdate {
  id: string;
  title: string;
  source: string;
  time: string;
  summary: string;
  highlights: string[];
  useCase: string;
  recommendation: string;
  url?: string;
}

export interface CsvParseResult {
  data: NormalizedAdDataRow[];
  dates: string[];
  errors: string[];
  fileName: string;
  fileSize: number;
}
