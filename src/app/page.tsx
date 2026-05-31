'use client';

import { useState, useEffect, useCallback } from 'react';

// Types
interface Stock {
  id: string;
  symbol: string;
  nameAr: string | null;
  nameEn: string | null;
  exchange: string;
  country: string | null;
  sector: string | null;
  industry: string | null;
  iconUrl: string | null;
  website: string | null;
  headquarters: string | null;
  foundedYear: number | null;
  description: string | null;
  isin: string | null;
}

interface StockOverview {
  currentPrice: number | null;
  changeAmount: number | null;
  changePercent: number | null;
  marketCap: number | null;
  peRatioTTM: number | null;
  epsTTM: number | null;
  dividendYield: number | null;
  employees: number | null;
}

interface HistoricalRecord {
  date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
}

interface HistoricalSummary {
  id: string;
  symbol: string;
  nameAr: string | null;
  nameEn: string | null;
  exchange: string;
  recordsCount: number;
}

interface Stats {
  totalStocks: number;
  historicalCount: number;
  stocksByExchange: { exchange: string; count: number }[];
  iconsCount?: number;
}

interface LogEntry {
  time: string;
  type: 'info' | 'success' | 'error';
  message: string;
}

export default function DataFactory() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [historicalData, setHistoricalData] = useState<HistoricalSummary[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedExchange, setSelectedExchange] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'stocks' | 'historical' | 'control' | 'console'>('dashboard');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [taskRunning, setTaskRunning] = useState(false);
  const [currentTask, setCurrentTask] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  
  // Stock detail modal
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [stockOverview, setStockOverview] = useState<StockOverview | null>(null);
  const [stockHistorical, setStockHistorical] = useState<HistoricalRecord[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  
  // Icons count
  const [iconsCount, setIconsCount] = useState(0);
  
  // Period for historical data
  const [selectedPeriod, setSelectedPeriod] = useState<string>('5y');

  // Add log
  const log = useCallback((type: LogEntry['type'], message: string) => {
    setLogs(prev => [...prev.slice(-50), { time: new Date().toLocaleTimeString('ar-EG'), type, message }]);
  }, []);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/stats');
      if (res.ok) {
        setStats(await res.json());
      }
    } catch (e) {
      log('error', 'فشل في تحميل الإحصائيات');
    }
  }, [log]);

  // Fetch ALL stocks (no limit)
  const fetchStocks = useCallback(async () => {
    try {
      log('info', 'جاري تحميل قائمة الأسهم...');
      const res = await fetch('/api/stocks?limit=1000'); // Fetch all stocks
      if (res.ok) {
        const data = await res.json();
        setStocks(data);
        log('success', `تم تحميل ${data.length} سهم بنجاح`);
      } else {
        log('error', 'فشل تحميل الأسهم - تأكد من تشغيل السيرفر');
      }
    } catch (e) {
      log('error', 'خطأ في الاتصال بالسيرفر');
    } finally {
      setLoading(false);
    }
  }, [log]);

  // Fetch all historical data
  const fetchHistorical = useCallback(async () => {
    try {
      log('info', 'جاري تحميل البيانات التاريخية...');
      const res = await fetch('/api/historical?limit=1000');
      if (res.ok) {
        const data = await res.json();
        setHistoricalData(data);
        log('success', `تم تحميل بيانات ${data.length} سهم`);
      }
    } catch (e) {
      log('error', 'فشل تحميل البيانات التاريخية');
    }
  }, [log]);

  // Fetch stock details
  const fetchStockDetail = async (stock: Stock) => {
    setSelectedStock(stock);
    setLoadingDetail(true);
    setStockOverview(null);
    setStockHistorical([]);
    
    try {
      // Fetch overview
      const overviewRes = await fetch(`/api/stocks/${stock.symbol}/overview`);
      if (overviewRes.ok) {
        const overviewData = await overviewRes.json();
        setStockOverview(overviewData);
      }
      
      // Fetch historical
      const histRes = await fetch(`/api/stocks/${stock.symbol}/historical?limit=30`);
      if (histRes.ok) {
        const histData = await histRes.json();
        setStockHistorical(histData);
      }
    } catch (e) {
      log('error', `فشل تحميل تفاصيل ${stock.symbol}`);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Count icons
  useEffect(() => {
    const countIcons = async () => {
      try {
        const res = await fetch('/api/icons/count');
        if (res.ok) {
          const data = await res.json();
          setIconsCount(data.count || 0);
        }
      } catch (e) {
        // Ignore
      }
    };
    countIcons();
  }, []);

  // Initial load
  useEffect(() => {
    fetchStats();
    fetchStocks();
  }, [fetchStats, fetchStocks]);

  // Load historical on tab change
  useEffect(() => {
    if (activeTab === 'historical' && historicalData.length === 0) {
      fetchHistorical();
    }
  }, [activeTab, historicalData.length, fetchHistorical]);

  // Stop task
  const stopTask = () => {
    setTaskRunning(false);
    setCurrentTask(null);
    setProgress(0);
    log('info', '⏹️ تم إيقاف المهمة');
  };

  // Run task
  const runTask = async (action: string, name: string) => {
    if (taskRunning) {
      log('error', 'يوجد مهمة قيد التشغيل بالفعل');
      return;
    }

    setTaskRunning(true);
    setCurrentTask(name);
    setProgress(0);
    log('info', `▶️ بدء: ${name}`);

    // Progress simulation
    const progressInterval = setInterval(() => {
      setProgress(p => Math.min(p + 3, 85));
    }, 300);

    try {
      const res = await fetch('/api/scraper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, period: selectedPeriod })
      });
      
      const data = await res.json();
      clearInterval(progressInterval);
      setProgress(100);
      
      if (res.ok) {
        log('success', `✅ تم: ${data.message || name}`);
      } else {
        log('error', `❌ فشل: ${data.error || 'خطأ غير معروف'}`);
      }

      // Refresh after 2 seconds
      setTimeout(() => {
        fetchStats();
        fetchStocks();
        setTaskRunning(false);
        setCurrentTask(null);
        setProgress(0);
      }, 2000);

    } catch (e) {
      clearInterval(progressInterval);
      log('error', '❌ فشل الاتصال بالسيرفر');
      setTaskRunning(false);
      setCurrentTask(null);
      setProgress(0);
    }
  };

  // Filter stocks
  const filteredStocks = stocks.filter(s => {
    const matchEx = selectedExchange === 'all' || s.exchange === selectedExchange;
    const matchSearch = !searchQuery || 
      s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.nameAr?.includes(searchQuery) ||
      s.nameEn?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchEx && matchSearch;
  });

  // Exchange names
  const exNames: Record<string, string> = {
    'KSA': '🇸🇦 السعودية',
    'EGX': '🇪🇬 مصر', 
    'KSE': '🇰🇼 الكويت',
    'QE': '🇶🇦 قطر',
    'UAE': '🇦🇪 الإمارات',
    'BAH': '🇧🇭 البحرين'
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-5xl animate-spin mb-4">⚙️</div>
          <p className="text-xl">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white" dir="rtl">
      {/* Stock Detail Modal */}
      {selectedStock && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setSelectedStock(null)}>
          <div className="bg-slate-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-slate-700 p-4 flex items-center gap-4 sticky top-0">
              {selectedStock.iconUrl && (
                <img src={selectedStock.iconUrl} alt={selectedStock.symbol} className="w-12 h-12 rounded" />
              )}
              <div className="flex-1">
                <h2 className="text-xl font-bold">{selectedStock.symbol}</h2>
                <p className="text-slate-300">{selectedStock.nameAr || selectedStock.nameEn || '—'}</p>
              </div>
              <button onClick={() => setSelectedStock(null)} className="text-slate-400 hover:text-white text-2xl">✕</button>
            </div>
            
            {loadingDetail ? (
              <div className="p-8 text-center">
                <div className="text-4xl animate-spin">⚙️</div>
                <p className="mt-2">جاري تحميل التفاصيل...</p>
              </div>
            ) : (
              <div className="p-4 space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-slate-700 rounded p-3">
                    <div className="text-slate-400 text-sm">البورصة</div>
                    <div className="font-bold">{exNames[selectedStock.exchange] || selectedStock.exchange}</div>
                  </div>
                  <div className="bg-slate-700 rounded p-3">
                    <div className="text-slate-400 text-sm">البلد</div>
                    <div className="font-bold">{selectedStock.country || '—'}</div>
                  </div>
                  <div className="bg-slate-700 rounded p-3">
                    <div className="text-slate-400 text-sm">القطاع</div>
                    <div className="font-bold">{selectedStock.sector || '—'}</div>
                  </div>
                  <div className="bg-slate-700 rounded p-3">
                    <div className="text-slate-400 text-sm">الصناعة</div>
                    <div className="font-bold">{selectedStock.industry || '—'}</div>
                  </div>
                </div>

                {/* Overview */}
                {stockOverview && (
                  <div className="bg-slate-700 rounded-lg p-4">
                    <h3 className="font-bold mb-3 text-emerald-400">📊 نظرة عامة</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <div className="text-slate-400 text-sm">السعر الحالي</div>
                        <div className="text-xl font-bold text-emerald-400">
                          {stockOverview.currentPrice?.toLocaleString() || '—'}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-400 text-sm">التغير</div>
                        <div className={`font-bold ${stockOverview.changePercent && stockOverview.changePercent > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {stockOverview.changePercent?.toFixed(2)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-400 text-sm">القيمة السوقية</div>
                        <div className="font-bold">{stockOverview.marketCap ? (stockOverview.marketCap / 1e9).toFixed(2) + 'B' : '—'}</div>
                      </div>
                      <div>
                        <div className="text-slate-400 text-sm">P/E</div>
                        <div className="font-bold">{stockOverview.peRatioTTM?.toFixed(2) || '—'}</div>
                      </div>
                      <div>
                        <div className="text-slate-400 text-sm">EPS</div>
                        <div className="font-bold">{stockOverview.epsTTM?.toFixed(2) || '—'}</div>
                      </div>
                      <div>
                        <div className="text-slate-400 text-sm">عائد التوزيعات</div>
                        <div className="font-bold">{stockOverview.dividendYield?.toFixed(2) || '—'}%</div>
                      </div>
                      <div>
                        <div className="text-slate-400 text-sm">الموظفين</div>
                        <div className="font-bold">{stockOverview.employees?.toLocaleString() || '—'}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Company Info */}
                <div className="bg-slate-700 rounded-lg p-4">
                  <h3 className="font-bold mb-3 text-blue-400">🏢 معلومات الشركة</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-slate-400 text-sm">الموقع الإلكتروني</div>
                      <div className="font-bold">{selectedStock.website ? (
                        <a href={`https://${selectedStock.website}`} target="_blank" className="text-cyan-400 hover:underline">{selectedStock.website}</a>
                      ) : '—'}</div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-sm">المقر</div>
                      <div className="font-bold">{selectedStock.headquarters || '—'}</div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-sm">سنة التأسيس</div>
                      <div className="font-bold">{selectedStock.foundedYear || '—'}</div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-sm">ISIN</div>
                      <div className="font-bold font-mono text-sm">{selectedStock.isin || '—'}</div>
                    </div>
                  </div>
                  {selectedStock.description && (
                    <div className="mt-4 pt-4 border-t border-slate-600">
                      <div className="text-slate-400 text-sm mb-1">الوصف</div>
                      <p className="text-slate-200">{selectedStock.description}</p>
                    </div>
                  )}
                </div>

                {/* Historical Chart Data */}
                {stockHistorical.length > 0 && (
                  <div className="bg-slate-700 rounded-lg p-4">
                    <h3 className="font-bold mb-3 text-purple-400">📈 آخر 30 يوم</h3>
                    <div className="overflow-auto max-h-64">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-600">
                          <tr>
                            <th className="p-2 text-right">التاريخ</th>
                            <th className="p-2 text-right">افتتاح</th>
                            <th className="p-2 text-right">أعلى</th>
                            <th className="p-2 text-right">أدنى</th>
                            <th className="p-2 text-right">إغلاق</th>
                            <th className="p-2 text-right">حجم</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stockHistorical.slice(0, 30).map((h, i) => (
                            <tr key={i} className="border-t border-slate-600">
                              <td className="p-2">{h.date}</td>
                              <td className="p-2">{h.open?.toFixed(2) || '—'}</td>
                              <td className="p-2 text-green-400">{h.high?.toFixed(2) || '—'}</td>
                              <td className="p-2 text-red-400">{h.low?.toFixed(2) || '—'}</td>
                              <td className="p-2 font-bold">{h.close?.toFixed(2) || '—'}</td>
                              <td className="p-2 text-slate-400">{h.volume?.toLocaleString() || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 py-4 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-emerald-400">🏭 Data Engine</h1>
          {taskRunning && (
            <div className="flex items-center gap-3 bg-amber-900/50 px-4 py-2 rounded-lg">
              <span className="animate-pulse">⏳</span>
              <span className="text-sm">{currentTask} ({progress}%)</span>
              <button onClick={stopTask} className="bg-red-500 px-3 py-1 rounded text-sm hover:bg-red-600">
                إيقاف
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Tabs */}
      <nav className="bg-slate-800/50 border-b border-slate-700">
        <div className="max-w-7xl mx-auto flex overflow-x-auto">
          {[
            { id: 'dashboard', label: '📊 الرئيسية' },
            { id: 'stocks', label: '📈 الأسهم' },
            { id: 'historical', label: '📉 السجل التاريخي' },
            { id: 'control', label: '🎮 التحكم' },
            { id: 'console', label: '💻 الطرفية' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as typeof activeTab)}
              className={`px-6 py-3 whitespace-nowrap transition-all ${
                activeTab === t.id ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6">
        {/* Dashboard */}
        {activeTab === 'dashboard' && stats && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-slate-800 rounded-lg p-4">
                <div className="text-3xl font-bold text-emerald-400">{stats.totalStocks}</div>
                <div className="text-slate-400">سهم</div>
              </div>
              <div className="bg-slate-800 rounded-lg p-4">
                <div className="text-3xl font-bold text-blue-400">{stats.historicalCount.toLocaleString()}</div>
                <div className="text-slate-400">سجل تاريخي</div>
              </div>
              <div className="bg-slate-800 rounded-lg p-4">
                <div className="text-3xl font-bold text-purple-400">{stats.stocksByExchange.length}</div>
                <div className="text-slate-400">بورصة</div>
              </div>
              <div className="bg-slate-800 rounded-lg p-4">
                <div className="text-3xl font-bold text-amber-400">{iconsCount}</div>
                <div className="text-slate-400">أيقونة</div>
              </div>
              <div className="bg-slate-800 rounded-lg p-4">
                <div className="text-3xl font-bold text-cyan-400">{filteredStocks.length}</div>
                <div className="text-slate-400">معروض</div>
              </div>
            </div>

            <div className="bg-slate-800 rounded-lg p-6">
              <h2 className="text-lg font-bold mb-4">توزيع الأسهم</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {stats.stocksByExchange.map(ex => {
                  const pct = Math.round((ex.count / stats.totalStocks) * 100);
                  return (
                    <div key={ex.exchange} className="bg-slate-700 rounded p-3">
                      <div className="flex justify-between text-sm mb-2">
                        <span>{exNames[ex.exchange] || ex.exchange}</span>
                        <span className="text-slate-400">{ex.count}</span>
                      </div>
                      <div className="h-2 bg-slate-600 rounded">
                        <div className="h-2 bg-emerald-500 rounded" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Stocks */}
        {activeTab === 'stocks' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="text-slate-400">
                عرض {filteredStocks.length} من {stocks.length} سهم
              </div>
              <button 
                onClick={fetchStocks}
                className="bg-emerald-600 px-4 py-2 rounded hover:bg-emerald-700"
              >
                🔄 تحديث
              </button>
            </div>

            {stats && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedExchange('all')}
                  className={`px-3 py-1 rounded ${selectedExchange === 'all' ? 'bg-emerald-600' : 'bg-slate-700'}`}
                >
                  الكل ({stats.totalStocks})
                </button>
                {stats.stocksByExchange.map(ex => (
                  <button
                    key={ex.exchange}
                    onClick={() => setSelectedExchange(ex.exchange)}
                    className={`px-3 py-1 rounded ${selectedExchange === ex.exchange ? 'bg-emerald-600' : 'bg-slate-700'}`}
                  >
                    {exNames[ex.exchange]} ({ex.count})
                  </button>
                ))}
              </div>
            )}

            <input
              type="text"
              placeholder="بحث بالرمز أو الاسم..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full md:w-64 px-3 py-2 bg-slate-800 border border-slate-600 rounded focus:border-emerald-500 outline-none"
            />

            <div className="bg-slate-800 rounded-lg overflow-hidden">
              <div className="max-h-[500px] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-700 sticky top-0">
                    <tr>
                      <th className="p-3 text-right w-12"></th>
                      <th className="p-3 text-right">الرمز</th>
                      <th className="p-3 text-right">الاسم</th>
                      <th className="p-3 text-right">البورصة</th>
                      <th className="p-3 text-right">القطاع</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStocks.map(s => (
                      <tr 
                        key={s.id} 
                        className="border-t border-slate-700 hover:bg-slate-700/50 cursor-pointer"
                        onClick={() => fetchStockDetail(s)}
                      >
                        <td className="p-3">
                          {s.iconUrl ? (
                            <img src={s.iconUrl} alt={s.symbol} className="w-8 h-8 rounded" />
                          ) : (
                            <div className="w-8 h-8 bg-slate-600 rounded flex items-center justify-center text-xs">
                              {s.symbol.slice(0, 2)}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-cyan-400 font-mono">{s.symbol}</td>
                        <td className="p-3">{s.nameAr || s.nameEn || '—'}</td>
                        <td className="p-3 text-purple-400">{exNames[s.exchange] || s.exchange}</td>
                        <td className="p-3 text-slate-400">{s.sector || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Historical */}
        {activeTab === 'historical' && (
          <div className="bg-slate-800 rounded-lg overflow-hidden">
            <div className="p-4 border-b border-slate-700 flex justify-between">
              <span className="font-bold">البيانات التاريخية ({historicalData.length} سهم)</span>
              <button onClick={fetchHistorical} className="text-sm bg-slate-700 px-3 py-1 rounded">تحديث</button>
            </div>
            <div className="max-h-[500px] overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-700 sticky top-0">
                  <tr>
                    <th className="p-3 text-right">الرمز</th>
                    <th className="p-3 text-right">الاسم</th>
                    <th className="p-3 text-right">البورصة</th>
                    <th className="p-3 text-right">السجلات</th>
                  </tr>
                </thead>
                <tbody>
                  {historicalData.map(h => (
                    <tr key={h.id} className="border-t border-slate-700 hover:bg-slate-700/50">
                      <td className="p-3 text-cyan-400 font-mono">{h.symbol}</td>
                      <td className="p-3">{h.nameAr || h.nameEn || '—'}</td>
                      <td className="p-3 text-purple-400">{exNames[h.exchange] || h.exchange}</td>
                      <td className="p-3">
                        <span className="bg-emerald-900/50 text-emerald-400 px-2 py-0.5 rounded font-mono">
                          {h.recordsCount}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Control */}
        {activeTab === 'control' && (
          <div className="space-y-6">
            {/* Period Selector */}
            <div className="bg-slate-800 rounded-lg p-4">
              <h3 className="font-bold mb-3">📅 فترة البيانات التاريخية</h3>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: '1y', label: 'سنة واحدة' },
                  { value: '2y', label: 'سنتين' },
                  { value: '5y', label: '5 سنين (default)' },
                  { value: '10y', label: '10 سنين' },
                  { value: 'max', label: 'كل البيانات' }
                ].map(p => (
                  <button
                    key={p.value}
                    onClick={() => setSelectedPeriod(p.value)}
                    className={`px-4 py-2 rounded-lg transition-all ${
                      selectedPeriod === p.value 
                        ? 'bg-emerald-600 text-white' 
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <p className="text-slate-400 text-sm mt-2">
                الفترة المحددة: <span className="text-emerald-400 font-bold">{selectedPeriod}</span>
              </p>
            </div>

            {/* Current Task */}
            {taskRunning && (
              <div className="bg-amber-900/30 border border-amber-600 rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-bold">⏳ {currentTask}</span>
                  <button onClick={stopTask} className="bg-red-500 px-4 py-1 rounded hover:bg-red-600">
                    ⏹️ إيقاف
                  </button>
                </div>
                <div className="h-3 bg-slate-700 rounded overflow-hidden">
                  <div className="h-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
                </div>
                <div className="text-sm text-slate-400 mt-1">{progress}%</div>
              </div>
            )}

            {/* Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button
                onClick={() => runTask('prices', 'تحديث الأسعار')}
                disabled={taskRunning}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 p-4 rounded-lg"
              >
                📊 تحديث الأسعار
              </button>
              <button
                onClick={() => runTask('historical', 'جلب البيانات التاريخية')}
                disabled={taskRunning}
                className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 p-4 rounded-lg"
              >
                📈 البيانات التاريخية
              </button>
              <button
                onClick={() => runTask('icons', 'تحميل الأيقونات')}
                disabled={taskRunning}
                className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 p-4 rounded-lg"
              >
                🖼️ تحميل الأيقونات
              </button>
              <button
                onClick={() => runTask('all', 'تحديث شامل')}
                disabled={taskRunning}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 p-4 rounded-lg font-bold"
              >
                🔄 تحديث الكل
              </button>
            </div>

            {/* Parallel */}
            <div className="bg-slate-800 rounded-lg p-4">
              <h3 className="font-bold mb-3">🚀 معالجة متوازية</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                  onClick={() => runTask('parallel_ksa_egx', 'السعودية + مصر')}
                  disabled={taskRunning}
                  className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 p-3 rounded"
                >
                  🇸🇦 السعودية + 🇪🇬 مصر
                </button>
                <button
                  onClick={() => runTask('parallel_kse_qe', 'الكويت + قطر')}
                  disabled={taskRunning}
                  className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 p-3 rounded"
                >
                  🇰🇼 الكويت + 🇶🇦 قطر
                </button>
                <button
                  onClick={() => runTask('parallel_uae_bah', 'الإمارات + البحرين')}
                  disabled={taskRunning}
                  className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 p-3 rounded"
                >
                  🇦🇪 الإمارات + 🇧🇭 البحرين
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Console */}
        {activeTab === 'console' && (
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="font-bold">سجل العمليات</span>
              <button onClick={() => setLogs([])} className="text-sm bg-red-900/50 text-red-400 px-3 py-1 rounded">
                مسح
              </button>
            </div>
            <div className="bg-black rounded-lg font-mono text-sm overflow-hidden">
              <div className="h-[400px] overflow-auto p-4" dir="ltr">
                {logs.length === 0 ? (
                  <p className="text-slate-500">لا توجد سجلات...</p>
                ) : (
                  logs.map((l, i) => (
                    <div key={i} className={`py-1 ${l.type === 'success' ? 'text-emerald-400' : l.type === 'error' ? 'text-red-400' : 'text-slate-300'}`}>
                      <span className="text-slate-500">[{l.time}]</span> {l.message}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="text-center text-slate-500 text-sm py-4 border-t border-slate-700 mt-8">
        Data Engine v1.0 | 🇸🇦 🇪🇬 🇰🇼 🇶🇦 🇦🇪 🇧🇭
      </footer>
    </div>
  );
}
