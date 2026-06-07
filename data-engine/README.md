# 📊 مصنع بيانات الأسهم العربية
## Arabic Stocks Data Factory

<div align="center">

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![Python](https://img.shields.io/badge/python-3.9+-green.svg)
![Next.js](https://img.shields.io/badge/Next.js-16-black.svg)
![Database](https://img.shields.io/badge/SQLite-100K+-records-orange.svg)

**مصدر بيانات شامل للأسهم العربية والذهب والعملات الرقمية**

[التوثيق](#-جدول-المحتويات) • [التثبيت](#-التثبيت) • [API](#-api-reference) • [قاعدة البيانات](#-قاعدة-البيانات)

</div>

---

## 📋 جدول المحتويات

1. [نظرة عامة](#-نظرة-عامة)
2. [المميزات](#-المميزات)
3. [هيكل المشروع](#-هيكل-المشروع)
4. [قاعدة البيانات](#-قاعدة-البيانات)
5. [API Reference](#-api-reference)
6. [أوقات عمل البورصات](#-أوقات-عمل-البورصات)
7. [التثبيت والتشغيل](#-التثبيت-والتشغيل)
8. [أمثلة الاستخدام](#-أمثلة-الاستخدام)
9. [التحديث التلقائي](#-التحديث-التلقائي)
10. [استكشاف الأخطاء](#-استكشاف-الأخطاء)

---

## 🌟 نظرة عامة

مصنع بيانات متكامل يجمع البيانات المالية من مصادر متعددة ويوفرها بشكل منظم للتطبيقات والمواقع.

### الأسواق المدعومة

| السوق | الرمز | عدد الأسهم | العملة |
|-------|-------|------------|--------|
| 🇪🇬 البورصة المصرية | EGX | ~300 | جنيه مصري (EGP) |
| 🇸🇦 السوق المالية السعودية | TADAWUL | ~400 | ريال سعودي (SAR) |
| 🇰🇼 بورصة الكويت | Boursa Kuwait | ~150 | دينار كويتي (KWD) |
| 🇶🇦 بورصة قطر | QSE | ~60 | ريال قطري (QAR) |

### أنواع البيانات

| النوع | المصدر | معدل التحديث |
|-------|--------|--------------|
| 📈 الأسهم | TradingView | أثناء جلسات التداول |
| 🥇 الذهب والفضة | Metals API | كل 10 دقائق |
| 💱 أسعار الصرف | ExchangeRate API | كل 10 دقائق |
| ₿ العملات الرقمية | CoinGecko | كل 5 دقائق |
| 📊 البيانات التاريخية | TradingView | يومي (5 سنوات) |

---

## ✨ المميزات

### ✅ جمع البيانات
- سحب تلقائي للأسعار من TradingView
- دعم 4 أسواق عربية
- أسعار الذهب بجميع العيارات (24، 22، 21، 18، 14، 10)
- 50 عملة رقمية متداولة
- بيانات تاريخية لمدة 5 سنوات

### ✅ التخزين
- قاعدة بيانات SQLite (خفيفة وسريعة)
- تسجيل كل الأسعار مع التاريخ والوقت
- أكثر من 100,000 سجل تاريخي

### ✅ التحديث الذكي
- تحديث تلقائي أثناء جلسات التداول فقط
- احترام الأجازات الرسمية
- أوقات العمل بالتوقيت المصري

### ✅ API جاهزة
- REST API endpoints
- JSON responses
- CORS enabled

---

## 📁 هيكل المشروع

```
data-engine/
│
├── 📁 config/                    # ملفات الإعدادات
│   └── 📄 market_hours.py        # أوقات عمل البورصات
│
├── 📁 scrapers/                  # سكريبتات جمع البيانات
│   ├── 📄 tradingview_scraper.py # سحب الأسهم
│   ├── 📄 metals_forex_fetcher.py# الذهب والعملات
│   ├── 📄 crypto_fetcher.py      # العملات الرقمية
│   ├── 📄 historical_fetcher.py  # البيانات التاريخية
│   ├── 📄 auto_refresh_scheduler.py # المجدول القديم
│   └── 📄 smart_scheduler.py     # المجدول الذكي (جديد)
│
├── 📁 data/                      # البيانات
│   ├── 📄 data_engine.db         # قاعدة البيانات (SQLite)
│   ├── 📄 stocks_data.json       # آخر بيانات الأسهم
│   ├── 📄 metals_forex_latest.json # آخر بيانات الذهب
│   ├── 📄 crypto_latest.json     # آخر بيانات الكريبتو
│   └── 📄 auto_refresh_status.json # حالة التحديث
│
└── 📄 README.md                  # هذا الملف
```

---

## 🗄️ قاعدة البيانات

### الموقع
```
data-engine/data/data_engine.db
```

### الجداول

#### 1️⃣ جدول `stocks` (الأسهم الحالية)
```sql
CREATE TABLE stocks (
    id INTEGER PRIMARY KEY,
    symbol TEXT UNIQUE,          -- رمز السهم (مثل: ADCI, 1120)
    name TEXT,                   -- اسم الشركة
    price REAL,                  -- السعر الحالي
    change_percent REAL,         -- نسبة التغير
    volume TEXT,                 -- حجم التداول
    market_cap TEXT,             -- القيمة السوقية
    market TEXT,                 -- السوق (مصر، السعودية، الكويت، قطر)
    created_at TIMESTAMP
);
```

#### 2️⃣ جدول `stock_prices` (أسعار الأسهم التاريخية)
```sql
CREATE TABLE stock_prices (
    id INTEGER PRIMARY KEY,
    timestamp TEXT,              -- التاريخ والوقت (2024-01-15 10:30:00)
    symbol TEXT,                 -- رمز السهم
    name TEXT,                   -- اسم الشركة
    price REAL,                  -- السعر
    change_percent REAL,         -- نسبة التغير
    volume TEXT,                 -- حجم التداول
    market_cap TEXT,             -- القيمة السوقية
    market TEXT,                 -- السوق
    UNIQUE(timestamp, symbol)    -- منع التكرار
);
```

#### 3️⃣ جدول `gold_prices` (أسعار الذهب)
```sql
CREATE TABLE gold_prices (
    id INTEGER PRIMARY KEY,
    timestamp TEXT,              -- التاريخ والوقت
    country TEXT,                -- الدولة (مصر، السعودية، ...)
    currency TEXT,               -- العملة (EGP, SAR, ...)
    karat TEXT,                  -- العيار (عيار 24، عيار 21، ...)
    price_per_gram REAL,         -- سعر الجرام
    price_per_ounce REAL,        -- سعر الأوقية
    UNIQUE(timestamp, country, karat)
);
```

#### 4️⃣ جدول `silver_prices` (أسعار الفضة)
```sql
CREATE TABLE silver_prices (
    id INTEGER PRIMARY KEY,
    timestamp TEXT,
    country TEXT,
    currency TEXT,
    price_per_gram REAL,
    price_per_ounce REAL,
    UNIQUE(timestamp, country)
);
```

#### 5️⃣ جدول `exchange_rates` (أسعار الصرف)
```sql
CREATE TABLE exchange_rates (
    id INTEGER PRIMARY KEY,
    timestamp TEXT,
    currency TEXT,               -- العملة (EGP, SAR, KWD, QAR, ...)
    rate_to_usd REAL,            -- السعر مقابل الدولار
    UNIQUE(timestamp, currency)
);
```

#### 6️⃣ جدول `crypto_prices` (العملات الرقمية)
```sql
CREATE TABLE crypto_prices (
    id INTEGER PRIMARY KEY,
    timestamp TEXT,
    rank INTEGER,                -- الترتيب العالمي
    symbol TEXT,                 -- الرمز (BTC, ETH, ...)
    name TEXT,                   -- الاسم
    price_usd REAL,              -- السعر بالدولار
    price_change_24h REAL,       -- التغير في 24 ساعة
    price_change_7d REAL,        -- التغير في 7 أيام
    market_cap REAL,             -- القيمة السوقية
    market_cap_rank INTEGER,     -- ترتيب القيمة السوقية
    total_volume REAL,           -- حجم التداول
    circulating_supply REAL,     -- المعروض المتداول
    UNIQUE(timestamp, symbol)
);
```

#### 7️⃣ جدول `historical_data` (البيانات التاريخية)
```sql
CREATE TABLE historical_data (
    id INTEGER PRIMARY KEY,
    symbol TEXT,                 -- رمز السهم
    name TEXT,                   -- اسم الشركة
    market TEXT,                 -- السوق
    date TEXT,                   -- التاريخ
    open REAL,                   -- سعر الافتتاح
    high REAL,                   -- أعلى سعر
    low REAL,                    -- أدنى سعر
    close REAL,                  -- سعر الإغلاق
    volume INTEGER,              -- حجم التداول
    last_fetch TEXT,
    UNIQUE(symbol, date)
);
```

#### 8️⃣ جدول `btc_local_prices` (سعر البيتكوين بالعملات العربية)
```sql
CREATE TABLE btc_local_prices (
    id INTEGER PRIMARY KEY,
    timestamp TEXT,
    currency TEXT,               -- العملة (EGP, SAR, KWD, QAR)
    price REAL,                  -- سعر البيتكوين
    change_24h REAL,             -- التغير في 24 ساعة
    UNIQUE(timestamp, currency)
);
```

### إحصائيات قاعدة البيانات

| الجدول | عدد السجلات | آخر تحديث |
|--------|-------------|-----------|
| stocks | ~1,200 | مستمر |
| stock_prices | ~360+ | كل 2-10 دقائق |
| gold_prices | ~1,000+ | كل 10 دقائق |
| crypto_prices | ~600+ | كل 5 دقائق |
| historical_data | ~99,000 | يومي |

---

## 🔌 API Reference

### Base URL
```
http://localhost:3000/api
```

### Endpoints

#### 📈 الأسهم

##### GET `/api/stocks`
الحصول على جميع الأسهم أو فلترة بالسوق

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| country | string | الفلترة بالسوق (egypt, saudi, kuwait, qatar) |

**Example Request:**
```bash
curl "http://localhost:3000/api/stocks?country=egypt"
```

**Example Response:**
```json
[
  {
    "symbol": "ADCI",
    "name": "أدكو",
    "price": 214.84,
    "change_percent": -0.54,
    "volume": "11.59 K",
    "market_cap": "2.53 B EGP",
    "market": "مصر"
  },
  ...
]
```

##### GET `/api/stocks/history`
الحصول على تاريخ أسعار سهم معين

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| symbol | string | Yes | رمز السهم |
| limit | number | No | عدد السجلات (default: 20) |

**Example:**
```bash
curl "http://localhost:3000/api/stocks/history?symbol=ADCI&limit=10"
```

---

#### 🥇 الذهب والعملات

##### GET `/api/metals-forex/status`
الحصول على آخر بيانات الذهب والعملات

**Example Response:**
```json
{
  "timestamp": "2024-01-15 10:30:00",
  "gold": {
    "gold_usd_per_ounce": 2340.00,
    "gold_usd_per_gram": 75.23,
    "countries": {
      "مصر": {
        "currency": "EGP",
        "exchange_rate_to_usd": 51.82,
        "gold_per_gram_local": 3898.56,
        "prices_by_karat": {
          "عيار 24": 3898.56,
          "عيار 22": 3573.81,
          "عيار 21": 3411.24,
          "عيار 18": 2923.92
        }
      }
    }
  }
}
```

##### GET `/api/gold/history`
تاريخ أسعار الذهب

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| country | string | No | الدولة (default: مصر) |
| karat | string | No | العيار (default: عيار 24) |
| limit | number | No | عدد السجلات |

---

#### ₿ العملات الرقمية

##### GET `/api/crypto/status`
الحصول على آخر أسعار العملات الرقمية

**Example Response:**
```json
{
  "timestamp": "2024-01-15 10:30:00",
  "total_cryptos": 50,
  "top_10": [
    {
      "rank": 1,
      "symbol": "BTC",
      "name": "Bitcoin",
      "price_usd": 62582.00,
      "price_change_24h": 2.71,
      "market_cap": 1254110999863
    }
  ]
}
```

##### GET `/api/crypto/history`
تاريخ أسعار عملة رقمية

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| symbol | string | Yes | رمز العملة (BTC, ETH, ...) |
| limit | number | No | عدد السجلات |

---

#### 📊 الإحصائيات

##### GET `/api/stats`
إحصائيات عامة عن النظام

**Example Response:**
```json
{
  "stocks_count": 858,
  "historical_count": 99076,
  "gold_records": 1095,
  "crypto_records": 650,
  "last_update": "2024-01-15 10:30:00"
}
```

##### GET `/api/database-report`
تقرير شامل عن قاعدة البيانات

---

#### 🔄 حالة النظام

##### GET `/api/auto-refresh/status`
حالة التحديث التلقائي

**Example Response:**
```json
{
  "running": true,
  "last_run": "2024-01-15T10:30:00",
  "next_run": "10:40:00",
  "tasks": {
    "metals_forex": {
      "name": "الذهب والعملات",
      "last_run": "2024-01-15T10:25:00",
      "status": "success"
    },
    "crypto": {
      "name": "العملات الرقمية",
      "last_run": "2024-01-15T10:26:00",
      "status": "success"
    },
    "stocks": {
      "name": "سحب الأسهم",
      "last_run": "2024-01-15T10:30:00",
      "status": "success"
    }
  },
  "market_status": {
    "مصر": {
      "is_open": true,
      "status": "السوق مفتوح"
    }
  }
}
```

---

## ⏰ أوقات عمل البورصات

### جدول العمل (بالتوقيت المصري - Africa/Cairo)

| البورصة | الفتح | الإغلاق | أيام العمل |
|---------|-------|---------|------------|
| 🇪🇬 مصر | 10:00 ص | 2:15 م | الأحد - الخميس |
| 🇸🇦 السعودية | 9:00 ص | 2:00 م | الأحد - الخميس |
| 🇰🇼 الكويت | 8:00 ص | 12:00 م | الأحد - الخميس |
| 🇶🇦 قطر | 8:30 ص | 12:15 م | الأحد - الخميس |

> **ملاحظة:** السعودية والكويت وقطر بتوقيت GMT+3، تم تحويله للتوقيت المصري GMT+2

### الأجازات الرسمية

#### مصر 🇪🇬
- 7 يناير: عيد الميلاد المجيد (الأقباط)
- 25 يناير: ثورة 25 يناير
- عيد الفطر (3-4 أيام)
- 25 أبريل: عيد تحرير سيناء
- 1 مايو: عيد العمال
- عيد الأضحى (4-5 أيام)
- السنة الهجرية الجديدة
- 23 يوليو: ثورة يوليو
- المولد النبوي
- 6 أكتوبر: نصر أكتوبر

#### السعودية 🇸🇦
- 22 فبراير: يوم التأسيس
- عيد الفطر (5 أيام)
- عيد الأضحى (7 أيام)
- 23 سبتمبر: اليوم الوطني
- السنة الهجرية الجديدة

#### الكويت 🇰🇼
- 25 فبراير: اليوم الوطني
- 26 فبراير: يوم التحرير
- عيد الفطر (3 أيام)
- عيد الأضحى (3 أيام)
- السنة الهجرية الجديدة
- المولد النبوي

#### قطر 🇶🇦
- يوم الرياضة (فبراير)
- عيد الفطر (3 أيام)
- عيد الأضحى (3 أيام)
- السنة الهجرية الجديدة
- المولد النبوي
- 18 ديسمبر: اليوم الوطني

### استخدام مكتبة أوقات العمل

```python
from config.market_hours import (
    is_market_open,
    get_market_status,
    get_all_markets_status,
    get_egypt_time
)

# التحقق من حالة سوق معين
is_open, message = is_market_open('مصر')
print(f"مفتوح: {is_open}, الرسالة: {message}")

# الحصول على حالة جميع الأسواق
all_status = get_all_markets_status()
for market in all_status:
    print(f"{market['name']}: {market['status']}")

# الحصول على الوقت الحالي بالتوقيت المصري
now = get_egypt_time()
print(f"التوقيت الحالي: {now}")
```

---

## 🚀 التثبيت والتشغيل

### المتطلبات

```bash
# Python 3.9+
python3 --version

# Node.js 18+ (للواجهة)
node --version

# Bun (لـ Next.js)
bun --version
```

### التثبيت

```bash
# 1. استنساخ المشروع
git clone https://github.com/enmohsen20111975/data-engine.git
cd data-engine

# 2. تثبيت متطلبات Python
pip install -r requirements.txt

# 3. تثبيت متطلبات Node.js
bun install
```

### ملف requirements.txt

```txt
playwright>=1.40.0
requests>=2.31.0
pytz>=2023.3
```

### التشغيل

#### تشغيل الواجهة
```bash
bun run dev
# الواجهة تعمل على http://localhost:3000
```

#### تشغيل المجدول الذكي
```bash
cd data-engine
python3 scrapers/smart_scheduler.py
```

#### تشغيل سكريبت مفرد
```bash
# سحب الأسهم
python3 scrapers/tradingview_scraper.py

# سحب الذهب والعملات
python3 scrapers/metals_forex_fetcher.py

# سحب العملات الرقمية
python3 scrapers/crypto_fetcher.py

# سحب البيانات التاريخية
python3 scrapers/historical_fetcher.py
```

---

## 💡 أمثلة الاستخدام

### Python - قراءة البيانات

```python
import sqlite3
import json

# الاتصال بقاعدة البيانات
conn = sqlite3.connect('data-engine/data/data_engine.db')
cursor = conn.cursor()

# 1. الحصول على أسهم مصر
cursor.execute("""
    SELECT symbol, name, price, change_percent, market 
    FROM stocks 
    WHERE market = 'مصر'
""")
for row in cursor.fetchall():
    print(f"{row[0]} - {row[1]}: {row[2]} ج.م ({row[3]}%)")

# 2. الحصول على تاريخ سعر سهم
cursor.execute("""
    SELECT timestamp, price, change_percent 
    FROM stock_prices 
    WHERE symbol = 'ADCI' 
    ORDER BY timestamp DESC 
    LIMIT 10
""")
for row in cursor.fetchall():
    print(f"{row[0]}: {row[1]} ج.م")

# 3. الحصول على سعر الذهب
cursor.execute("""
    SELECT timestamp, price_per_gram 
    FROM gold_prices 
    WHERE country = 'مصر' AND karat = 'عيار 24'
    ORDER BY timestamp DESC 
    LIMIT 1
""")
gold = cursor.fetchone()
print(f"سعر الذهب عيار 24: {gold[1]} ج.م")

# 4. الحصول على سعر البيتكوين
cursor.execute("""
    SELECT timestamp, price_usd, price_change_24h 
    FROM crypto_prices 
    WHERE symbol = 'BTC' 
    ORDER BY timestamp DESC 
    LIMIT 1
""")
btc = cursor.fetchone()
print(f"Bitcoin: ${btc[1]} ({btc[2]}%)")

conn.close()
```

### Python - قراءة ملفات JSON

```python
import json
from pathlib import Path

DATA_DIR = Path('data-engine/data')

# 1. قراءة بيانات الأسهم
with open(DATA_DIR / 'stocks_data.json', 'r', encoding='utf-8') as f:
    stocks = json.load(f)
    
egypt_stocks = [s for s in stocks if s['market'] == 'مصر']
print(f"عدد الأسهم المصرية: {len(egypt_stocks)}")

# 2. قراءة بيانات الذهب
with open(DATA_DIR / 'metals_forex_latest.json', 'r', encoding='utf-8') as f:
    metals = json.load(f)
    
gold_egypt = metals['gold']['countries']['مصر']
print(f"سعر الذهب في مصر: {gold_egypt['gold_per_gram_local']} ج.م")

# 3. قراءة بيانات الكريبتو
with open(DATA_DIR / 'crypto_latest.json', 'r', encoding='utf-8') as f:
    crypto = json.load(f)
    
print(f"عدد العملات: {crypto['total_cryptos']}")
for c in crypto['top_10']:
    print(f"{c['rank']}. {c['name']}: ${c['price_usd']}")
```

### JavaScript/TypeScript - استخدام API

```typescript
// الحصول على الأسهم المصرية
const response = await fetch('/api/stocks?country=egypt');
const stocks = await response.json();

stocks.forEach(stock => {
  console.log(`${stock.symbol} - ${stock.name}: ${stock.price} ج.م`);
});

// الحصول على سعر الذهب
const goldResponse = await fetch('/api/metals-forex/status');
const goldData = await goldResponse.json();

const egyptGold = goldData.gold.countries['مصر'];
console.log(`سعر الذهب عيار 24: ${egyptGold.prices_by_karat['عيار 24']} ج.م`);

// الحصول على حالة السوق
const statusResponse = await fetch('/api/auto-refresh/status');
const status = await statusResponse.json();

console.log('حالة الأسواق:');
Object.entries(status.market_status).forEach(([market, info]: [string, any]) => {
  console.log(`${market}: ${info.is_open ? '🟢 مفتوح' : '🔴 مغلق'}`);
});
```

### React Component Example

```tsx
'use client';

import { useState, useEffect } from 'react';

interface Stock {
  symbol: string;
  name: string;
  price: number;
  change_percent: number;
  market: string;
}

export function StockList() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/stocks?country=egypt')
      .then(res => res.json())
      .then(data => {
        setStocks(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>جاري التحميل...</div>;

  return (
    <div className="grid gap-2">
      {stocks.map(stock => (
        <div key={stock.symbol} className="flex justify-between p-2 border rounded">
          <div>
            <span className="font-bold">{stock.symbol}</span>
            <span className="text-gray-500 mr-2">{stock.name}</span>
          </div>
          <div>
            <span>{stock.price} ج.م</span>
            <span className={stock.change_percent >= 0 ? 'text-green-500' : 'text-red-500'}>
              {stock.change_percent >= 0 ? '+' : ''}{stock.change_percent}%
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

## 🔄 التحديث التلقائي

### Smart Scheduler (المجدول الذكي)

يعمل المجدول الذكي على تحديث البيانات بناءً على حالة الأسواق:

#### قواعد التحديث

| نوع البيانات | معدل التحديث | متى يعمل |
|--------------|--------------|----------|
| الذهب والعملات | كل 10 دقائق | دائماً |
| العملات الرقمية | كل 5 دقائق | دائماً |
| الأسهم | كل 2-10 دقائق | فقط أثناء جلسات التداول |

#### حالة التحديث

```python
# التحقق من حالة التحديث
import json

with open('data-engine/data/auto_refresh_status.json', 'r') as f:
    status = json.load(f)

print(f"الحالة: {'شغال' if status['running'] else 'متوقف'}")
print(f"آخر تحديث: {status['last_run']}")
print(f"التحديث القادم: {status['next_run']}")

# حالة كل مهمة
for task_id, task in status['tasks'].items():
    print(f"{task['name']}: {task['status']}")
```

#### تشغيل/إيقاف المجدول

```bash
# تشغيل المجدول في الخلفية
nohup python3 scrapers/smart_scheduler.py > scheduler.log 2>&1 &

# إيقاف المجدول
pkill -f smart_scheduler.py

# التحقق من حالة المجدول
ps aux | grep smart_scheduler
```

---

## 🔧 استكشاف الأخطاء

### مشاكل شائعة وحلولها

#### 1. خطأ في الاتصال بـ TradingView
```
Error: Timeout waiting for selector
```

**الحل:**
```bash
# تأكد من تثبيت Playwright browsers
playwright install chromium

# أو استخدم headless=False للتشخيص
```

#### 2. قاعدة البيانات فارغة
```
Error: no such table: stocks
```

**الحل:**
```bash
# تشغيل سكريبت سحب البيانات
python3 scrapers/tradingview_scraper.py
python3 scrapers/metals_forex_fetcher.py
python3 scrapers/crypto_fetcher.py
```

#### 3. خطأ في تثبيت pytz
```
ModuleNotFoundError: No module named 'pytz'
```

**الحل:**
```bash
pip install pytz
```

#### 4. الأسعار لا تتحدث
```
البيانات قديمة
```

**الحل:**
```bash
# التحقق من حالة المجدول
cat data-engine/data/auto_refresh_status.json

# إعادة تشغيل المجدول
pkill -f smart_scheduler
python3 scrapers/smart_scheduler.py
```

#### 5. مشاكل CORS في API
```
Access-Control-Allow-Origin error
```

**الحل:**
تأكد من إضافة CORS headers في API routes:
```typescript
headers: {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}
```

---

## 📞 الدعم والمساهمة

### الإبلاغ عن مشاكل
- فتح Issue جديد على GitHub
- وصف المشكلة بالتفصيل
- إرفاق سجلات الأخطاء

### المساهمة في التطوير
1. Fork المشروع
2. إنشاء فرع جديد (`git checkout -b feature/amazing-feature`)
3. عمل Commit (`git commit -m 'Add amazing feature'`)
4. Push للفرع (`git push origin feature/amazing-feature`)
5. فتح Pull Request

---

## 📄 الترخيص

هذا المشروع مرخص تحت رخصة MIT.

---

## 👨‍💻 المؤلف

**Z.ai Code** - [GitHub](https://github.com/enmohsen20111975/data-engine)

---

<div align="center">

**صنع بـ ❤️ لمجتمع المطورين العرب**

</div>
