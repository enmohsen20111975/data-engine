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
            # استخراج السعر من المحتوى
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
        print(f"  Error fetching {symbol}: {e}")
        return None

def update_stock_prices(stocks=None):
    """تحديث أسعار كل الأسهم"""
    if stocks is None:
        stocks = get_all_stocks()

    print(f"\n{'='*60}")
    print(f"تحديث أسعار {len(stocks)} سهم")
    print(f"{'='*60}")

    updated = 0
    failed = 0

    for i, stock in enumerate(stocks):
        symbol = stock['symbol']
        exchange = stock['exchange']

        print(f"[{i+1}/{len(stocks)}] {symbol} ({exchange})...", end=' ')

        price = extract_price_from_tradingview(symbol, exchange)

        if price:
            # تحديث في قاعدة البيانات
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
            print(f"✓ {price}")
            updated += 1
        else:
            print("✗")
            failed += 1

        time.sleep(0.5)  # تأخير لتجنب الحظر

    print(f"\nالنتائج: {updated} تم، {failed} فشل")
    return updated, failed

# =============================================================================
# استخراج البيانات التاريخية من Yahoo Finance
# =============================================================================
def fetch_historical_from_yahoo(symbol, exchange, period='1y'):
    """استخراج البيانات التاريخية من Yahoo Finance"""
    yahoo_suffix = EXCHANGE_MAP.get(exchange, {}).get('yahoo')
    if not yahoo_suffix:
        return None, "Yahoo Finance not available for this exchange"

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

        # استخراج البيانات
        result = data.get('chart', {}).get('result', [])
        if not result:
            return None, "No data in response"

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

def update_historical_data(stocks=None, period='2y'):
    """تحديث البيانات التاريخية"""
    if stocks is None:
        stocks = get_all_stocks()

    # فلترة الأسهم اللي ليها Yahoo
    stocks_with_yahoo = [s for s in stocks if EXCHANGE_MAP.get(s['exchange'], {}).get('yahoo')]

    print(f"\n{'='*60}")
    print(f"تحديث البيانات التاريخية لـ {len(stocks_with_yahoo)} سهم")
    print(f"{'='*60}")

    total_records = 0
    failed = 0

    for i, stock in enumerate(stocks_with_yahoo):
        symbol = stock['symbol']
        exchange = stock['exchange']

        print(f"[{i+1}/{len(stocks_with_yahoo)}] {symbol} ({exchange})...", end=' ')

        historical, error = fetch_historical_from_yahoo(symbol, exchange, period)

        if historical:
            # حفظ في قاعدة البيانات
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
            print(f"✓ {records} سجل")
            total_records += records
        else:
            print(f"✗ {error}")
            failed += 1

        time.sleep(0.5)

    print(f"\nالنتائج: {total_records} سجل، {failed} فشل")
    return total_records, failed

# =============================================================================
# تحميل أيقونات الأسهم
# =============================================================================
def download_stock_icon(symbol, exchange):
    """تحميل أيقونة السهم من TradingView"""
    # إنشاء مجلد الأيقونات لو مش موجود
    os.makedirs(ICONS_DIR, exist_ok=True)

    # TradingView icon URL pattern
    icon_url = f"https://s3-symbol-logo.tradingview.com/{symbol.lower()}.svg"

    icon_path = os.path.join(ICONS_DIR, f"{symbol}.svg")

    # لو الأيقونة موجودة بالفعل
    if os.path.exists(icon_path):
        return True, "Already exists"

    try:
        response = requests.get(icon_url, timeout=15)
        if response.status_code == 200:
            with open(icon_path, 'wb') as f:
                f.write(response.content)
            return True, "Downloaded"
        return False, f"HTTP {response.status_code}"
    except Exception as e:
        return False, str(e)

def download_all_icons(stocks=None):
    """تحميل كل الأيقونات"""
    if stocks is None:
        stocks = get_all_stocks()

    print(f"\n{'='*60}")
    print(f"تحميل أيقونات {len(stocks)} سهم")
    print(f"{'='*60}")

    downloaded = 0
    existing = 0
    failed = 0

    for i, stock in enumerate(stocks):
        symbol = stock['symbol']

        if (i + 1) % 50 == 0:
            print(f"[{i+1}/{len(stocks)}] Processing...")

        success, msg = download_stock_icon(symbol, stock['exchange'])

        if success:
            if msg == "Downloaded":
                downloaded += 1
            else:
                existing += 1
        else:
            failed += 1

        time.sleep(0.1)

    print(f"\nالنتائج: {downloaded} جديد، {existing} موجود، {failed} فشل")
    return downloaded, existing, failed

# =============================================================================
# التحليل الفني
# =============================================================================
def calculate_technical_indicators(historical_data):
    """حساب المؤشرات الفنية"""
    if len(historical_data) < 20:
        return None

    closes = [d['close'] for d in historical_data if d['close']]

    if len(closes) < 20:
        return None

    # RSI
    def calculate_rsi(prices, period=14):
        if len(prices) < period + 1:
            return None

        gains = []
        losses = []

        for i in range(1, period + 1):
            change = prices[-i] - prices[-i - 1]
            if change > 0:
                gains.append(change)
                losses.append(0)
            else:
                gains.append(0)
                losses.append(abs(change))

        avg_gain = sum(gains) / period
        avg_loss = sum(losses) / period

        if avg_loss == 0:
            return 100

        rs = avg_gain / avg_loss
        rsi = 100 - (100 / (1 + rs))
        return round(rsi, 2)

    # MA
    ma_20 = sum(closes[-20:]) / 20
    ma_50 = sum(closes[-50:]) / 50 if len(closes) >= 50 else None

    return {
        'rsi': calculate_rsi(closes),
        'ma_20': round(ma_20, 2),
        'ma_50': round(ma_50, 2) if ma_50 else None,
        'current_price': closes[-1],
    }

# =============================================================================
# التشغيل المجدول
# =============================================================================
def run_scheduled():
    """تشغيل مجدول كل ساعة"""
    import schedule

    def job():
        print(f"\n{'#'*60}")
        print(f"# بدء التحديث المجدول: {datetime.now()}")
        print(f"{'#'*60}")

        stocks = get_all_stocks()

        # تحديث الأسعار
        update_stock_prices(stocks)

        # تحديث البيانات التاريخية (كل يوم)
        if datetime.now().hour == 0:
            update_historical_data(stocks, period='1m')

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

    args = parser.parse_args()

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
        update_stock_prices(stocks)
    elif args.historical_only:
        update_historical_data(stocks)
    elif args.icons_only:
        download_all_icons(stocks)
    else:
        # تشغيل كل العمليات
        update_stock_prices(stocks)
        update_historical_data(stocks)
        download_all_icons(stocks)

    print(f"\n{'='*60}")
    print("تم الانتهاء!")
    print(f"{'='*60}")

if __name__ == '__main__':
    main()
