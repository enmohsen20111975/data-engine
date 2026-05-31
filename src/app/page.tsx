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
}

interface HistoricalSummary {
  id: string;
  symbol: string;
  nameAr: string | null;
  nameEn: string | null;
  exchange: string;
  country: string | null;
  recordsCount: number;
  latestDate: string | null;
  latestClose: number | null;
}

interface Stats {
  totalStocks: number;
  historicalCount: number;
  stocksByExchange: { exchange: string; count: number }[];
}

interface LogEntry {
  time: string;
  type: 'info' | 'success' | 'error' | 'warning';
  message: string;
}

interface TaskProgress {
  running: boolean;
  task: string | null;
  progress: number;
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
  const [taskProgress, setTaskProgress] = useState<TaskProgress>({
    running: false,
    task: null,
    progress: 0,
    message: ''
  });

  // Add log entry
  const addLog = useCallback((type: LogEntry['type'], message: string) => {
    const entry: LogEntry = {
      time: new Date().toLocaleTimeString('ar-EG'),
      type,
      message
    };
    setLogs(prev => [...prev.slice(-99), entry]);
  }, []);

  // Fetch stats only
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      addLog('error', 'خطأ في تحميل الإحصائيات');
    }
  }, [addLog]);

  // Fetch stocks
  const fetchStocks = useCallback(async () => {
    try {
      addLog('info', 'جاري تحميل الأسهم...');
      const res = await fetch('/api/stocks?limit=200');
      if (res.ok) {
        const data = await res.json();
        setStocks(data);
        addLog('success', `تم تحميل ${data.length} سهم`);
      } else {
        addLog('error', 'خطأ في تحميل الأسهم');
      }
    } catch (error) {
      addLog('error', 'خطأ في الاتصال');
    } finally {
      setLoading(false);
    }
  }, [addLog]);

  // Fetch historical
  const fetchHistorical = useCallback(async () => {
    try {
      addLog('info', 'جاري تحميل البيانات التاريخية...');
      const res = await fetch('/api/historical?limit=50');
      if (res.ok) {
        const data = await res.json();
        setHistoricalData(data);
        addLog('success', `تم تحميل ملخص ${data.length} سهم`);
      } else {
        addLog('error', 'خطأ في تحميل البيانات التاريخية');
      }
    } catch (error) {
      addLog('error', 'خطأ في تحميل البيانات التاريخية');
    }
  }, [addLog]);

  // Initial load
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchStats();
      await fetchStocks();
    };
    init();
  }, [fetchStats, fetchStocks]);

  // Load historical when tab is selected
  useEffect(() => {
    if (activeTab === 'historical' && historicalData.length === 0) {
      fetchHistorical();
    }
  }, [activeTab, historicalData.length, fetchHistorical]);

  // Run task
  const runTask = async (action: string, label: string) => {
    addLog('info', `🚀 بدء ${label}...`);
    setTaskProgress({
      running: true,
      task: action,
      progress: 0,
      message: `جاري ${label}...`
    });

    // Simulate progress
    const progressInterval = setInterval(() => {
      setTaskProgress(prev => ({
        ...prev,
        progress: Math.min(prev.progress + 5, 90)
      }));
    }, 500);

    try {
      const res = await fetch('/api/scraper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      
      const data = await res.json();
      
      clearInterval(progressInterval);
      setTaskProgress({
        running: false,
        task: null,
        progress: 100,
        message: data.message || 'تم بنجاح'
      });
      
      addLog('success', `✅ ${data.message || 'تم بنجاح'}`);
      
      // Refresh data
      setTimeout(() => {
        fetchStats();
        fetchStocks();
      }, 2000);
    } catch (error) {
      clearInterval(progressInterval);
      setTaskProgress({
        running: false,
        task: null,
        progress: 0,
        message: 'حدث خطأ'
      });
      addLog('error', `❌ خطأ في ${label}`);
    }
  };

  // Filter stocks
  const filteredStocks = stocks.filter(stock => {
    const matchesExchange = selectedExchange === 'all' || stock.exchange === selectedExchange;
    const matchesSearch = !searchQuery || 
      stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (stock.nameAr?.includes(searchQuery)) ||
      (stock.nameEn?.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesExchange && matchesSearch;
  });

  // Exchange labels
  const exchangeLabels: Record<string, string> = {
    'KSA': '🇸🇦 السعودية',
    'EGX': '🇪🇬 مصر',
    'KSE': '🇰🇼 الكويت',
    'QE': '🇶🇦 قطر',
    'UAE': '🇦🇪 الإمارات',
    'BAH': '🇧🇭 البحرين'
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-center text-white">
          <div className="text-6xl mb-4 animate-spin">⚙️</div>
          <p className="text-xl">جارٍ تحميل Data Engine...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white font-sans" dir="rtl">
      {/* Header */}
      <header className="py-6 px-6 border-b border-white/10 bg-black/20">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
              🏭 Data Engine
            </h1>
            <p className="text-slate-400 text-sm">محرك البيانات للبورصات العربية - 6 بورصات</p>
          </div>
          
          {taskProgress.running && (
            <div className="flex items-center gap-4 bg-white/5 px-4 py-2 rounded-lg">
              <span className="text-amber-400 animate-pulse">⏳</span>
              <div className="w-48">
                <div className="text-xs text-slate-400 mb-1">{taskProgress.message}</div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-emerald-400 to-cyan-400 h-2 rounded-full transition-all"
                    style={{ width: `${taskProgress.progress}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Tabs */}
      <nav className="border-b border-white/10 bg-black/10">
        <div className="max-w-7xl mx-auto flex gap-1 px-6 overflow-x-auto">
          {[
            { id: 'dashboard', label: '📊 لوحة المعلومات' },
            { id: 'stocks', label: '📈 الأسهم' },
            { id: 'historical', label: '📉 التاريخية' },
            { id: 'control', label: '🎮 التحكم' },
            { id: 'console', label: '💻 الكونسول' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-6 py-3 whitespace-nowrap transition-all ${
                activeTab === tab.id 
                  ? 'bg-emerald-500/20 text-emerald-400 border-b-2 border-emerald-500' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Dashboard */}
        {activeTab === 'dashboard' && stats && (
          <div className="space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard value={stats.totalStocks} label="إجمالي الأسهم" icon="📊" color="emerald" />
              <StatCard value={stats.historicalCount.toLocaleString()} label="سجل تاريخي" icon="📈" color="blue" />
              <StatCard value={stats.stocksByExchange.length} label="بورصات" icon="🏛️" color="purple" />
              <StatCard value={filteredStocks.length} label="معروض" icon="🔍" color="amber" />
            </div>

            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <h2 className="text-xl font-bold mb-4">🗺️ توزيع الأسهم</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {stats.stocksByExchange.map((ex) => {
                  const pct = Math.round((ex.count / stats.totalStocks) * 100);
                  return (
                    <div key={ex.exchange} className="bg-white/5 rounded-lg p-4">
                      <div className="flex justify-between mb-2">
                        <span>{exchangeLabels[ex.exchange] || ex.exchange}</span>
                        <span className="text-slate-400">{ex.count}</span>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-2">
                        <div className="bg-gradient-to-r from-emerald-400 to-cyan-400 h-2 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <h2 className="text-xl font-bold mb-4">⚡ إجراءات سريعة</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <ControlButton label="📊 الأسعار" onClick={() => runTask('prices', 'تحديث الأسعار')} disabled={taskProgress.running} color="blue" />
                <ControlButton label="📈 التاريخية" onClick={() => runTask('historical', 'البيانات التاريخية')} disabled={taskProgress.running} color="purple" />
                <ControlButton label="🖼️ الأيقونات" onClick={() => runTask('icons', 'تحميل الأيقونات')} disabled={taskProgress.running} color="amber" />
                <ControlButton label="🔄 الكل" onClick={() => runTask('all', 'تحديث شامل')} disabled={taskProgress.running} color="emerald" primary />
              </div>
            </div>
          </div>
        )}

        {/* Stocks */}
        {activeTab === 'stocks' && (
          <div className="space-y-6">
            {stats && (
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setSelectedExchange('all')} className={`px-4 py-2 rounded-lg ${selectedExchange === 'all' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 border-2' : 'bg-white/5 border border-white/10'}`}>
                  الكل ({stats.totalStocks})
                </button>
                {stats.stocksByExchange.map(ex => (
                  <button key={ex.exchange} onClick={() => setSelectedExchange(ex.exchange)} className={`px-4 py-2 rounded-lg ${selectedExchange === ex.exchange ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 border-2' : 'bg-white/5 border border-white/10'}`}>
                    {exchangeLabels[ex.exchange]} ({ex.count})
                  </button>
                ))}
              </div>
            )}

            <input
              type="text"
              placeholder="🔍 ابحث..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full md:w-96 px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-emerald-500"
            />

            <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
              <div className="p-4 border-b border-white/10 flex justify-between">
                <span className="font-bold">الأسهم ({filteredStocks.length})</span>
                <button onClick={fetchStocks} className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10">🔄</button>
              </div>
              <div className="overflow-auto max-h-[500px]">
                <table className="w-full">
                  <thead className="sticky top-0 bg-slate-800">
                    <tr className="border-b border-white/10">
                      <th className="p-3 text-right">الرمز</th>
                      <th className="p-3 text-right">الاسم</th>
                      <th className="p-3 text-right">البورصة</th>
                      <th className="p-3 text-right">القطاع</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStocks.map(stock => (
                      <tr key={stock.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="p-3 font-bold text-cyan-400">{stock.symbol}</td>
                        <td className="p-3">{stock.nameAr || stock.nameEn || '-'}</td>
                        <td className="p-3"><span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-sm">{exchangeLabels[stock.exchange] || stock.exchange}</span></td>
                        <td className="p-3 text-slate-400">{stock.sector || '-'}</td>
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
          <div className="space-y-6">
            <div className="flex justify-between">
              <h2 className="text-xl font-bold">📉 البيانات التاريخية</h2>
              <button onClick={fetchHistorical} className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10">🔄</button>
            </div>

            <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
              <div className="overflow-auto max-h-[600px]">
                <table className="w-full">
                  <thead className="sticky top-0 bg-slate-800">
                    <tr className="border-b border-white/10">
                      <th className="p-3 text-right">الرمز</th>
                      <th className="p-3 text-right">الاسم</th>
                      <th className="p-3 text-right">البورصة</th>
                      <th className="p-3 text-right">السجلات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historicalData.map(item => (
                      <tr key={item.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="p-3 font-bold text-cyan-400">{item.symbol}</td>
                        <td className="p-3">{item.nameAr || item.nameEn || '-'}</td>
                        <td className="p-3"><span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-sm">{exchangeLabels[item.exchange] || item.exchange}</span></td>
                        <td className="p-3"><span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded font-mono">{item.recordsCount}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Control */}
        {activeTab === 'control' && (
          <div className="space-y-6">
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <h2 className="text-xl font-bold mb-4">⚡ إجراءات سريعة</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <ControlButton label="📊 الأسعار" onClick={() => runTask('prices', 'تحديث الأسعار')} disabled={taskProgress.running} color="blue" />
                <ControlButton label="📈 التاريخية" onClick={() => runTask('historical', 'البيانات التاريخية')} disabled={taskProgress.running} color="purple" />
                <ControlButton label="🖼️ الأيقونات" onClick={() => runTask('icons', 'تحميل الأيقونات')} disabled={taskProgress.running} color="amber" />
                <ControlButton label="🔄 الكل" onClick={() => runTask('all', 'تحديث شامل')} disabled={taskProgress.running} color="emerald" primary />
              </div>
            </div>

            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <h2 className="text-xl font-bold mb-2">🚀 مهام متوازية</h2>
              <p className="text-slate-400 mb-4 text-sm">تشغيل عدة مهام في نفس الوقت</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ControlButton label="🇸🇦 السعودية + 🇪🇬 مصر" onClick={() => runTask('parallel_ksa_egx', 'معالجة متوازية')} disabled={taskProgress.running} color="blue" />
                <ControlButton label="🇰🇼 الكويت + 🇶🇦 قطر" onClick={() => runTask('parallel_kse_qe', 'معالجة متوازية')} disabled={taskProgress.running} color="purple" />
                <ControlButton label="🇦🇪 الإمارات + 🇧🇭 البحرين" onClick={() => runTask('parallel_uae_bah', 'معالجة متوازية')} disabled={taskProgress.running} color="amber" />
              </div>
            </div>

            {taskProgress.message && (
              <div className={`rounded-xl p-6 border ${taskProgress.running ? 'bg-amber-500/10 border-amber-500/30' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
                <div className="flex items-center gap-4">
                  <span className="text-4xl">{taskProgress.running ? '⏳' : '✅'}</span>
                  <div className="flex-1">
                    <p className="font-medium">{taskProgress.message}</p>
                    {taskProgress.running && (
                      <div className="mt-2">
                        <div className="flex justify-between text-sm mb-1">
                          <span>التقدم</span>
                          <span>{taskProgress.progress}%</span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-3">
                          <div className="bg-gradient-to-r from-emerald-400 to-cyan-400 h-3 rounded-full transition-all" style={{ width: `${taskProgress.progress}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Console */}
        {activeTab === 'console' && (
          <div className="space-y-4">
            <div className="flex justify-between">
              <h2 className="text-xl font-bold">💻 الكونسول</h2>
              <button onClick={() => setLogs([])} className="px-4 py-2 bg-red-500/20 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-500/30">🗑️ مسح</button>
            </div>

            <div className="bg-black/50 rounded-xl border border-white/10 font-mono text-sm overflow-hidden">
              <div className="bg-white/5 px-4 py-2 border-b border-white/10 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500" />
                <span className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="w-3 h-3 rounded-full bg-green-500" />
                <span className="mr-4 text-slate-400">Console</span>
              </div>
              <div className="p-4 h-[500px] overflow-y-auto" dir="ltr">
                {logs.length === 0 ? (
                  <p className="text-slate-500">لا توجد سجلات...</p>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className={`py-1 ${log.type === 'success' ? 'text-emerald-400' : log.type === 'error' ? 'text-red-400' : 'text-slate-300'}`}>
                      <span className="text-slate-500">[{log.time}]</span> {log.message}
                    </div>
                  ))
                )}
              </div>
            </div>

            {stats && (
              <div className="bg-white/5 rounded-xl p-4 border border-white/10 grid grid-cols-4 gap-4 text-center">
                <div><div className="text-emerald-400 text-2xl font-bold">{stats.totalStocks}</div><div className="text-slate-400 text-sm">أسهم</div></div>
                <div><div className="text-blue-400 text-2xl font-bold">{stats.historicalCount.toLocaleString()}</div><div className="text-slate-400 text-sm">سجلات</div></div>
                <div><div className="text-purple-400 text-2xl font-bold">{stats.stocksByExchange.length}</div><div className="text-slate-400 text-sm">بورصات</div></div>
                <div><div className="text-amber-400 text-2xl font-bold">{logs.length}</div><div className="text-slate-400 text-sm">سجلات</div></div>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="py-4 text-center text-slate-500 border-t border-white/10">
        Data Engine v1.0 | 🇸🇦 🇪🇬 🇰🇼 🇶🇦 🇦🇪 🇧🇭
      </footer>
    </div>
  );
}

function StatCard({ value, label, icon, color }: { value: string | number; label: string; icon: string; color: string }) {
  const colors: Record<string, string> = { emerald: 'text-emerald-400', blue: 'text-blue-400', purple: 'text-purple-400', amber: 'text-amber-400' };
  const bgs: Record<string, string> = { emerald: 'border-emerald-500/30', blue: 'border-blue-500/30', purple: 'border-purple-500/30', amber: 'border-amber-500/30' };
  return (
    <div className={`bg-white/5 rounded-xl p-4 border ${bgs[color]}`}>
      <div className="text-2xl mb-2">{icon}</div>
      <div className={`text-2xl font-bold ${colors[color]}`}>{value}</div>
      <div className="text-slate-400 text-sm">{label}</div>
    </div>
  );
}

function ControlButton({ label, onClick, disabled, color, primary }: { label: string; onClick: () => void; disabled?: boolean; color: string; primary?: boolean }) {
  const styles: Record<string, string> = {
    emerald: 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white',
    blue: 'bg-blue-500/20 border-blue-500/50 text-white',
    purple: 'bg-purple-500/20 border-purple-500/50 text-white',
    amber: 'bg-amber-500/20 border-amber-500/50 text-white'
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`px-4 py-3 rounded-lg font-medium transition-all disabled:opacity-50 ${primary ? styles[color] : `border ${styles[color]}`}`}>
      {label}
    </button>
  );
}
