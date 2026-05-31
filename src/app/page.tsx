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

interface Stats {
  totalStocks: number;
  historicalCount: number;
  stocksByExchange: { exchange: string; count: number }[];
}

interface TaskStatus {
  running: boolean;
  task: string | null;
  progress: number;
  message: string;
  logs: string[];
}

export default function DataFactory() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedExchange, setSelectedExchange] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [taskStatus, setTaskStatus] = useState<TaskStatus>({
    running: false,
    task: null,
    progress: 0,
    message: '',
    logs: []
  });
  const [activeTab, setActiveTab] = useState<'stocks' | 'control' | 'logs'>('stocks');

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      const [statsRes, stocksRes] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/stocks?limit=500')
      ]);
      
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
      
      if (stocksRes.ok) {
        const stocksData = await stocksRes.json();
        setStocks(stocksData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Run scraper task
  const runTask = async (action: string, label: string) => {
    setTaskStatus(prev => ({
      ...prev,
      running: true,
      task: action,
      progress: 0,
      message: `جاري ${label}...`,
      logs: [...prev.logs, `[${new Date().toLocaleTimeString('ar-EG')}] بدء ${label}`]
    }));
    
    try {
      const res = await fetch('/api/scraper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      
      const data = await res.json();
      
      setTaskStatus(prev => ({
        ...prev,
        running: false,
        progress: 100,
        message: data.message || 'تم بنجاح',
        logs: [...prev.logs, `[${new Date().toLocaleTimeString('ar-EG')}] ✅ ${data.message || 'تم بنجاح'}`]
      }));
      
      setTimeout(fetchData, 2000);
    } catch (error) {
      setTaskStatus(prev => ({
        ...prev,
        running: false,
        message: 'حدث خطأ',
        logs: [...prev.logs, `[${new Date().toLocaleTimeString('ar-EG')}] ❌ حدث خطأ`]
      }));
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
          <div className="text-6xl mb-4 animate-pulse">⏳</div>
          <p className="text-xl">جارٍ التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white font-sans" dir="rtl">
      {/* Header */}
      <header className="py-8 px-6 border-b border-white/10">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
            🏭 Data Engine
          </h1>
          <p className="text-slate-400 mt-2">محرك البيانات للبورصات العربية - 6 بورصات</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard value={stats.totalStocks} label="إجمالي الأسهم" icon="📊" color="emerald" />
            <StatCard value={stats.historicalCount.toLocaleString()} label="سجل تاريخي" icon="📈" color="blue" />
            <StatCard value={stats.stocksByExchange.length} label="بورصات" icon="🏛️" color="purple" />
            <StatCard value={filteredStocks.length} label="معروض" icon="🔍" color="amber" />
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 border-b border-white/10 pb-4">
          <TabButton active={activeTab === 'stocks'} onClick={() => setActiveTab('stocks')}>
            📊 الأسهم
          </TabButton>
          <TabButton active={activeTab === 'control'} onClick={() => setActiveTab('control')}>
            🎮 لوحة التحكم
          </TabButton>
          <TabButton active={activeTab === 'logs'} onClick={() => setActiveTab('logs')}>
            📝 السجلات
          </TabButton>
        </div>

        {/* Control Panel Tab */}
        {activeTab === 'control' && (
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span>⚡</span> إجراءات سريعة
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <ControlButton 
                  label="📊 تحديث الأسعار" 
                  onClick={() => runTask('prices', 'تحديث الأسعار')}
                  disabled={taskStatus.running}
                  color="blue"
                />
                <ControlButton 
                  label="📈 البيانات التاريخية" 
                  onClick={() => runTask('historical', 'جلب البيانات التاريخية')}
                  disabled={taskStatus.running}
                  color="purple"
                />
                <ControlButton 
                  label="🖼️ تحميل الأيقونات" 
                  onClick={() => runTask('icons', 'تحميل الأيقونات')}
                  disabled={taskStatus.running}
                  color="amber"
                />
                <ControlButton 
                  label="🔄 تحديث الكل" 
                  onClick={() => runTask('all', 'تحديث شامل')}
                  disabled={taskStatus.running}
                  color="emerald"
                  primary
                />
              </div>
            </div>

            {/* Parallel Tasks */}
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span>🚀</span> مهام متوازية (للأجهزة القوية)
              </h2>
              <p className="text-slate-400 mb-4 text-sm">
                تشغيل عدة مهام في نفس الوقت لاستغلال قوة الجهاز
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ControlButton 
                  label="🇸🇦 السعودية + 🇪🇬 مصر" 
                  onClick={() => runTask('parallel_ksa_egx', 'معالجة السعودية ومصر')}
                  disabled={taskStatus.running}
                  color="blue"
                />
                <ControlButton 
                  label="🇰🇼 الكويت + 🇶🇦 قطر" 
                  onClick={() => runTask('parallel_kse_qe', 'معالجة الكويت وقطر')}
                  disabled={taskStatus.running}
                  color="purple"
                />
                <ControlButton 
                  label="🇦🇪 الإمارات + 🇧🇭 البحرين" 
                  onClick={() => runTask('parallel_uae_bah', 'معالجة الإمارات والبحرين')}
                  disabled={taskStatus.running}
                  color="amber"
                />
              </div>
            </div>

            {/* Status */}
            {taskStatus.message && (
              <div className={`rounded-xl p-4 border ${
                taskStatus.running 
                  ? 'bg-amber-500/10 border-amber-500/30' 
                  : 'bg-emerald-500/10 border-emerald-500/30'
              }`}>
                <div className="flex items-center gap-3">
                  {taskStatus.running ? (
                    <span className="animate-spin text-2xl">⏳</span>
                  ) : (
                    <span className="text-2xl">✅</span>
                  )}
                  <div>
                    <p className="font-medium">{taskStatus.message}</p>
                    {taskStatus.running && (
                      <div className="mt-2 w-full bg-white/10 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-emerald-400 to-cyan-400 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${taskStatus.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Logs Tab */}
        {activeTab === 'logs' && (
          <div className="bg-white/5 rounded-xl p-6 border border-white/10">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <span>📝</span> سجلات النظام
              </h2>
              <button 
                onClick={() => setTaskStatus(prev => ({ ...prev, logs: [] }))}
                className="text-sm text-slate-400 hover:text-white transition-colors"
              >
                مسح السجلات
              </button>
            </div>
            <div className="bg-black/30 rounded-lg p-4 font-mono text-sm max-h-96 overflow-y-auto" dir="ltr">
              {taskStatus.logs.length === 0 ? (
                <p className="text-slate-500">لا توجد سجلات بعد...</p>
              ) : (
                taskStatus.logs.map((log, i) => (
                  <div key={i} className="py-1 border-b border-white/5 last:border-0">
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Stocks Tab */}
        {activeTab === 'stocks' && (
          <>
            {/* Exchange Filter */}
            {stats && (
              <div className="flex flex-wrap gap-2 mb-6">
                <button
                  onClick={() => setSelectedExchange('all')}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    selectedExchange === 'all' 
                      ? 'bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400' 
                      : 'bg-white/5 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  الكل ({stats.totalStocks})
                </button>
                {stats.stocksByExchange.map((ex) => (
                  <button
                    key={ex.exchange}
                    onClick={() => setSelectedExchange(ex.exchange)}
                    className={`px-4 py-2 rounded-lg transition-all ${
                      selectedExchange === ex.exchange 
                        ? 'bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400' 
                        : 'bg-white/5 border border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {exchangeLabels[ex.exchange] || ex.exchange} ({ex.count})
                  </button>
                ))}
              </div>
            )}

            {/* Search */}
            <div className="mb-6">
              <input
                type="text"
                placeholder="🔍 ابحث عن سهم..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full md:w-96 px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            {/* Stocks Table */}
            <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
              <div className="p-4 border-b border-white/10 flex justify-between items-center">
                <span className="font-bold">الأسهم ({filteredStocks.length})</span>
                <button 
                  onClick={fetchData}
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
                >
                  🔄 تحديث
                </button>
              </div>
              
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-slate-800 z-10">
                    <tr className="border-b border-white/10">
                      <th className="p-4 text-right">الرمز</th>
                      <th className="p-4 text-right">الاسم</th>
                      <th className="p-4 text-right">البورصة</th>
                      <th className="p-4 text-right">الدولة</th>
                      <th className="p-4 text-right">القطاع</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStocks.map((stock) => (
                      <tr key={stock.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {stock.iconUrl && (
                              <img src={stock.iconUrl} alt="" className="w-6 h-6 rounded" />
                            )}
                            <span className="font-bold text-cyan-400">{stock.symbol}</span>
                          </div>
                        </td>
                        <td className="p-4">{stock.nameAr || stock.nameEn || '-'}</td>
                        <td className="p-4">
                          <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-sm">
                            {exchangeLabels[stock.exchange] || stock.exchange}
                          </span>
                        </td>
                        <td className="p-4 text-slate-400">{stock.country || '-'}</td>
                        <td className="p-4 text-slate-400">{stock.sector || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-slate-500 border-t border-white/10 mt-8">
        <p>Data Engine v1.0 | Saudi Arabia, Egypt, Kuwait, Qatar, UAE, Bahrain</p>
      </footer>
    </div>
  );
}

// Components
function StatCard({ value, label, icon, color }: { value: string | number; label: string; icon: string; color: string }) {
  const colorClasses: Record<string, string> = {
    emerald: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/30',
    blue: 'from-blue-500/20 to-blue-500/5 border-blue-500/30',
    purple: 'from-purple-500/20 to-purple-500/5 border-purple-500/30',
    amber: 'from-amber-500/20 to-amber-500/5 border-amber-500/30'
  };
  
  const textColors: Record<string, string> = {
    emerald: 'text-emerald-400',
    blue: 'text-blue-400',
    purple: 'text-purple-400',
    amber: 'text-amber-400'
  };
  
  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} border rounded-xl p-4`}>
      <div className="text-2xl mb-2">{icon}</div>
      <div className={`text-2xl font-bold ${textColors[color]}`}>{value}</div>
      <div className="text-slate-400 text-sm">{label}</div>
    </div>
  );
}

function TabButton({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-3 rounded-lg transition-all ${
        active 
          ? 'bg-emerald-500/20 text-emerald-400 border-b-2 border-emerald-500' 
          : 'text-slate-400 hover:text-white hover:bg-white/5'
      }`}
    >
      {children}
    </button>
  );
}

function ControlButton({ 
  label, 
  onClick, 
  disabled, 
  color,
  primary 
}: { 
  label: string; 
  onClick: () => void; 
  disabled?: boolean; 
  color: string;
  primary?: boolean;
}) {
  const colorClasses: Record<string, string> = {
    emerald: 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700',
    blue: 'bg-blue-500/20 border-blue-500/50 hover:bg-blue-500/30',
    purple: 'bg-purple-500/20 border-purple-500/50 hover:bg-purple-500/30',
    amber: 'bg-amber-500/20 border-amber-500/50 hover:bg-amber-500/30'
  };
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-3 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
        primary 
          ? `${colorClasses[color]} text-white shadow-lg shadow-emerald-500/25` 
          : `${colorClasses[color]} border text-white`
      }`}
    >
      {label}
    </button>
  );
}
