#!/usr/bin/env python3
"""
Data Engine Backend - سكريبت موحد لكل عمليات البيانات
يدعم: استخراج الأسعار، البيانات التاريخية، الأيقونات، التحليل الفني

Usage:
    python backend.py                    # تشغيل مرة واحدة
    python backend.py --schedule         # تشغيل مجدول (كل ساعة)
    python backend.py --stocks-only      # تحديث الأسعار بس
    python backend.py --historical-only  # تحديث البيانات التاريخية بس
    python backend.py --icons-only       # تحميل الأيقونات بس
    python backend.py --exchange KSA     # بورصة معينة فقط
"""

import sqlite3
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from bs4 import BeautifulSoup
import time
import re
import json
import os
import argparse
import random
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

# =============================================================================
# إعدادات
# =============================================================================
DB_PATH = os.path.join(os.path.dirname(__file__), '../../db/data-factory.db')
ICONS_DIR = os.path.join(os.path.dirname(__file__), '../../public/stock-icons')
LOG_FILE = os.path.join(os.path.dirname(__file__), '../../scraper_status.json')

# روابط TradingView
BASE_URL = 'https://ar.tradingview.com/symbols/'

# mapping البورصات
EXCHANGE_MAP = {
    'KSA': {'tv': 'SAU', 'yahoo': '.SR', 'country': 'السعودية'},
    'EGX': {'tv': 'EGX', 'yahoo': '.CA', 'country': 'مصر'},
    'UAE': {'tv': 'DFM', 'yahoo': None, 'country': 'الإمارات'},  # Yahoo مش متاح
    'KSE': {'tv': 'KSE', 'yahoo': '.KW', 'country': 'الكويت'},
    'QE': {'tv': 'QSE', 'yahoo': '.QA', 'country': 'قطر'},
    'BAH': {'tv': 'BSE', 'yahoo': '.BH', 'country': 'البحرين'},
}

# قائمة User-Agents للتناوب
USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
]

def get_random_headers():
    """الحصول على headers عشوائية"""
    return {
        'User-Agent': random.choice(USER_AGENTS),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
    }

def create_session():
    """إنشاء session مع retry"""
    session = requests.Session()
    retry_strategy = Retry(
        total=3,
        backoff_factor=1,
        status_forcelist=[429, 500, 502, 503, 504],
    )
    adapter = HTTPAdapter(max_retries=retry_strategy)
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    return session

# =============================================================================
# نظام الـ Log
# =============================================================================
def update_status(status_data):
    """تحديث ملف الحالة"""
    status_data['lastUpdate'] = datetime.now().isoformat()
    try:
        with open(LOG_FILE, 'w', encoding='utf-8') as f:
            json.dump(status_data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"Warning: Could not write status file: {e}")

def log(message, status_data=None, level='info'):
    """طباعة وتحديث الحالة"""
    timestamp = datetime.now().strftime('%H:%M:%S')
    full_msg = f"[{timestamp}] {message}"
    print(full_msg, flush=True)
    
    if status_data is not None:
        status_data['logs'] = status_data.get('logs', [])
        status_data['logs'].append({'time': timestamp, 'level': level, 'message': message})
        status_data['logs'] = status_data['logs'][-300:]
        update_status(status_data)

# =============================================================================
# قاعدة البيانات
# =============================================================================
def get_db():
    """الحصول على اتصال قاعدة البيانات"""
    conn = sqlite3.connect(DB_PATH, timeout=30)
    conn.row_factory = sqlite3.Row
    return conn

def get_all_stocks():
    """الحصول على كل الأسهم"""
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT * FROM Stock ORDER BY exchange, symbol')
    stocks = [dict(row) for row in c.fetchall()]
    conn.close()
    return stocks

def get_stocks_by_exchange(exchange):
    """الحصول على أسهم بورصة معينة"""
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT * FROM Stock WHERE exchange = ? ORDER BY symbol', (exchange,))
    stocks = [dict(row) for row in c.fetchall()]
    conn.close()
    return stocks

# =============================================================================
# استخراج البيانات التاريخية من Yahoo Finance (محسن)
# =============================================================================
def fetch_historical_from_yahoo(symbol, exchange, period='1y', session=None):
    """استخراج البيانات التاريخية من Yahoo Finance - محسن"""
    yahoo_suffix = EXCHANGE_MAP.get(exchange, {}).get('yahoo')
    if not yahoo_suffix:
        return None, "لا يوجد دعم Yahoo Finance لهذه البورصة"

    yahoo_symbol = f"{symbol}{yahoo_suffix}"
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{yahoo_symbol}"

    params = {
        'interval': '1d',
        'range': period,
    }

    if session is None:
        session = create_session()

    # تجربة عدة مرات
    max_retries = 3
    for attempt in range(max_retries):
        try:
            headers = get_random_headers()
            response = session.get(url, params=params, headers=headers, timeout=30)
            
            if response.status_code == 429:
                # Rate limited - انتظر أطول
                wait_time = (attempt + 1) * 5
                time.sleep(wait_time)
                continue
                
            if response.status_code != 200:
                return None, f"HTTP {response.status_code}"

            data = response.json()

            result = data.get('chart', {}).get('result', [])
            if not result:
                error = data.get('chart', {}).get('error', {})
                if error:
                    return None, f"Yahoo Error: {error.get('description', 'Unknown')}"
                return None, "لا توجد بيانات متاحة"

            quote = result[0]
            timestamps = quote.get('timestamp', [])
            
            if not timestamps:
                return None, "لا توجد timestamps"

            indicators = quote.get('indicators', {})
            quotes = indicators.get('quote', [{}])[0]

            historical = []
            for i, ts in enumerate(timestamps):
                try:
                    date = datetime.fromtimestamp(ts).strftime('%Y-%m-%d')
                    open_price = quotes.get('open', [None])[i]
                    high = quotes.get('high', [None])[i]
                    low = quotes.get('low', [None])[i]
                    close = quotes.get('close', [None])[i]
                    volume = quotes.get('volume', [None])[i]
                    
                    if all([open_price, high, low, close]):
                        historical.append({
                            'date': date,
                            'open': float(open_price),
                            'high': float(high),
                            'low': float(low),
                            'close': float(close),
                            'volume': int(volume) if volume else 0,
                        })
                except (IndexError, TypeError, ValueError):
                    continue

            if not historical:
                return None, "فشل في استخراج البيانات"
                
            return historical, None

        except requests.exceptions.Timeout:
            if attempt < max_retries - 1:
                time.sleep(2)
                continue
            return None, "انتهت مهلة الاتصال"
            
        except requests.exceptions.ConnectionError:
            if attempt < max_retries - 1:
                time.sleep(3)
                continue
            return None, "خطأ في الاتصال"
            
        except json.JSONDecodeError:
            return None, "فشل في قراءة الرد"
            
        except Exception as e:
            return None, f"خطأ: {str(e)}"

    return None, "فشل بعد عدة محاولات"

def update_historical_data(stocks=None, period='5y', status_data=None):
    """تحديث البيانات التاريخية - محسن"""
    if stocks is None:
        stocks = get_all_stocks()
    
    if status_data is None:
        status_data = {'task': 'historical', 'progress': 0, 'logs': []}

    # فلترة الأسهم اللي ليها Yahoo
    stocks_with_yahoo = [s for s in stocks if EXCHANGE_MAP.get(s['exchange'], {}).get('yahoo')]
    stocks_no_yahoo = [s for s in stocks if not EXCHANGE_MAP.get(s['exchange'], {}).get('yahoo')]

    log(f"\n{'='*60}", status_data)
    log(f"📊 بدء جلب البيانات التاريخية", status_data)
    log(f"{'='*60}", status_data)
    log(f"📌 الفترة: {period}", status_data)
    log(f"📈 أسهم مدعومة (Yahoo): {len(stocks_with_yahoo)}", status_data)
    
    if stocks_no_yahoo:
        log(f"⚠️ أسهم غير مدعومة (الإمارات): {len(stocks_no_yahoo)}", status_data)

    # تفاصيل كل بورصة
    log(f"\n📍 توزيع الأسهم المدعومة:", status_data)
    by_exchange_count = {}
    for s in stocks_with_yahoo:
        ex = s['exchange']
        by_exchange_count[ex] = by_exchange_count.get(ex, 0) + 1
    for ex, count in by_exchange_count.items():
        country = EXCHANGE_MAP.get(ex, {}).get('country', ex)
        log(f"   • {country}: {count} سهم", status_data)

    status_data['total'] = len(stocks_with_yahoo)
    status_data['current'] = 0
    status_data['total_records'] = 0
    status_data['by_exchange'] = {}

    session = create_session()
    total_records = 0
    failed = 0
    failed_details = []
    success_count = 0

    for i, stock in enumerate(stocks_with_yahoo):
        symbol = stock['symbol']
        exchange = stock['exchange']

        status_data['current'] = i + 1
        status_data['progress'] = int((i + 1) / len(stocks_with_yahoo) * 100)

        historical, error = fetch_historical_from_yahoo(symbol, exchange, period, session)

        if historical and len(historical) > 0:
            conn = get_db()
            c = conn.cursor()

            records = 0
            for row in historical:
                try:
                    c.execute('''
                        INSERT INTO HistoricalData (stockId, date, open, high, low, close, volume)
                        VALUES ((SELECT id FROM Stock WHERE symbol = ?), ?, ?, ?, ?, ?, ?)
                        ON CONFLICT(stockId, date) DO UPDATE SET
                            open = excluded.open,
                            high = excluded.high,
                            low = excluded.low,
                            close = excluded.close,
                            volume = excluded.volume
                    ''', (symbol, row['date'], row['open'], row['high'],
                          row['low'], row['close'], row['volume']))
                    records += 1
                except Exception as e:
                    pass

            conn.commit()
            conn.close()
            
            total_records += records
            success_count += 1
            status_data['total_records'] = total_records
            
            # تحديث إحصائيات البورصة
            if exchange not in status_data['by_exchange']:
                status_data['by_exchange'][exchange] = {'success': 0, 'failed': 0, 'records': 0}
            status_data['by_exchange'][exchange]['success'] += 1
            status_data['by_exchange'][exchange]['records'] += records

            # Log كل 20 سهم
            if (i + 1) % 20 == 0:
                log(f"📈 [{i+1}/{len(stocks_with_yahoo)}] {total_records:,} سجل | ✅ {success_count} نجح | ❌ {failed} فشل", status_data)
        else:
            failed += 1
            if exchange not in status_data['by_exchange']:
                status_data['by_exchange'][exchange] = {'success': 0, 'failed': 0, 'records': 0}
            status_data['by_exchange'][exchange]['failed'] += 1
            
            if len(failed_details) < 50:
                failed_details.append({'symbol': symbol, 'exchange': exchange, 'error': error})

        # تأخير عشوائي لتجنب الحظر
        delay = random.uniform(0.3, 0.8)
        time.sleep(delay)
        
        # تحديث الحالة كل 10 أسهم
        if (i + 1) % 10 == 0:
            update_status(status_data)

    # ملخص نهائي
    log(f"\n{'='*60}", status_data)
    log(f"✅ انتهى جلب البيانات التاريخية", status_data)
    log(f"{'='*60}", status_data)
    log(f"📊 إجمالي السجلات: {total_records:,}", status_data)
    log(f"✅ أسهم نجحت: {success_count}", status_data)
    log(f"❌ أسهم فشلت: {failed}", status_data)
    
    # تفاصيل كل بورصة
    log(f"\n📍 تفاصيل كل بورصة:", status_data)
    for ex, data in status_data.get('by_exchange', {}).items():
        country = EXCHANGE_MAP.get(ex, {}).get('country', ex)
        total_ex = data['success'] + data['failed']
        success_rate = (data['success'] / total_ex * 100) if total_ex > 0 else 0
        log(f"   • {country}: {data['success']} نجح, {data['failed']} فشل ({success_rate:.1f}%), {data['records']:,} سجل", status_data)
    
    # أمثلة على الأخطاء
    if failed_details:
        log(f"\n⚠️ أمثلة على الأخطاء (أول 20):", status_data)
        for detail in failed_details[:20]:
            log(f"   • {detail['symbol']} ({detail['exchange']}): {detail['error']}", status_data)

    status_data['progress'] = 100
    status_data['status'] = 'completed'
    status_data['summary'] = {
        'total_records': total_records,
        'success': success_count,
        'failed': failed
    }
    update_status(status_data)

    return total_records, failed

# =============================================================================
# استخراج الأسعار من TradingView
# =============================================================================
def extract_price_from_tradingview(symbol, exchange, session=None):
    """استخراج السعر الحالي من TradingView"""
    tv_exchange = EXCHANGE_MAP.get(exchange, {}).get('tv', exchange)
    url = f"{BASE_URL}{symbol}-{tv_exchange}/"

    if session is None:
        session = create_session()

    try:
        headers = get_random_headers()
        response = session.get(url, headers=headers, timeout=30)
        if response.status_code != 200:
            return None

        soup = BeautifulSoup(response.text, 'html.parser')

        # البحث عن السعر في meta tags
        price_meta = soup.find('meta', {'property': 'og:title'})
        if price_meta:
            content = price_meta.get('content', '')
            match = re.search(r'[\d,]+\.?\d*', content)
            if match:
                price_str = match.group().replace(',', '')
                return float(price_str)

        return None

    except Exception as e:
        return None

def update_stock_prices(stocks=None, status_data=None):
    """تحديث أسعار كل الأسهم"""
    if stocks is None:
        stocks = get_all_stocks()
    
    if status_data is None:
        status_data = {'task': 'prices', 'progress': 0, 'logs': []}

    log(f"📊 بدء تحديث أسعار {len(stocks)} سهم", status_data)
    status_data['total'] = len(stocks)
    status_data['current'] = 0

    updated = 0
    failed = 0
    session = create_session()

    for i, stock in enumerate(stocks):
        symbol = stock['symbol']
        exchange = stock['exchange']

        status_data['current'] = i + 1
        status_data['progress'] = int((i + 1) / len(stocks) * 100)
        
        if (i + 1) % 50 == 0 or i == 0:
            log(f"📈 [{i+1}/{len(stocks)}] جاري المعالجة... ({updated} نجح, {failed} فشل)", status_data)

        price = extract_price_from_tradingview(symbol, exchange, session)

        if price:
            conn = get_db()
            c = conn.cursor()
            c.execute('''
                INSERT INTO StockOverview (stockId, currentPrice, lastUpdate)
                VALUES ((SELECT id FROM Stock WHERE symbol = ?), ?, ?)
                ON CONFLICT(stockId) DO UPDATE SET
                    currentPrice = excluded.currentPrice,
                    lastUpdate = excluded.lastUpdate
            ''', (symbol, price, datetime.now().isoformat()))
            conn.commit()
            conn.close()
            updated += 1
        else:
            failed += 1

        time.sleep(random.uniform(0.2, 0.5))

    log(f"\n{'='*50}", status_data)
    log(f"✅ انتهى تحديث الأسعار: {updated} نجح, {failed} فشل", status_data)
    
    status_data['progress'] = 100
    status_data['status'] = 'completed'
    status_data['summary'] = {'success': updated, 'failed': failed}
    update_status(status_data)
    
    return updated, failed

# =============================================================================
# تحميل أيقونات الأسهم
# =============================================================================
def download_stock_icon(symbol, session=None):
    """تحميل أيقونة السهم من TradingView"""
    os.makedirs(ICONS_DIR, exist_ok=True)
    icon_url = f"https://s3-symbol-logo.tradingview.com/{symbol.lower()}.svg"
    icon_path = os.path.join(ICONS_DIR, f"{symbol}.svg")

    if os.path.exists(icon_path):
        return True, "exists"

    if session is None:
        session = create_session()

    try:
        response = session.get(icon_url, timeout=15)
        if response.status_code == 200:
            with open(icon_path, 'wb') as f:
                f.write(response.content)
            return True, "downloaded"
        return False, f"HTTP {response.status_code}"
    except Exception as e:
        return False, str(e)

def download_all_icons(stocks=None, status_data=None):
    """تحميل كل الأيقونات"""
    if stocks is None:
        stocks = get_all_stocks()
    
    if status_data is None:
        status_data = {'task': 'icons', 'progress': 0, 'logs': []}

    log(f"🖼️ بدء تحميل أيقونات {len(stocks)} سهم", status_data)
    
    status_data['total'] = len(stocks)
    status_data['current'] = 0

    downloaded = 0
    existing = 0
    failed = 0
    session = create_session()

    for i, stock in enumerate(stocks):
        symbol = stock['symbol']

        status_data['current'] = i + 1
        status_data['progress'] = int((i + 1) / len(stocks) * 100)

        if (i + 1) % 100 == 0:
            log(f"🖼️ [{i+1}/{len(stocks)}] {downloaded} جديد, {existing} موجود, {failed} فشل", status_data)

        success, msg = download_stock_icon(symbol, session)

        if success:
            if msg == "downloaded":
                downloaded += 1
            else:
                existing += 1
        else:
            failed += 1

        time.sleep(0.1)

    log(f"\n{'='*50}", status_data)
    log(f"✅ انتهى تحميل الأيقونات: {downloaded} جديد, {existing} موجود, {failed} فشل", status_data)
    
    status_data['progress'] = 100
    status_data['status'] = 'completed'
    status_data['summary'] = {'downloaded': downloaded, 'existing': existing, 'failed': failed}
    update_status(status_data)

    return downloaded, existing, failed

# =============================================================================
# التشغيل المجدول
# =============================================================================
def run_scheduled():
    """تشغيل مجدول كل ساعة"""
    import schedule

    def job():
        stocks = get_all_stocks()
        status_data = {'task': 'scheduled', 'progress': 0, 'logs': []}
        update_stock_prices(stocks, status_data)

    schedule.every().hour.do(job)

    print("بدء التشغيل المجدول (كل ساعة)")
    print("اضغط Ctrl+C للإيقاف")

    while True:
        schedule.run_pending()
        time.sleep(60)

# =============================================================================
# Main
# =============================================================================
def main():
    parser = argparse.ArgumentParser(description='Data Engine Backend')
    parser.add_argument('--schedule', action='store_true', help='تشغيل مجدول')
    parser.add_argument('--stocks-only', action='store_true', help='تحديث الأسعار بس')
    parser.add_argument('--historical-only', action='store_true', help='تحديث البيانات التاريخية بس')
    parser.add_argument('--icons-only', action='store_true', help='تحميل الأيقونات بس')
    parser.add_argument('--exchange', type=str, help='تحديث بورصة معينة فقط')
    parser.add_argument('--period', type=str, default='5y', 
                        help='فترة البيانات التاريخية: 1y, 2y, 5y, 10y, max (default: 5y)')

    args = parser.parse_args()

    # Initialize status
    status_data = {
        'task': 'init',
        'progress': 0,
        'status': 'running',
        'logs': []
    }
    update_status(status_data)

    print(f"\n{'='*60}")
    print("🏭 Data Engine Backend")
    print(f"{'='*60}")
    print(f"📂 Database: {os.path.abspath(DB_PATH)}")
    print(f"🖼️ Icons: {os.path.abspath(ICONS_DIR)}")
    print(f"📝 Status: {os.path.abspath(LOG_FILE)}")

    # فلترة البورصة لو محدد
    stocks = get_stocks_by_exchange(args.exchange) if args.exchange else get_all_stocks()
    print(f"📊 Stocks: {len(stocks)}")
    
    # توزيع الأسهم
    if stocks:
        by_ex = {}
        for s in stocks:
            ex = s['exchange']
            by_ex[ex] = by_ex.get(ex, 0) + 1
        print("📍 التوزيع:")
        for ex, count in by_ex.items():
            country = EXCHANGE_MAP.get(ex, {}).get('country', ex)
            print(f"   • {country}: {count}")

    if args.schedule:
        run_scheduled()
    elif args.stocks_only:
        status_data['task'] = 'prices'
        update_stock_prices(stocks, status_data)
    elif args.historical_only:
        status_data['task'] = 'historical'
        update_historical_data(stocks, period=args.period, status_data=status_data)
    elif args.icons_only:
        status_data['task'] = 'icons'
        download_all_icons(stocks, status_data)
    else:
        # تشغيل كل العمليات
        status_data['task'] = 'all'
        update_stock_prices(stocks, status_data)
        update_historical_data(stocks, period=args.period, status_data=status_data)
        download_all_icons(stocks, status_data)

    print(f"\n{'='*60}")
    print("✅ تم الانتهاء!")
    print(f"{'='*60}")

if __name__ == '__main__':
    main()
