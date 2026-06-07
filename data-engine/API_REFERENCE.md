# 🔌 API Reference التفصيلي

## Base URL

```
http://localhost:3000/api
```

---

## 📊 Endpoints

### 1. الأسهم (Stocks)

---

#### `GET /api/stocks`

الحصول على قائمة الأسهم

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `country` | string | No | الفلترة بالسوق: `egypt`, `saudi`, `kuwait`, `qatar` |

**Example Request:**
```bash
# كل الأسهم
curl "http://localhost:3000/api/stocks"

# الأسهم المصرية فقط
curl "http://localhost:3000/api/stocks?country=egypt"

# الأسهم السعودية
curl "http://localhost:3000/api/stocks?country=saudi"
```

**Response:**
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
  {
    "symbol": "COMI",
    "name": "البنك التجاري الدولي",
    "price": 85.20,
    "change_percent": 1.25,
    "volume": "1.2 M",
    "market_cap": "195.5 B EGP",
    "market": "مصر"
  }
]
```

**Status Codes:**
- `200 OK` - نجاح
- `500 Internal Server Error` - خطأ في الخادم

---

#### `GET /api/stocks/{symbol}`

الحصول على سهم واحد

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `symbol` | string | رمز السهم |

**Example:**
```bash
curl "http://localhost:3000/api/stocks/ADCI"
```

**Response:**
```json
{
  "symbol": "ADCI",
  "name": "أدكو",
  "price": 214.84,
  "change_percent": -0.54,
  "volume": "11.59 K",
  "market_cap": "2.53 B EGP",
  "market": "مصر"
}
```

---

#### `GET /api/stocks/history`

الحصول على تاريخ أسعار سهم

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `symbol` | string | Yes | رمز السهم |
| `limit` | number | No | عدد السجلات (default: 20) |
| `from` | string | No | من تاريخ (YYYY-MM-DD) |
| `to` | string | No | إلى تاريخ (YYYY-MM-DD) |

**Example:**
```bash
curl "http://localhost:3000/api/stocks/history?symbol=ADCI&limit=10"
```

**Response:**
```json
[
  {
    "timestamp": "2024-01-15 10:30:00",
    "symbol": "ADCI",
    "name": "أدكو",
    "price": 214.84,
    "change_percent": -0.54,
    "volume": "11.59 K"
  },
  {
    "timestamp": "2024-01-15 10:25:00",
    "symbol": "ADCI",
    "name": "أدكو",
    "price": 215.20,
    "change_percent": -0.50,
    "volume": "10.5 K"
  }
]
```

---

### 2. الذهب والعملات (Metals & Forex)

---

#### `GET /api/metals-forex/status`

الحصول على آخر أسعار الذهب والعملات

**Example:**
```bash
curl "http://localhost:3000/api/metals-forex/status"
```

**Response:**
```json
{
  "timestamp": "2024-01-15 10:30:00",
  "gold": {
    "gold_usd_per_ounce": 2340.00,
    "gold_usd_per_gram": 75.23,
    "countries": {
      "مصر": {
        "currency": "EGP",
        "symbol": "ج.م",
        "flag": "🇪🇬",
        "exchange_rate_to_usd": 51.82,
        "gold_per_gram_local": 3898.56,
        "gold_per_ounce_local": 121258.80,
        "prices_by_karat": {
          "عيار 24": 3898.56,
          "عيار 22": 3573.81,
          "عيار 21": 3411.24,
          "عيار 18": 2923.92,
          "عيار 14": 2274.03,
          "عيار 10": 1624.53
        }
      },
      "السعودية": {
        "currency": "SAR",
        "symbol": "ر.س",
        "flag": "🇸🇦",
        "exchange_rate_to_usd": 3.75,
        "gold_per_gram_local": 282.12,
        "prices_by_karat": { ... }
      }
    }
  },
  "silver": {
    "silver_usd_per_ounce": 28.00,
    "silver_usd_per_gram": 0.90,
    "countries": { ... }
  },
  "exchange_rates": {
    "EGP": 51.82,
    "SAR": 3.75,
    "KWD": 0.31,
    "QAR": 3.64
  }
}
```

---

#### `GET /api/gold/history`

تاريخ أسعار الذهب

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `country` | string | No | الدولة (default: مصر) |
| `karat` | string | No | العيار (default: عيار 24) |
| `limit` | number | No | عدد السجلات |

**Example:**
```bash
curl "http://localhost:3000/api/gold/history?country=مصر&karat=عيار 24&limit=10"
```

**Response:**
```json
[
  {
    "timestamp": "2024-01-15 10:30:00",
    "country": "مصر",
    "karat": "عيار 24",
    "price_per_gram": 3898.56,
    "price_per_ounce": 121258.80
  },
  {
    "timestamp": "2024-01-15 10:20:00",
    "country": "مصر",
    "karat": "عيار 24",
    "price_per_gram": 3895.20,
    "price_per_ounce": 121153.50
  }
]
```

---

#### `GET /api/exchange-rates`

أسعار الصرف

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `currency` | string | No | عملة معينة |

**Example:**
```bash
curl "http://localhost:3000/api/exchange-rates"
```

**Response:**
```json
{
  "timestamp": "2024-01-15 10:30:00",
  "base": "USD",
  "rates": {
    "EGP": 51.82,
    "SAR": 3.75,
    "KWD": 0.31,
    "QAR": 3.64,
    "AED": 3.67,
    "BHD": 0.38,
    "OMR": 0.38,
    "JOD": 0.71
  }
}
```

---

### 3. العملات الرقمية (Crypto)

---

#### `GET /api/crypto/status`

الحصول على أسعار العملات الرقمية

**Example:**
```bash
curl "http://localhost:3000/api/crypto/status"
```

**Response:**
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
      "price_change_7d": -5.20,
      "market_cap": 1254110999863,
      "total_volume": 28811089213,
      "circulating_supply": 20039087.0,
      "image": "https://coin-images.coingecko.com/coins/images/1/large/bitcoin.png"
    },
    {
      "rank": 2,
      "symbol": "ETH",
      "name": "Ethereum",
      "price_usd": 1629.22,
      "price_change_24h": 4.27,
      ...
    }
  ],
  "all_cryptos": [ ... ],
  "btc_local_prices": {
    "EGP": {
      "country": "مصر",
      "currency_name": "جنيه مصري",
      "flag": "🇪🇬",
      "btc_price": 3245000.00,
      "btc_change_24h": 2.71
    },
    ...
  }
}
```

---

#### `GET /api/crypto/history`

تاريخ سعر عملة رقمية

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `symbol` | string | Yes | رمز العملة (BTC, ETH, SOL, ...) |
| `limit` | number | No | عدد السجلات |

**Example:**
```bash
curl "http://localhost:3000/api/crypto/history?symbol=BTC&limit=5"
```

**Response:**
```json
[
  {
    "timestamp": "2024-01-15 10:30:00",
    "symbol": "BTC",
    "name": "Bitcoin",
    "price_usd": 62582.00,
    "price_change_24h": 2.71,
    "market_cap": 1254110999863
  },
  ...
]
```

---

### 4. البيانات التاريخية (Historical)

---

#### `GET /api/historical/status`

حالة البيانات التاريخية

**Example:**
```bash
curl "http://localhost:3000/api/historical/status"
```

**Response:**
```json
{
  "total_records": 99076,
  "markets": {
    "السعودية": 98604,
    "الذهب والفضة": 63,
    "العملات": 100,
    "مؤشرات عالمية": 89,
    "الأسهم الأمريكية": 220
  },
  "date_range": {
    "start": "2019-01-01",
    "end": "2024-01-15"
  }
}
```

---

#### `GET /api/historical/stock`

بيانات تاريخية لسهم

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `symbol` | string | Yes | رمز السهم |
| `from` | string | No | من تاريخ |
| `to` | string | No | إلى تاريخ |

**Example:**
```bash
curl "http://localhost:3000/api/historical/stock?symbol=1120&from=2023-01-01&to=2024-01-15"
```

**Response:**
```json
[
  {
    "date": "2024-01-15",
    "symbol": "1120",
    "name": "الراجحي",
    "open": 66.50,
    "high": 67.00,
    "low": 66.20,
    "close": 66.70,
    "volume": 3660000
  },
  ...
]
```

---

### 5. حالة النظام (System Status)

---

#### `GET /api/stats`

إحصائيات عامة

**Example:**
```bash
curl "http://localhost:3000/api/stats"
```

**Response:**
```json
{
  "stocks_count": 858,
  "stocks_by_market": {
    "مصر": 100,
    "السعودية": 100,
    "الكويت": 100,
    "قطر": 55
  },
  "historical_count": 99076,
  "gold_records": 1095,
  "silver_records": 182,
  "crypto_records": 650,
  "exchange_rates_records": 182,
  "last_update": "2024-01-15 10:30:00"
}
```

---

#### `GET /api/database-report`

تقرير شامل عن قاعدة البيانات

**Example:**
```bash
curl "http://localhost:3000/api/database-report"
```

**Response:**
```json
{
  "database_size": "16.30 MB",
  "tables": {
    "stocks": { "count": 858, "size": "120 KB" },
    "stock_prices": { "count": 363, "size": "50 KB" },
    "gold_prices": { "count": 1095, "size": "100 KB" },
    "crypto_prices": { "count": 650, "size": "80 KB" },
    "historical_data": { "count": 99076, "size": "15 MB" }
  },
  "oldest_record": "2019-01-01",
  "newest_record": "2024-01-15"
}
```

---

#### `GET /api/auto-refresh/status`

حالة التحديث التلقائي

**Example:**
```bash
curl "http://localhost:3000/api/auto-refresh/status"
```

**Response:**
```json
{
  "running": true,
  "started_at": "2024-01-15T08:00:00",
  "last_run": "2024-01-15T10:30:00",
  "next_run": "10:40:00",
  "interval": 600,
  "tasks": {
    "metals_forex": {
      "script": "metals_forex_fetcher.py",
      "name": "الذهب والعملات",
      "last_run": "2024-01-15T10:25:00",
      "status": "success"
    },
    "crypto": {
      "script": "crypto_fetcher.py",
      "name": "العملات الرقمية",
      "last_run": "2024-01-15T10:26:00",
      "status": "success"
    },
    "stocks": {
      "script": "tradingview_scraper.py",
      "name": "سحب الأسهم",
      "last_run": "2024-01-15T10:30:00",
      "status": "success"
    }
  },
  "market_status": {
    "مصر": {
      "name": "EGX - البورصة المصرية",
      "is_open": true,
      "status": "السوق مفتوح",
      "market_open_egypt": "10:00",
      "market_close_egypt": "14:15",
      "next_event": "يغلق الساعة 14:15 بتوقيت مصر"
    },
    "السعودية": {
      "name": "TADAWUL - السوق المالية السعودية",
      "is_open": true,
      "status": "السوق مفتوح",
      "market_open_egypt": "09:00",
      "market_close_egypt": "14:00"
    },
    "الكويت": {
      "name": "Boursa Kuwait - بورصة الكويت",
      "is_open": false,
      "status": "السوق مغلق (انتهى التداول)",
      "next_event": "يفتح يوم الأحد الساعة 08:00"
    },
    "قطر": {
      "name": "QSE - بورصة قطر",
      "is_open": false,
      "status": "السوق مغلق (انتهى التداول)"
    }
  },
  "logs": [
    "[10:30:00] ✅ سحب الأسهم completed successfully",
    "[10:26:00] ✅ العملات الرقمية completed successfully",
    "[10:25:00] ✅ الذهب والعملات completed successfully"
  ]
}
```

---

### 6. المؤشرات الفنية (Technical Indicators)

---

#### `GET /api/technical/status`

حالة المؤشرات الفنية

**Example:**
```bash
curl "http://localhost:3000/api/technical/status"
```

**Response:**
```json
{
  "available": true,
  "last_update": "2024-01-15 10:00:00",
  "supported_indicators": [
    "RSI",
    "MACD",
    "Bollinger Bands",
    "Moving Averages",
    "Support/Resistance"
  ]
}
```

---

## 🔒 Rate Limits

| Endpoint | Limit |
|----------|-------|
| جميع Endpoints | 100 طلب/دقيقة |

---

## 🌐 CORS

جميع الـ endpoints تدعم CORS:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

---

## 📝 Error Responses

### Error Format

```json
{
  "error": true,
  "message": "وصف الخطأ",
  "code": "ERROR_CODE"
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `NOT_FOUND` | 404 | المورد غير موجود |
| `INVALID_PARAMETER` | 400 | معامل غير صالح |
| `DATABASE_ERROR` | 500 | خطأ في قاعدة البيانات |
| `RATE_LIMIT_EXCEEDED` | 429 | تجاوز حد الطلبات |

---

## 💻 SDK Examples

### JavaScript/TypeScript

```typescript
// data-engine-client.ts
const API_BASE = 'http://localhost:3000/api';

export class DataEngineClient {
  
  // الأسهم
  async getStocks(country?: string) {
    const url = country 
      ? `${API_BASE}/stocks?country=${country}`
      : `${API_BASE}/stocks`;
    const res = await fetch(url);
    return res.json();
  }
  
  async getStockHistory(symbol: string, limit: number = 20) {
    const res = await fetch(`${API_BASE}/stocks/history?symbol=${symbol}&limit=${limit}`);
    return res.json();
  }
  
  // الذهب
  async getGoldPrices() {
    const res = await fetch(`${API_BASE}/metals-forex/status`);
    return res.json();
  }
  
  async getGoldHistory(country: string = 'مصر', karat: string = 'عيار 24') {
    const res = await fetch(`${API_BASE}/gold/history?country=${country}&karat=${karat}`);
    return res.json();
  }
  
  // العملات الرقمية
  async getCryptoPrices() {
    const res = await fetch(`${API_BASE}/crypto/status`);
    return res.json();
  }
  
  async getCryptoHistory(symbol: string) {
    const res = await fetch(`${API_BASE}/crypto/history?symbol=${symbol}`);
    return res.json();
  }
  
  // حالة النظام
  async getSystemStatus() {
    const res = await fetch(`${API_BASE}/auto-refresh/status`);
    return res.json();
  }
  
  async getStats() {
    const res = await fetch(`${API_BASE}/stats`);
    return res.json();
  }
}

// استخدام الـ Client
const client = new DataEngineClient();

// الحصول على الأسهم المصرية
const egyptStocks = await client.getStocks('egypt');

// الحصول على سعر الذهب
const gold = await client.getGoldPrices();
console.log(gold.gold.countries['مصر'].prices_by_karat['عيار 24']);

// الحصول على حالة السوق
const status = await client.getSystemStatus();
console.log(status.market_status['مصر'].is_open);
```

### Python

```python
# data_engine_client.py
import requests
from typing import Optional, List, Dict

class DataEngineClient:
    def __init__(self, base_url: str = 'http://localhost:3000/api'):
        self.base_url = base_url
    
    def get_stocks(self, country: Optional[str] = None) -> List[Dict]:
        """الحصول على قائمة الأسهم"""
        url = f'{self.base_url}/stocks'
        if country:
            url += f'?country={country}'
        response = requests.get(url)
        return response.json()
    
    def get_stock_history(self, symbol: str, limit: int = 20) -> List[Dict]:
        """الحصول على تاريخ سهم"""
        url = f'{self.base_url}/stocks/history?symbol={symbol}&limit={limit}'
        response = requests.get(url)
        return response.json()
    
    def get_gold_prices(self) -> Dict:
        """الحصول على أسعار الذهب"""
        url = f'{self.base_url}/metals-forex/status'
        response = requests.get(url)
        return response.json()
    
    def get_gold_history(self, country: str = 'مصر', karat: str = 'عيار 24') -> List[Dict]:
        """الحصول على تاريخ سعر الذهب"""
        url = f'{self.base_url}/gold/history?country={country}&karat={karat}'
        response = requests.get(url)
        return response.json()
    
    def get_crypto_prices(self) -> Dict:
        """الحصول على أسعار العملات الرقمية"""
        url = f'{self.base_url}/crypto/status'
        response = requests.get(url)
        return response.json()
    
    def get_crypto_history(self, symbol: str) -> List[Dict]:
        """الحصول على تاريخ عملة رقمية"""
        url = f'{self.base_url}/crypto/history?symbol={symbol}'
        response = requests.get(url)
        return response.json()
    
    def get_system_status(self) -> Dict:
        """الحصول على حالة النظام"""
        url = f'{self.base_url}/auto-refresh/status'
        response = requests.get(url)
        return response.json()
    
    def get_stats(self) -> Dict:
        """الحصول على إحصائيات"""
        url = f'{self.base_url}/stats'
        response = requests.get(url)
        return response.json()


# استخدام الـ Client
if __name__ == '__main__':
    client = DataEngineClient()
    
    # الأسهم المصرية
    egypt_stocks = client.get_stocks('egypt')
    for stock in egypt_stocks[:5]:
        print(f"{stock['symbol']}: {stock['price']} ج.م")
    
    # سعر الذهب
    gold = client.get_gold_prices()
    egypt_gold = gold['gold']['countries']['مصر']
    print(f"سعر الذهب عيار 24: {egypt_gold['prices_by_karat']['عيار 24']} ج.م")
    
    # حالة السوق
    status = client.get_system_status()
    for market, info in status['market_status'].items():
        state = '🟢 مفتوح' if info['is_open'] else '🔴 مغلق'
        print(f"{market}: {state}")
```

---

## 🔄 WebSocket (Coming Soon)

```typescript
// سيكون متاح قريباً
const ws = new WebSocket('ws://localhost:3000/ws');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch(data.type) {
    case 'stock_update':
      console.log(`Stock ${data.symbol} updated: ${data.price}`);
      break;
    case 'gold_update':
      console.log(`Gold price updated: ${data.price}`);
      break;
    case 'crypto_update':
      console.log(`Crypto ${data.symbol} updated: ${data.price}`);
      break;
  }
};
```

---

<div align="center">

**تم التوضيح بـ ❤️**

</div>
