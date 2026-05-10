
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, FileText, CheckCircle2, AlertCircle, Calendar, 
  RefreshCw, TrendingUp, TrendingDown, Minus, ChevronDown, 
  ChevronUp, ExternalLink, Info, BrainCircuit, Globe,
  ArrowRight, Sparkles, AlertTriangle, ListChecks, Trash2,
  Clock, MapPin, User, Tag, Search, Plus
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { calculateDailySummary, AdFilters } from '../services/adAnalysisService';
import { parseCsv, normalizeData } from '../utils/csvParser';
import { 
  NormalizedAdDataRow, DailyAdSummary, AdMetric, 
  AdAnomaly, IndustryNews, AiUpdate 
} from '../types/briefing';

// --- Sub-components ---

interface MetricCardProps {
  metric: AdMetric;
  isActive: boolean;
  onClick: () => void;
}

const MetricCard: React.FC<MetricCardProps> = ({ metric, isActive, onClick }) => {
  const isPositive = metric.trend === 'up';
  const isNegative = metric.trend === 'down';

  const formatValue = (v: number | undefined) => {
    if (v === undefined) return '-';
    if (metric.isPercentage) return (v * 100).toFixed(2) + '%';
    if (metric.isCurrency) return '¥' + v.toLocaleString(undefined, { minimumFractionDigits: metric.precision, maximumFractionDigits: metric.precision });
    return v.toLocaleString(undefined, { maximumFractionDigits: metric.precision });
  };

  const getStatusColor = () => {
    switch (metric.status) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'warning': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'notice': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div 
      onClick={onClick}
      className={`bg-white p-4 rounded-xl border transition-all cursor-pointer shadow-sm relative overflow-hidden
        ${isActive ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-md' : 'border-gray-100 hover:shadow-md hover:border-gray-200'}`}
    >
      <div className="flex justify-between items-start mb-2">
        <span className="text-sm font-bold text-gray-500 tracking-tight">{metric.label}</span>
        {metric.status !== 'normal' && (
          <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${getStatusColor()} font-black`}>
            {metric.status.toUpperCase()}
          </span>
        )}
      </div>
      <div className="text-xl font-black text-gray-900 mb-2 truncate">
        {formatValue(metric.value)}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        <div className="flex items-center text-[10px]">
          <span className="text-gray-400 mr-1">环比</span>
          {metric.change !== undefined ? (
            <div className={`flex items-center font-bold ${isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-gray-500'}`}>
              {isPositive ? <TrendingUp size={10} className="mr-0.5" /> : isNegative ? <TrendingDown size={10} className="mr-0.5" /> : <Minus size={10} className="mr-0.5" />}
              {Math.abs(metric.change * 100).toFixed(1)}%
            </div>
          ) : <span className="text-gray-300">-</span>}
        </div>
        <div className="flex items-center text-[10px]">
          <span className="text-gray-400 mr-1 font-medium">近7日</span>
          {metric.avgChange !== undefined ? (
            <div className={`flex items-center font-bold ${metric.avgChange > 0 ? 'text-green-600' : metric.avgChange < 0 ? 'text-red-600' : 'text-gray-500'}`}>
              {Math.abs(metric.avgChange * 100).toFixed(1)}%
            </div>
          ) : <span className="text-gray-300">-</span>}
        </div>
      </div>
      
      {/* Tiny Background Line */}
      {metric.trendData && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-50 opacity-50">
          <div 
             className={`h-full transition-all duration-1000 ${isPositive ? 'bg-green-400' : isNegative ? 'bg-red-400' : 'bg-gray-300'}`}
             style={{ width: `${Math.min(100, Math.abs(metric.change || 0) * 100)}%` }}
          />
        </div>
      )}
    </div>
  );
};

const TrendChart: React.FC<{ metric: AdMetric }> = ({ metric }) => {
  if (!metric.trendData || metric.trendData.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-indigo-100 p-6 shadow-xl shadow-indigo-100/50">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h4 className="text-lg font-black text-slate-900 flex items-center gap-2">
            {metric.label} 近一周趋势
            <span className="text-xs font-normal text-slate-400">基于 7 日滚动均值对比</span>
          </h4>
        </div>
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-1.5">
             <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
             <span className="text-xs font-bold text-slate-500">观测值</span>
           </div>
        </div>
      </div>
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={metric.trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
              tickFormatter={(v) => metric.isCurrency ? `¥${v}` : metric.isPercentage ? `${(v * 100).toFixed(1)}%` : v}
            />
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
              labelStyle={{ fontWeight: 'bold', marginBottom: '4px', fontSize: '12px' }}
              formatter={(v: number) => [
                metric.isCurrency ? `¥${v.toLocaleString()}` : metric.isPercentage ? (v * 100).toFixed(2) + '%' : v.toLocaleString(), 
                metric.label
              ]}
            />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke="#4f46e5" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorValue)" 
              animationDuration={1500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const AnomalyItem: React.FC<{ anomaly: AdAnomaly }> = ({ anomaly }) => {
  const [isOpen, setIsOpen] = useState(true);

  const levelStyles = {
    high: 'border-l-red-500 bg-red-50/50',
    medium: 'border-l-orange-500 bg-orange-50/50',
    low: 'border-l-blue-500 bg-blue-50/50'
  };

  const levelIcon = {
    high: <AlertTriangle className="text-red-500" size={18} />,
    medium: <AlertCircle className="text-orange-500" size={18} />,
    low: <Info className="text-blue-500" size={18} />
  };

  return (
    <div className={`border border-slate-200 border-l-4 rounded-xl overflow-hidden transition-all ${levelStyles[anomaly.level]}`}>
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {levelIcon[anomaly.level]}
            <div>
              <div className="text-base font-black text-slate-900">
                {anomaly.targetName} · {anomaly.metricLabel} 剧烈波动
              </div>
              <div className="text-xs text-slate-500 flex gap-4 mt-1 font-medium">
                <span>当前：{anomaly.currentValue}</span>
                <span className={`font-bold ${anomaly.changeRate > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {anomaly.changeRate > 0 ? '↑' : '↓'} {Math.abs(anomaly.changeRate * 100).toFixed(1)}%
                </span>
                <span>标准：{anomaly.baselineValue}</span>
              </div>
            </div>
          </div>
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 hover:bg-slate-100 rounded-md transition-colors"
          >
            {isOpen ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
          </button>
        </div>

        <AnimatePresence>
          {isOpen && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="space-y-4">
                  <div className="bg-white/60 rounded-xl p-4 border border-slate-100 shadow-sm">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <Sparkles size={10} /> 异常归因分析
                    </div>
                    <div className="text-sm text-slate-700 leading-relaxed font-medium">{anomaly.reason}</div>
                  </div>
                  <div className="bg-white/60 rounded-xl p-4 border border-slate-100 shadow-sm">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <ListChecks size={10} /> 建议排查路径
                    </div>
                    <div className="text-sm text-slate-700 leading-relaxed font-medium">{anomaly.troubleshoot}</div>
                  </div>
                </div>
                
                <div className="bg-indigo-600 rounded-xl p-5 shadow-lg shadow-indigo-100 text-white flex flex-col justify-center">
                  <div className="text-[10px] font-black text-indigo-100 uppercase tracking-widest mb-2">行动建议 / Action Requirement</div>
                  <div className="text-base font-bold leading-relaxed mb-3">
                    {anomaly.nextStep}
                  </div>
                  <button className="self-start text-[10px] font-black bg-white/20 hover:bg-white/30 text-white rounded px-3 py-1.5 transition-all flex items-center gap-1">
                    标记已处理 <CheckCircle2 size={10} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

interface ScheduleItem {
  id: string;
  time: string;
  title: string;
  type: string;
  person: string;
  location: string;
  docLink?: string;
  meetingLink?: string;
}

const ScheduleTimeline = () => {
  const [schedules, setSchedules] = useState<ScheduleItem[]>([
    { id: '1', time: '09:30', title: '早间数据复盘会', type: 'meeting', person: '投放组', location: '会议室 A01', docLink: 'https://docs.example.com/briefing', meetingLink: 'https://zoom.us/j/123456' },
    { id: '2', time: '11:00', title: '消耗异动深度排查', type: 'action', person: '优化师', location: '工位' },
    { id: '3', time: '14:00', title: '周度素材策略同步', type: 'meeting', person: '设计组', location: '会议厅 B', docLink: 'https://docs.example.com/assets' },
  ]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  const handleDelete = (id: string) => {
    setSchedules(prev => prev.filter(s => s.id !== id));
  };

  const handleUpdate = (id: string, updates: Partial<ScheduleItem>) => {
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const handleAdd = () => {
    const newItem: ScheduleItem = {
      id: Math.random().toString(36).substr(2, 9),
      time: '09:00',
      title: '新工作项',
      type: 'task',
      person: '我',
      location: '待定'
    };
    setSchedules(prev => [...prev, newItem]);
    setEditingId(newItem.id);
  };

  const isPast = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    const scheduleTime = new Date(currentTime);
    scheduleTime.setHours(h, m, 0, 0);
    return scheduleTime < currentTime;
  };

  const sortedSchedules = [...schedules].sort((a, b) => a.time.localeCompare(b.time));

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-2">
          <Clock className="text-indigo-600" size={20} />
          <h3 className="text-xl font-black text-slate-900">今日工作安排</h3>
        </div>
        <button 
          onClick={handleAdd}
          className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
        >
          <Plus size={18} />
        </button>
      </div>
      <div className="space-y-0">
        {sortedSchedules.map((item, i) => {
          const past = isPast(item.time);
          return (
            <div key={item.id} className={`flex gap-6 group ${past ? 'opacity-40 grayscale select-none' : ''}`}>
              <div className="flex flex-col items-center">
                <div className={`text-sm font-black w-12 pt-1 transition-colors ${past ? 'text-slate-300' : 'text-slate-400'}`}>{item.time}</div>
                <div className={`w-0.5 flex-1 my-2 transition-colors ${i === sortedSchedules.length - 1 ? 'invisible' : ''} ${past ? 'bg-slate-100' : 'bg-slate-100'}`}></div>
              </div>
              <div className="flex-1 pb-8">
                <div className={`border rounded-2xl p-5 transition-all relative ${past ? 'bg-white border-slate-100 shadow-none' : 'bg-slate-50 border-slate-100 group-hover:bg-indigo-50 group-hover:border-indigo-100 shadow-sm'}`}>
                  {editingId === item.id ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <input 
                        type="time" 
                        value={item.time} 
                        onChange={(e) => handleUpdate(item.id, { time: e.target.value })}
                        className="bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold outline-none"
                      />
                      <select 
                        value={item.type} 
                        onChange={(e) => handleUpdate(item.id, { type: e.target.value })}
                        className="bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold outline-none"
                      >
                        <option value="meeting">Meeting</option>
                        <option value="action">Action</option>
                        <option value="task">Task</option>
                      </select>
                    </div>
                    <input 
                      type="text" 
                      value={item.title} 
                      placeholder="内容标题"
                      onChange={(e) => handleUpdate(item.id, { title: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm font-bold outline-none"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input 
                        type="text" 
                        value={item.person} 
                        placeholder="负责人"
                        onChange={(e) => handleUpdate(item.id, { person: e.target.value })}
                        className="bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold outline-none"
                      />
                      <input 
                        type="text" 
                        value={item.location} 
                        placeholder="地点"
                        onChange={(e) => handleUpdate(item.id, { location: e.target.value })}
                        className="bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                       <input 
                        type="text" 
                        value={item.docLink || ''} 
                        placeholder="文档链接 (可选)"
                        onChange={(e) => handleUpdate(item.id, { docLink: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-[10px] font-bold outline-none"
                      />
                       <input 
                        type="text" 
                        value={item.meetingLink || ''} 
                        placeholder="视频会议链接 (可选)"
                        onChange={(e) => handleUpdate(item.id, { meetingLink: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-[10px] font-bold outline-none"
                      />
                    </div>
                    <button 
                      onClick={() => setEditingId(null)}
                      className="w-full py-2 bg-indigo-600 text-white rounded-lg text-xs font-black uppercase tracking-widest"
                    >
                      完成保存
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-2">
                       <div className="text-base font-black text-slate-800">{item.title}</div>
                       <div className="flex gap-2">
                          <button onClick={() => setEditingId(item.id)} className="p-1.5 text-slate-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-all">
                            <RefreshCw size={14} />
                          </button>
                          <button onClick={() => handleDelete(item.id)} className="p-1.5 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                            <Trash2 size={14} />
                          </button>
                          <div className={`text-[10px] font-black px-2 py-0.5 rounded uppercase self-center
                            ${item.type === 'meeting' ? 'bg-blue-100 text-blue-600' : 
                              item.type === 'action' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                            {item.type}
                          </div>
                       </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 font-bold">
                      <span className="flex items-center gap-1"><User size={12} /> {item.person}</span>
                      <span className="flex items-center gap-1"><MapPin size={12} /> {item.location}</span>
                    </div>
                    {(item.docLink || item.meetingLink) && (
                      <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-2">
                        {item.docLink && (
                          <a href={item.docLink} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[10px] bg-slate-200/50 text-slate-600 px-2 py-1 rounded-md hover:bg-slate-200 transition-colors">
                            <FileText size={10} /> 文档
                          </a>
                        )}
                        {item.meetingLink && (
                          <a href={item.meetingLink} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[10px] bg-indigo-100 text-indigo-600 px-2 py-1 rounded-md hover:bg-indigo-200 transition-colors">
                            <Globe size={10} /> 视频会议
                          </a>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);
};

// --- Main Page ---

export default function DailyBriefingPage() {
  const [csvData, setCsvData] = useState<NormalizedAdDataRow[]>([]);
  const [briefing, setBriefing] = useState<DailyAdSummary | null>(null);
  const [targetDate, setTargetDate] = useState<string>('');
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [filters, setFilters] = useState<AdFilters>({ adName: '', adSlot: '', advertiser: '' });
  const [selectedMetricLabel, setSelectedMetricLabel] = useState<string>('消耗');

  const [dimensionSuggestions, setDimensionSuggestions] = useState<{ ads: string[], slots: string[], advertisers: string[] }>({ ads: [], slots: [], advertisers: [] });
  
  const [news, setNews] = useState<IndustryNews[]>([]);
  const [aiUpdates, setAiUpdates] = useState<AiUpdate[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<{ name: string; size: number; status: 'idle' | 'success' | 'error' | 'parsing' }>({ name: '', size: 0, status: 'idle' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchNews();
    fetchAiUpdates();
  }, []);

  useEffect(() => {
    if (csvData.length > 0 && targetDate) {
      const summary = calculateDailySummary(csvData, targetDate, filters);
      setBriefing(summary);
    }
  }, [csvData, targetDate, filters]);

  const fetchNews = async () => {
    try {
      const res = await fetch('/api/news');
      const data = await res.json();
      setNews(data);
    } catch (e) { console.error('Fetch news error', e); }
  };

  const fetchAiUpdates = async () => {
    try {
      const res = await fetch('/api/ai-updates');
      const data = await res.json();
      setAiUpdates(data);
    } catch (e) { console.error('Fetch AI error', e); }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    if (!file.name.endsWith('.csv')) {
      setErrorMessage('请上传 CSV 文件 (后缀名为 .csv)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('文件过大，请上传 10MB 以内的 CSV 文件。');
      return;
    }

    setUploadStatus({ name: file.name, size: file.size, status: 'parsing' });
    setLoading(true);

    const reader = new FileReader();
    reader.onerror = () => {
      setErrorMessage('文件读取出错，请尝试重新上传。');
      setUploadStatus(prev => ({ ...prev, status: 'error' }));
      setLoading(false);
    };

    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) throw new Error('文件内容为空');
        
        const raw = parseCsv(text);
        if (raw.length === 0) throw new Error('CSV 解析结果为空，请确认文件是否有内容。');
        
        const normalized = normalizeData(raw);
        
        if (normalized.length === 0) {
          throw new Error('未识别到有效的广告数据行。请确认包含 “日期” 和 “消耗” 等字段。');
        }

        const dates = Array.from(new Set(normalized.map(d => d.date))).sort((a,b) => b.localeCompare(a));
        setCsvData(normalized);
        setAvailableDates(dates);
        
        const latest = dates[0];
        setTargetDate(latest);
        
        // Extract dimension suggestions for searchable inputs
        setDimensionSuggestions({
          ads: Array.from(new Set(normalized.map(d => d.ad).filter(Boolean))) as string[],
          slots: Array.from(new Set(normalized.map(d => d.adSlot).filter(Boolean))) as string[],
          advertisers: Array.from(new Set(normalized.map(d => d.advertiser).filter(Boolean))) as string[]
        });

        const summary = calculateDailySummary(normalized, latest, filters);
        setBriefing(summary);
        setUploadStatus(prev => ({ ...prev, status: 'success' }));
      } catch (err: any) {
        setErrorMessage(err.message || '文件解析失败');
        setUploadStatus(prev => ({ ...prev, status: 'error' }));
      } finally {
        setLoading(false);
      }
    };
    reader.readAsText(file);
  };

  const clearData = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCsvData([]);
    setBriefing(null);
    setTargetDate('');
    setAvailableDates([]);
    setErrorMessage(null);
    setFilters({ adName: '', adSlot: '', advertiser: '' });
    setSelectedMetricLabel('消耗');
    setUploadStatus({ name: '', size: 0, status: 'idle' });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const openUrl = (url?: string) => {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <div className="max-w-7xl mx-auto px-4 py-8 lg:px-8">
        
        {/* Error Message Area */}
        <AnimatePresence>
          {errorMessage && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mb-6 overflow-hidden"
            >
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2 font-medium">
                  <AlertTriangle size={18} />
                  {errorMessage}
                </div>
                <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-red-600">
                  <RefreshCw size={14} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 font-black tracking-widest mb-2">
              <Sparkles size={18} />
              <span>ADS MASTER • BETA</span>
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              每日早报汇总
              {briefing && (
                <span className="text-sm font-bold text-red-500 bg-red-50 border border-red-100 px-3 py-1 rounded-full animate-pulse">
                  {briefing.anomalies.length} 个剧烈异动
                </span>
              )}
            </h1>
            <p className="mt-2 text-slate-500 font-bold flex items-center gap-4">
              <span className="flex items-center gap-1.5"><Calendar size={16} /> {targetDate || today}</span>
              <span className="flex items-center gap-1.5 underline decoration-indigo-200 underline-offset-4">数据驱动决策</span>
            </p>
          </div>

          <div className="flex flex-col items-end gap-2 text-right">
            {uploadStatus.status === 'success' ? (
              <div className="bg-indigo-600 text-white rounded-2xl py-3 px-6 shadow-lg shadow-indigo-100 flex items-center gap-4 border border-indigo-500">
                <div className="bg-white/20 p-1.5 rounded-lg"><CheckCircle2 size={16} /></div>
                <div className="text-left">
                  <div className="text-xs font-black uppercase tracking-widest text-indigo-200">数据源</div>
                  <div className="text-sm font-bold truncate max-w-[150px]">{uploadStatus.name}</div>
                </div>
                <button 
                  onClick={clearData}
                  className="bg-white/10 hover:bg-red-500 p-2 rounded-lg transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-slate-400 font-bold bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm transition-all hover:bg-slate-50">
                <Info size={16} />
                请上传投放 CSV
              </div>
            )}
          </div>
        </header>

        {/* Action Bar / Upload Area */}
        <div className="mb-12 grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-12 xl:col-span-8">
             {uploadStatus.status === 'idle' ? (
               <div 
                onClick={() => fileInputRef.current?.click()}
                className="bg-white border-4 border-dashed border-slate-100 rounded-[32px] p-12 transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-6 hover:border-indigo-200 hover:bg-slate-50/50 group h-full"
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  className="hidden" 
                  accept=".csv"
                />
                <div className="bg-indigo-50 p-6 rounded-3xl text-indigo-600 group-hover:scale-110 transition-transform">
                  <Upload size={48} />
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-800 tracking-tight">上传昨日广告数据 CSV</div>
                  <p className="text-slate-500 mt-2 font-medium">支持消耗、展示、点击、请求、ad_name、广告位等字段</p>
                </div>
                <div className="flex items-center gap-4 text-xs font-black uppercase text-indigo-600">
                  <span className="bg-indigo-50 px-3 py-1.5 rounded-lg">UTF-8 编码</span>
                  <span className="bg-indigo-50 px-3 py-1.5 rounded-lg">&lt; 10MB</span>
                </div>
              </div>
             ) : (
               <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm h-full flex flex-col">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-black text-slate-900 flex items-center gap-2 uppercase tracking-tight">
                      <Search size={22} className="text-indigo-600" />
                      深度维度筛选
                    </h3>
                    <div className="flex gap-2">
                       <button onClick={clearData} className="px-4 py-2 bg-slate-100 text-slate-600 text-xs font-black rounded-xl hover:bg-slate-200 transition-colors uppercase">重置所有</button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">分析日期</label>
                      <div className="relative">
                        <select 
                          value={targetDate} 
                          onChange={(e) => setTargetDate(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none appearance-none cursor-pointer"
                        >
                          {availableDates.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                    <div className="space-y-2">
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">广告名搜索</label>
                       <div className="relative">
                          <input 
                            list="ads-list"
                            type="text" 
                            placeholder="搜索关键词..."
                            value={filters.adName}
                            onChange={(e) => setFilters(prev => ({ ...prev, adName: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none pl-11 shadow-inner"
                          />
                          <Tag size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                          <datalist id="ads-list">
                            {dimensionSuggestions.ads.map(val => <option key={val} value={val} />)}
                          </datalist>
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">广告位/槽位</label>
                       <div className="relative">
                          <input 
                            list="slots-list"
                            type="text" 
                            placeholder="如：首屏、侧栏..."
                            value={filters.adSlot}
                            onChange={(e) => setFilters(prev => ({ ...prev, adSlot: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none pl-11 shadow-inner"
                          />
                          <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                          <datalist id="slots-list">
                             {dimensionSuggestions.slots.map(val => <option key={val} value={val} />)}
                          </datalist>
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">广告主/流量主</label>
                       <div className="relative">
                          <input 
                            list="advertisers-list"
                            type="text" 
                            placeholder="搜账户、主体..."
                            value={filters.advertiser}
                            onChange={(e) => setFilters(prev => ({ ...prev, advertiser: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none pl-11 shadow-inner"
                          />
                          <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                          <datalist id="advertisers-list">
                             {dimensionSuggestions.advertisers.map(val => <option key={val} value={val} />)}
                          </datalist>
                       </div>
                    </div>
                  </div>
               </div>
             )}
          </div>
          
          <div className="lg:col-span-12 xl:col-span-4 h-full">
            <div className="bg-indigo-600 rounded-[32px] p-8 text-white shadow-2xl shadow-indigo-200 h-full flex flex-col justify-between overflow-hidden relative group transition-all hover:scale-[1.02]">
              <div className="absolute -top-10 -right-10 opacity-10 group-hover:rotate-12 transition-transform duration-700">
                <BrainCircuit size={240} />
              </div>
              <div className="relative z-10">
                <h3 className="text-xl font-black mb-4 flex items-center gap-2">
                  <Sparkles size={20} />
                  核心分析
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-xl font-black">{briefing?.anomalies.length || 0}</div>
                    <div>
                      <div className="text-[10px] font-black text-indigo-200 uppercase tracking-widest">异动点</div>
                      <div className="text-sm font-bold">建议立即核查</div>
                    </div>
                  </div>
                  <div className="p-4 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-sm">
                    <div className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-1">主要操作建议</div>
                    <div className="text-sm font-bold leading-snug">{briefing?.recommendations[0] || '等待上传数据分析...'}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                      <div className="text-[9px] font-black text-indigo-300 uppercase">最大变降</div>
                      <div className="text-xs font-bold text-red-300">{briefing?.anomalies.sort((a,b) => a.changeRate - b.changeRate)[0]?.changeRate ? (briefing.anomalies.sort((a,b) => a.changeRate - b.changeRate)[0].changeRate * 100).toFixed(0) + '%' : '无'}</div>
                    </div>
                    <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                      <div className="text-[9px] font-black text-indigo-300 uppercase">最大增幅</div>
                      <div className="text-xs font-bold text-green-300">{briefing?.anomalies.sort((a,b) => b.changeRate - a.changeRate)[0]?.changeRate ? (briefing.anomalies.sort((a,b) => b.changeRate - a.changeRate)[0].changeRate * 100).toFixed(0) + '%' : '无'}</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="relative z-10 mt-8 pt-6 border-t border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <div className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-tight">AI 洞察已锁定</div>
                </div>
                <div className="h-10 w-10 rounded-full border-2 border-white/20 flex items-center justify-center">
                  <TrendingUp size={20} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Modules */}
        <div className="space-y-12">
          
          {/* Module 1: Data Analysis */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-lg shadow-indigo-100"><TrendingUp size={20} /></div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">数据异动扫描与趋势洞察</h2>
            </div>
            
            {!briefing ? (
              <div className="bg-white rounded-[32px] border border-slate-200 p-16 flex flex-col items-center justify-center text-center">
                <div className="bg-slate-50 p-8 rounded-[32px] mb-6">
                  <FileText size={48} className="text-slate-200" />
                </div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">当前暂无广告分析</h3>
                <p className="text-slate-500 max-w-sm mt-3 font-medium">
                  请上传包含日期、消耗、展示、点击等字段的 CSV 文件，我们将为您呈现深度的趋势分析。
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Metrics Loop */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                  {briefing.metrics.map(m => (
                    <MetricCard 
                      key={m.label} 
                      metric={m} 
                      isActive={selectedMetricLabel === m.label}
                      onClick={() => setSelectedMetricLabel(m.label)}
                    />
                  ))}
                </div>

                {/* Trend Chart Area */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={selectedMetricLabel}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.4 }}
                  >
                    {briefing.metrics.find(m => m.label === selectedMetricLabel) && (
                      <TrendChart metric={briefing.metrics.find(m => m.label === selectedMetricLabel)!} />
                    )}
                  </motion.div>
                </AnimatePresence>

                {/* Anomalies and Recommendations */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                  <div className="lg:col-span-7 space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                        <AlertTriangle size={24} className="text-red-500" />
                        异动排查与根因分析
                      </h3>
                      {briefing.anomalies.length > 0 && (
                        <span className="bg-red-50 text-red-600 text-[10px] font-black px-3 py-1 rounded-full border border-red-100 uppercase">紧急响应</span>
                      )}
                    </div>
                    <div className="space-y-4">
                      {briefing.anomalies.length > 0 ? (
                        briefing.anomalies.map(a => <AnomalyItem key={a.id} anomaly={a} />)
                      ) : (
                        <div className="bg-white rounded-3xl border-4 border-dashed border-slate-100 p-16 text-center text-slate-400 font-black uppercase text-sm tracking-widest">
                          Perfect! No Anomalies Found
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="lg:col-span-5 space-y-6">
                     <ScheduleTimeline />
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Industry News Section */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-12 pt-8 border-t border-slate-100">
            <div>
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-600 p-2 rounded-lg text-white shadow-lg shadow-blue-100"><Globe size={20} /></div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">广告行业趋势播报</h2>
                </div>
                <button 
                  onClick={() => openUrl('https://searchengineland.com/')}
                  className="text-xs font-black text-blue-600 uppercase tracking-widest hover:underline flex items-center gap-1"
                >
                  View More <ArrowRight size={14} />
                </button>
              </div>
              <div className="grid grid-cols-1 gap-6">
                {news.length > 0 ? (
                  news.map(item => (
                    <div 
                      key={item.id} 
                      onClick={() => openUrl(item.url)}
                      className="bg-white rounded-3xl border border-slate-200 overflow-hidden hover:shadow-xl transition-all group cursor-pointer border-b-4 border-b-blue-100"
                    >
                      <div className="p-8">
                        <div className="flex gap-2 mb-4">
                          {item.tags.map(tag => (
                            <span key={tag} className="text-[10px] px-2.5 py-1 bg-blue-50 text-blue-600 font-black rounded-lg uppercase tracking-tight">
                              {tag}
                            </span>
                          ))}
                        </div>
                        <h3 className="text-xl font-black text-slate-900 mb-3 group-hover:text-blue-600 transition-colors leading-tight">
                          {item.title}
                        </h3>
                        <p className="text-sm text-slate-500 mb-6 leading-relaxed font-medium line-clamp-2">
                          {item.summary}
                        </p>
                        <div className="p-5 bg-slate-50 rounded-2xl mb-6 border border-slate-100">
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><TrendingUp size={10} /> 投放策略影响</div>
                          <div className="text-sm text-slate-700 font-bold leading-relaxed">{item.impact}</div>
                        </div>
                        {item.suggestion && (
                          <div className="p-5 bg-blue-50/30 rounded-2xl mb-6 border border-blue-100/50">
                            <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Info size={10} /> 智能优化建议</div>
                            <div className="text-sm text-blue-900 font-bold leading-relaxed">{item.suggestion}</div>
                          </div>
                        )}
                        <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                          <div className="flex items-center gap-2">
                             <span className="text-xs text-slate-400 font-black uppercase tracking-tight">{item.source}</span>
                             <span className="w-1.5 h-1.5 rounded-full bg-slate-200"></span>
                             <span className="text-xs text-slate-400 font-bold">{item.time}</span>
                          </div>
                   <button className="p-2 text-slate-300 group-hover:text-blue-600 transition-colors">
                            <ExternalLink size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-20 text-slate-300 font-black uppercase text-sm tracking-widest">Nothing New Here</div>
                )}
              </div>
            </div>

            {/* AI Update Section */}
            <div className="lg:pl-8 lg:border-l border-slate-100">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="bg-purple-600 p-2 rounded-lg text-white shadow-lg shadow-purple-100"><BrainCircuit size={20} /></div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">AI 技术前哨站</h2>
                </div>
                <button 
                  onClick={() => openUrl('https://www.theverge.com/ai')}
                  className="text-xs font-black text-purple-600 uppercase tracking-widest hover:underline flex items-center gap-1"
                >
                  Updates <ArrowRight size={14} />
                </button>
              </div>
              <div className="grid grid-cols-1 gap-6">
                {aiUpdates.length > 0 ? (
                  aiUpdates.map(update => (
                    <div 
                      key={update.id} 
                      onClick={() => openUrl(update.url)}
                      className="bg-white rounded-3xl border border-slate-200 overflow-hidden hover:shadow-xl transition-all group border-t-8 border-t-purple-600 cursor-pointer"
                    >
                      <div className="p-8">
                        <div className="flex items-center gap-3 mb-4">
                          <span className="bg-purple-600 text-white text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest shadow-sm shadow-purple-100">NEW RELEASE</span>
                          <span className="text-xs text-slate-400 font-bold">{update.time}</span>
                        </div>
                        <h3 className="text-xl font-black text-slate-900 mb-3 tracking-tight">
                          {update.title}
                        </h3>
                        <p className="text-sm text-slate-600 mb-6 font-medium leading-relaxed">
                          {update.summary}
                        </p>
                        <div className="space-y-4 mb-6">
                          <div className="bg-gradient-to-br from-purple-50 to-white p-5 rounded-2xl border border-purple-100 relative overflow-hidden">
                             <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                               <Sparkles size={64} className="text-purple-600" />
                             </div>
                            <div className="flex items-center gap-2 text-[10px] font-black text-purple-600 uppercase tracking-widest mb-2 relative z-10">
                              <TrendingUp size={12} /> 落地应用场景
                            </div>
                            <div className="text-sm text-slate-800 leading-relaxed font-bold relative z-10">{update.useCase}</div>
                          </div>
                          {update.recommendation && (
                            <div className="bg-indigo-50/30 p-5 rounded-2xl border border-indigo-100/50">
                              <div className="flex items-center gap-2 text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2">
                                <Sparkles size={12} /> 建议操作
                              </div>
                              <div className="text-sm text-slate-800 leading-relaxed font-bold">{update.recommendation}</div>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex flex-wrap gap-2">
                            {update.highlights.slice(0, 3).map(h => (
                               <span key={h} className="inline-block px-2 py-1 rounded-lg border border-slate-100 bg-slate-50 text-[10px] text-slate-400 font-black uppercase">{h}</span>
                            ))}
                          </div>
                          <button className="text-xs font-black text-purple-600 flex items-center gap-2 hover:gap-3 transition-all uppercase">
                             Explore <ArrowRight size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-20 text-slate-300 font-black uppercase text-sm tracking-widest">No Intelligence Yet</div>
                )}
              </div>
            </div>
          </section>

        </div>

        {/* Footer */}
        <footer className="mt-32 pt-12 border-t border-slate-200 text-center">
          <div className="flex justify-center gap-12 mb-8 opacity-20 grayscale filter group-hover:grayscale-0 transition-all duration-700">
            <span className="text-2xl font-black tracking-tighter italic">MAX-ADS</span>
            <span className="text-2xl font-black tracking-tighter italic">AI-INSIGHT</span>
            <span className="text-2xl font-black tracking-tighter italic">DATA-OPS</span>
          </div>
          <p className="text-slate-400 text-xs font-black uppercase tracking-[0.2em]">
            Precision Engineering for Digital Advertising · 2026
          </p>
        </footer>
      </div>
    </div>
  );
}
