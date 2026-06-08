'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Database, Newspaper, Table, TrendingUp, TrendingDown,
  ChevronLeft, ChevronRight, ExternalLink, Clock, Building2,
  Activity, RefreshCw, HardDrive, FileSpreadsheet, CheckCircle2,
  XCircle, AlertTriangle, Zap, X, BarChart3, DollarSign,
  PieChart, LineChart, FileText, Calculator, Wallet, CandlestickChart
} from 'lucide-react'

// Types
interface Stock {
  id: number
  symbol: string
  name: string
  price: string | number
  change_percent: string
  market: string
  logo_url?: string
  volume?: number
  market_cap?: number
}

interface StockDetail {
  stock: Record<string, unknown>
  tabs: Record<string, Record<string, unknown>>
  historical: Record<string, unknown>[]
  news: Record<string, unknown>[]
}

interface NewsItem {
  id: number
  title: string
  url: string
  snippet: string
  source: string
  market: string
  published_date: string
  fetched_at: string
}

interface DbStats {
  fileSizeMB: string
  tables: { name: string; count: number }[]
  totalTables: number
}

interface DatabaseReport {
  tables: {
    name: string
    count: number
    uniqueSymbols: number
    dateRange?: { min: string; max: string }
    lastUpdate?: string
    markets?: { name: string; count: number }[]
  }[]
  totals: {
    totalRecords: number
    totalSymbols: number
    tableCount: number
  }
  fileSize: string
  lastChecked: string
}

interface AutoRefreshStatus {
  running: boolean
  interval: number
  next_run: string | null
  tasks: Record<string, { status: string; last_run: string; count: number }>
  logs: { time: string; message: string; type: string }[]
}

// Market flags and colors
const MARKET_CONFIG: Record<string, { flag: string; color: string }> = {
  'السعودية': { flag: '🇸🇦', color: 'bg-green-100 text-green-700 border-green-300' },
  'مصر': { flag: '🇪🇬', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  'الكويت': { flag: '🇰🇼', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  'قطر': { flag: '🇶🇦', color: 'bg-purple-100 text-purple-700 border-purple-300' },
  'saudi': { flag: '🇸🇦', color: 'bg-green-100 text-green-700 border-green-300' },
  'egypt': { flag: '🇪🇬', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  'kuwait': { flag: '🇰🇼', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  'qatar': { flag: '🇶🇦', color: 'bg-purple-100 text-purple-700 border-purple-300' },
}

// Field labels
const PERFORMANCE_LABELS: Record<string, string> = {
  price: 'السعر',
  change_percent: 'التغير',
  perf_1w: 'أداء أسبوع',
  perf_1m: 'أداء شهر',
  perf_3m: 'أداء 3 شهور',
  perf_6m: 'أداء 6 شهور',
  perf_ytd: 'أداء السنة',
  perf_1y: 'أداء سنة',
  perf_5y: 'أداء 5 سنين',
  perf_10y: 'أداء 10 سنين',
  perf_all: 'أداء الكلي',
  volatility_1w: 'التذبذب أسبوع',
  volatility_1m: 'التذبذب شهر',
}

const VALUATION_LABELS: Record<string, string> = {
  market_cap: 'القيمة السوقية',
  market_cap_perf: 'تغير القيمة',
  pe_ratio: 'مكرر الربحية (P/E)',
  peg_ratio: 'PEG Ratio',
  ps_ratio: 'مكرر المبيعات (P/S)',
  pb_ratio: 'مكرر الدفترية (P/B)',
  pcf_ratio: 'P/CF',
  pfcf_ratio: 'P/FCF',
  ev: 'القيمة المؤسسية',
  ev_revenue: 'EV/Revenue',
  ev_ebit: 'EV/EBIT',
  ev_ebitda: 'EV/EBITDA',
}

const DIVIDEND_LABELS: Record<string, string> = {
  dps_ttm: 'توزيعة الـ 12 شهر',
  dps_fy: 'توزيعة السنة المالية',
  div_yield: 'عائد التوزيعات',
  div_yield_fwd: 'العائد المتوقع',
  payout_ratio: 'نسبة التوزيع',
  dps_growth: 'نمو التوزيعات',
  cont_div: 'سنوات التوزيع المستمر',
  cont_div_growth: 'سنوات النمو المستمر',
}

const PROFITABILITY_LABELS: Record<string, string> = {
  gross_margin: 'هامش الربح الإجمالي',
  operating_margin: 'هامش التشغيل',
  pretax_margin: 'هامش قبل الضرائب',
  net_margin: 'هامش الربح الصافي',
  fcf_margin: 'هامش التدفق النقدي الحر',
  roa: 'العائد على الأصول (ROA)',
  roe: 'العائد على حقوق الملكية (ROE)',
  roc: 'العائد على رأس المال (ROC)',
}

const INCOME_LABELS: Record<string, string> = {
  fiscal_period: 'الفترة المالية',
  fiscal_end: 'نهاية الفترة',
  revenue: 'الإيرادات',
  revenue_growth: 'نمو الإيرادات',
  gross_profit: 'الربح الإجمالي',
  operating_income: 'دخل التشغيل',
  net_income: 'صافي الربح',
  eps_basic: 'ربح السهم الأساسي',
  eps_diluted: 'ربح السهم المخفف',
}

const BALANCE_LABELS: Record<string, string> = {
  total_assets: 'إجمالي الأصول',
  total_liabilities: 'إجمالي الالتزامات',
  total_equity: 'حقوق الملكية',
  shares_outstanding: 'الأسهم القائمة',
  shares_float: 'الأسهم الحرة',
  current_assets: 'الأصول المتداولة',
  current_liabilities: 'الالتزامات المتداولة',
  cash: 'النقدية',
  debt: 'الديون',
}

const CASHFLOW_LABELS: Record<string, string> = {
  operating_cf: 'التدفق من التشغيل',
  investing_cf: 'التدفق من الاستثمار',
  financing_cf: 'التدفق من التمويل',
  free_cf: 'التدفق النقدي الحر',
}

const TECHNICAL_LABELS: Record<string, string> = {
  technical_rating: 'التوصية الفنية',
  ma_rating: 'توصية المتوسطات',
  oscillators_rating: 'توصية المذبذبات',
  trend: 'الاتجاه',
  momentum: 'الزخم',
  rsi: 'RSI',
  macd: 'MACD',
  stoch: 'Stochastic',
  adx: 'ADX',
  atr: 'ATR',
}

export default function Home() {
  // State
  const [activeTab, setActiveTab] = useState('dashboard')
  const [stocks, setStocks] = useState<Stock[]>([])
  const [news, setNews] = useState<NewsItem[]>([])
  const [dbStats, setDbStats] = useState<DbStats | null>(null)
  const [dbReport, setDbReport] = useState<DatabaseReport | null>(null)
  const [refreshStatus, setRefreshStatus] = useState<AutoRefreshStatus | null>(null)
  const [markets, setMarkets] = useState<string[]>([])
  const [selectedMarket, setSelectedMarket] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const LIMIT = 20

  // Stock detail state
  const [selectedStock, setSelectedStock] = useState<string | null>(null)
  const [stockDetail, setStockDetail] = useState<StockDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailTab, setDetailTab] = useState('overview')

  // Fetch database stats
  const fetchDbStats = async () => {
    try {
      const res = await fetch('/api/db-stats')
      const data = await res.json()
      setDbStats(data)
    } catch (error) {
      console.error('Error fetching db stats:', error)
    }
  }

  // Fetch database report
  const fetchDbReport = async () => {
    try {
      const res = await fetch('/api/database-report')
      const data = await res.json()
      setDbReport(data)
    } catch (error) {
      console.error('Error fetching db report:', error)
    }
  }

  // Fetch auto refresh status
  const fetchRefreshStatus = async () => {
    try {
      const res = await fetch('/api/auto-refresh/status')
      const data = await res.json()
      setRefreshStatus(data)
    } catch (error) {
      console.error('Error fetching refresh status:', error)
    }
  }

  // Fetch stocks
  const fetchStocks = async (market?: string, offset = 0) => {
    try {
      const params = new URLSearchParams({
        limit: String(LIMIT),
        offset: String(offset)
      })
      if (market) params.set('market', market)
      
      const res = await fetch(`/api/stocks?${params}`)
      const data = await res.json()
      setStocks(data.stocks || [])
      setTotal(data.total || 0)
      if (data.markets) setMarkets(data.markets)
    } catch (error) {
      console.error('Error fetching stocks:', error)
    }
  }

  // Fetch news
  const fetchNews = async (market?: string, offset = 0) => {
    try {
      const params = new URLSearchParams({
        limit: String(LIMIT),
        offset: String(offset)
      })
      if (market) params.set('market', market)
      
      const res = await fetch(`/api/news?${params}`)
      const data = await res.json()
      setNews(data.news || [])
      setTotal(data.total || 0)
      if (data.markets) setMarkets(data.markets)
    } catch (error) {
      console.error('Error fetching news:', error)
    }
  }

  // Fetch stock detail
  const fetchStockDetail = async (symbol: string) => {
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/stock-detail?symbol=${symbol}`)
      const data = await res.json()
      setStockDetail(data)
    } catch (error) {
      console.error('Error fetching stock detail:', error)
    }
    setDetailLoading(false)
  }

  // Initial load
  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await Promise.all([
        fetchDbStats(),
        fetchDbReport(),
        fetchRefreshStatus()
      ])
      setLoading(false)
    }
    init()
  }, [])

  // Refresh dashboard data periodically
  useEffect(() => {
    if (activeTab !== 'dashboard') return
    const interval = setInterval(() => {
      fetchRefreshStatus()
    }, 5000)
    return () => clearInterval(interval)
  }, [activeTab])

  // Load stock detail when selected
  useEffect(() => {
    if (!selectedStock) return
    
    let isMounted = true
    const loadDetail = async () => {
      setDetailLoading(true)
      try {
        const res = await fetch(`/api/stock-detail?symbol=${selectedStock}`)
        const data = await res.json()
        if (isMounted) {
          setStockDetail(data)
        }
      } catch (error) {
        console.error('Error fetching stock detail:', error)
      }
      if (isMounted) {
        setDetailLoading(false)
      }
    }
    loadDetail()
    
    return () => { isMounted = false }
  }, [selectedStock])

  // Handle tab change
  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    setPage(0)
    setSelectedMarket('')
    setLoading(true)
    
    if (tab === 'database') {
      fetchStocks().then(() => setLoading(false))
    } else if (tab === 'news') {
      fetchNews().then(() => setLoading(false))
    } else {
      Promise.all([
        fetchDbStats(),
        fetchDbReport(),
        fetchRefreshStatus()
      ]).then(() => setLoading(false))
    }
  }

  // Handle market filter change
  const handleMarketChange = (market: string) => {
    setSelectedMarket(market)
    setPage(0)
    if (activeTab === 'database') {
      fetchStocks(market, 0)
    } else if (activeTab === 'news') {
      fetchNews(market, 0)
    }
  }

  // Pagination
  const handlePrevPage = () => {
    if (page > 0) {
      const newPage = page - 1
      setPage(newPage)
      if (activeTab === 'database') {
        fetchStocks(selectedMarket, newPage * LIMIT)
      } else {
        fetchNews(selectedMarket, newPage * LIMIT)
      }
    }
  }

  const handleNextPage = () => {
    if ((page + 1) * LIMIT < total) {
      const newPage = page + 1
      setPage(newPage)
      if (activeTab === 'database') {
        fetchStocks(selectedMarket, newPage * LIMIT)
      } else {
        fetchNews(selectedMarket, newPage * LIMIT)
      }
    }
  }

  // Format helpers
  const formatPrice = (price: string | number) => {
    const num = typeof price === 'string' ? parseFloat(price.replace(/[^0-9.-]/g, '')) : price
    if (isNaN(num)) return '-'
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    try {
      return new Date(dateStr).toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return dateStr
    }
  }

  const getMarketConfig = (market: string) => {
    return MARKET_CONFIG[market] || { flag: '🌍', color: 'bg-gray-100 text-gray-700 border-gray-300' }
  }

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="w-4 h-4 text-green-500" />
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />
      default: return <Activity className="w-4 h-4 text-blue-500" />
    }
  }

  // Render data grid
  const renderDataGrid = (data: Record<string, unknown> | null, labels: Record<string, string>) => {
    if (!data) return <div className="text-slate-400 text-center py-4">لا توجد بيانات</div>
    
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {Object.entries(labels).map(([key, label]) => {
          const value = data[key]
          if (value === null || value === undefined) return null
          
          const strValue = String(value)
          const isNegative = strValue.startsWith('-') || strValue.startsWith('−')
          const isPositive = strValue.startsWith('+')
          
          return (
            <div key={key} className="bg-slate-50 rounded-lg p-3">
              <div className="text-xs text-slate-500 mb-1">{label}</div>
              <div className={`font-semibold ${isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-slate-800'}`}>
                {strValue}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // Get stock name safely
  const getStockName = () => {
    if (!stockDetail?.stock) return 'سهم'
    return (stockDetail.stock.name as string) || (stockDetail.stock.symbol as string) || 'سهم'
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex flex-col" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Database className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">لوحة تحكم البيانات</h1>
                <p className="text-sm text-slate-500">السعودية 🇸🇦 | مصر 🇪🇬 | الكويت 🇰🇼 | قطر 🇶🇦</p>
              </div>
            </div>
            
            {dbStats && (
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-sm">
                  <HardDrive className="w-3 h-3 ml-1" />
                  {dbStats.fileSizeMB} MB
                </Badge>
                <Badge variant="secondary" className="text-sm">
                  {dbStats.tables?.reduce((sum, t) => sum + t.count, 0).toLocaleString()} سجل
                </Badge>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 flex-1">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-lg mx-auto">
            <TabsTrigger value="dashboard" className="gap-2">
              <Activity className="w-4 h-4" />
              لوحة التحكم
            </TabsTrigger>
            <TabsTrigger value="database" className="gap-2">
              <Table className="w-4 h-4" />
              قاعدة البيانات
            </TabsTrigger>
            <TabsTrigger value="news" className="gap-2">
              <Newspaper className="w-4 h-4" />
              الأخبار
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-slate-800">
                        {dbReport?.totals.tableCount || 0}
                      </div>
                      <div className="text-xs text-slate-500">جدول</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Database className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-slate-800">
                        {dbReport?.totals.totalRecords.toLocaleString() || 0}
                      </div>
                      <div className="text-xs text-slate-500">سجل</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Building2 className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-slate-800">
                        {dbReport?.totals.totalSymbols.toLocaleString() || 0}
                      </div>
                      <div className="text-xs text-slate-500">رمز فريد</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <HardDrive className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-slate-800">
                        {dbReport?.fileSize || '0 MB'}
                      </div>
                      <div className="text-xs text-slate-500">حجم القاعدة</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Auto Refresh Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <RefreshCw className={`w-5 h-5 ${refreshStatus?.running ? 'text-green-500 animate-spin' : 'text-slate-400'}`} />
                  حالة التحديث التلقائي
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Badge variant={refreshStatus?.running ? 'default' : 'secondary'} className="gap-1">
                        {refreshStatus?.running ? (
                          <>
                            <Zap className="w-3 h-3" />
                            يعمل
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3" />
                            متوقف
                          </>
                        )}
                      </Badge>
                      {refreshStatus?.interval && (
                        <span className="text-sm text-slate-500">
                          كل {Math.floor(refreshStatus.interval / 60)} دقيقة
                        </span>
                      )}
                    </div>

                    {refreshStatus?.tasks && Object.keys(refreshStatus.tasks).length > 0 && (
                      <div className="grid md:grid-cols-2 gap-3">
                        {Object.entries(refreshStatus.tasks).map(([name, task]) => (
                          <div key={name} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                            <div>
                              <div className="font-medium text-sm">{name}</div>
                              <div className="text-xs text-slate-500">
                                آخر تشغيل: {task.last_run ? formatDate(task.last_run) : 'لم يشتغل'}
                              </div>
                            </div>
                            <div className="text-left">
                              <Badge variant="outline" className="text-xs">
                                {task.count} مرة
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {refreshStatus?.logs && refreshStatus.logs.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-semibold mb-2 text-slate-700">آخر السجلات</h4>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {refreshStatus.logs.slice(-10).reverse().map((log, i) => (
                            <div key={i} className="flex items-start gap-2 p-2 bg-slate-50 rounded text-sm">
                              {getLogIcon(log.type)}
                              <div className="flex-1">
                                <span className="text-slate-600">{log.message}</span>
                                <span className="text-xs text-slate-400 mr-2">
                                  {formatDate(log.time)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tables Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Database className="w-5 h-5 text-primary" />
                  نظرة على الجداول
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                      <Skeleton key={i} className="h-20" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {dbReport?.tables.map((table) => (
                      <div key={table.name} className="bg-slate-50 rounded-lg p-3">
                        <div className="text-lg font-bold text-slate-800">
                          {table.count.toLocaleString()}
                        </div>
                        <div className="text-xs text-slate-500 truncate">{table.name}</div>
                        {table.uniqueSymbols > 0 && (
                          <div className="text-xs text-slate-400 mt-1">
                            {table.uniqueSymbols} رمز
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Database Tab */}
          <TabsContent value="database" className="space-y-4">
            {/* Filter */}
            <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">فلترة حسب السوق:</span>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant={selectedMarket === '' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleMarketChange('')}
                  >
                    الكل
                  </Button>
                  {markets.map(market => {
                    const config = getMarketConfig(market)
                    return (
                      <Button
                        key={market}
                        variant={selectedMarket === market ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleMarketChange(market)}
                        className="gap-1"
                      >
                        <span>{config.flag}</span>
                        {market}
                      </Button>
                    )
                  })}
                </div>
              </div>
              <div className="text-sm text-slate-500">
                {total.toLocaleString()} سهم
              </div>
            </div>

            {/* Stocks Table */}
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">#</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">السهم</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">السوق</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">السعر</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">التغير</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">تفاصيل</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      Array.from({ length: 10 }).map((_, i) => (
                        <tr key={i}>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-8" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-12" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                        </tr>
                      ))
                    ) : stocks.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                          لا توجد بيانات
                        </td>
                      </tr>
                    ) : (
                      stocks.map((stock, index) => {
                        const marketConfig = getMarketConfig(stock.market)
                        const changePercentStr = String(stock.change_percent ?? '0').replace('%', '')
                        const changeNum = parseFloat(changePercentStr)
                        const isPositive = changeNum >= 0
                        
                        return (
                          <tr key={stock.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 text-sm text-slate-500">
                              {page * LIMIT + index + 1}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {stock.logo_url ? (
                                  <img 
                                    src={stock.logo_url} 
                                    alt={stock.symbol}
                                    className="w-6 h-6 rounded"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none'
                                    }}
                                  />
                                ) : (
                                  <div className="w-6 h-6 rounded bg-slate-200 flex items-center justify-center text-xs">
                                    {stock.symbol?.charAt(0)}
                                  </div>
                                )}
                                <div>
                                  <div className="font-medium text-slate-800">{stock.symbol}</div>
                                  <div className="text-xs text-slate-500 truncate max-w-32">{stock.name}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className={`gap-1 ${marketConfig.color}`}>
                                <span>{marketConfig.flag}</span>
                                {stock.market}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 font-medium text-slate-800">
                              {formatPrice(stock.price)}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`flex items-center gap-1 font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                                {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                {stock.change_percent}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedStock(stock.symbol)}
                                className="text-primary hover:text-primary/80"
                              >
                                عرض التفاصيل
                              </Button>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Pagination */}
            <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm">
              <Button
                variant="outline"
                onClick={handlePrevPage}
                disabled={page === 0}
                className="gap-1"
              >
                <ChevronRight className="w-4 h-4" />
                السابق
              </Button>
              <span className="text-sm text-slate-600">
                صفحة {page + 1} من {Math.ceil(total / LIMIT) || 1}
              </span>
              <Button
                variant="outline"
                onClick={handleNextPage}
                disabled={(page + 1) * LIMIT >= total}
                className="gap-1"
              >
                التالي
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </div>
          </TabsContent>

          {/* News Tab */}
          <TabsContent value="news" className="space-y-4">
            <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">فلترة حسب السوق:</span>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant={selectedMarket === '' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleMarketChange('')}
                  >
                    الكل
                  </Button>
                  {markets.map(market => {
                    const config = getMarketConfig(market)
                    return (
                      <Button
                        key={market}
                        variant={selectedMarket === market ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleMarketChange(market)}
                        className="gap-1"
                      >
                        <span>{config.flag}</span>
                        {market}
                      </Button>
                    )
                  })}
                </div>
              </div>
              <div className="text-sm text-slate-500">
                {total} خبر
              </div>
            </div>

            {loading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <Skeleton className="h-4 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-2/3" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : news.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-slate-500">
                  لا توجد أخبار
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {news.map((item) => {
                  const marketConfig = getMarketConfig(item.market)
                  
                  return (
                    <Card key={item.id} className="group hover:shadow-lg transition-all duration-200 overflow-hidden">
                      <CardContent className="p-0">
                        <div className={`px-4 py-2 ${marketConfig.color} border-b`}>
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className="bg-white/50 text-xs">
                              <span className="ml-1">{marketConfig.flag}</span>
                              {item.market}
                            </Badge>
                            <span className="text-xs opacity-70">{item.source}</span>
                          </div>
                        </div>
                        
                        <div className="p-4">
                          <h3 className="font-semibold text-slate-800 mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                            {item.title}
                          </h3>
                          
                          {item.snippet && (
                            <p className="text-sm text-slate-600 mb-3 line-clamp-3">
                              {item.snippet}
                            </p>
                          )}
                          
                          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                            <div className="flex items-center gap-1 text-xs text-slate-500">
                              <Clock className="w-3 h-3" />
                              {formatDate(item.fetched_at)}
                            </div>
                            
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:text-primary/80 text-xs flex items-center gap-1"
                            >
                              اقرأ المزيد
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}

            <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm">
              <Button
                variant="outline"
                onClick={handlePrevPage}
                disabled={page === 0}
                className="gap-1"
              >
                <ChevronRight className="w-4 h-4" />
                السابق
              </Button>
              <span className="text-sm text-slate-600">
                صفحة {page + 1} من {Math.ceil(total / LIMIT) || 1}
              </span>
              <Button
                variant="outline"
                onClick={handleNextPage}
                disabled={(page + 1) * LIMIT >= total}
                className="gap-1"
              >
                التالي
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Stock Detail Modal */}
      {selectedStock && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-6xl max-h-[90vh] overflow-hidden">
            <CardHeader className="bg-slate-50 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {stockDetail?.stock?.logo_url ? (
                    <img 
                      src={stockDetail.stock.logo_url as string} 
                      alt={selectedStock}
                      className="w-10 h-10 rounded"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center">
                      <span className="font-bold text-primary">{selectedStock?.charAt(0)}</span>
                    </div>
                  )}
                  <div>
                    <CardTitle className="text-lg">{getStockName()}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline">{selectedStock}</Badge>
                      {stockDetail?.stock?.market && (
                        <Badge variant="secondary" className="gap-1">
                          <span>{getMarketConfig(stockDetail.stock.market as string).flag}</span>
                          {stockDetail.stock.market as string}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setSelectedStock(null)
                    setStockDetail(null)
                    setDetailTab('overview')
                  }}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(90vh-120px)]">
                {detailLoading ? (
                  <div className="p-6 space-y-4">
                    {[1, 2, 3, 4].map(i => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : stockDetail ? (
                  <div className="p-6">
                    <Tabs value={detailTab} onValueChange={setDetailTab}>
                      <TabsList className="mb-4 flex-wrap h-auto gap-1">
                        <TabsTrigger value="overview" className="gap-1">
                          <PieChart className="w-4 h-4" />
                          نظرة عامة
                        </TabsTrigger>
                        <TabsTrigger value="performance" className="gap-1">
                          <BarChart3 className="w-4 h-4" />
                          الأداء
                        </TabsTrigger>
                        <TabsTrigger value="valuation" className="gap-1">
                          <DollarSign className="w-4 h-4" />
                          التقييم
                        </TabsTrigger>
                        <TabsTrigger value="dividends" className="gap-1">
                          <Wallet className="w-4 h-4" />
                          التوزيعات
                        </TabsTrigger>
                        <TabsTrigger value="profitability" className="gap-1">
                          <Calculator className="w-4 h-4" />
                          الربحية
                        </TabsTrigger>
                        <TabsTrigger value="financials" className="gap-1">
                          <FileText className="w-4 h-4" />
                          القوائم المالية
                        </TabsTrigger>
                        <TabsTrigger value="technical" className="gap-1">
                          <CandlestickChart className="w-4 h-4" />
                          الفني
                        </TabsTrigger>
                        <TabsTrigger value="historical" className="gap-1">
                          <LineChart className="w-4 h-4" />
                          التاريخي
                        </TabsTrigger>
                      </TabsList>

                      {/* Overview Tab */}
                      <TabsContent value="overview" className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm">معلومات أساسية</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="bg-slate-50 rounded-lg p-3">
                                  <div className="text-xs text-slate-500">السعر</div>
                                  <div className="font-semibold">{String(stockDetail.stock.price || '-')}</div>
                                </div>
                                <div className="bg-slate-50 rounded-lg p-3">
                                  <div className="text-xs text-slate-500">التغير</div>
                                  <div className="font-semibold">{String(stockDetail.stock.change_percent || '-')}</div>
                                </div>
                                <div className="bg-slate-50 rounded-lg p-3">
                                  <div className="text-xs text-slate-500">السوق</div>
                                  <div className="font-semibold">{String(stockDetail.stock.market || '-')}</div>
                                </div>
                                <div className="bg-slate-50 rounded-lg p-3">
                                  <div className="text-xs text-slate-500">الرمز</div>
                                  <div className="font-semibold">{String(stockDetail.stock.symbol || '-')}</div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm">التقييم السريع</CardTitle>
                            </CardHeader>
                            <CardContent>
                              {stockDetail.tabs.tab_valuation ? (
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="bg-slate-50 rounded-lg p-3">
                                    <div className="text-xs text-slate-500">القيمة السوقية</div>
                                    <div className="font-semibold">{String(stockDetail.tabs.tab_valuation.market_cap || '-')}</div>
                                  </div>
                                  <div className="bg-slate-50 rounded-lg p-3">
                                    <div className="text-xs text-slate-500">مكرر الربحية</div>
                                    <div className="font-semibold">{String(stockDetail.tabs.tab_valuation.pe_ratio || '-')}</div>
                                  </div>
                                  <div className="bg-slate-50 rounded-lg p-3">
                                    <div className="text-xs text-slate-500">عائد التوزيعات</div>
                                    <div className="font-semibold">{String(stockDetail.tabs.tab_dividends?.div_yield || '-')}</div>
                                  </div>
                                  <div className="bg-slate-50 rounded-lg p-3">
                                    <div className="text-xs text-slate-500">التوصية الفنية</div>
                                    <div className="font-semibold">{String(stockDetail.tabs.tab_technical_analysis?.technical_rating || '-')}</div>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-slate-400 text-center py-4">لا توجد بيانات تقييم</div>
                              )}
                            </CardContent>
                          </Card>
                        </div>
                      </TabsContent>

                      {/* Performance Tab */}
                      <TabsContent value="performance">
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm flex items-center gap-2">
                              <BarChart3 className="w-4 h-4" />
                              بيانات الأداء
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            {renderDataGrid(stockDetail.tabs.tab_performance as Record<string, unknown>, PERFORMANCE_LABELS)}
                          </CardContent>
                        </Card>
                      </TabsContent>

                      {/* Valuation Tab */}
                      <TabsContent value="valuation">
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm flex items-center gap-2">
                              <DollarSign className="w-4 h-4" />
                              بيانات التقييم
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            {renderDataGrid(stockDetail.tabs.tab_valuation as Record<string, unknown>, VALUATION_LABELS)}
                          </CardContent>
                        </Card>
                      </TabsContent>

                      {/* Dividends Tab */}
                      <TabsContent value="dividends">
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Wallet className="w-4 h-4" />
                              بيانات التوزيعات
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            {renderDataGrid(stockDetail.tabs.tab_dividends as Record<string, unknown>, DIVIDEND_LABELS)}
                          </CardContent>
                        </Card>
                      </TabsContent>

                      {/* Profitability Tab */}
                      <TabsContent value="profitability">
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Calculator className="w-4 h-4" />
                              بيانات الربحية
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            {renderDataGrid(stockDetail.tabs.tab_profitability as Record<string, unknown>, PROFITABILITY_LABELS)}
                          </CardContent>
                        </Card>
                      </TabsContent>

                      {/* Financials Tab */}
                      <TabsContent value="financials" className="space-y-4">
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm">قائمة الدخل</CardTitle>
                          </CardHeader>
                          <CardContent>
                            {renderDataGrid(stockDetail.tabs.tab_income_statement as Record<string, unknown>, INCOME_LABELS)}
                          </CardContent>
                        </Card>
                        
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm">الميزانية العمومية</CardTitle>
                          </CardHeader>
                          <CardContent>
                            {renderDataGrid(stockDetail.tabs.tab_balance_sheet as Record<string, unknown>, BALANCE_LABELS)}
                          </CardContent>
                        </Card>
                        
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm">قائمة التدفقات النقدية</CardTitle>
                          </CardHeader>
                          <CardContent>
                            {renderDataGrid(stockDetail.tabs.tab_cash_flow as Record<string, unknown>, CASHFLOW_LABELS)}
                          </CardContent>
                        </Card>
                      </TabsContent>

                      {/* Technical Tab */}
                      <TabsContent value="technical">
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm flex items-center gap-2">
                              <CandlestickChart className="w-4 h-4" />
                              التحليل الفني
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            {renderDataGrid(stockDetail.tabs.tab_technical_analysis as Record<string, unknown>, TECHNICAL_LABELS)}
                          </CardContent>
                        </Card>
                      </TabsContent>

                      {/* Historical Tab */}
                      <TabsContent value="historical">
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm flex items-center gap-2">
                              <LineChart className="w-4 h-4" />
                              البيانات التاريخية (آخر 30 يوم)
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            {stockDetail.historical && stockDetail.historical.length > 0 ? (
                              <div className="overflow-x-auto">
                                <table className="w-full">
                                  <thead className="bg-slate-100">
                                    <tr>
                                      <th className="px-3 py-2 text-right text-xs font-semibold">التاريخ</th>
                                      <th className="px-3 py-2 text-right text-xs font-semibold">الافتتاح</th>
                                      <th className="px-3 py-2 text-right text-xs font-semibold">الأعلى</th>
                                      <th className="px-3 py-2 text-right text-xs font-semibold">الأدنى</th>
                                      <th className="px-3 py-2 text-right text-xs font-semibold">الإغلاق</th>
                                      <th className="px-3 py-2 text-right text-xs font-semibold">الحجم</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {stockDetail.historical.map((row, i) => (
                                      <tr key={i} className="hover:bg-slate-50">
                                        <td className="px-3 py-2 text-sm">{String(row.date || '-')}</td>
                                        <td className="px-3 py-2 text-sm">{String(row.open || '-')}</td>
                                        <td className="px-3 py-2 text-sm text-green-600">{String(row.high || '-')}</td>
                                        <td className="px-3 py-2 text-sm text-red-600">{String(row.low || '-')}</td>
                                        <td className="px-3 py-2 text-sm font-medium">{String(row.close || '-')}</td>
                                        <td className="px-3 py-2 text-sm">{String(row.volume || '-')}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <div className="text-slate-400 text-center py-4">لا توجد بيانات تاريخية</div>
                            )}
                          </CardContent>
                        </Card>
                      </TabsContent>
                    </Tabs>
                  </div>
                ) : (
                  <div className="p-6 text-center text-slate-500">لا توجد بيانات</div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t py-4 mt-auto">
        <div className="container mx-auto px-4 text-center text-sm text-slate-500">
          Data Engine © 2024 - الأسواق العربية: السعودية 🇸🇦 | مصر 🇪🇬 | الكويت 🇰🇼 | قطر 🇶🇦
        </div>
      </footer>
    </div>
  )
}
