
import { NormalizedAdDataRow, RawAdDataRow } from '../types/briefing';

const FIELD_MAP: Record<string, keyof NormalizedAdDataRow> = {
  // Date
  'date': 'date',
  '日期': 'date',
  'day': 'date',
  '日期时间': 'date',
  'report_date': 'date',
  
  // Dimensions
  'account': 'account',
  '账户': 'account',
  'campaign': 'campaign',
  '计划': 'campaign',
  '广告系列': 'campaign',
  'ad_group': 'adGroup',
  'adgroup': 'adGroup',
  '广告组': 'adGroup',
  'ad': 'ad',
  '广告': 'ad',
  'ad_name': 'ad',
  '广告名': 'ad',
  '广告名称': 'ad',
  'ad_slot': 'adSlot',
  'adslot': 'adSlot',
  '广告位': 'adSlot',
  'placement': 'adSlot',
  'advertiser': 'advertiser',
  '广告主': 'advertiser',
  '流量主': 'advertiser',
  'publisher': 'advertiser',
  
  // Metrics
  'spend': 'spend',
  'cost': 'spend',
  '消耗': 'spend',
  '花费': 'spend',
  '当日话费': 'spend',
  '当日花费': 'spend',
  'transactions': 'transactions',
  'orders': 'transactions',
  'purchases': 'transactions',
  '交易笔数': 'transactions',
  '订单数': 'transactions',
  'requests': 'requests',
  'request_count': 'requests',
  'ad_requests': 'requests',
  '请求量': 'requests',
  'impressions': 'impressions',
  'shows': 'impressions',
  '展示': 'impressions',
  '展示量': 'impressions',
  '曝光': 'impressions',
  '曝光量': 'impressions',
  'clicks': 'clicks',
  '点击': 'clicks',
  '点击量': 'clicks',
  'conversions': 'conversions',
  '转化': 'conversions',
  '转化数': 'conversions',
  'revenue': 'revenue',
  'sales': 'revenue',
  '收入': 'revenue',
  '销售额': 'revenue',
  'gmv': 'revenue',
};

export function parseNumber(val: any): number {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;
  
  const clean = String(val).replace(/[%,]/g, '').trim();
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

export function parseCsv(text: string): RawAdDataRow[] {
  // Handle UTF-8 BOM if present
  const cleanText = text.replace(/^\uFEFF/, '');
  const lines = cleanText.split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) return [];

  // Robust CSV splitting (handles quotes)
  const splitCsvLine = (line: string) => {
    const regex = /(".*?"|[^",\s]+)(?=\s*,|\s*$)/g;
    const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
    // Fallback to simple split if regex fails
    if (!matches) return line.split(',').map(s => s.trim().replace(/^"|"$/g, ''));
    return matches.map(s => s.trim().replace(/^"|"$/g, ''));
  };

  const headers = splitCsvLine(lines[0]).map(h => h.toLowerCase().trim());
  const results: RawAdDataRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = splitCsvLine(lines[i]);
    const row: RawAdDataRow = {};
    headers.forEach((header, index) => {
      row[header] = values[index];
    });
    results.push(row);
  }
  return results;
}

export function normalizeData(rawData: RawAdDataRow[]): NormalizedAdDataRow[] {
  return rawData.map((row, index) => {
    const normalized: any = {
      spend: 0,
      transactions: 0,
      requests: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      revenue: 0,
    };

    let hasDate = false;

    Object.entries(row).forEach(([key, value]) => {
      const field = FIELD_MAP[key.toLowerCase()];
      if (field) {
        if (field === 'date') {
          const d = normalizeDate(String(value));
          if (d) {
            normalized.date = d;
            hasDate = true;
          }
        } else if (['spend', 'transactions', 'requests', 'impressions', 'clicks', 'conversions', 'revenue'].includes(field)) {
          normalized[field] = parseNumber(value);
        } else {
          normalized[field] = value;
        }
      }
    });

    return hasDate ? normalized : null;
  }).filter((row): row is NormalizedAdDataRow => row !== null);
}

function normalizeDate(raw: string): string {
  if (!raw) return '';
  let clean = raw.trim();
  
  // Handle YYYYMMDD format (e.g., 20260501)
  if (/^\d{8}$/.test(clean)) {
    clean = `${clean.substring(0, 4)}-${clean.substring(4, 6)}-${clean.substring(6, 8)}`;
  } else {
    // Try clean up date string (e.g. 2024/05/10 -> 2024-05-10)
    clean = clean.replace(/\//g, '-').replace(/\./g, '-');
  }

  const date = new Date(clean);
  if (isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
}
