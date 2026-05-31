# 📊 Data Engine - محرك بيانات البورصات العربية

## نظرة عامة

مشروع شامل لاستخراج وتخزين بيانات الأسهم من 6 بورصات عربية:
- 🇸🇦 السعودية (TADAWUL) - 386 سهم
- 🇪🇬 مصر (EGX) - 246 سهم
- 🇰🇼 الكويت (KSE) - 131 سهم
- 🇶🇦 قطر (QE) - 55 سهم
- 🇦🇪 الإمارات (ADX/DFM) - 141 سهم
- 🇧🇭 البحرين (BSE) - 17 سهم

**الإجمالي: 976 سهم**

---

## 📁 هيكل المشروع

```
/home/z/my-project/
├── db/
│   └── data-factory.db          # قاعدة بيانات SQLite
├── public/
│   └── stock-icons/             # أيقونات الأسهم
└── mini-services/
    └── scraper-service/
        ├── full_scraper.py      # استخراج البيانات الأساسية
        ├── scrape_historical.py # استخراج البيانات التاريخية
        ├── download_icons.py    # تحميل أيقونات الأسهم
        └── scrape_all.py        # سكريبت شامل
```

---

## 🔗 مصادر البيانات

### 1. TradingView Arabic (المصدر الرئيسي)
**الرابط:** `https://ar.tradingview.com`

#### البيانات المتاحة:
- **صفحة نظرة عامة:** `/symbols/{EXCHANGE}-{SYMBOL}/`
- **القوائم المالية:** `/symbols/{EXCHANGE}-{SYMBOL}/financials-overview/`
- **التحليل الفني:** `/symbols/{EXCHANGE}-{SYMBOL}/technicals/`
- **التوقعات:** `/symbols/{EXCHANGE}-{SYMBOL}/forecast/`
- **الأخبار:** `/symbols/{EXCHANGE}-{SYMBOL}/news/`

#### ترجمة رموز البورصات:
| البورصة | رمز TradingView |
|---------|-----------------|
| السعودية | TADAWUL |
| مصر | EGX |
| الكويت | KSE |
| قطر | QE |
| الإمارات | ADX أو DFM |
| البحرين | BSE |

#### مثال على الروابط:
```
أرامكو: https://ar.tradingview.com/symbols/TADAWUL-2222/
الراجحي: https://ar.tradingview.com/symbols/TADAWUL-1120/
بنك الرياض: https://ar.tradingview.com/symbols/TADAWUL-1010/
```

#### أيقونات الأسهم:
```
الرابط: https://s3-symbol-logo.tradingview.com/{company-name}.svg

أمثلة:
- أرامكو: https://s3-symbol-logo.tradingview.com/saudi-arabian-oil.svg
- الراجحي: https://s3-symbol-logo.tradingview.com/alrajhi-bank.svg
```

---

### 2. Yahoo Finance (البيانات التاريخية)
**الرابط:** `https://finance.yahoo.com`

#### لاحقات البورصات:
| البورصة | اللاحقة | مثال |
|---------|---------|------|
| السعودية | .SR | 2222.SR |
| مصر | .CA | EMFD.CA |
| الكويت | .KW | AAYANRE.KW |
| قطر | .QA | QNBK.QA |
| البحرين | .BH | BBK.BH |
| الإمارات | ❌ غير متاح | - |

#### مثال على الروابط:
```
أرامكو: https://finance.yahoo.com/quote/2222.SR/history/
بنك الكويت: https://finance.yahoo.com/quote/BBK.BH/history/
```

#### البيانات التاريخية:
- Date
- Open
- High
- Low
- Close
- Adj Close
- Volume

---

## 📋 البيانات المستخرجة

### من TradingView - صفحة نظرة عامة:

```javascript
// السعر الحالي
const price = document.querySelector('span[class*="last"]')?.innerText;

// أيقونة السهم
const logo = document.querySelector('img[src*="logo"]')?.src;
```

#### البيانات الأساسية:
| الحقل | الوصف |
|-------|-------|
| currentPrice | السعر الحالي |
| marketCap | القيمة السوقية |
| peRatio | نسبة السعر للأرباح |
| eps | الأرباح لكل سهم |
| dividendYield | عائد التوزيعات |
| beta | معامل بيتا |
| employees | عدد الموظفين |
| ceo | المدير التنفيذي |
| website | الموقع الإلكتروني |
| founded | تاريخ التأسيس |
| isin | رقم التعريف الدولي |

---

### من TradingView - القوائم المالية:

#### تبويب القوائم:
| الحقل | الوصف |
|-------|-------|
| revenue | الإيرادات |
| grossProfit | إجمالي الربح |
| operatingIncome | الدخل التشغيلي |
| netIncome | صافي الربح |
| ebitda | EBITDA |
| ebit | EBIT |
| eps_basic | الأرباح الأساسية لكل سهم |
| eps_diluted | الأرباح المخففة لكل سهم |
| sharesOutstanding | الأسهم القائمة |

#### تبويب إحصائيات:
| الفئة | المؤشرات |
|-------|----------|
| نسب الربحية | هامش الربح، هامش التشغيل، EBITDA، صافي الهامش |
| نسب السيولة | السيولة السريعة، النسبة الجارية، دوران المخزون |
| نسب الملاءة | الدين/الأصول، الدين/حقوق الملكية |
| لكل سهم | EPS، EBITDA/سهم، القيمة الدفترية، النقد/سهم |

---

### من TradingView - التحليل الفني:

```javascript
// استخراج المؤشرات
const oscillators = document.querySelectorAll('[class*="oscillator"]');
const movingAverages = document.querySelectorAll('[class*="ma"]');
```

#### المؤشرات المتاحة:
| المؤشر | الوصف |
|--------|-------|
| RSI (14) | مؤشر القوة النسبية |
| Stochastic %K | مؤشر ستوكاستك |
| CCI (20) | مؤشر قناة السلع |
| ADX (14) | مؤشر متوسط الحركة |
| MACD | مؤشر الماكد |
| Williams %R | مؤشر ويليامز |

#### المتوسطات المتحركة:
| المؤشر | الوصف |
|--------|-------|
| EMA 10, 20, 50, 100, 200 | المتوسط الأسي |
| SMA 10, 20, 50, 100, 200 | المتوسط البسيط |
| Ichimoku | خط الأساس |
| Hull MA | متوسط هال |

#### نقاط الارتكاز:
| النقطة | الوصف |
|--------|-------|
| R1, R2, R3 | مستويات المقاومة |
| Pivot | نقطة الارتكاز |
| S1, S2, S3 | مستويات الدعم |

---

### من TradingView - التوقعات:

| الحقل | الوصف |
|-------|-------|
| targetPrice | السعر المستهدف |
| maxEstimate | أقصى تقدير |
| minEstimate | أدنى تقدير |
| analystCount | عدد المحللين |
| buyRating | تقييم شراء |
| holdRating | تقييم احتفاظ |
| sellRating | تقييم بيع |

---

### من Yahoo Finance - البيانات التاريخية:

```javascript
// استخراج الجدول
const table = document.querySelector('table');
const rows = table.querySelectorAll('tr');

// ترتيب الأعمدة
// [0] Date
// [1] Open
// [2] High
// [3] Low
// [4] Close
// [5] Adj Close
// [6] Volume
```

---

## 🛠️ أدوات الاستخراج

### agent-browser (التحكم في المتصفح)

```bash
# فتح صفحة
agent-browser open "https://ar.tradingview.com/symbols/TADAWUL-2222/" --timeout 30

# تنفيذ JavaScript
agent-browser eval "document.body.innerText"

# إغلاق المتصفح
agent-browser close
```

### تنفيذ JavaScript من Python:

```python
import subprocess
import base64

def run_js(js_code):
    encoded = base64.b64encode(js_code.encode()).decode()
    result = subprocess.run(
        f"agent-browser eval -b '{encoded}'",
        shell=True, capture_output=True, text=True, timeout=120
    )
    return result.stdout.strip()
```

### مثال استخراج البيانات:

```javascript
(function(){
  const data = {};
  
  // استخراج النص
  const text = document.body.innerText;
  const lines = text.split('\n');
  
  // البحث عن بيانات معينة
  for(let i=0; i<lines.length; i++){
    const line = lines[i].trim();
    
    if(line.includes('القيمة السوقية')){
      data.marketCap = lines[i+1]?.trim();
    }
    if(line.includes('السعر إلى نسبة الأرباح')){
      data.peRatio = lines[i+1]?.trim();
    }
  }
  
  // استخراج الصور
  const logo = document.querySelector('img[src*="logo"]');
  data.logoUrl = logo?.src;
  
  return JSON.stringify(data);
})()
```

---

## 📊 هيكل قاعدة البيانات

### جدول Stock:
```sql
CREATE TABLE Stock (
    id TEXT PRIMARY KEY,
    symbol TEXT NOT NULL,
    nameEn TEXT,
    nameAr TEXT,
    exchange TEXT,
    sector TEXT,
    industry TEXT,
    isin TEXT,
    iconUrl TEXT,
    createdAt TEXT,
    updatedAt TEXT
);
```

### جدول StockOverview:
```sql
CREATE TABLE StockOverview (
    id TEXT PRIMARY KEY,
    stockId TEXT,
    currentPrice REAL,
    marketCap REAL,
    peRatioTTM REAL,
    dividendYield REAL,
    eps REAL,
    beta REAL,
    createdAt TEXT,
    updatedAt TEXT
);
```

### جدول HistoricalData:
```sql
CREATE TABLE HistoricalData (
    id TEXT PRIMARY KEY,
    stockId TEXT,
    date TEXT,
    open REAL,
    high REAL,
    low REAL,
    close REAL,
    adjustedClose REAL,
    volume REAL,
    createdAt TEXT
);
```

### جدول FinancialRatios:
```sql
CREATE TABLE FinancialRatios (
    id TEXT PRIMARY KEY,
    stockId TEXT,
    year INTEGER,
    grossMargin REAL,
    operatingMargin REAL,
    ebitdaMargin REAL,
    netMargin REAL,
    quickRatio REAL,
    currentRatio REAL,
    debtToEquity REAL,
    debtToAssets REAL,
    roe REAL,
    roa REAL,
    createdAt TEXT
);
```

### جدول TechnicalIndicators:
```sql
CREATE TABLE TechnicalIndicators (
    id TEXT PRIMARY KEY,
    stockId TEXT,
    date TEXT,
    rsi REAL,
    stochasticK REAL,
    macd REAL,
    ema10 REAL,
    ema20 REAL,
    ema50 REAL,
    sma50 REAL,
    sma200 REAL,
    pivotPoint REAL,
    r1 REAL, r2 REAL, r3 REAL,
    s1 REAL, s2 REAL, s3 REAL,
    summary TEXT,
    createdAt TEXT
);
```

### جدول AnalystForecasts:
```sql
CREATE TABLE AnalystForecasts (
    id TEXT PRIMARY KEY,
    stockId TEXT,
    targetPrice REAL,
    maxEstimate REAL,
    minEstimate REAL,
    analystCount INTEGER,
    buyRating INTEGER,
    holdRating INTEGER,
    sellRating INTEGER,
    overallRating TEXT,
    createdAt TEXT
);
```

---

## 🚀 سكريبتات التشغيل

### 1. استخراج البيانات الأساسية:
```bash
cd /home/z/my-project/mini-services/scraper-service
python3 full_scraper.py KSA  # للسعودية
python3 full_scraper.py EGX  # لمصر
# ...
```

### 2. استخراج البيانات التاريخية:
```bash
python3 scrape_historical.py KSA
python3 scrape_historical.py EGX
# ...
```

### 3. تحميل الأيقونات:
```bash
python3 download_icons.py
```

---

## ⚠️ ملاحظات مهمة

### 1. تأخير الطلبات:
```python
import time
time.sleep(2)  # انتظار 2 ثانية بين كل طلب
```

### 2. معالجة الأخطاء:
```python
try:
    # كود الاستخراج
except Exception as e:
    print(f"خطأ: {e}")
    continue
```

### 3. إغلاق المتصفح:
```python
# دائماً أغلق المتصفح بعد الانتهاء
subprocess.run("agent-browser close", shell=True, capture_output=True)
```

### 4. التحقق من الصفحة:
```python
# تأكد إن الصفحة فتحت صح
title = run_js("document.title")
if 'error' in title.lower():
    print("الصفحة لم تفتح بشكل صحيح")
```

---

## 📈 الإحصائيات الحالية

| البورصة | الأسهم | البيانات التاريخية |
|---------|--------|-------------------|
| السعودية | 386 | 9,519 |
| مصر | 246 | 4,491 |
| الكويت | 131 | 1,743 |
| قطر | 55 | 2,500 |
| البحرين | 17 | 2,590 |
| الإمارات | 141 | ❌ |
| **الإجمالي** | **976** | **20,843** |

---

## 🔄 التحديثات القادمة

- [ ] استخراج البيانات المالية التفصيلية
- [ ] استخراج التحليل الفني
- [ ] استخراج توقعات المحللين
- [ ] استخراج الأخبار
- [ ] تحميل أيقونات كل الأسهم
- [ ] حل مشكلة أسهم الإمارات

---

*آخر تحديث: 2026-05-31*
