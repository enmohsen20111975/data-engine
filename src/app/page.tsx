'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Database, Newspaper, Table, TrendingUp, TrendingDown,
  ChevronLeft, ChevronRight, ExternalLink, Clock, Building2
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

export default function Home() {
  // State
  const [activeTab, setActiveTab] = useState('database')
  const [stocks, setStocks] = useState<Stock[]>([])
  const [news, setNews] = useState<NewsItem[]>([])
  const [dbStats, setDbStats] = useState<DbStats | null>(null)
  const [markets, setMarkets] = useState<string[]>([])
  const [selectedMarket, setSelectedMarket] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const LIMIT = 20

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

  // Initial load
  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await fetchDbStats()
      await fetchStocks()
      setLoading(false)
    }
    init()
  }, [])

  // Handle tab change
  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    setPage(0)
    setSelectedMarket('')
    if (tab === 'database') {
      fetchStocks()
    } else if (tab === 'news') {
      fetchNews()
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
    const num = typeof price === 'string' ? parseFloat(price) : price
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Database className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">عارض بيانات الأسواق</h1>
                <p className="text-sm text-slate-500">السعودية 🇸🇦 | مصر 🇪🇬 | الكويت 🇰🇼 | قطر 🇶🇦</p>
              </div>
            </div>
            
            {dbStats && (
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-sm">
                  <Database className="w-3 h-3 ml-1" />
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
      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
            <TabsTrigger value="database" className="gap-2">
              <Table className="w-4 h-4" />
              قاعدة البيانات
            </TabsTrigger>
            <TabsTrigger value="news" className="gap-2">
              <Newspaper className="w-4 h-4" />
              الأخبار
            </TabsTrigger>
          </TabsList>

          {/* Database Tab */}
          <TabsContent value="database" className="space-y-4">
            {/* Filter */}
            <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">فلترة حسب السوق:</span>
                <div className="flex gap-2">
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
                        </tr>
                      ))
                    ) : (
                      stocks.map((stock, index) => {
                        const marketConfig = getMarketConfig(stock.market)
                        const changeNum = parseFloat(stock.change_percent?.replace('%', '') || '0')
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
                صفحة {page + 1} من {Math.ceil(total / LIMIT)}
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
            {/* Filter */}
            <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">فلترة حسب السوق:</span>
                <div className="flex gap-2">
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

            {/* News Grid */}
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
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {news.map((item) => {
                  const marketConfig = getMarketConfig(item.market)
                  
                  return (
                    <Card key={item.id} className="group hover:shadow-lg transition-all duration-200 overflow-hidden">
                      <CardContent className="p-0">
                        {/* Header with market badge */}
                        <div className={`px-4 py-2 ${marketConfig.color} border-b`}>
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className="bg-white/50 text-xs">
                              <span className="ml-1">{marketConfig.flag}</span>
                              {item.market}
                            </Badge>
                            <span className="text-xs opacity-70">{item.source}</span>
                          </div>
                        </div>
                        
                        {/* Content */}
                        <div className="p-4">
                          <h3 className="font-semibold text-slate-800 mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                            {item.title}
                          </h3>
                          
                          {item.snippet && (
                            <p className="text-sm text-slate-600 mb-3 line-clamp-3">
                              {item.snippet}
                            </p>
                          )}
                          
                          {/* Footer */}
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
                صفحة {page + 1} من {Math.ceil(total / LIMIT)}
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

        {/* Database Stats Card */}
        {dbStats && activeTab === 'database' && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                إحصائيات قاعدة البيانات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {dbStats.tables.map((table) => (
                  <div key={table.name} className="bg-slate-50 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-slate-800">{table.count.toLocaleString()}</div>
                    <div className="text-xs text-slate-500 truncate">{table.name}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-auto py-4">
        <div className="container mx-auto px-4 text-center text-sm text-slate-500">
          Data Engine © 2024 - الأسواق العربية: السعودية 🇸🇦 | مصر 🇪🇬 | الكويت 🇰🇼 | قطر 🇶🇦
        </div>
      </footer>
    </div>
  )
}
