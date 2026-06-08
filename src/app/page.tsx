'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { 
  Database, Play, Square, Loader2, Activity,
  TrendingUp, DollarSign, Building2, Bitcoin,
  RefreshCw, BarChart3, Gauge, Coins, Landmark,
  CheckCircle2, XCircle, Zap, LineChart, Clock, History
} from 'lucide-react'

// ==================== TYPES ====================

interface ScraperStatus {
  running: boolean
  startTime?: string
  currentMarket: string
  progress: Record<string, { stocks: number; status: string }>
  logs: string[]
}

interface TechnicalStatus {
  running: boolean
  progress: { market: string; current: number; total: number }
  logs: string[]
  results: Array<{
    ticker: string
    market: string
    price: number
    rsi: number | null
    macd: number | null
    recommendation: string
  }>
}

interface Stats {
  totalStocks: number
  markets: Record<string, { count: number; percent: number }>
}

interface CryptoStatus {
  running: boolean
  progress: { current: number; total: number; currentCoin?: string }
  logs: string[]
}

interface CryptoStats {
  totalCryptos: number
  topCryptos: Array<{
    symbol: string
    name: string
    current_price: number
    price_change_percent_24h: number
    market_cap: number
    market_cap_rank: number
  }>
}

interface MetalsForexStatus {
  running: boolean
  progress: { current: number; total: number }
  logs: string[]
  results?: {
    metals: Array<{ symbol: string; name: string; price_usd: number }>
    currencies: {
      arab: Array<{ code: string; name: string; rate_to_usd: number; flag: string }>
    }
    last_update?: string
  }
}

interface HistoricalStatus {
  running: boolean
  progress: { current: number; total: number; symbol: string }
  logs: string[]
  results: Array<{
    symbol: string
    name: string
    market: string
    days: number
    latest_close: number
    status: string
  }>
}

interface AutoRefreshStatus {
  running: boolean
  interval: number
  next_run: string | null
  tasks: Record<string, { last_run: string | null; status: string }>
  logs: string[]
}

interface DatabaseReport {
  tables: Array<{
    name: string
    count: number
    uniqueSymbols: number
    dateRange?: { min: string; max: string }
    lastUpdate?: string
    categories?: { name: string; count: number }[]
    markets?: { name: string; count: number }[]
  }>
  totals: {
    totalRecords: number
    totalSymbols: number
    tableCount: number
  }
  fileSize: string
  lastChecked: string
}

// ==================== CONSTANTS ====================

const TASK_CONFIG = {
  stocks: { name: 'سحب الأسهم', icon: Building2, color: 'text-blue-500', expected: 500 },
  technical: { name: 'المؤشرات الفنية', icon: LineChart, color: 'text-purple-500', expected: 25 },
  metals: { name: 'الذهب', icon: Landmark, color: 'text-yellow-600', expected: 3 },
  crypto: { name: 'العملات', icon: Bitcoin, color: 'text-orange-500', expected: 60 },
  historical: { name: 'البيانات التاريخية', icon: History, color: 'text-cyan-500', expected: 25 }
}

const SCRAPING_MARKETS = [
  { name: 'السعودية', flag: '🇸🇦', expected: 200 },
  { name: 'مصر', flag: '🇪🇬', expected: 200 },
  { name: 'الكويت', flag: '🇰🇼', expected: 100 },
  { name: 'قطر', flag: '🇶🇦', expected: 50 },
]

const TECHNICAL_MARKETS = [
  { name: 'مصر', flag: '🇪🇬', supported: true, tickers: ['COMI', 'ETEL', 'HRHO'] },
  { name: 'الكويت', flag: '🇰🇼', supported: true, tickers: ['NBK', 'KFH', 'ZAIN'] },
  { name: 'قطر', flag: '🇶🇦', supported: true, tickers: ['QNB', 'MAS', 'QIBK'] },
  { name: 'السعودية', flag: '🇸🇦', supported: false, note: 'غير مدعوم من TA Library' },
]

// ==================== HELPERS ====================

function formatNumber(num: number | undefined | null): string {
  if (num === undefined || num === null || isNaN(num)) return '0'
  if (num >= 1e12) return `${(num / 1e12).toFixed(1)}T`
  if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`
  if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`
  if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`
  return num.toFixed(2)
}

function formatPrice(num: number | undefined | null): string {
  if (num === undefined || num === null || isNaN(num)) return '0'
  if (num >= 1000) return formatNumber(num)
  if (num >= 1) return num.toFixed(2)
  return num.toFixed(6)
}

// ==================== TASK STATUS COMPONENT ====================

function TaskStatusCard({ 
  title, 
  running, 
  progress, 
  total, 
  icon: Icon, 
  color,
  logs
}: { 
  title: string
  running: boolean
  progress: number
  total: number
  icon: any
  color: string
  logs?: string[]
}) {
  const percent = total > 0 ? Math.round((progress / total) * 100) : 0
  
  return (
    <Card className={`relative overflow-hidden ${running ? 'border-primary' : ''}`}>
      {running && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-primary/20">
          <div 
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
      )}
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Icon className={`w-5 h-5 ${color}`} />
            <span className="font-medium">{title}</span>
          </div>
          {running ? (
            <Badge variant="default" className="animate-pulse">
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              جاري...
            </Badge>
          ) : (
            <Badge variant="secondary">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              مكتمل
            </Badge>
          )}
        </div>
        
        {running && total > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{progress} / {total}</span>
              <span>{percent}%</span>
            </div>
            <Progress value={percent} className="h-2" />
          </div>
        )}
        
        {logs && logs.length > 0 && (
          <div className="mt-3 text-xs text-muted-foreground bg-muted/50 rounded p-2 max-h-16 overflow-hidden">
            {logs[logs.length - 1]}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ==================== MAIN COMPONENT ====================

export default function Home() {
  // State
  const [stats, setStats] = useState<Stats | null>(null)
  const [scraperStatus, setScraperStatus] = useState<ScraperStatus | null>(null)
  const [technicalStatus, setTechnicalStatus] = useState<TechnicalStatus | null>(null)
  const [cryptoStats, setCryptoStats] = useState<CryptoStats | null>(null)
  const [cryptoStatus, setCryptoStatus] = useState<CryptoStatus | null>(null)
  const [metalsForexStatus, setMetalsForexStatus] = useState<MetalsForexStatus | null>(null)
  const [historicalStatus, setHistoricalStatus] = useState<HistoricalStatus | null>(null)
  const [autoRefreshStatus, setAutoRefreshStatus] = useState<AutoRefreshStatus | null>(null)
  const [dbReport, setDbReport] = useState<DatabaseReport | null>(null)
  
  // UI State
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')

  const fetchAllData = async () => {
    try {
      const endpoints = [
        { url: '/api/stats', setter: setStats },
        { url: '/api/scraper/status', setter: setScraperStatus },
        { url: '/api/technical/status', setter: setTechnicalStatus },
        { url: '/api/crypto/stats', setter: setCryptoStats },
        { url: '/api/crypto/status', setter: setCryptoStatus },
        { url: '/api/metals-forex/status', setter: setMetalsForexStatus },
        { url: '/api/historical/status', setter: setHistoricalStatus },
        { url: '/api/auto-refresh/status', setter: setAutoRefreshStatus },
        { url: '/api/database-report', setter: setDbReport },
      ]

      await Promise.all(
        endpoints.map(async ({ url, setter }) => {
          try {
            const res = await fetch(url)
            const data = await res.json()
            setter(data)
          } catch {}
        })
      )
    } catch (error) {
      console.error('Fetch error:', error)
    }
  }

  useEffect(() => {
    let mounted = true
    const init = async () => {
      await fetchAllData()
      if (mounted) setLoading(false)
    }
    init()
    const interval = setInterval(fetchAllData, 2000)
    return () => { mounted = false; clearInterval(interval) }
  }, [])

  // Actions
  const handleAction = async (action: string, url: string) => {
    setActionLoading(action)
    try {
      await fetch(url, { method: 'POST' })
    } catch (error) {
      console.error(error)
    }
    setTimeout(() => setActionLoading(null), 1000)
  }

  const handleRunAll = async () => {
    setActionLoading('all')
    try {
      await fetch('/api/run-all', { method: 'POST' })
    } catch (error) {
      console.error(error)
    }
    setTimeout(() => setActionLoading(null), 2000)
  }

  // Calculate totals
  const stocksCount = stats?.totalStocks || 0
  const technicalCount = technicalStatus?.results?.length || 0
  const metalsCount = metalsForexStatus?.results?.metals?.length || 0
  const cryptoCount = cryptoStats?.totalCryptos || 0
  const currenciesCount = metalsForexStatus?.results?.currencies?.arab?.length || 0
  const historicalCount = historicalStatus?.results?.length || 0

  const isScraping = scraperStatus?.running
  const isTechnicalRunning = technicalStatus?.running
  const isCryptoRunning = cryptoStatus?.running
  const isMetalsRunning = metalsForexStatus?.running
  const isHistoricalRunning = historicalStatus?.running
  const isAutoRefreshRunning = autoRefreshStatus?.running
  const anyRunning = isScraping || isCryptoRunning || isMetalsRunning || isTechnicalRunning || isHistoricalRunning

  // Calculate progress
  const stocksProgress = Object.values(scraperStatus?.progress || {}).reduce(
    (sum, p) => sum + p.stocks, 0
  )
  const technicalProgress = technicalStatus?.progress?.current || technicalCount
  const metalsProgress = metalsForexStatus?.progress?.current || metalsCount
  const cryptoProgress = cryptoStatus?.progress?.current || cryptoCount

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex flex-col" dir="rtl">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Database className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-bold">مصنع بيانات الأسواق العربية</h1>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>🇪🇬 مصر | 🇸🇦 السعودية | 🇰🇼 الكويت | 🇶🇦 قطر</span>
                  {isAutoRefreshRunning && (
                    <Badge variant="default" className="animate-pulse mr-2">
                      <Clock className="w-3 h-3 ml-1" />
                      تحديث تلقائي
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              {/* Auto Refresh Button */}
              {isAutoRefreshRunning ? (
                <Button variant="outline" onClick={() => handleAction('auto-refresh', '/api/auto-refresh/stop')} size="lg" className="gap-2">
                  <Square className="w-5 h-5" />
                  إيقاف التلقائي
                </Button>
              ) : (
                <Button variant="outline" onClick={() => handleAction('auto-refresh', '/api/auto-refresh/start')} size="lg" className="gap-2">
                  <Clock className="w-5 h-5" />
                  تحديث تلقائي
                </Button>
              )}
              
              {/* Run All Button */}
              <Button 
                onClick={handleRunAll}
                disabled={anyRunning || actionLoading === 'all'}
                className="gap-2"
                size="lg"
              >
                {actionLoading === 'all' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : anyRunning ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Zap className="w-5 h-5" />
                )}
                {anyRunning ? 'جاري التشغيل...' : 'شغل الكل'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="container mx-auto px-4 py-4 flex-1">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <div className="space-y-4">
            
            {/* Task Status Cards - 4 Cards */}
            <div className="grid md:grid-cols-4 gap-4">
              <TaskStatusCard
                title="سحب الأسهم (Scraping)"
                running={isScraping}
                progress={stocksProgress}
                total={TASK_CONFIG.stocks.expected}
                icon={TASK_CONFIG.stocks.icon}
                color={TASK_CONFIG.stocks.color}
                logs={scraperStatus?.logs}
              />
              <TaskStatusCard
                title="المؤشرات الفنية (TA)"
                running={isTechnicalRunning}
                progress={technicalProgress}
                total={TASK_CONFIG.technical.expected}
                icon={TASK_CONFIG.technical.icon}
                color={TASK_CONFIG.technical.color}
                logs={technicalStatus?.logs}
              />
              <TaskStatusCard
                title="الذهب والعملات"
                running={isMetalsRunning}
                progress={metalsProgress}
                total={TASK_CONFIG.metals.expected}
                icon={TASK_CONFIG.metals.icon}
                color={TASK_CONFIG.metals.color}
                logs={metalsForexStatus?.logs}
              />
              <TaskStatusCard
                title="العملات الرقمية"
                running={isCryptoRunning}
                progress={cryptoProgress}
                total={TASK_CONFIG.crypto.expected}
                icon={TASK_CONFIG.crypto.icon}
                color={TASK_CONFIG.crypto.color}
                logs={cryptoStatus?.logs}
              />
            </div>

            {/* Quick Stats - 5 Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Card>
                <CardContent className="p-3 text-center">
                  <Building2 className="w-5 h-5 mx-auto text-blue-500 mb-1" />
                  <div className="text-2xl font-bold">{stocksCount}</div>
                  <div className="text-xs text-muted-foreground">سهم (Scraping)</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-3 text-center">
                  <LineChart className="w-5 h-5 mx-auto text-purple-500 mb-1" />
                  <div className="text-2xl font-bold">{technicalCount}</div>
                  <div className="text-xs text-muted-foreground">مؤشر فني (TA)</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-3 text-center">
                  <Landmark className="w-5 h-5 mx-auto text-yellow-600 mb-1" />
                  <div className="text-2xl font-bold">{metalsCount}</div>
                  <div className="text-xs text-muted-foreground">معدن</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-3 text-center">
                  <DollarSign className="w-5 h-5 mx-auto text-green-600 mb-1" />
                  <div className="text-2xl font-bold">{currenciesCount}</div>
                  <div className="text-xs text-muted-foreground">عملة</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-3 text-center">
                  <Bitcoin className="w-5 h-5 mx-auto text-orange-500 mb-1" />
                  <div className="text-2xl font-bold">{cryptoCount}</div>
                  <div className="text-xs text-muted-foreground">عملة رقمية</div>
                </CardContent>
              </Card>
            </div>

            {/* 🔴 Live Status Report - شاشة الحالة الحية */}
            <Card className="border-green-500/50 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="w-5 h-5 text-green-500 animate-pulse" />
                    🔴 تقرير الحالة الحية - آخر تحديث: {new Date().toLocaleTimeString('ar-EG')}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {anyRunning ? (
                      <Badge variant="default" className="bg-green-500 animate-pulse">
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        يعمل الآن
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        جميع المهام مكتملة
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-3">
                  {/* سحب الأسهم */}
                  <div className={`p-3 rounded-lg border-2 ${isScraping ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30' : 'border-gray-200 bg-muted/30'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Building2 className={`w-4 h-4 ${isScraping ? 'text-blue-500 animate-bounce' : 'text-gray-400'}`} />
                        <span className="font-medium text-sm">سحب الأسهم</span>
                      </div>
                      {isScraping ? (
                        <Badge variant="default" className="bg-blue-500 text-xs">يعمل</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">متوقف</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {isScraping ? (
                        <span className="text-blue-600">⚡ جاري سحب: {scraperStatus?.currentMarket || '...'} | {stocksProgress} سهم</span>
                      ) : scraperStatus?.logs?.length > 0 ? (
                        <span>{scraperStatus.logs[scraperStatus.logs.length - 1]}</span>
                      ) : (
                        <span>✅ مكتمل - {stocksCount} سهم</span>
                      )}
                    </div>
                  </div>

                  {/* المؤشرات الفنية */}
                  <div className={`p-3 rounded-lg border-2 ${isTechnicalRunning ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/30' : 'border-gray-200 bg-muted/30'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <LineChart className={`w-4 h-4 ${isTechnicalRunning ? 'text-purple-500 animate-bounce' : 'text-gray-400'}`} />
                        <span className="font-medium text-sm">المؤشرات الفنية</span>
                      </div>
                      {isTechnicalRunning ? (
                        <Badge variant="default" className="bg-purple-500 text-xs">يعمل</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">متوقف</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {isTechnicalRunning ? (
                        <span className="text-purple-600">⚡ جاري تحليل: {technicalStatus?.progress?.market || '...'} | {technicalProgress}/{technicalStatus?.progress?.total}</span>
                      ) : technicalStatus?.logs?.length > 0 ? (
                        <span>{technicalStatus.logs[technicalStatus.logs.length - 1]}</span>
                      ) : (
                        <span>✅ مكتمل - {technicalCount} سهم</span>
                      )}
                    </div>
                  </div>

                  {/* الذهب والعملات */}
                  <div className={`p-3 rounded-lg border-2 ${isMetalsRunning ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30' : 'border-gray-200 bg-muted/30'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Landmark className={`w-4 h-4 ${isMetalsRunning ? 'text-yellow-500 animate-bounce' : 'text-gray-400'}`} />
                        <span className="font-medium text-sm">الذهب والعملات</span>
                      </div>
                      {isMetalsRunning ? (
                        <Badge variant="default" className="bg-yellow-500 text-xs">يعمل</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">متوقف</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {isMetalsRunning ? (
                        <span className="text-yellow-600">⚡ جاري تحديث: {metalsProgress}/{metalsForexStatus?.progress?.total}</span>
                      ) : metalsForexStatus?.logs?.length > 0 ? (
                        <span>{metalsForexStatus.logs[metalsForexStatus.logs.length - 1]}</span>
                      ) : (
                        <span>✅ مكتمل - {metalsCount} معدن + {currenciesCount} عملة</span>
                      )}
                    </div>
                  </div>

                  {/* العملات الرقمية */}
                  <div className={`p-3 rounded-lg border-2 ${isCryptoRunning ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30' : 'border-gray-200 bg-muted/30'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Bitcoin className={`w-4 h-4 ${isCryptoRunning ? 'text-orange-500 animate-bounce' : 'text-gray-400'}`} />
                        <span className="font-medium text-sm">العملات الرقمية</span>
                      </div>
                      {isCryptoRunning ? (
                        <Badge variant="default" className="bg-orange-500 text-xs">يعمل</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">متوقف</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {isCryptoRunning ? (
                        <span className="text-orange-600">⚡ جاري سحب: {cryptoStatus?.progress?.currentCoin || '...'} | {cryptoProgress}/{cryptoStatus?.progress?.total}</span>
                      ) : cryptoStatus?.logs?.length > 0 ? (
                        <span>{cryptoStatus.logs[cryptoStatus.logs.length - 1]}</span>
                      ) : (
                        <span>✅ مكتمل - {cryptoCount} عملة</span>
                      )}
                    </div>
                  </div>

                  {/* البيانات التاريخية */}
                  <div className={`p-3 rounded-lg border-2 ${isHistoricalRunning ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/30' : 'border-gray-200 bg-muted/30'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <History className={`w-4 h-4 ${isHistoricalRunning ? 'text-cyan-500 animate-bounce' : 'text-gray-400'}`} />
                        <span className="font-medium text-sm">البيانات التاريخية</span>
                      </div>
                      {isHistoricalRunning ? (
                        <Badge variant="default" className="bg-cyan-500 text-xs">يعمل</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">متوقف</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {isHistoricalRunning ? (
                        <span className="text-cyan-600">⚡ جاري سحب: {historicalStatus?.progress?.symbol || '...'} | {historicalStatus?.progress?.current}/{historicalStatus?.progress?.total}</span>
                      ) : historicalStatus?.logs?.length > 0 ? (
                        <span>{historicalStatus.logs[historicalStatus.logs.length - 1]}</span>
                      ) : (
                        <span>✅ مكتمل - {historicalCount} رمز</span>
                      )}
                    </div>
                  </div>

                  {/* التحديث التلقائي */}
                  <div className={`p-3 rounded-lg border-2 ${isAutoRefreshRunning ? 'border-pink-500 bg-pink-50 dark:bg-pink-950/30' : 'border-gray-200 bg-muted/30'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Clock className={`w-4 h-4 ${isAutoRefreshRunning ? 'text-pink-500 animate-spin' : 'text-gray-400'}`} />
                        <span className="font-medium text-sm">التحديث التلقائي</span>
                      </div>
                      {isAutoRefreshRunning ? (
                        <Badge variant="default" className="bg-pink-500 text-xs">نشط</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">متوقف</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {isAutoRefreshRunning ? (
                        <span className="text-pink-600">⚡ التالي: {autoRefreshStatus?.next_run || '...'} | كل {Math.round((autoRefreshStatus?.interval || 600) / 60)} دقائق</span>
                      ) : (
                        <span>⏸️ متوقف - اضغط "تحديث تلقائي" للبدء</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* ملخص سريع */}
                <div className="mt-3 p-2 bg-muted/30 rounded-lg flex items-center justify-between text-xs">
                  <div className="flex items-center gap-4">
                    <span>📊 <strong>{dbReport?.totals?.totalRecords?.toLocaleString() || 0}</strong> سجل في قاعدة البيانات</span>
                    <span>|</span>
                    <span>💾 حجم القاعدة: <strong>{dbReport?.fileSize || '0 MB'}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    {anyRunning ? (
                      <span className="text-green-600 animate-pulse">🔄 هناك {Object.values([isScraping, isTechnicalRunning, isMetalsRunning, isCryptoRunning, isHistoricalRunning]).filter(Boolean).length} مهام تعمل الآن</span>
                    ) : (
                      <span className="text-muted-foreground">✅ جميع المهام مكتملة</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Database Report Card */}
            {dbReport && (
              <Card className="border-primary/20">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Database className="w-5 h-5 text-primary" />
                      📊 تقرير قاعدة البيانات
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{dbReport.fileSize}</Badge>
                      <Badge variant="secondary">{dbReport.totals.totalRecords.toLocaleString()} سجل</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-4 gap-4 mb-4">
                    {dbReport.tables.map((table) => (
                      <div key={table.name} className="bg-muted/50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">{table.name}</span>
                          <Badge variant="outline" className="text-xs">{table.count}</Badge>
                        </div>
                        {table.dateRange && (
                          <div className="text-xs text-muted-foreground">
                            📅 {table.dateRange.min} → {table.dateRange.max}
                          </div>
                        )}
                        {table.uniqueSymbols > 0 && (
                          <div className="text-xs text-muted-foreground">
                            🔢 {table.uniqueSymbols} رمز
                          </div>
                        )}
                        {table.lastUpdate && (
                          <div className="text-xs text-muted-foreground mt-1">
                            ⏰ {new Date(table.lastUpdate).toLocaleString('ar-EG')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {/* Auto Refresh Status */}
                  {autoRefreshStatus && (
                    <div className="flex items-center justify-between bg-muted/30 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <Clock className={`w-4 h-4 ${autoRefreshStatus.running ? 'text-green-500 animate-spin' : 'text-muted-foreground'}`} />
                        <span className="text-sm font-medium">التحديث التلقائي</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {autoRefreshStatus.running ? (
                          <>
                            <Badge variant="default" className="animate-pulse">نشط</Badge>
                            {autoRefreshStatus.next_run && (
                              <span className="text-xs text-muted-foreground">التالي: {autoRefreshStatus.next_run}</span>
                            )}
                          </>
                        ) : (
                          <Badge variant="secondary">متوقف</Badge>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Main Tabs - 6 Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
                <TabsTrigger value="scraping">سحب الأسهم</TabsTrigger>
                <TabsTrigger value="technical">المؤشرات الفنية</TabsTrigger>
                <TabsTrigger value="historical">بيانات تاريخية</TabsTrigger>
                <TabsTrigger value="metals">ذهب وعملات</TabsTrigger>
                <TabsTrigger value="crypto">عملات رقمية</TabsTrigger>
              </TabsList>

              {/* ==================== OVERVIEW TAB ==================== */}
              <TabsContent value="overview" className="space-y-4">
                {/* Market Progress */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">📈 تقدم سحب الأسهم بالأسواق</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {SCRAPING_MARKETS.map(market => {
                      const marketData = stats?.markets?.[market.name]
                      const count = marketData?.count || scraperStatus?.progress?.[market.name]?.stocks || 0
                      const percent = Math.min(100, Math.round((count / market.expected) * 100))
                      const status = scraperStatus?.progress?.[market.name]?.status
                      
                      return (
                        <div key={market.name} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{market.flag}</span>
                              <span>{market.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">{count} سهم</span>
                              {status === 'completed' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                              {status === 'error' && <XCircle className="w-4 h-4 text-red-500" />}
                            </div>
                          </div>
                          <Progress value={percent} className="h-2" />
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>

                {/* Technical Analysis Summary */}
                {technicalStatus?.results && technicalStatus.results.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">📊 المؤشرات الفنية (RSI + MACD)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-3 gap-3">
                        {['BUY', 'SELL', 'NEUTRAL'].map(rec => {
                          const count = technicalStatus.results?.filter(r => r.recommendation === rec).length || 0
                          const color = rec === 'BUY' ? 'text-green-500' : rec === 'SELL' ? 'text-red-500' : 'text-yellow-500'
                          const label = rec === 'BUY' ? 'شراء' : rec === 'SELL' ? 'بيع' : 'محايد'
                          
                          return (
                            <div key={rec} className="bg-muted/50 rounded-lg p-3 text-center">
                              <div className={`text-2xl font-bold ${color}`}>{count}</div>
                              <div className="text-sm">{label}</div>
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Metals Preview */}
                {metalsForexStatus?.results?.metals?.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">🥇 أسعار المعادن</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-3 gap-3">
                        {metalsForexStatus.results.metals.map((metal) => (
                          <div key={metal.symbol} className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950 dark:to-yellow-900 rounded-lg p-4 text-center">
                            <div className="text-3xl mb-1">
                              {metal.symbol === 'XAU' ? '🥇' : metal.symbol === 'XAG' ? '🥈' : '⚪'}
                            </div>
                            <div className="font-bold">{metal.name}</div>
                            <div className="text-xl font-bold text-yellow-700">${formatPrice(metal.price_usd)}</div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Top Cryptos Preview */}
                {cryptoStats?.topCryptos?.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">₿ أعلى 5 عملات</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {cryptoStats.topCryptos.slice(0, 5).map((crypto, i) => (
                          <div key={crypto.symbol} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground w-6">{i + 1}</span>
                              <span className="font-bold">{crypto.symbol}</span>
                              <span className="text-muted-foreground text-sm">{crypto.name}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-medium">${formatPrice(crypto.current_price)}</span>
                              <span className={`text-sm ${crypto.price_change_percent_24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {crypto.price_change_percent_24h >= 0 ? '+' : ''}{crypto.price_change_percent_24h?.toFixed(2)}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* ==================== SCRAPING TAB ==================== */}
              <TabsContent value="scraping" className="space-y-4">
                <Card className="border-blue-200">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Activity className="w-5 h-5 text-blue-500" />
                        <div>
                          <span className="font-medium">Scraping من TradingView</span>
                          <p className="text-xs text-muted-foreground">سحب كل الأسهم من 4 أسواق عربية</p>
                        </div>
                      </div>
                      {isScraping ? (
                        <Button variant="destructive" onClick={() => handleAction('scraping', '/api/scraper/stop')} size="sm">
                          <Square className="w-4 h-4 ml-2" />إيقاف
                        </Button>
                      ) : (
                        <Button onClick={() => handleAction('scraping', '/api/scraper/start')} size="sm">
                          <Play className="w-4 h-4 ml-2" />تشغيل
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <div className="grid md:grid-cols-2 gap-4">
                  {SCRAPING_MARKETS.map(market => {
                    const marketData = stats?.markets?.[market.name]
                    const count = marketData?.count || scraperStatus?.progress?.[market.name]?.stocks || 0
                    const percent = Math.min(100, Math.round((count / market.expected) * 100))
                    const status = scraperStatus?.progress?.[market.name]?.status
                    
                    return (
                      <Card key={market.name} className={status === 'completed' ? 'border-green-200' : status === 'error' ? 'border-red-200' : ''}>
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">{market.flag}</span>
                              <span className="font-medium">{market.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={percent >= 80 ? 'default' : 'secondary'}>{percent}%</Badge>
                              {status === 'completed' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                              {status === 'error' && <XCircle className="w-4 h-4 text-red-500" />}
                            </div>
                          </div>
                          <Progress value={percent} className="h-2" />
                          <div className="text-xs text-muted-foreground">{count} / {market.expected} سهم</div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </TabsContent>

              {/* ==================== TECHNICAL TAB ==================== */}
              <TabsContent value="technical" className="space-y-4">
                <Card className="border-purple-200 bg-purple-50/30">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <LineChart className="w-5 h-5 text-purple-500" />
                        <div>
                          <span className="font-medium">TradingView TA Library</span>
                          <p className="text-xs text-muted-foreground">RSI + MACD + التوصيات (3 أسواق مدعومة)</p>
                        </div>
                      </div>
                      {isTechnicalRunning ? (
                        <Button variant="destructive" onClick={() => handleAction('technical', '/api/technical/stop')} size="sm">
                          <Square className="w-4 h-4 ml-2" />إيقاف
                        </Button>
                      ) : (
                        <Button onClick={() => handleAction('technical', '/api/technical/start')} size="sm" className="bg-purple-500 hover:bg-purple-600">
                          <Play className="w-4 h-4 ml-2" />تحديث
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Supported Markets */}
                <div className="grid md:grid-cols-4 gap-4">
                  {TECHNICAL_MARKETS.map(market => (
                    <Card key={market.name} className={market.supported ? 'border-green-200' : 'opacity-50'}>
                      <CardContent className="p-3 text-center">
                        <div className="text-3xl mb-2">{market.flag}</div>
                        <div className="font-bold">{market.name}</div>
                        <Badge variant={market.supported ? 'default' : 'secondary'} className="mt-2 text-xs">
                          {market.supported ? '✅ مدعوم' : `❌ ${market.note}`}
                        </Badge>
                        {market.supported && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {market.tickers.length} أسهم
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Technical Results */}
                {technicalStatus?.results && technicalStatus.results.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">📊 نتائج المؤشرات الفنية</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-right p-2">السهم</th>
                              <th className="text-right p-2">السوق</th>
                              <th className="text-right p-2">السعر</th>
                              <th className="text-right p-2">RSI</th>
                              <th className="text-right p-2">MACD</th>
                              <th className="text-right p-2">التوصية</th>
                            </tr>
                          </thead>
                          <tbody>
                            {technicalStatus.results.slice(0, 20).map((result, i) => (
                              <tr key={i} className="border-b last:border-0">
                                <td className="p-2 font-bold">{result.ticker}</td>
                                <td className="p-2">{result.market}</td>
                                <td className="p-2">${formatPrice(result.price)}</td>
                                <td className="p-2">{result.rsi?.toFixed(1) || '-'}</td>
                                <td className="p-2">{result.macd?.toFixed(2) || '-'}</td>
                                <td className="p-2">
                                  <Badge variant={
                                    result.recommendation === 'BUY' ? 'default' :
                                    result.recommendation === 'SELL' ? 'destructive' : 'secondary'
                                  }>
                                    {result.recommendation === 'BUY' ? 'شراء' :
                                     result.recommendation === 'SELL' ? 'بيع' : 'محايد'}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* ==================== HISTORICAL TAB ==================== */}
              <TabsContent value="historical" className="space-y-4">
                <Card className="border-cyan-200 bg-cyan-50/30">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <History className="w-5 h-5 text-cyan-500" />
                        <div>
                          <span className="font-medium">Yahoo Finance Historical Data</span>
                          <p className="text-xs text-muted-foreground">بيانات تاريخية (OHLCV) - يومي</p>
                        </div>
                      </div>
                      {isHistoricalRunning ? (
                        <Button variant="destructive" onClick={() => handleAction('historical', '/api/historical/stop')} size="sm">
                          <Square className="w-4 h-4 ml-2" />إيقاف
                        </Button>
                      ) : (
                        <Button onClick={() => handleAction('historical', '/api/historical/start')} size="sm" className="bg-cyan-500 hover:bg-cyan-600">
                          <Play className="w-4 h-4 ml-2" />تحميل
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Progress */}
                {isHistoricalRunning && (
                  <Card>
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>جاري سحب: {historicalStatus?.progress?.symbol}</span>
                          <span>{historicalStatus?.progress?.current} / {historicalStatus?.progress?.total}</span>
                        </div>
                        <Progress value={(historicalStatus?.progress?.current || 0) / (historicalStatus?.progress?.total || 1) * 100} className="h-2" />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Historical Results */}
                {historicalStatus?.results && historicalStatus.results.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">📊 البيانات التاريخية المحملة</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-right p-2">الرمز</th>
                              <th className="text-right p-2">الاسم</th>
                              <th className="text-right p-2">السوق</th>
                              <th className="text-right p-2">أيام</th>
                              <th className="text-right p-2">آخر إغلاق</th>
                            </tr>
                          </thead>
                          <tbody>
                            {historicalStatus.results.filter(r => r.status === 'success').map((result, i) => (
                              <tr key={i} className="border-b last:border-0">
                                <td className="p-2 font-bold">{result.symbol}</td>
                                <td className="p-2">{result.name}</td>
                                <td className="p-2">{result.market}</td>
                                <td className="p-2">{result.days}</td>
                                <td className="p-2 font-medium">${result.latest_close?.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* ==================== METALS TAB ==================== */}
              <TabsContent value="metals" className="space-y-4">
                <Card className="border-yellow-200">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Landmark className="w-5 h-5 text-yellow-600" />
                        <div>
                          <span className="font-medium">الذهب والعملات العربية</span>
                          <p className="text-xs text-muted-foreground">gold-api.com + exchangerate-api.com</p>
                        </div>
                      </div>
                      {isMetalsRunning ? (
                        <Button variant="destructive" onClick={() => handleAction('metals', '/api/metals-forex/stop')} size="sm">
                          <Loader2 className="w-4 h-4 ml-2 animate-spin" />جاري...
                        </Button>
                      ) : (
                        <Button onClick={() => handleAction('metals', '/api/metals-forex/start')} size="sm" className="bg-yellow-600 hover:bg-yellow-700">
                          <RefreshCw className="w-4 h-4 ml-2" />تحديث
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Metals */}
                {metalsForexStatus?.results?.metals?.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">🥇 المعادن الثمينة</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-3 gap-4">
                        {metalsForexStatus.results.metals.map((metal) => (
                          <Card key={metal.symbol} className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950 dark:to-yellow-900">
                            <CardContent className="p-4 text-center">
                              <div className="text-3xl mb-2">
                                {metal.symbol === 'XAU' ? '🥇' : metal.symbol === 'XAG' ? '🥈' : '⚪'}
                              </div>
                              <div className="font-bold text-lg">{metal.name}</div>
                              <div className="text-2xl font-bold text-yellow-700">${formatPrice(metal.price_usd)}</div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Currencies */}
                {metalsForexStatus?.results?.currencies?.arab?.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">💱 العملات العربية</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-4 gap-3">
                        {metalsForexStatus.results.currencies.arab.map((currency) => (
                          <Card key={currency.code}>
                            <CardContent className="p-3 text-center">
                              <div className="text-2xl mb-1">{currency.flag}</div>
                              <div className="font-bold">{currency.code}</div>
                              <div className="text-lg font-bold text-green-600 mt-1">
                                {currency.rate_to_usd.toFixed(4)}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* ==================== CRYPTO TAB ==================== */}
              <TabsContent value="crypto" className="space-y-4">
                <Card className="border-orange-200">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bitcoin className="w-5 h-5 text-orange-500" />
                        <div>
                          <span className="font-medium">CoinGecko + Binance + CMC</span>
                          <p className="text-xs text-muted-foreground">3 مصادر للعملات الرقمية</p>
                        </div>
                      </div>
                      {isCryptoRunning ? (
                        <Button variant="destructive" onClick={() => handleAction('crypto', '/api/crypto/stop')} size="sm">
                          <Square className="w-4 h-4 ml-2" />إيقاف
                        </Button>
                      ) : (
                        <Button onClick={() => handleAction('crypto', '/api/crypto/start')} size="sm" className="bg-orange-500 hover:bg-orange-600">
                          <Play className="w-4 h-4 ml-2" />تحديث
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">أعلى 10 عملات</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {cryptoStats?.topCryptos?.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-right p-2">#</th>
                              <th className="text-right p-2">الاسم</th>
                              <th className="text-right p-2">السعر</th>
                              <th className="text-right p-2">24h</th>
                              <th className="text-right p-2">القيمة</th>
                            </tr>
                          </thead>
                          <tbody>
                            {cryptoStats.topCryptos.slice(0, 10).map((crypto, i) => (
                              <tr key={crypto.symbol} className="border-b last:border-0">
                                <td className="p-2">{crypto.market_cap_rank || i + 1}</td>
                                <td className="p-2 font-bold">{crypto.symbol}</td>
                                <td className="p-2">${formatPrice(crypto.current_price)}</td>
                                <td className={`p-2 ${crypto.price_change_percent_24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                  {crypto.price_change_percent_24h >= 0 ? '+' : ''}{crypto.price_change_percent_24h?.toFixed(2)}%
                                </td>
                                <td className="p-2">${formatNumber(crypto.market_cap)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground py-8">
                        <Bitcoin className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>اضغط "تحديث" لسحب البيانات</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* ==================== LOGS & DEBUG PANEL ==================== */}
            <Card className="border-green-200 bg-green-50/10 dark:bg-green-950/20">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="w-5 h-5 text-green-500" />
                    📋 سجلات النظام (Logs & Debug)
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant={anyRunning ? "default" : "secondary"} className="animate-pulse">
                      {anyRunning ? "🟢 نشط" : "⚪ خامد"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Scraping Logs */}
                  <div className="bg-black/90 rounded-lg p-3 font-mono text-xs text-green-400 max-h-48 overflow-y-auto">
                    <div className="text-green-500 mb-2 border-b border-green-500/30 pb-1">
                      🔵 سحب الأسهم (Scraping)
                    </div>
                    {scraperStatus?.logs && scraperStatus.logs.length > 0 ? (
                      scraperStatus.logs.slice(-10).map((log, i) => (
                        <div key={i} className="mb-1">{log}</div>
                      ))
                    ) : (
                      <div className="text-gray-500">لا توجد سجلات...</div>
                    )}
                  </div>
                  
                  {/* Technical Logs */}
                  <div className="bg-black/90 rounded-lg p-3 font-mono text-xs text-purple-400 max-h-48 overflow-y-auto">
                    <div className="text-purple-500 mb-2 border-b border-purple-500/30 pb-1">
                      🟣 المؤشرات الفنية (TA)
                    </div>
                    {technicalStatus?.logs && technicalStatus.logs.length > 0 ? (
                      technicalStatus.logs.slice(-10).map((log, i) => (
                        <div key={i} className="mb-1">{log}</div>
                      ))
                    ) : (
                      <div className="text-gray-500">لا توجد سجلات...</div>
                    )}
                  </div>
                  
                  {/* Metals Logs */}
                  <div className="bg-black/90 rounded-lg p-3 font-mono text-xs text-yellow-400 max-h-48 overflow-y-auto">
                    <div className="text-yellow-500 mb-2 border-b border-yellow-500/30 pb-1">
                      🟡 الذهب والعملات
                    </div>
                    {metalsForexStatus?.logs && metalsForexStatus.logs.length > 0 ? (
                      metalsForexStatus.logs.slice(-10).map((log, i) => (
                        <div key={i} className="mb-1">{log}</div>
                      ))
                    ) : (
                      <div className="text-gray-500">لا توجد سجلات...</div>
                    )}
                  </div>
                  
                  {/* Crypto Logs */}
                  <div className="bg-black/90 rounded-lg p-3 font-mono text-xs text-orange-400 max-h-48 overflow-y-auto">
                    <div className="text-orange-500 mb-2 border-b border-orange-500/30 pb-1">
                      🟠 العملات الرقمية
                    </div>
                    {cryptoStatus?.logs && cryptoStatus.logs.length > 0 ? (
                      cryptoStatus.logs.slice(-10).map((log, i) => (
                        <div key={i} className="mb-1">{log}</div>
                      ))
                    ) : (
                      <div className="text-gray-500">لا توجد سجلات...</div>
                    )}
                  </div>
                  
                  {/* Historical Logs */}
                  <div className="bg-black/90 rounded-lg p-3 font-mono text-xs text-cyan-400 max-h-48 overflow-y-auto">
                    <div className="text-cyan-500 mb-2 border-b border-cyan-500/30 pb-1">
                      🔷 البيانات التاريخية
                    </div>
                    {historicalStatus?.logs && historicalStatus.logs.length > 0 ? (
                      historicalStatus.logs.slice(-10).map((log, i) => (
                        <div key={i} className="mb-1">{log}</div>
                      ))
                    ) : (
                      <div className="text-gray-500">لا توجد سجلات...</div>
                    )}
                  </div>
                  
                  {/* Auto Refresh Logs */}
                  <div className="bg-black/90 rounded-lg p-3 font-mono text-xs text-pink-400 max-h-48 overflow-y-auto">
                    <div className="text-pink-500 mb-2 border-b border-pink-500/30 pb-1">
                      ⏰ التحديث التلقائي
                    </div>
                    {autoRefreshStatus?.logs && autoRefreshStatus.logs.length > 0 ? (
                      autoRefreshStatus.logs.slice(-10).map((log, i) => (
                        <div key={i} className="mb-1">{log}</div>
                      ))
                    ) : (
                      <div className="text-gray-500">لا توجد سجلات...</div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t py-2 text-center text-xs text-muted-foreground bg-muted/30 mt-auto">
        <div className="container mx-auto">
          🏭 مصنع البيانات الشامل | Scraping + TA + Metals + Crypto | 4 أسواق عربية
        </div>
      </footer>
    </div>
  )
}
