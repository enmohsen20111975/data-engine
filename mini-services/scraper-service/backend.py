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
"""

import sqlite3
import requests
from bs4 import BeautifulSoup
import time
import re
import json
import os
import argparse
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

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept-Language': 'ar-SA,ar;q=0.9,en;q=0.8',
}

# =============================================================================
# نظام الـ Log
# =============================================================================
def update_status(status_data):
    """تحديث ملف الحالة"""
    status_data['lastUpdate'] = datetime.now().isoformat()
    try:
        with open(LOG_FILE, 'w', encoding='utf-8') as f:
            json.dump(status_data, f, ensure_ascii=False, indent=2)
    except:
        pass

def log(message, status_data=None, level='info'):
    """طباعة وتحديث الحالة"""
    timestamp = datetime.now().strftime('%H:%M:%S')
    full_msg = f"[{timestamp}] {message}"
    print(full_msg)
    
    if status_data is not None:
        status_data['logs'] = status_data.get('logs', [])
        status_data['logs'].append({'time': timestamp, 'level': level, 'message': message})
        # احتفظ بآخر 100 سجل بس
        status_data['logs'] = status_data['logs'][-100:]
        update_status(status_data)

# =============================================================================
# قاعدة البيانات
# =============================================================================
def get_db():
    """الحصول على اتصال قاعدة البيانات"""
    conn = sqlite3.connect(DB_PATH)
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
# استخراج الأسعار من TradingView
# =============================================================================
def extract_price_from_tradingview(symbol, exchange):
    """استخراج السعر الحالي من TradingView"""
    tv_exchange = EXCHANGE_MAP.get(exchange, {}).get('tv', exchange)
    url = f"{BASE_URL}{symbol}-{tv_exchange}/"

    try:
        response = requests.get(url, headers=HEADERS, timeout=30)
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

        # البحث في الـ HTML
        price_div = soup.find('div', class_=re.compile(r'price|last'))
        if price_div:
            price_text = price_div.get_text(strip=True)
            price_text = re.sub(r'[^\d.]', '', price_text)
            if price_text:
                return float(price_text)

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

    for i, stock in enumerate(stocks):
        symbol = stock['symbol']
        exchange = stock['exchange']

        status_data['current'] = i + 1
        status_data['progress'] = int((i + 1) / len(stocks) * 100)
        
        if (i + 1) % 50 == 0 or i == 0:
            log(f"📈 [{i+1}/{len(stocks)}] جاري المعالجة... ({updated} نجح, {failed} فشل)", status_data)

        price = extract_price_from_tradingview(symbol, exchange)

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

        time.sleep(0.3)  # تأخير لتجنب الحظر

    log(f"✅ انتهى تحديث الأسعار: {updated} نجح, {failed} فشل", status_data)
    status_data['progress'] = 100
    status_data['status'] = 'completed'
    update_status(status_data)
    
    return updated, failed

# =============================================================================
# استخراج البيانات التاريخية من Yahoo Finance
# =============================================================================
def fetch_historical_from_yahoo(symbol, exchange, period='1y'):
    """استخراج البيانات التاريخية من Yahoo Finance"""
    yahoo_suffix = EXCHANGE_MAP.get(exchange, {}).get('yahoo')
    if not yahoo_suffix:
        return None, "Yahoo Finance not available"

    yahoo_symbol = f"{symbol}{yahoo_suffix}"
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{yahoo_symbol}"

    params = {
        'interval': '1d',
        'range': period,
    }

    try:
        response = requests.get(url, params=params, headers=HEADERS, timeout=30)
        if response.status_code != 200:
            return None, f"HTTP {response.status_code}"

        data = response.json()

        result = data.get('chart', {}).get('result', [])
        if not result:
            return None, "No data"

        quote = result[0]
        timestamps = quote.get('timestamp', [])
        indicators = quote.get('indicators', {})

        quotes = indicators.get('quote', [{}])[0]

        historical = []
        for i, ts in enumerate(timestamps):
            date = datetime.fromtimestamp(ts).strftime('%Y-%m-%d')
            historical.append({
                'date': date,
                'open': quotes.get('open', [None])[i],
                'high': quotes.get('high', [None])[i],
                'low': quotes.get('low', [None])[i],
                'close': quotes.get('close', [None])[i],
                'volume': quotes.get('volume', [None])[i],
            })

        return historical, None

    except Exception as e:
        return None, str(e)

def update_historical_data(stocks=None, period='5y', status_data=None):
    """تحديث البيانات التاريخية"""
    if stocks is None:
        stocks = get_all_stocks()
    
    if status_data is None:
        status_data = {'task': 'historical', 'progress': 0, 'logs': []}

    # فلترة الأسهم اللي ليها Yahoo
    stocks_with_yahoo = [s for s in stocks if EXCHANGE_MAP.get(s['exchange'], {}).get('yahoo')]
    stocks_no_yahoo = [s for s in stocks if not EXCHANGE_MAP.get(s['exchange'], {}).get('yahoo')]

    log(f"📊 بدء جلب البيانات التاريخية", status_data)
    log(f"📌 الفترة: {period}", status_data)
    log(f"📈 أسهم مدعومة (Yahoo): {len(stocks_with_yahoo)}", status_data)
    log(f"⚠️ أسهم غير مدعومة: {len(stocks_no_yahoo)} (الإمارات)", status_data)

    # حساب عدد السجلات المتوقع
    period_days = {'1y': 250, '2y': 500, '5y': 1250, '10y': 2500, 'max': 5000}
    expected_per_stock = period_days.get(period, 1250)
    total_expected = len(stocks_with_yahoo) * expected_per_stock
    
    log(f"🎯 متوقع ~{total_expected:,} سجل", status_data)

    status_data['total'] = len(stocks_with_yahoo)
    status_data['current'] = 0
    status_data['total_records'] = 0
    status_data['by_exchange'] = {}

    total_records = 0
    failed = 0

    for i, stock in enumerate(stocks_with_yahoo):
        symbol = stock['symbol']
        exchange = stock['exchange']

        status_data['current'] = i + 1
        status_data['progress'] = int((i + 1) / len(stocks_with_yahoo) * 100)

        historical, error = fetch_historical_from_yahoo(symbol, exchange, period)

        if historical:
            conn = get_db()
            c = conn.cursor()

            records = 0
            for row in historical:
                if all([row['open'], row['high'], row['low'], row['close']]):
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
                    except:
                        pass

            conn.commit()
            conn.close()
            
            total_records += records
            status_data['total_records'] = total_records
            
            # تحديث إحصائيات البورصة
            if exchange not in status_data['by_exchange']:
                status_data['by_exchange'][exchange] = {'success': 0, 'failed': 0, 'records': 0}
            status_data['by_exchange'][exchange]['success'] += 1
            status_data['by_exchange'][exchange]['records'] += records

            # Log كل 20 سهم
            if (i + 1) % 20 == 0:
                log(f"📈 [{i+1}/{len(stocks_with_yahoo)}] {total_records:,} سجل | {failed} فشل", status_data)
        else:
            failed += 1
            if exchange not in status_data['by_exchange']:
                status_data['by_exchange'][exchange] = {'success': 0, 'failed': 0, 'records': 0}
            status_data['by_exchange'][exchange]['failed'] += 1

        time.sleep(0.3)
        
        # تحديث الحالة كل 10 أسهم
        if (i + 1) % 10 == 0:
            update_status(status_data)

    # ملخص نهائي
    log(f"\n{'='*50}", status_data)
    log(f"✅ انتهى جلب البيانات التاريخية", status_data)
    log(f"📊 الإجمالي: {total_records:,} سجل", status_data)
    log(f"✅ نجح: {len(stocks_with_yahoo) - failed} سهم", status_data)
    log(f"❌ فشل: {failed} سهم", status_data)
    
    # تفاصيل كل بورصة
    for ex, data in status_data.get('by_exchange', {}).items():
        country = EXCHANGE_MAP.get(ex, {}).get('country', ex)
        log(f"  📍 {country}: {data['success']} نجح, {data['failed']} فشل, {data['records']:,} سجل", status_data)

    status_data['progress'] = 100
    status_data['status'] = 'completed'
    update_status(status_data)

    return total_records, failed

# =============================================================================
# تحميل أيقونات الأسهم
# =============================================================================
def download_stock_icon(symbol, exchange):
    """تحميل أيقونة السهم من TradingView"""
    os.makedirs(ICONS_DIR, exist_ok=True)
    icon_url = f"https://s3-symbol-logo.tradingview.com/{symbol.lower()}.svg"
    icon_path = os.path.join(ICONS_DIR, f"{symbol}.svg")

    if os.path.exists(icon_path):
        return True, "exists"

    try:
        response = requests.get(icon_url, timeout=15)
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

    for i, stock in enumerate(stocks):
        symbol = stock['symbol']

        status_data['current'] = i + 1
        status_data['progress'] = int((i + 1) / len(stocks) * 100)

        if (i + 1) % 100 == 0:
            log(f"🖼️ [{i+1}/{len(stocks)}] {downloaded} جديد, {existing} موجود, {failed} فشل", status_data)

        success, msg = download_stock_icon(symbol, stock['exchange'])

        if success:
            if msg == "downloaded":
                downloaded += 1
            else:
                existing += 1
        else:
            failed += 1

        time.sleep(0.1)

    log(f"✅ انتهى تحميل الأيقونات: {downloaded} جديد, {existing} موجود, {failed} فشل", status_data)
    status_data['progress'] = 100
    status_data['status'] = 'completed'
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
        if datetime.now().hour == 0:
            update_historical_data(stocks, period='1m', status_data=status_data)

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
    print("Data Engine Backend")
    print(f"{'='*60}")
    print(f"Database: {DB_PATH}")
    print(f"Icons: {ICONS_DIR}")

    # فلترة البورصة لو محدد
    stocks = get_stocks_by_exchange(args.exchange) if args.exchange else get_all_stocks()
    print(f"Stocks: {len(stocks)}")

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
    print("تم الانتهاء!")
    print(f"{'='*60}")

if __name__ == '__main__':
    main()
