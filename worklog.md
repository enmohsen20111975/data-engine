# Data Engine - Work Log
## بورصة البيانات - Stock Market Data Engine for Middle East Markets

---

## 📋 Current Session (January 14, 2025)

### ✅ Completed Tasks

#### 1. Telegram API Credentials - SAVED
**مواقع حفظ بيانات Telegram:**
1. `/home/z/my-project/telegram-credentials.json` - الملف الرئيسي
2. `/home/z/my-project/mini-services/telegram-service/credentials.json` - لخدمة Telegram
3. `/home/z/my-project/data-engine/telegram-credentials.json` - لمحرك البيانات
4. `/home/z/my-project/.env.telegram` - متغيرات البيئة

**البيانات:**
```
API_ID: 34557076
API_HASH: fe604a9844bf753210acb4e648af4155
Test Server: 149.154.167.40:443
Production Server: 149.154.167.50:443
```

#### 2. Telegram Service - UPDATED ✅
- خدمة Telegram تعمل على Port 3010
- telethon مثبت ومُعد
- API credentials تم تحميلها بنجاح
- حفظ دائم للرسائل في `/home/z/my-project/telegram_messages_store.json`

#### 3. Database Tables - CREATED ✅
- `telegram_messages` - لتخزين الرسائل الخام
- `telegram_signals` - لتخزين توصيات البيع والشراء
- `telegram_news` - لتخزين الأخبار

#### 4. API Endpoints - CREATED ✅
- `/api/telegram/messages` (GET/POST) - استرجاع وحفظ الرسائل
- `/api/telegram/process` (GET/POST) - معالجة الرسائل واستخراج الإشارات

#### 5. Message Processing Logic - IMPLEMENTED ✅
- استخراج نوع الإشارة (شراء/بيع/انتظار/تجميع/تصريف)
- استخراج رموز الأسهم (Saudi 4-digit codes)
- استخراج الأسعار (السعر الحالي، الهدف، وقف الخسارة)
- تحليل المشاعر (إيجابي/سلبي/محايد)

---

### 🏗️ Project Architecture

```
my-project/
├── src/app/page.tsx           # Main UI (5 Tabs)
├── src/app/api/
│   └── telegram/
│       ├── auth/              # Authentication routes
│       ├── messages/          # Messages storage
│       └── process/           # Message processing
├── mini-services/
│   └── telegram-service/      # Telegram Service (Port 3010)
│       ├── index.py           # Main service
│       └── credentials.json   # API credentials
├── data-engine/
│   ├── analysis_engine/       # Python Analysis Engine
│   │   ├── master_analyzer.py
│   │   ├── technical_analysis.py
│   │   ├── fundamental_analysis.py
│   │   └── quantitative_analysis.py
│   ├── data/
│   │   └── data_engine.db     # SQLite Database
│   └── scrapers/              # Data Scrapers
└── prisma/schema.prisma       # Database Schema
```

---

### 📊 Analysis Engine Weights

| Analysis Type | Weight | Description |
|---------------|--------|-------------|
| Technical | 30% | Volume Profile, Order Flow, Volatility, Trend, Momentum |
| Fundamental | 25% | P/E, P/B, ROA, ROE, Debt Ratio |
| Quantitative | 15% | Short-term predictions |
| Sentiment | 30% | News sentiment analysis |

---

### 👥 Investor Personality Types

| Type | Threshold | Description |
|------|-----------|-------------|
| محافظ | 0.75 | Very cautious, needs strong signals |
| متحفظ | 0.70 | Conservative approach |
| متوازن | 0.65 | Balanced risk/reward |
| حصيف | 0.60 | Prudent investor |
| نمو | 0.55 | Growth focused |
| جذري | 0.50 | Aggressive growth |
| عدواني | 0.45 | Very aggressive |

---

### 📈 Database Status

| Market | Stocks | Historical Data |
|--------|--------|-----------------|
| Saudi Arabia (Tadawul) | 89 | ✅ Available |
| Egypt (EGX) | ~200 | ❌ Not available |
| Kuwait (KSE) | ~200 | ❌ Not available |
| Qatar (QSE) | ~200 | ❌ Not available |

**Total Stocks:** 619 in database
**Stocks with Historical Data:** 110 (Saudi only)

---

### 🎯 Next Steps

#### 1. Telegram Integration - READY TO USE
- [x] Configure Telegram service with credentials ✅
- [x] Create database tables ✅
- [x] Implement message parsing ✅
- [x] Pattern extraction for signals ✅
- [ ] **USER NEEDS TO AUTHENTICATE** - Enter phone number and verify code

#### 2. UI Enhancements
- [ ] Separate markets in analysis tab
- [ ] Individual analysis type views
- [ ] Final decision aggregation

#### 3. Data Import
- [ ] Import historical data for Egypt
- [ ] Import historical data for Kuwait
- [ ] Import historical data for Qatar

---

## 📜 Session Summary (June 7-8, 2024)

### ✅ Completed Tasks

#### 1. Database Setup
- Created SQLite database: `data-engine/data/data_engine.db` (22 MB)
- 17 tables with proper English names
- 858 stocks from 4 markets

#### 2. Stock Data Scrapers (Python)
| File | Purpose |
|------|---------|
| `tradingview_scraper.py` | Main scraper - 8 tabs for all stocks |
| `historical_fetcher.py` | Historical price data |
| `historical_fetcher_5years.py` | 5-year historical data |
| `crypto_fetcher.py` | Cryptocurrency prices |
| `metals_forex_fetcher.py` | Gold, Silver, Forex rates |
| `technical_fetcher.py` | Technical analysis indicators |
| `smart_scheduler.py` | Intelligent scheduling |
| `auto_refresh_scheduler.py` | Auto-refresh system |

#### 3. News Fetcher (Node.js + Python)
| File | Purpose |
|------|---------|
| `news_fetcher.js` | Main news fetcher (production-ready) |
| `news_fetcher.py` | Python backup version |

**Features:**
- Caching (1 hour)
- Rate limiting (30 req/min)
- Retry logic (3 retries)
- 4 markets: Saudi, Egypt, Kuwait, Qatar

---

## Database Tables

| Table | Records | Description |
|-------|---------|-------------|
| stocks | 858 | Main stock info + logo URLs |
| tab_performance | 858 | Performance metrics |
| tab_valuation | 858 | Valuation data |
| tab_dividends | 858 | Dividend info |
| tab_profitability | 858 | Profitability metrics |
| tab_income_statement | 866 | Income statement |
| tab_balance_sheet | 866 | Balance sheet |
| tab_cash_flow | 866 | Cash flow |
| tab_technical_analysis | 863 | Technical indicators |
| historical_data | 99,076 | Historical prices |
| gold_prices | 1,683 | Gold prices |
| silver_prices | 280 | Silver prices |
| exchange_rates | 280 | Currency exchange |
| crypto_prices | 900 | Crypto prices |
| btc_local_prices | 68 | BTC local prices |
| stock_prices | 2,493 | Stock prices |
| market_news | 90 | News articles |
| telegram_messages | 0 | Telegram messages (NEW) |
| telegram_signals | 0 | Trading signals (NEW) |
| telegram_news | 0 | Telegram news (NEW) |

---

## Markets Covered

| Market | Exchange | Stocks |
|--------|----------|--------|
| Saudi Arabia | Tadawul | ~200 |
| Egypt | EGX | ~200 |
| Kuwait | KSE | ~200 |
| Qatar | QSE | ~200 |

---

## Usage Commands

### Fetch News
```bash
node data-engine/scrapers/news_fetcher.js --fetch --days=7
node data-engine/scrapers/news_fetcher.js --stats
```

### Run Scrapers
```bash
python data-engine/scrapers/tradingview_scraper.py
python data-engine/scrapers/historical_fetcher.py
python data-engine/scrapers/crypto_fetcher.py
```

### Telegram Service
```bash
# Check service health
curl http://localhost:3010/health

# Get saved messages
curl http://localhost:3010/messages/saved
```

---

## Production Ready Features

- ✅ Rate Limiting
- ✅ Caching
- ✅ Error Handling
- ✅ Retry Logic
- ✅ Optimized for ~100 users
- ✅ Telegram Integration
- ✅ Message Processing & Signal Extraction

---

## GitHub Repository
https://github.com/enmohsen20111975/data-engine

---

## Last Updated
January 14, 2025
