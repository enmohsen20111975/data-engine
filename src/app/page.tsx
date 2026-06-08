'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Database, Newspaper, Table, TrendingUp, TrendingDown,
  ChevronLeft, ChevronRight, ExternalLink, Clock, Building2,
  Activity, RefreshCw, HardDrive, FileSpreadsheet, CheckCircle2,
  XCircle, AlertTriangle, Zap, X, BarChart3, DollarSign,
  PieChart, LineChart, FileText, Calculator, Wallet, CandlestickChart,
  Target, Shield, AlertCircle, Sparkles, Gauge, Users
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

interface AnalysisRecommendation {
  symbol: string
  name: string
  market: string
  action: 'BUY' | 'SELL' | 'HOLD'
  master_score: number
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  entry_price: number
  stop_loss: number
  take_profit_1: number
  take_profit_2: number
  take_profit_3: number
  position_size_percent: number
  technical_score: number
  fundamental_score: number
  signals: string[]
  warnings: string[]
  reason: string
  market_regime: string
  personality_match: boolean
  timestamp: string
}

interface MarketAnalysisResult {
  market: string
  personality: string
  total_recommendations: number
  recommendations: AnalysisRecommendation[]
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

// Personality types
const PERSONALITY_TYPES = [
  { value: 'conservative', label: 'محافظ', description: 'عتبة شراء 85%', icon: Shield },
  { value: 'moderate', label: 'معتدل', description: 'عتبة شراء 80%', icon: Shield },
  { value: 'balanced', label: 'متوازن', description: 'عتبة شراء 75%', icon: Gauge },
  { value: 'growth', label: 'نمو', description: 'عتبة شراء 70%', icon: TrendingUp },
  { value: 'aggressive', label: 'عدواني', description: 'عتبة شراء 65%', icon: Zap },
  { value: 'speculative', label: 'مضارب', description: 'عتبة شراء 60%', icon: AlertCircle },
  { value: 'gambler', label: 'مقامر', description: 'عتبة شراء 55%', icon: AlertTriangle },
]

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

  // Analysis state
  const [analysisMarket, setAnalysisMarket] = useState<string>('all')
  const [analysisPersonality, setAnalysisPersonality] = useState<string>('balanced')
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<MarketAnalysisResult | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [selectedRecommendation, setSelectedRecommendation] = useState<AnalysisRecommendation | null>(null)

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

  // Run market analysis
  const runAnalysis = async () => {
    setAnalysisLoading(true)
    setAnalysisError(null)
    setAnalysisResult(null)
    
    try {
      const params = new URLSearchParams({
        action: 'market',
        personality: analysisPersonality,
        limit: '20'
      })
      if (analysisMarket && analysisMarket !== 'all') params.set('market', analysisMarket)
      
      const res = await fetch(`/api/analyze?${params}`)
      const data = await res.json()
      
      if (data.error) {
        setAnalysisError(data.error)
      } else {
        setAnalysisResult(data)
      }
    } catch (error) {
      setAnalysisError(String(error))
    }
    
    setAnalysisLoading(false)
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
    } else if (tab === 'analysis') {
      setLoading(false)
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

  const getActionColor = (action: string) => {
    switch (action) {
      case 'BUY': return 'text-green-600 bg-green-50 border-green-200'
      case 'SELL': return 'text-red-600 bg-red-50 border-red-200'
      default: return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    }
  }

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'HIGH': return 'bg-green-500'
      case 'MEDIUM': return 'bg-yellow-500'
      default: return 'bg-orange-500'
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 65) return 'text-yellow-600'
    if (score >= 50) return 'text-orange-600'
    return 'text-red-600'
  }

  const getPersonalityInfo = (value: string) => {
    return PERSONALITY_TYPES.find(p => p.value === value) || PERSONALITY_TYPES[2]
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
          <TabsList className="grid w-full grid-cols-4 max-w-2xl mx-auto">
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
            <TabsTrigger value="analysis" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              التحليلات
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

          {/* Analysis Tab */}
          <TabsContent value="analysis" className="space-y-6">
            {/* Analysis Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  محرك التحليل الذكي
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  {/* Market Selection */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">السوق</label>
                    <Select value={analysisMarket} onValueChange={setAnalysisMarket}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر السوق" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">كل الأسواق</SelectItem>
                        <SelectItem value="السعودية">🇸🇦 السعودية</SelectItem>
                        <SelectItem value="مصر">🇪🇬 مصر</SelectItem>
                        <SelectItem value="الكويت">🇰🇼 الكويت</SelectItem>
                        <SelectItem value="قطر">🇶🇦 قطر</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Personality Selection */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">شخصية المستثمر</label>
                    <Select value={analysisPersonality} onValueChange={setAnalysisPersonality}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الشخصية" />
                      </SelectTrigger>
                      <SelectContent>
                        {PERSONALITY_TYPES.map(p => {
                          const Icon = p.icon
                          return (
                            <SelectItem key={p.value} value={p.value}>
                              <div className="flex items-center gap-2">
                                <Icon className="w-4 h-4" />
                                <span>{p.label}</span>
                                <span className="text-xs text-slate-400">({p.description})</span>
                              </div>
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Run Button */}
                  <div className="flex items-end">
                    <Button 
                      onClick={runAnalysis} 
                      disabled={analysisLoading}
                      className="w-full gap-2"
                      size="lg"
                    >
                      {analysisLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          جاري التحليل...
                        </>
                      ) : (
                        <>
                          <BarChart3 className="w-4 h-4" />
                          تشغيل التحليل
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Personality Info */}
                <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-slate-500" />
                    <span className="font-medium text-slate-700">
                      {getPersonalityInfo(analysisPersonality).label}:
                    </span>
                    <span className="text-slate-600">
                      {getPersonalityInfo(analysisPersonality).description}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Error Display */}
            {analysisError && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-red-700">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-medium">خطأ في التحليل:</span>
                    <span>{analysisError}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Analysis Results */}
            {analysisResult && (
              <div className="space-y-4">
                {/* Summary */}
                <Card className="bg-gradient-to-r from-primary/5 to-primary/10">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/20 rounded-lg">
                          <Target className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-slate-800">
                            {analysisResult.total_recommendations}
                          </div>
                          <div className="text-sm text-slate-600">توصية شراء</div>
                        </div>
                      </div>
                      <div className="text-left">
                        <Badge variant="outline" className="mb-1">
                          {analysisResult.market === 'All' ? 'كل الأسواق' : analysisResult.market}
                        </Badge>
                        <div className="text-xs text-slate-500">
                          الشخصية: {getPersonalityInfo(analysisResult.personality).label}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Recommendations Grid */}
                <div className="grid md:grid-cols-2 gap-4">
                  {analysisResult.recommendations.map((rec, index) => (
                    <Card 
                      key={rec.symbol} 
                      className="cursor-pointer hover:shadow-lg transition-all"
                      onClick={() => setSelectedRecommendation(rec)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center font-bold text-primary">
                              {index + 1}
                            </div>
                            <div>
                              <div className="font-bold text-slate-800">{rec.symbol}</div>
                              <div className="text-xs text-slate-500 truncate max-w-32">{rec.name}</div>
                            </div>
                          </div>
                          <Badge className={`${getActionColor(rec.action)} border`}>
                            {rec.action === 'BUY' ? 'شراء' : rec.action === 'SELL' ? 'بيع' : 'انتظار'}
                          </Badge>
                        </div>

                        {/* Score */}
                        <div className="mb-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-slate-600">درجة التحليل</span>
                            <span className={`text-lg font-bold ${getScoreColor(rec.master_score)}`}>
                              {rec.master_score.toFixed(0)}%
                            </span>
                          </div>
                          <Progress value={rec.master_score} className="h-2" />
                        </div>

                        {/* Scores Grid */}
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <div className="bg-slate-50 rounded p-2 text-center">
                            <div className="text-xs text-slate-500">الفني</div>
                            <div className="font-semibold text-slate-800">{rec.technical_score.toFixed(0)}%</div>
                          </div>
                          <div className="bg-slate-50 rounded p-2 text-center">
                            <div className="text-xs text-slate-500">الأساسي</div>
                            <div className="font-semibold text-slate-800">{rec.fundamental_score.toFixed(0)}%</div>
                          </div>
                        </div>

                        {/* Price Levels */}
                        <div className="flex items-center justify-between text-xs">
                          <div>
                            <span className="text-slate-500">دخول: </span>
                            <span className="font-medium text-slate-800">{formatPrice(rec.entry_price)}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">وقف: </span>
                            <span className="font-medium text-red-600">{formatPrice(rec.stop_loss)}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">هدف: </span>
                            <span className="font-medium text-green-600">{formatPrice(rec.take_profit_1)}</span>
                          </div>
                        </div>

                        {/* Confidence */}
                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <div className={`w-2 h-2 rounded-full ${getConfidenceColor(rec.confidence)}`}></div>
                            <span className="text-xs text-slate-600">
                              {rec.confidence === 'HIGH' ? 'ثقة عالية' : rec.confidence === 'MEDIUM' ? 'ثقة متوسطة' : 'ثقة منخفضة'}
                            </span>
                          </div>
                          <span className="text-xs text-slate-500">
                            حجم المركز: {rec.position_size_percent.toFixed(1)}%
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {!analysisResult && !analysisLoading && !analysisError && (
              <Card>
                <CardContent className="p-12 text-center">
                  <BarChart3 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-700 mb-2">محرك التحليل الذكي</h3>
                  <p className="text-slate-500 mb-4">
                    اختر السوق وشخصية المستثمر ثم اضغط على &quot;تشغيل التحليل&quot;
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <Badge variant="outline">تحليل فني 30%</Badge>
                    <Badge variant="outline">تحليل أساسي 25%</Badge>
                    <Badge variant="outline">تحليل كمي 15%</Badge>
                    <Badge variant="outline">تحليل معنوي 30%</Badge>
                  </div>
                </CardContent>
              </Card>
            )}
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
                  }}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {detailLoading ? (
                <div className="p-8 space-y-4">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-32 w-full" />
                </div>
              ) : (
                <ScrollArea className="h-[70vh]">
                  <div className="p-4">
                    {/* Detail Tabs */}
                    <Tabs value={detailTab} onValueChange={setDetailTab}>
                      <TabsList className="w-full justify-start flex-wrap h-auto gap-1 mb-4">
                        <TabsTrigger value="overview" className="text-xs">نظرة عامة</TabsTrigger>
                        <TabsTrigger value="performance" className="text-xs">الأداء</TabsTrigger>
                        <TabsTrigger value="valuation" className="text-xs">التقييم</TabsTrigger>
                        <TabsTrigger value="dividends" className="text-xs">التوزيعات</TabsTrigger>
                        <TabsTrigger value="profitability" className="text-xs">الربحية</TabsTrigger>
                        <TabsTrigger value="income" className="text-xs">قائمة الدخل</TabsTrigger>
                        <TabsTrigger value="balance" className="text-xs">الميزانية</TabsTrigger>
                        <TabsTrigger value="cashflow" className="text-xs">التدفق النقدي</TabsTrigger>
                        <TabsTrigger value="technical" className="text-xs">التحليل الفني</TabsTrigger>
                      </TabsList>

                      <TabsContent value="overview">
                        <div className="grid md:grid-cols-2 gap-4">
                          {stockDetail?.stock && (
                            <div className="space-y-3">
                              <h3 className="font-semibold text-slate-700">معلومات السهم</h3>
                              <div className="grid grid-cols-2 gap-2">
                                {Object.entries(stockDetail.stock).map(([key, value]) => {
                                  if (['id', 'created_at', 'updated_at', 'logo_url'].includes(key)) return null
                                  return (
                                    <div key={key} className="bg-slate-50 rounded p-2">
                                      <div className="text-xs text-slate-500">{key}</div>
                                      <div className="font-medium text-sm truncate">{String(value)}</div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </TabsContent>

                      <TabsContent value="performance">
                        {renderDataGrid(stockDetail?.tabs?.performance as Record<string, unknown>, PERFORMANCE_LABELS)}
                      </TabsContent>

                      <TabsContent value="valuation">
                        {renderDataGrid(stockDetail?.tabs?.valuation as Record<string, unknown>, VALUATION_LABELS)}
                      </TabsContent>

                      <TabsContent value="dividends">
                        {renderDataGrid(stockDetail?.tabs?.dividends as Record<string, unknown>, DIVIDEND_LABELS)}
                      </TabsContent>

                      <TabsContent value="profitability">
                        {renderDataGrid(stockDetail?.tabs?.profitability as Record<string, unknown>, PROFITABILITY_LABELS)}
                      </TabsContent>

                      <TabsContent value="income">
                        {renderDataGrid(stockDetail?.tabs?.income_statement as Record<string, unknown>, INCOME_LABELS)}
                      </TabsContent>

                      <TabsContent value="balance">
                        {renderDataGrid(stockDetail?.tabs?.balance_sheet as Record<string, unknown>, BALANCE_LABELS)}
                      </TabsContent>

                      <TabsContent value="cashflow">
                        {renderDataGrid(stockDetail?.tabs?.cash_flow as Record<string, unknown>, CASHFLOW_LABELS)}
                      </TabsContent>

                      <TabsContent value="technical">
                        {renderDataGrid(stockDetail?.tabs?.technical as Record<string, unknown>, TECHNICAL_LABELS)}
                      </TabsContent>
                    </Tabs>
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Analysis Detail Modal */}
      {selectedRecommendation && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {selectedRecommendation.symbol}
                    <Badge className={getActionColor(selectedRecommendation.action)}>
                      {selectedRecommendation.action === 'BUY' ? 'شراء' : 
                       selectedRecommendation.action === 'SELL' ? 'بيع' : 'انتظار'}
                    </Badge>
                  </CardTitle>
                  <p className="text-sm text-slate-600 mt-1">{selectedRecommendation.name}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelectedRecommendation(null)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 overflow-y-auto max-h-[70vh]">
              {/* Master Score */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-slate-700">درجة التحليل الشاملة</span>
                  <span className={`text-2xl font-bold ${getScoreColor(selectedRecommendation.master_score)}`}>
                    {selectedRecommendation.master_score.toFixed(0)}%
                  </span>
                </div>
                <Progress value={selectedRecommendation.master_score} className="h-3" />
              </div>

              {/* Scores Breakdown */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-slate-600">التحليل الفني</span>
                    <span className="font-bold text-slate-800">{selectedRecommendation.technical_score.toFixed(0)}%</span>
                  </div>
                  <Progress value={selectedRecommendation.technical_score} className="h-2" />
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-slate-600">التحليل الأساسي</span>
                    <span className="font-bold text-slate-800">{selectedRecommendation.fundamental_score.toFixed(0)}%</span>
                  </div>
                  <Progress value={selectedRecommendation.fundamental_score} className="h-2" />
                </div>
              </div>

              {/* Price Levels */}
              <div className="mb-6">
                <h4 className="font-semibold text-slate-700 mb-3">مستويات السعر</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                    <div className="text-xs text-blue-600 mb-1">سعر الدخول</div>
                    <div className="text-lg font-bold text-blue-700">{formatPrice(selectedRecommendation.entry_price)}</div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                    <div className="text-xs text-red-600 mb-1">وقف الخسارة</div>
                    <div className="text-lg font-bold text-red-700">{formatPrice(selectedRecommendation.stop_loss)}</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                    <div className="text-xs text-green-600 mb-1">الهدف الأول</div>
                    <div className="text-lg font-bold text-green-700">{formatPrice(selectedRecommendation.take_profit_1)}</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                    <div className="text-xs text-green-600 mb-1">الهدف الثاني</div>
                    <div className="text-lg font-bold text-green-700">{formatPrice(selectedRecommendation.take_profit_2)}</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 border border-green-200 col-span-2">
                    <div className="text-xs text-green-600 mb-1">الهدف الثالث</div>
                    <div className="text-lg font-bold text-green-700">{formatPrice(selectedRecommendation.take_profit_3)}</div>
                  </div>
                </div>
              </div>

              {/* Risk Management */}
              <div className="mb-6">
                <h4 className="font-semibold text-slate-700 mb-3">إدارة المخاطر</h4>
                <div className="bg-slate-50 rounded-lg p-3 grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-slate-500">حجم المركز المقترح</span>
                    <div className="font-semibold text-slate-800">{selectedRecommendation.position_size_percent.toFixed(1)}%</div>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">مستوى الثقة</span>
                    <div className="font-semibold text-slate-800 flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${getConfidenceColor(selectedRecommendation.confidence)}`}></div>
                      {selectedRecommendation.confidence === 'HIGH' ? 'عالية' : 
                       selectedRecommendation.confidence === 'MEDIUM' ? 'متوسطة' : 'منخفضة'}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">اتجاه السوق</span>
                    <div className="font-semibold text-slate-800">
                      {selectedRecommendation.market_regime === 'bull' ? '🐂 صاعد' : 
                       selectedRecommendation.market_regime === 'bear' ? '🐻 هابط' : '📊 عرضي'}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">يناسب شخصيتك</span>
                    <div className="font-semibold">
                      {selectedRecommendation.personality_match ? (
                        <span className="text-green-600">✓ نعم</span>
                      ) : (
                        <span className="text-red-600">✗ لا</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Signals */}
              {selectedRecommendation.signals.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-semibold text-slate-700 mb-3">إشارات إيجابية</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedRecommendation.signals.map((signal, i) => (
                      <Badge key={i} variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        {signal}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Warnings */}
              {selectedRecommendation.warnings.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-semibold text-slate-700 mb-3">تحذيرات</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedRecommendation.warnings.map((warning, i) => (
                      <Badge key={i} variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                        {warning}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Reason */}
              <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
                <h4 className="font-semibold text-slate-700 mb-2">السبب</h4>
                <p className="text-slate-600">{selectedRecommendation.reason}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t py-4 mt-auto">
        <div className="container mx-auto px-4 text-center text-sm text-slate-500">
          محرك البيانات والتحليلات - الأسواق العربية
        </div>
      </footer>
    </div>
  )
}
