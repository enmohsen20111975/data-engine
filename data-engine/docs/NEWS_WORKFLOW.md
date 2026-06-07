# سير عمل جمع أخبار البورصة
# Stock Market News Gathering Workflow

## الهدف | Objective
جمع الأخبار المؤثرة على بورصات الدول التالية:
- السعودية (Tadawul)
- مصر (EGX)
- الكويت (KSE)
- قطر (QSE)

---

## ✅ المرحلة 1: البحث عن مصادر الأخبار | Phase 1: News Sources Research

### 1.1 مصادر رسمية | Official Sources
| الدولة | البورصة | الموقع | RSS | الحالة |
|--------|---------|--------|-----|--------|
| السعودية | Tadawul | https://www.saudiexchange.sa | ❌ محظور | ✅ تم البحث |
| مصر | EGX | https://www.egx.com.eg | ❌ محظور | ✅ تم البحث |
| الكويت | KSE | https://www.boursakuwait.com.kw | ❌ محظور | ✅ تم البحث |
| قطر | QSE | https://www.qe.com.qa | ❌ محظور | ✅ تم البحث |

### 1.2 مصادر إخبارية مالية | Financial News Sources
| المصدر | الموقع | الدول المغطاة | الحالة |
|--------|--------|--------------|--------|
| Argaam | https://www.argaam.com | السعودية | ✅ يعمل |
| Mubasher | https://mubasher.info | الخليج ومصر | ⚠️ Cloudflare block |
| Investing.com | https://www.investing.com | عالمي | ✅ يعمل |
| TradingView | https://www.tradingview.com | عالمي | ✅ يعمل |
| Yahoo Finance | https://finance.yahoo.com | عالمي | ✅ يعمل |
| TradingEconomics | https://tradingeconomics.com | عالمي | ✅ يعمل |

### 1.3 واجهات برمجة الأخبار | News APIs
| API | التكلفة | التغطية | الحالة |
|-----|---------|---------|--------|
| marketaux | Freemium | عالمي | ⚠️ يحتاج API key |
| NewsAPI | Freemium | عالمي | ⚠️ يحتاج API key |
| Finnhub | Freemium | عالمي | ⚠️ يحتاج API key |
| GNews | Freemium | عالمي | ⚠️ يحتاج API key |

---

## ✅ المرحلة 2: الحل المطبق | Phase 2: Implemented Solution

### الحل: Web Search API
تم استخدام **z-ai-web-dev-sdk** للبحث عن الأخبار المالية

**المميزات:**
- ✅ مجاني (مدمج في المشروع)
- ✅ يغطي كل الأسواق المستهدفة
- ✅ نتائج حديثة (recency filter)
- ✅ لا يحتاج API keys خارجية

### الملفات المنشأة:
1. **`data-engine/scrapers/news_fetcher.js`** - جالب الأخبار الرئيسي
2. **`data-engine/scrapers/news_fetcher.py`** - نسخة Python (احتياطي)

### قاعدة البيانات:
```sql
CREATE TABLE market_news (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    url TEXT UNIQUE,
    snippet TEXT,
    source TEXT,
    market TEXT,
    search_query TEXT,
    published_date TEXT,
    sentiment TEXT,
    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## ✅ المرحلة 3: الاستخدام | Phase 3: Usage

### تشغيل جالب الأخبار:
```bash
# جلب أخبار آخر 7 أيام
node data-engine/scrapers/news_fetcher.js --fetch --days=7

# عرض الإحصائيات
node data-engine/scrapers/news_fetcher.js --stats

# جلب أخبار آخر 3 أيام
node data-engine/scrapers/news_fetcher.js --fetch --days=3
```

### النتائج الحالية:
- **إجمالي الأخبار:** 90 خبر
- **السعودية:** 28 خبر
- **مصر:** 23 خبر
- **الكويت:** 20 خبر
- **قطر:** 19 خبر

### أهم المصادر:
| المصدر | عدد الأخبار |
|--------|-------------|
| Argaam | 11 |
| Investing.com | 6 |
| Boursa Kuwait | 6 |
| EGX | 5 |
| Yahoo Finance | 5 |

---

## 🔄 المرحلة 4: التحديث التلقائي | Phase 4: Auto Update

### خيارات الجدولة:

#### 1. باستخدام cron (Linux):
```bash
# تحديث كل 4 ساعات
0 */4 * * * cd /home/z/my-project/data-engine && node scrapers/news_fetcher.js --fetch --days=1
```

#### 2. باستخدام Python scheduler:
```python
# كل 4 ساعات
schedule.every(4).hours.do(fetch_news)
```

---

## 📝 ملاحظات مهمة | Important Notes

1. **Rate Limiting:** البحث فيه حدود، لا تكثر من الطلبات
2. **التكرار:** الأخبار المكررة يتم تجاهلها تلقائياً (UNIQUE url)
3. **التنظيف:** يفضل حذف الأخبار القديمة كل فترة
4. **الجودة:** بعض النتائج قد لا تكون مالية - يتم تصفيتها لاحقاً

---

## 🎯 الخطوات المستقبلية | Future Steps

1. **تحليل المشاعر (Sentiment Analysis):**
   - إضافة LLM لتحليل مشاعر الأخبار
   - تصنيف الأخبار (إيجابي/سلبي/محايد)

2. **ربط الأخبار بالأسهم:**
   - استخراج أسماء الشركات من النص
   - ربط كل خبر بالأسهم المتأثرة

3. **إشعارات:**
   - إرسال إشعارات للأخبار المهمة
   - تنبيهات عند أخبار تؤثر على محفظة المستخدم

4. **تصنيف الأخبار:**
   - أخبار الشركات
   - أخبار القطاعات
   - أخبار الاقتصاد الكلي

---

## سجل التحديثات | Update Log
| التاريخ | التحديث |
|---------|---------|
| 2024-06-07 | بدء المشروع والبحث عن المصادر |
| 2024-06-07 | إنشاء news_fetcher.js واختباره |
| 2024-06-07 | تحسين استعلامات البحث للحصول على نتائج أفضل |
| 2024-06-07 | حفظ 90 خبر من 4 أسواق |
