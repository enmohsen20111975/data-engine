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
  oldestDate: string | null;
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
  startTime: Date | null;
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
    message: '',
    startTime: null
  });
  const [selectedStockDetails, setSelectedStockDetails] = useState<HistoricalSummary | null>(null);

  // Add log entry
  const addLog = useCallback((type: LogEntry['type'], message: string) => {
    const entry: LogEntry = {
      time: new Date().toLocaleTimeString('ar-EG'),
      type,
      message
    };
    setLogs(prev => [...prev.slice(-99), entry]);
  }, []);

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      addLog('info', 'جاري تحديث البيانات...');
      const [statsRes, stocksRes] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/stocks?limit=500')
      ]);
      
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
        addLog('success', `تم تحميل ${statsData.totalStocks} سهم و ${statsData.historicalCount} سجل تاريخي`);
      }
      
      if (stocksRes.ok) {
        const stocksData = await stocksRes.json();
        setStocks(stocksData);
      }
    } catch (error) {
      addLog('error', 'خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, [addLog]);

  // Fetch historical summary
  const fetchHistorical = useCallback(async () => {
    try {
      addLog('info', 'جاري تحميل البيانات التاريخية...');
      const res = await fetch('/api/historical?limit=200');
      if (res.ok) {
        const data = await res.json();
        setHistoricalData(data);
        addLog('success', `تم تحميل ملخص ${data.length} سهم تاريخي`);
      }
    } catch (error) {
      addLog('error', 'خطأ في تحميل البيانات التاريخية');
    }
  }, [addLog]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    if (activeTab === 'historical' && historicalData.length === 0) {
      fetchHistorical();
    }
  }, [activeTab, historicalData.length, fetchHistorical]);

  // Simulate progress for tasks
  const simulateProgress = (taskName: string, duration: number = 30000) => {
    setTaskProgress({
      running: true,
      task: taskName,
      progress: 0,
      message: `بدء ${taskName}...`,
      startTime: new Date()
    });

    const steps = 20;
    const stepDuration = duration / steps;
    let currentStep = 0;

    const interval = setInterval(() => {
      currentStep++;
      const progress = Math.min((currentStep / steps) * 100, 95);
      setTaskProgress(prev => ({
        ...prev,
        progress,
        message: `${taskName}... ${Math.round(progress)}%`
      }));
      
      if (currentStep >= steps) {
        clearInterval(interval);
      }
    }, stepDuration);

    return interval;
  };

  // Run scraper task
  const runTask = async (action: string, label: string) => {
    addLog('info', `🚀 بدء ${label}...`);
    const progressInterval = simulateProgress(label, 60000);
    
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
        message: data.message || 'تم بنجاح',
        startTime: null
      });
      
      addLog('success', `✅ ${data.message || 'تم بنجاح'}`);
      
      setTimeout(() => {
        fetchData();
        if (activeTab === 'historical') fetchHistorical();
      }, 2000);
    } catch (error) {
      clearInterval(progressInterval);
      setTaskProgress({
        running: false,
        task: null,
        progress: 0,
        message: 'حدث خطأ',
        startTime: null
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
          <div className="mt-4 w-64 h-2 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 animate-pulse" style={{width: '60%'}} />
          </div>
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
            <p className="text-slate-400 text-sm">محرك البيانات للبورصات العربية</p>
          </div>
          
          {/* Quick Progress Bar */}
          {taskProgress.running && (
            <div className="flex items-center gap-4 bg-white/5 px-4 py-2 rounded-lg">
              <span className="text-amber-400 animate-pulse">⏳</span>
              <div className="w-48">
                <div className="text-xs text-slate-400 mb-1">{taskProgress.message}</div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-emerald-400 to-cyan-400 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${taskProgress.progress}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="border-b border-white/10 bg-black/10">
        <div className="max-w-7xl mx-auto flex gap-1 px-6">
          <TabButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')}>
            📊 لوحة المعلومات
          </TabButton>
          <TabButton active={activeTab === 'stocks'} onClick={() => setActiveTab('stocks')}>
            📈 الأسهم
          </TabButton>
          <TabButton active={activeTab === 'historical'} onClick={() => setActiveTab('historical')}>
            📉 البيانات التاريخية
          </TabButton>
          <TabButton active={activeTab === 'control'} onClick={() => setActiveTab('control')}>
            🎮 التحكم
          </TabButton>
          <TabButton active={activeTab === 'console'} onClick={() => setActiveTab('console')}>
            💻 الكونسول
          </TabButton>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && stats && (
          <div className="space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard value={stats.totalStocks} label="إجمالي الأسهم" icon="📊" color="emerald" />
              <StatCard value={stats.historicalCount.toLocaleString()} label="سجل تاريخي" icon="📈" color="blue" />
              <StatCard value={stats.stocksByExchange.length} label="بورصات" icon="🏛️" color="purple" />
              <StatCard value={filteredStocks.length} label="معروض الآن" icon="🔍" color="amber" />
            </div>

            {/* Exchange Distribution */}
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <h2 className="text-xl font-bold mb-4">🗺️ توزيع الأسهم حسب البورصة</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {stats.stocksByExchange.map((ex) => {
                  const percentage = Math.round((ex.count / stats.totalStocks) * 100);
                  return (
                    <div key={ex.exchange} className="bg-white/5 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">{exchangeLabels[ex.exchange] || ex.exchange}</span>
                        <span className="text-slate-400">{ex.count}</span>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-3">
                        <div 
                          className="bg-gradient-to-r from-emerald-400 to-cyan-400 h-3 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="text-xs text-slate-500 mt-1">{percentage}%</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <h2 className="text-xl font-bold mb-4">⚡ إجراءات سريعة</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <ControlButton 
                  label="📊 تحديث الأسعار" 
                  onClick={() => runTask('prices', 'تحديث الأسعار')}
                  disabled={taskProgress.running}
                  color="blue"
                />
                <ControlButton 
                  label="📈 البيانات التاريخية" 
                  onClick={() => runTask('historical', 'جلب البيانات التاريخية')}
                  disabled={taskProgress.running}
                  color="purple"
                />
                <ControlButton 
                  label="🖼️ تحميل الأيقونات" 
                  onClick={() => runTask('icons', 'تحميل الأيقونات')}
                  disabled={taskProgress.running}
                  color="amber"
                />
                <ControlButton 
                  label="🔄 تحديث الكل" 
                  onClick={() => runTask('all', 'تحديث شامل')}
                  disabled={taskProgress.running}
                  color="emerald"
                  primary
                />
              </div>
            </div>
          </div>
        )}

        {/* Stocks Tab */}
        {activeTab === 'stocks' && (
          <div className="space-y-6">
            {/* Exchange Filter */}
            {stats && (
              <div className="flex flex-wrap gap-2">
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
            <input
              type="text"
              placeholder="🔍 ابحث عن سهم..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full md:w-96 px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-emerald-500 transition-colors"
            />

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
          </div>
        )}

        {/* Historical Data Tab */}
        {activeTab === 'historical' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">📉 ملخص البيانات التاريخية</h2>
              <button 
                onClick={fetchHistorical}
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
              >
                🔄 تحديث
              </button>
            </div>

            <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-slate-800 z-10">
                    <tr className="border-b border-white/10">
                      <th className="p-4 text-right">الرمز</th>
                      <th className="p-4 text-right">الاسم</th>
                      <th className="p-4 text-right">البورصة</th>
                      <th className="p-4 text-right">السجلات</th>
                      <th className="p-4 text-right">أحدث تاريخ</th>
                      <th className="p-4 text-right">أقدم تاريخ</th>
                      <th className="p-4 text-right">آخر إغلاق</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historicalData.map((item) => (
                      <tr 
                        key={item.id} 
                        className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                        onClick={() => setSelectedStockDetails(item)}
                      >
                        <td className="p-4 font-bold text-cyan-400">{item.symbol}</td>
                        <td className="p-4">{item.nameAr || item.nameEn || '-'}</td>
                        <td className="p-4">
                          <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-sm">
                            {exchangeLabels[item.exchange] || item.exchange}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded font-mono">
                            {item.recordsCount}
                          </span>
                        </td>
                        <td className="p-4 text-slate-300 font-mono text-sm">{item.latestDate || '-'}</td>
                        <td className="p-4 text-slate-400 font-mono text-sm">{item.oldestDate || '-'}</td>
                        <td className="p-4 text-amber-400 font-mono">{item.latestClose?.toFixed(2) || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Selected Stock Details */}
            {selectedStockDetails && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedStockDetails(null)}>
                <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-2xl font-bold text-cyan-400">{selectedStockDetails.symbol}</h3>
                      <p className="text-slate-400">{selectedStockDetails.nameAr || selectedStockDetails.nameEn}</p>
                    </div>
                    <button 
                      onClick={() => setSelectedStockDetails(null)}
                      className="text-slate-400 hover:text-white text-2xl"
                    >
                      ×
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-slate-400">البورصة:</span>
                      <span>{exchangeLabels[selectedStockDetails.exchange] || selectedStockDetails.exchange}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">عدد السجلات:</span>
                      <span className="text-emerald-400 font-mono">{selectedStockDetails.recordsCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">أحدث تاريخ:</span>
                      <span className="font-mono">{selectedStockDetails.latestDate || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">أقدم تاريخ:</span>
                      <span className="font-mono">{selectedStockDetails.oldestDate || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">آخر إغلاق:</span>
                      <span className="text-amber-400 font-mono">{selectedStockDetails.latestClose?.toFixed(2) || '-'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Control Tab */}
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
                  disabled={taskProgress.running}
                  color="blue"
                />
                <ControlButton 
                  label="📈 البيانات التاريخية" 
                  onClick={() => runTask('historical', 'جلب البيانات التاريخية')}
                  disabled={taskProgress.running}
                  color="purple"
                />
                <ControlButton 
                  label="🖼️ تحميل الأيقونات" 
                  onClick={() => runTask('icons', 'تحميل الأيقونات')}
                  disabled={taskProgress.running}
                  color="amber"
                />
                <ControlButton 
                  label="🔄 تحديث الكل" 
                  onClick={() => runTask('all', 'تحديث شامل')}
                  disabled={taskProgress.running}
                  color="emerald"
                  primary
                />
              </div>
            </div>

            {/* Parallel Tasks */}
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
                <span>🚀</span> مهام متوازية
              </h2>
              <p className="text-slate-400 mb-4 text-sm">
                تشغيل عدة مهام في نفس الوقت لاستغلال قوة الجهاز
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ControlButton 
                  label="🇸🇦 السعودية + 🇪🇬 مصر" 
                  onClick={() => runTask('parallel_ksa_egx', 'معالجة السعودية ومصر')}
                  disabled={taskProgress.running}
                  color="blue"
                />
                <ControlButton 
                  label="🇰🇼 الكويت + 🇶🇦 قطر" 
                  onClick={() => runTask('parallel_kse_qe', 'معالجة الكويت وقطر')}
                  disabled={taskProgress.running}
                  color="purple"
                />
                <ControlButton 
                  label="🇦🇪 الإمارات + 🇧🇭 البحرين" 
                  onClick={() => runTask('parallel_uae_bah', 'معالجة الإمارات والبحرين')}
                  disabled={taskProgress.running}
                  color="amber"
                />
              </div>
            </div>

            {/* Task Progress */}
            {taskProgress.message && (
              <div className={`rounded-xl p-6 border ${
                taskProgress.running 
                  ? 'bg-amber-500/10 border-amber-500/30' 
                  : 'bg-emerald-500/10 border-emerald-500/30'
              }`}>
                <div className="flex items-center gap-4 mb-4">
                  {taskProgress.running ? (
                    <span className="text-4xl animate-spin">⚙️</span>
                  ) : (
                    <span className="text-4xl">✅</span>
                  )}
                  <div className="flex-1">
                    <p className="text-lg font-medium">{taskProgress.message}</p>
                    {taskProgress.startTime && (
                      <p className="text-sm text-slate-400">
                        بدأ: {taskProgress.startTime.toLocaleTimeString('ar-EG')}
                      </p>
                    )}
                  </div>
                </div>
                
                {taskProgress.running && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>التقدم</span>
                      <span>{Math.round(taskProgress.progress)}%</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-4">
                      <div 
                        className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 h-4 rounded-full transition-all duration-300 relative overflow-hidden"
                        style={{ width: `${taskProgress.progress}%` }}
                      >
                        <div className="absolute inset-0 bg-white/20 animate-pulse" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Console Tab */}
        {activeTab === 'console' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <span>💻</span> كونسول النظام
              </h2>
              <div className="flex gap-2">
                <button 
                  onClick={() => setLogs([])}
                  className="px-4 py-2 bg-red-500/20 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                >
                  🗑️ مسح
                </button>
                <button 
                  onClick={fetchData}
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
                >
                  🔄 تحديث
                </button>
              </div>
            </div>

            {/* Console Output */}
            <div className="bg-black/50 rounded-xl border border-white/10 font-mono text-sm overflow-hidden">
              <div className="bg-white/5 px-4 py-2 border-b border-white/10 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500" />
                <span className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="w-3 h-3 rounded-full bg-green-500" />
                <span className="mr-4 text-slate-400">Data Engine Console</span>
              </div>
              <div className="p-4 h-[500px] overflow-y-auto" dir="ltr">
                {logs.length === 0 ? (
                  <p className="text-slate-500">لا توجد سجلات. ابدأ بمهمة لرؤية التقدم هنا...</p>
                ) : (
                  logs.map((log, i) => (
                    <div 
                      key={i} 
                      className={`py-1 border-b border-white/5 last:border-0 ${
                        log.type === 'success' ? 'text-emerald-400' :
                        log.type === 'error' ? 'text-red-400' :
                        log.type === 'warning' ? 'text-amber-400' :
                        'text-slate-300'
                      }`}
                    >
                      <span className="text-slate-500">[{log.time}]</span> {log.message}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Stats in Console */}
            {stats && (
              <div className="bg-white/5 rounded-xl p-4 border border-white/10 font-mono text-sm">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-emerald-400 text-2xl font-bold">{stats.totalStocks}</div>
                    <div className="text-slate-400">أسهم</div>
                  </div>
                  <div>
                    <div className="text-blue-400 text-2xl font-bold">{stats.historicalCount.toLocaleString()}</div>
                    <div className="text-slate-400">سجلات</div>
                  </div>
                  <div>
                    <div className="text-purple-400 text-2xl font-bold">{stats.stocksByExchange.length}</div>
                    <div className="text-slate-400">بورصات</div>
                  </div>
                  <div>
                    <div className="text-amber-400 text-2xl font-bold">{logs.length}</div>
                    <div className="text-slate-400">سجلات</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-slate-500 border-t border-white/10 mt-8">
        <p>Data Engine v1.0 | 🇸🇦 🇪🇬 🇰🇼 🇶🇦 🇦🇪 🇧🇭</p>
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
      className={`px-6 py-3 transition-all ${
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
