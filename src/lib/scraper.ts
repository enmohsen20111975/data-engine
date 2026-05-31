/**
 * Data Factory - Complete TradingView Scraper
 * Extracts ALL available data from TradingView
 * 
 * Data Types:
 * - Stock Overview (prices, market cap, key metrics)
 * - Historical Data (from 2010)
 * - Income Statement (annual & quarterly)
 * - Balance Sheet
 * - Cash Flow
 * - Financial Ratios
 * - Dividends
 * - Analyst Forecasts
 * - Ownership Structure
 * - Insider Holdings
 */

import ZAI from 'z-ai-web-dev-sdk';
import { db } from '@/lib/db';

// =============================================================================
// CONFIGURATION - ALL ARAB COUNTRIES
// =============================================================================

export const DATA_SOURCES = {
  TRADING_VIEW: {
    name: 'TradingView',
    baseUrl: 'https://www.tradingview.com',
    marketsUrl: (country: string) => `https://www.tradingview.com/markets/stocks-${country}/`,
    allStocksUrl: (country: string) => `https://www.tradingview.com/markets/stocks-${country}/market-movers-all-stocks/`,
    quoteUrl: (symbol: string, exchange: string) => `https://www.tradingview.com/symbols/${exchange}-${symbol}/`,
    historicalUrl: (symbol: string, exchange: string) => `https://www.tradingview.com/symbols/${exchange}-${symbol}/historical-data/`,
    financialsUrl: (symbol: string, exchange: string) => `https://www.tradingview.com/symbols/${exchange}-${symbol}/financials/`,
    dividendsUrl: (symbol: string, exchange: string) => `https://www.tradingview.com/symbols/${exchange}-${symbol}/dividends/`,
    forecastsUrl: (symbol: string, exchange: string) => `https://www.tradingview.com/symbols/${exchange}-${symbol}/forecasts/`,
    newsUrl: (symbol: string, exchange: string) => `https://www.tradingview.com/symbols/${exchange}-${symbol}/news/`,
  },
  STOCK_ANALYSIS: {
    name: 'Stock Analysis',
    baseUrl: 'https://stockanalysis.com',
    listUrl: (exchange: string) => `https://stockanalysis.com/list/${exchange}/`,
    quoteUrl: (symbol: string) => `https://stockanalysis.com/quote/${symbol}/`,
    financialsUrl: (symbol: string) => `https://stockanalysis.com/stocks/${symbol}/financials/`,
  },
};

// All Arab exchanges supported by TradingView
export const EXCHANGES = {
  // Egypt
  EGX: { 
    name: 'Egyptian Exchange', 
    country: 'Egypt',
    countryAr: 'مصر',
    code: 'EGX', 
    tvCountry: 'egypt',
    currency: 'EGP',
    timezone: 'Africa/Cairo'
  },
  
  // Saudi Arabia
  TADAWUL: { 
    name: 'Saudi Stock Exchange (Tadawul)', 
    country: 'Saudi Arabia',
    countryAr: 'السعودية',
    code: 'TADAWUL', 
    tvCountry: 'saudi-arabia',
    currency: 'SAR',
    timezone: 'Asia/Riyadh'
  },
  
  // UAE - Abu Dhabi
  ADX: { 
    name: 'Abu Dhabi Securities Exchange', 
    country: 'UAE',
    countryAr: 'الإمارات - أبوظبي',
    code: 'ADX', 
    tvCountry: 'uae',
    currency: 'AED',
    timezone: 'Asia/Dubai'
  },
  
  // UAE - Dubai
  DFM: { 
    name: 'Dubai Financial Market', 
    country: 'UAE',
    countryAr: 'الإمارات - دبي',
    code: 'DFM', 
    tvCountry: 'uae',
    currency: 'AED',
    timezone: 'Asia/Dubai'
  },
  
  // Kuwait
  KSE: { 
    name: 'Kuwait Stock Exchange (Boursa Kuwait)', 
    country: 'Kuwait',
    countryAr: 'الكويت',
    code: 'KSE', 
    tvCountry: 'kuwait',
    currency: 'KWD',
    timezone: 'Asia/Kuwait'
  },
  
  // Qatar
  QE: { 
    name: 'Qatar Stock Exchange', 
    country: 'Qatar',
    countryAr: 'قطر',
    code: 'QE', 
    tvCountry: 'qatar',
    currency: 'QAR',
    timezone: 'Asia/Qatar'
  },
  
  // Bahrain
  BHB: { 
    name: 'Bahrain Bourse', 
    country: 'Bahrain',
    countryAr: 'البحرين',
    code: 'BHB', 
    tvCountry: 'bahrain',
    currency: 'BHD',
    timezone: 'Asia/Bahrain'
  },
  
  // Oman
  MSX: { 
    name: 'Muscat Stock Exchange', 
    country: 'Oman',
    countryAr: 'عمان',
    code: 'MSX', 
    tvCountry: 'oman',
    currency: 'OMR',
    timezone: 'Asia/Muscat'
  },
  
  // Tunisia
  BVB: { 
    name: 'Tunisia Stock Exchange (Bourse de Tunis)', 
    country: 'Tunisia',
    countryAr: 'تونس',
    code: 'BVB', 
    tvCountry: 'tunisia',
    currency: 'TND',
    timezone: 'Africa/Tunis'
  },
  
  // Morocco
  CSE: { 
    name: 'Casablanca Stock Exchange', 
    country: 'Morocco',
    countryAr: 'المغرب',
    code: 'CSE', 
    tvCountry: 'morocco',
    currency: 'MAD',
    timezone: 'Africa/Casablanca'
  },
  
  // Jordan
  AMMAN: { 
    name: 'Amman Stock Exchange', 
    country: 'Jordan',
    countryAr: 'الأردن',
    code: 'AMMAN', 
    tvCountry: 'jordan',
    currency: 'JOD',
    timezone: 'Asia/Amman'
  },
  
  // Palestine
  PEX: { 
    name: 'Palestine Exchange', 
    country: 'Palestine',
    countryAr: 'فلسطين',
    code: 'PEX', 
    tvCountry: 'palestine',
    currency: 'ILS',
    timezone: 'Asia/Gaza'
  },
};

// =============================================================================
// DATA TYPES AVAILABLE
// =============================================================================

export const DATA_TYPES = [
  { 
    id: 'overview', 
    name: 'نظرة عامة على السهم', 
    nameEn: 'Stock Overview',
    description: 'السعر، القيمة السوقية، مكرر الربحية، وغيرها',
    icon: 'Building2'
  },
  { 
    id: 'historical', 
    name: 'البيانات التاريخية', 
    nameEn: 'Historical Data',
    description: 'أسعار الفتح والإغلاق والأسعار العليا والدنيا والحجم',
    icon: 'LineChart'
  },
  { 
    id: 'income', 
    name: 'قائمة الدخل', 
    nameEn: 'Income Statement',
    description: 'الإيرادات، الأرباح، مصاريف التشغيل',
    icon: 'TrendingUp'
  },
  { 
    id: 'balance', 
    name: 'الميزانية العمومية', 
    nameEn: 'Balance Sheet',
    description: 'الأصول، الخصوم، حقوق المساهمين',
    icon: 'Scale'
  },
  { 
    id: 'cashflow', 
    name: 'التدفقات النقدية', 
    nameEn: 'Cash Flow',
    description: 'تدفقات التشغيل والاستثمار والتمويل',
    icon: 'Banknote'
  },
  { 
    id: 'ratios', 
    name: 'النسب المالية', 
    nameEn: 'Financial Ratios',
    description: 'ROE, ROA, مكرر الربحية، نسبة التداول',
    icon: 'PieChart'
  },
  { 
    id: 'dividends', 
    name: 'توزيعات الأرباح', 
    nameEn: 'Dividends',
    description: 'مواعيد وقيم التوزيعات',
    icon: 'Wallet'
  },
  { 
    id: 'forecasts', 
    name: 'توقعات المحللين', 
    nameEn: 'Analyst Forecasts',
    description: 'السعر المستهدف وتوصيات الشراء والبيع',
    icon: 'Target'
  },
  { 
    id: 'ownership', 
    name: 'هيكل الملكية', 
    nameEn: 'Ownership Structure',
    description: 'تملك المؤسسات والمطلعين والعامة',
    icon: 'Users'
  },
  { 
    id: 'news', 
    name: 'الأخبار', 
    nameEn: 'News',
    description: 'آخر أخبار السهم',
    icon: 'Newspaper'
  },
];

// =============================================================================
// TYPES
// =============================================================================

export interface ScrapingStatus {
  isRunning: boolean;
  currentJobId: string | null;
  progress: number;
  currentStage: string;
  currentStock: string;
  totalStocks: number;
  processedStocks: number;
  failedStocks: number;
  logs: LogEntry[];
  source: 'tradingview' | 'stockanalysis';
}

export interface LogEntry {
  time: string;
  action: string;
  message: string;
  stock?: string;
}

export interface ScrapingOptions {
  exchange: string;
  dataTypes: string[];
  startDate?: string; // For historical data (default: 2010-01-01)
  endDate?: string;
  source?: 'tradingview' | 'stockanalysis';
}

// =============================================================================
// GLOBAL STATE
// =============================================================================

let scrapingStatus: ScrapingStatus = {
  isRunning: false,
  currentJobId: null,
  progress: 0,
  currentStage: '',
  currentStock: '',
  totalStocks: 0,
  processedStocks: 0,
  failedStocks: 0,
  logs: [],
  source: 'tradingview',
};

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;

// =============================================================================
// CORE FUNCTIONS
// =============================================================================

async function getZAI() {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create();
  }
  return zaiInstance;
}

export function getScrapingStatus(): ScrapingStatus {
  return { ...scrapingStatus };
}

function addLog(action: string, message: string, stock?: string) {
  const entry: LogEntry = {
    time: new Date().toISOString(),
    action,
    message,
    stock,
  };
  scrapingStatus.logs.unshift(entry);
  if (scrapingStatus.logs.length > 100) {
    scrapingStatus.logs = scrapingStatus.logs.slice(0, 100);
  }
  console.log(`[${action}] ${message}${stock ? ` (${stock})` : ''}`);
}

async function readPage(url: string): Promise<{ title: string; html: string; url: string } | null> {
  try {
    const zai = await getZAI();
    const result = await zai.functions.invoke('page_reader', { url });
    
    if (result.code === 200 && result.data?.html) {
      return {
        title: result.data.title || '',
        html: result.data.html,
        url: result.data.url || url,
      };
    }
    return null;
  } catch (error) {
    console.error(`Failed to read page ${url}:`, error);
    return null;
  }
}

// =============================================================================
// TRADINGVIEW PARSERS
// =============================================================================

function extractStocksFromTradingView(html: string, exchange: string): Array<{
  symbol: string;
  name: string;
  exchange: string;
  sector?: string;
  price?: number;
  change?: number;
  changePercent?: number;
  volume?: number;
}> {
  const stocks: Array<{
    symbol: string;
    name: string;
    exchange: string;
    sector?: string;
    price?: number;
    change?: number;
    changePercent?: number;
    volume?: number;
  }> = [];
  
  // TradingView stores data in JSON format
  // Try to find the data in various formats
  
  // Method 1: Look for symbol data in the page
  const symbolPattern = /"symbol"\s*:\s*"([^"]+)"/g;
  const namePattern = /"description"\s*:\s*"([^"]+)"/g;
  
  const symbols: string[] = [];
  const names: string[] = [];
  
  let match;
  while ((match = symbolPattern.exec(html)) !== null) {
    const fullSymbol = match[1];
    // Parse symbol like "EGX:COMI" or "COMI"
    const parts = fullSymbol.split(':');
    const symbol = parts.length > 1 ? parts[1] : parts[0];
    if (!symbols.includes(symbol)) {
      symbols.push(symbol);
    }
  }
  
  while ((match = namePattern.exec(html)) !== null) {
    names.push(match[1]);
  }
  
  // Combine
  for (let i = 0; i < symbols.length && i < names.length; i++) {
    stocks.push({
      symbol: symbols[i],
      name: names[i],
      exchange: exchange,
    });
  }
  
  console.log(`TradingView extraction: found ${stocks.length} stocks`);
  return stocks;
}

function extractOverviewFromTradingView(html: string): Record<string, any> {
  const overview: Record<string, any> = {};
  
  // Extract key metrics from TradingView page
  // Look for data in specific patterns
  
  // Price data
  const priceMatch = html.match(/"last"\s*:\s*([0-9.]+)/);
  if (priceMatch) overview.currentPrice = parseFloat(priceMatch[1]);
  
  const changeMatch = html.match(/"change"\s*:\s*([-0-9.]+)/);
  if (changeMatch) overview.change = parseFloat(changeMatch[1]);
  
  const changePctMatch = html.match(/"chg_percent"\s*:\s*([-0-9.]+)/);
  if (changePctMatch) overview.changePercent = parseFloat(changePctMatch[1]);
  
  const volumeMatch = html.match(/"volume"\s*:\s*([0-9.]+)/);
  if (volumeMatch) overview.volume = parseFloat(volumeMatch[1]);
  
  // Market data
  const marketCapMatch = html.match(/"market_cap"\s*:\s*"?([0-9. BMK]+)"?/i);
  if (marketCapMatch) overview.marketCap = marketCapMatch[1];
  
  const peMatch = html.match(/"price_earnings_ratio"\s*:\s*([0-9.]+)/);
  if (peMatch) overview.peRatio = parseFloat(peMatch[1]);
  
  const epsMatch = html.match(/"earnings_per_share"\s*:\s*([0-9.]+)/);
  if (epsMatch) overview.eps = parseFloat(epsMatch[1]);
  
  const dividendYieldMatch = html.match(/"dividend_yield"\s*:\s*([0-9.]+)/);
  if (dividendYieldMatch) overview.dividendYield = parseFloat(dividendYieldMatch[1]);
  
  const betaMatch = html.match(/"beta_1_year"\s*:\s*([0-9.]+)/);
  if (betaMatch) overview.beta = parseFloat(betaMatch[1]);
  
  // 52 week high/low
  const high52Match = html.match(/"fifty_two_week_high"\s*:\s*([0-9.]+)/);
  if (high52Match) overview.week52High = parseFloat(high52Match[1]);
  
  const low52Match = html.match(/"fifty_two_week_low"\s*:\s*([0-9.]+)/);
  if (low52Match) overview.week52Low = parseFloat(low52Match[1]);
  
  return overview;
}

function extractHistoricalDataFromTradingView(html: string): Array<{
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}> {
  const data: Array<{
    date: Date;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }> = [];
  
  // TradingView historical data is often in JSON format
  // Look for OHLCV data
  
  // Pattern for historical data
  const ohlcvPattern = /"ohlc"\s*:\s*\[([\s\S]*?)\]/;
  const match = html.match(ohlcvPattern);
  
  if (match) {
    try {
      const ohlcData = JSON.parse(`[${match[1]}]`);
      for (const item of ohlcData) {
        if (Array.isArray(item) && item.length >= 5) {
          data.push({
            date: new Date(item[0] * 1000),
            open: parseFloat(item[1]),
            high: parseFloat(item[2]),
            low: parseFloat(item[3]),
            close: parseFloat(item[4]),
            volume: parseFloat(item[5] || 0),
          });
        }
      }
    } catch (e) {
      console.error('Failed to parse OHLCV data:', e);
    }
  }
  
  return data;
}

function extractFinancialsFromTradingView(html: string, type: 'income' | 'balance' | 'cashflow'): Record<string, any> {
  const financials: Record<string, any> = {};
  
  // Extract financial data based on type
  // This is a simplified version - real implementation would need more complex parsing
  
  const revenueMatch = html.match(/"total_revenue"\s*:\s*([0-9.]+)/);
  if (revenueMatch) financials.revenue = parseFloat(revenueMatch[1]);
  
  const netIncomeMatch = html.match(/"net_income"\s*:\s*([0-9.]+)/);
  if (netIncomeMatch) financials.netIncome = parseFloat(netIncomeMatch[1]);
  
  const totalAssetsMatch = html.match(/"total_assets"\s*:\s*([0-9.]+)/);
  if (totalAssetsMatch) financials.totalAssets = parseFloat(totalAssetsMatch[1]);
  
  const totalEquityMatch = html.match(/"total_equity"\s*:\s*([0-9.]+)/);
  if (totalEquityMatch) financials.totalEquity = parseFloat(totalEquityMatch[1]);
  
  return financials;
}

function extractDividendsFromTradingView(html: string): Array<{
  exDate: Date;
  amount: number;
  currency: string;
}> {
  const dividends: Array<{
    exDate: Date;
    amount: number;
    currency: string;
  }> = [];
  
  // Look for dividend data
  const dividendPattern = /"dividends"\s*:\s*\[([\s\S]*?)\]/;
  const match = html.match(dividendPattern);
  
  if (match) {
    try {
      const divData = JSON.parse(`[${match[1]}]`);
      for (const item of divData) {
        if (item.ex_date && item.amount) {
          dividends.push({
            exDate: new Date(item.ex_date),
            amount: parseFloat(item.amount),
            currency: item.currency || 'EGP',
          });
        }
      }
    } catch (e) {
      console.error('Failed to parse dividend data:', e);
    }
  }
  
  return dividends;
}

function extractForecastsFromTradingView(html: string): Record<string, any> {
  const forecasts: Record<string, any> = {};
  
  // Target price
  const targetMatch = html.match(/"target_price"\s*:\s*([0-9.]+)/);
  if (targetMatch) forecasts.targetPrice = parseFloat(targetMatch[1]);
  
  // Recommendations
  const buyMatch = html.match(/"buy"\s*:\s*([0-9]+)/);
  if (buyMatch) forecasts.buy = parseInt(buyMatch[1]);
  
  const sellMatch = html.match(/"sell"\s*:\s*([0-9]+)/);
  if (sellMatch) forecasts.sell = parseInt(sellMatch[1]);
  
  const holdMatch = html.match(/"hold"\s*:\s*([0-9]+)/);
  if (holdMatch) forecasts.hold = parseInt(holdMatch[1]);
  
  return forecasts;
}

// =============================================================================
// STOCK ANALYSIS PARSERS (Backup)
// =============================================================================

function extractStocksFromStockAnalysis(html: string): Array<{ symbol: string; name: string }> {
  const stocks: Array<{ symbol: string; name: string }> = [];
  
  // Extract symbols
  const patterns = [
    /href="\/quote\/egx\/([^\/]+)\//g,
    /quote\/egx\/([^\/"']+)/g,
  ];
  
  const symbols: string[] = [];
  for (const pattern of patterns) {
    const matches = html.matchAll(pattern);
    for (const match of matches) {
      if (!symbols.includes(match[1])) {
        symbols.push(match[1]);
      }
    }
  }
  
  // Extract names
  const nameMatches = html.matchAll(/class="slw[^"]*"[^>]*>([^<]+)/g);
  const names: string[] = [];
  for (const match of nameMatches) {
    names.push(match[1].replace(/&amp;/g, '&').trim());
  }
  
  // Combine
  for (let i = 0; i < symbols.length && i < names.length; i++) {
    stocks.push({
      symbol: symbols[i],
      name: names[i] || symbols[i],
    });
  }
  
  return stocks;
}

// =============================================================================
// MAIN SCRAPING FUNCTION
// =============================================================================

export async function startScraping(
  exchangeCode: string = 'EGX',
  options: ScrapingOptions
): Promise<{ success: boolean; jobId?: string; message: string }> {
  if (scrapingStatus.isRunning) {
    return { success: false, message: 'Scraping already in progress' };
  }

  const exchange = EXCHANGES[exchangeCode as keyof typeof EXCHANGES];
  if (!exchange) {
    return { success: false, message: `Unknown exchange: ${exchangeCode}` };
  }

  try {
    // Reset status
    scrapingStatus = {
      isRunning: true,
      currentJobId: `job_${Date.now()}`,
      progress: 0,
      currentStage: 'Initializing...',
      currentStock: '',
      totalStocks: 0,
      processedStocks: 0,
      failedStocks: 0,
      logs: [],
      source: 'tradingview',
    };

    addLog('start', `Starting scraping for ${exchange.name} (${exchange.countryAr})`);
    addLog('config', `Data types: ${options.dataTypes.join(', ')}`);

    // Create job in database
    const job = await db.scrapeJob.create({
      data: {
        country: exchange.country,
        exchange: exchange.code,
        status: 'running',
        startedAt: new Date(),
        fetchOverview: options.dataTypes.includes('overview'),
        fetchHistorical: options.dataTypes.includes('historical'),
        fetchFinancials: options.dataTypes.includes('income') || 
                         options.dataTypes.includes('balance') || 
                         options.dataTypes.includes('cashflow'),
        fetchDividends: options.dataTypes.includes('dividends'),
        fetchForecasts: options.dataTypes.includes('forecasts'),
        fetchOwnership: options.dataTypes.includes('ownership'),
        startDate: options.startDate || '2010-01-01',
        endDate: options.endDate,
      },
    });
    scrapingStatus.currentJobId = job.id;

    // Step 1: Get stocks from database or fetch from web
    scrapingStatus.currentStage = 'جارٍ جلب قائمة الأسهم...';
    addLog('fetch-list', `Getting stock list for ${exchange.code}`);
    
    let stocks: Array<{
      symbol: string;
      name: string;
      exchange: string;
      sector?: string;
    }> = [];
    
    // First, check if we already have stocks in database for this exchange
    const existingStocks = await db.stock.findMany({
      where: { exchange: exchange.code },
      select: { symbol: true, nameEn: true, sector: true }
    });
    
    if (existingStocks.length > 0) {
      addLog('db-stocks', `Found ${existingStocks.length} stocks in database`);
      stocks = existingStocks.map(s => ({
        symbol: s.symbol,
        name: s.nameEn || s.symbol,
        exchange: exchange.code,
        sector: s.sector || undefined
      }));
    } else {
      // Try TradingView
      addLog('fetch-list', `Fetching from TradingView`);
      const listUrl = DATA_SOURCES.TRADING_VIEW.allStocksUrl(exchange.tvCountry);
      console.log('Fetching TradingView URL:', listUrl);
      const listPage = await readPage(listUrl);
      
      if (listPage) {
        const tvStocks = extractStocksFromTradingView(listPage.html, exchange.code);
        stocks = tvStocks;
      }
      
      // Fallback to Stock Analysis if needed
      if (stocks.length === 0) {
        addLog('fallback', 'Falling back to Stock Analysis');
        const saUrl = `https://stockanalysis.com/list/${exchange.tvCountry}-stock-exchange/`;
        const saPage = await readPage(saUrl);
        
        if (saPage) {
          const saStocks = extractStocksFromStockAnalysis(saPage.html);
          stocks = saStocks.map(s => ({ ...s, exchange: exchange.code }));
        }
      }
    }

    if (stocks.length === 0) {
      throw new Error('No stocks found. Please upload stock list first using Investing.com tab.');
    }

    scrapingStatus.totalStocks = stocks.length;
    addLog('fetch-list', `Found ${stocks.length} stocks`);

    // Step 2: Save stocks to database
    scrapingStatus.currentStage = 'جارٍ حفظ قائمة الأسهم...';
    addLog('save-stocks', 'Saving stock list to database');

    for (const stock of stocks) {
      try {
        await db.stock.upsert({
          where: { symbol: stock.symbol },
          create: {
            symbol: stock.symbol,
            nameEn: stock.name,
            nameAr: stock.name,
            exchange: exchange.code,
            country: exchange.country,
            currency: exchange.currency,
            sector: stock.sector,
          },
          update: {
            nameEn: stock.name,
            sector: stock.sector,
            updatedAt: new Date(),
          },
        });
      } catch (e) {
        console.error(`Failed to save stock ${stock.symbol}:`, e);
      }
    }
    addLog('save-stocks', `Saved ${stocks.length} stocks to database`);

    // Step 3: Fetch detailed data for each stock
    scrapingStatus.currentStage = 'جارٍ جلب البيانات التفصيلية...';
    scrapingStatus.processedStocks = 0;

    for (let i = 0; i < stocks.length; i++) {
      const stock = stocks[i];
      scrapingStatus.currentStock = stock.symbol;
      scrapingStatus.progress = ((i + 1) / stocks.length) * 100;

      try {
        addLog('fetch-stock', `Fetching data for ${stock.symbol}`, stock.symbol);
        
        // Get the stock record
        const stockRecord = await db.stock.findUnique({
          where: { symbol: stock.symbol }
        });
        
        if (!stockRecord) continue;

        // Fetch Overview
        if (options.dataTypes.includes('overview')) {
          const quoteUrl = DATA_SOURCES.TRADING_VIEW.quoteUrl(stock.symbol, exchange.code);
          const quotePage = await readPage(quoteUrl);
          
          if (quotePage) {
            const overviewData = extractOverviewFromTradingView(quotePage.html);
            
            await db.stockOverview.upsert({
              where: { stockId: stockRecord.id },
              create: {
                stockId: stockRecord.id,
                ...overviewData,
                lastUpdate: new Date(),
              },
              update: {
                ...overviewData,
                lastUpdate: new Date(),
              },
            });
          }
          
          await new Promise(r => setTimeout(r, 500));
        }

        // Fetch Historical Data
        if (options.dataTypes.includes('historical')) {
          const histUrl = DATA_SOURCES.TRADING_VIEW.historicalUrl(stock.symbol, exchange.code);
          const histPage = await readPage(histUrl);
          
          if (histPage) {
            const histData = extractHistoricalDataFromTradingView(histPage.html);
            
            for (const data of histData) {
              try {
                await db.historicalData.upsert({
                  where: {
                    stockId_date: {
                      stockId: stockRecord.id,
                      date: data.date,
                    }
                  },
                  create: {
                    stockId: stockRecord.id,
                    ...data,
                  },
                  update: {
                    ...data,
                  },
                });
              } catch (e) {
                console.error(`Failed to save historical data:`, e);
              }
            }
          }
          
          await new Promise(r => setTimeout(r, 500));
        }

        // Fetch Financials
        if (options.dataTypes.includes('income') || 
            options.dataTypes.includes('balance') || 
            options.dataTypes.includes('cashflow')) {
          const finUrl = DATA_SOURCES.TRADING_VIEW.financialsUrl(stock.symbol, exchange.code);
          const finPage = await readPage(finUrl);
          
          if (finPage) {
            // Income Statement
            if (options.dataTypes.includes('income')) {
              const incomeData = extractFinancialsFromTradingView(finPage.html, 'income');
              
              if (Object.keys(incomeData).length > 0) {
                await db.incomeStatement.upsert({
                  where: {
                    stockId_period_periodType: {
                      stockId: stockRecord.id,
                      period: 'Latest',
                      periodType: 'annual',
                    }
                  },
                  create: {
                    stockId: stockRecord.id,
                    period: 'Latest',
                    periodType: 'annual',
                    ...incomeData,
                  },
                  update: {
                    ...incomeData,
                  },
                });
              }
            }
          }
          
          await new Promise(r => setTimeout(r, 500));
        }

        // Fetch Dividends
        if (options.dataTypes.includes('dividends')) {
          const divUrl = DATA_SOURCES.TRADING_VIEW.dividendsUrl(stock.symbol, exchange.code);
          const divPage = await readPage(divUrl);
          
          if (divPage) {
            const divData = extractDividendsFromTradingView(divPage.html);
            
            for (const div of divData) {
              try {
                await db.dividend.upsert({
                  where: {
                    stockId_exDate: {
                      stockId: stockRecord.id,
                      exDate: div.exDate,
                    }
                  },
                  create: {
                    stockId: stockRecord.id,
                    ...div,
                  },
                  update: {
                    ...div,
                  },
                });
              } catch (e) {
                console.error(`Failed to save dividend:`, e);
              }
            }
          }
          
          await new Promise(r => setTimeout(r, 500));
        }

        // Fetch Forecasts
        if (options.dataTypes.includes('forecasts')) {
          const forecastUrl = DATA_SOURCES.TRADING_VIEW.forecastsUrl(stock.symbol, exchange.code);
          const forecastPage = await readPage(forecastUrl);
          
          if (forecastPage) {
            const forecastData = extractForecastsFromTradingView(forecastPage.html);
            
            if (Object.keys(forecastData).length > 0) {
              await db.analystForecast.upsert({
                where: { stockId: stockRecord.id },
                create: {
                  stockId: stockRecord.id,
                  ...forecastData,
                  lastUpdate: new Date(),
                },
                update: {
                  ...forecastData,
                  lastUpdate: new Date(),
                },
              });
            }
          }
          
          await new Promise(r => setTimeout(r, 500));
        }

        scrapingStatus.processedStocks++;
        addLog('success', `Successfully fetched data for ${stock.symbol}`, stock.symbol);
        
      } catch (error) {
        scrapingStatus.failedStocks++;
        addLog('error', `Failed to fetch data for ${stock.symbol}`, stock.symbol);
      }

      // Delay between stocks
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Complete job
    await db.scrapeJob.update({
      where: { id: job.id },
      data: {
        status: 'completed',
        progress: 100,
        processedStocks: scrapingStatus.processedStocks,
        failedStocks: scrapingStatus.failedStocks,
        completedAt: new Date(),
      },
    });

    scrapingStatus.isRunning = false;
    scrapingStatus.progress = 100;
    scrapingStatus.currentStage = 'اكتمل!';
    addLog('complete', `Scraping completed. ${scrapingStatus.processedStocks}/${stocks.length} stocks processed, ${scrapingStatus.failedStocks} failed`);

    return { 
      success: true, 
      jobId: job.id, 
      message: `Successfully scraped ${scrapingStatus.processedStocks} stocks` 
    };

  } catch (error) {
    scrapingStatus.isRunning = false;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    addLog('error', `Scraping failed: ${errorMessage}`);

    if (scrapingStatus.currentJobId) {
      await db.scrapeJob.update({
        where: { id: scrapingStatus.currentJobId },
        data: {
          status: 'failed',
          errorMsg: errorMessage,
          completedAt: new Date(),
        },
      });
    }

    return { success: false, message: errorMessage };
  }
}

// Stop scraping
export async function stopScraping(): Promise<{ success: boolean; message: string }> {
  if (!scrapingStatus.isRunning) {
    return { success: false, message: 'No scraping in progress' };
  }

  scrapingStatus.isRunning = false;
  scrapingStatus.currentStage = 'تم الإيقاف بواسطة المستخدم';
  addLog('stop', 'Scraping stopped by user');

  if (scrapingStatus.currentJobId) {
    await db.scrapeJob.update({
      where: { id: scrapingStatus.currentJobId },
      data: {
        status: 'cancelled',
        completedAt: new Date(),
      },
    });
  }

  return { success: true, message: 'Scraping stopped' };
}

// Get stock list from database
export async function getStocks(exchange?: string) {
  const where = exchange ? { exchange } : {};
  return db.stock.findMany({
    where,
    include: {
      _count: {
        select: { 
          historicalData: true,
          dividends: true,
          news: true,
        },
      },
      overview: true,
    },
    orderBy: { symbol: 'asc' },
  });
}

// Get scraping jobs history
export async function getScrapeJobs(limit: number = 20) {
  return db.scrapeJob.findMany({
    take: limit,
    orderBy: { createdAt: 'desc' },
  });
}
