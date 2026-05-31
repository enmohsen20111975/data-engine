#!/usr/bin/env python3
"""
سكريبت استخراج الأسامي العربية من TradingView
يستخرج: الاسم العربي، القطاع، الصناعة، الوصف
"""

import sqlite3
import requests
from bs4 import BeautifulSoup
import time
import re
import json

# إعدادات
DB_PATH = '../../db/data-factory.db'
BASE_URL = 'https://ar.tradingview.com/symbols/'

# رابط كل بورصة
EXCHANGE_URLS = {
    'KSA': 'TADAWUL',   # السعودية
    'EGX': 'EGX',       # مصر
    'UAE': 'DFM',       # الإمارات - DFM
    'KSE': 'KSE',       # الكويت
    'QE': 'QSE',        # قطر
    'BAH': 'BSE'        # البحرين
}

# Headers
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept-Language': 'ar-SA,ar;q=0.9,en;q=0.8',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
}

def get_stock_url(symbol, exchange):
    """تحويل رمز السهم لرابط TradingView"""
    tv_exchange = EXCHANGE_URLS.get(exchange, exchange)

    # السعودية فيها رموز أرقام
    if exchange == 'KSA':
        # البحث عن الـ urlSlug في القاعدة
        return None

    return f"{BASE_URL}{symbol}-{tv_exchange}/"

def extract_arabic_data(url, symbol):
    """استخراج البيانات العربية من صفحة TradingView"""
    try:
        response = requests.get(url, headers=HEADERS, timeout=30)
        if response.status_code != 200:
            return None

        soup = BeautifulSoup(response.text, 'html.parser')

        data = {
            'nameAr': None,
            'sector': None,
            'industry': None,
            'description': None
        }

        # استخراج الاسم العربي من عنوان الصفحة
        title = soup.find('title')
        if title:
            title_text = title.get_text()
            # الاسم العربي غالبًا أول جزء من العنوان
            parts = title_text.split(' - ')
            if parts:
                name = parts[0].strip()
                # تأكد إنه عربي
                if any('\u0600' <= c <= '\u06FF' for c in name):
                    data['nameAr'] = name

        # استخراج من meta tags
        og_title = soup.find('meta', {'property': 'og:title'})
        if og_title and not data['nameAr']:
            name = og_title.get('content', '')
            if any('\u0600' <= c <= '\u06FF' for c in name):
                data['nameAr'] = name.split(' - ')[0].strip()

        # استخراج الوصف
        desc_meta = soup.find('meta', {'name': 'description'})
        if desc_meta:
            desc = desc_meta.get('content', '')
            if any('\u0600' <= c <= '\u06FF' for c in desc):
                data['description'] = desc[:500]  # أول 500 حرف

        # البحث عن القطاع والصناعة في الصفحة
        # TradingView بيحطهم في جدول أو قائمة
        for tag in soup.find_all(['div', 'span', 'td']):
            text = tag.get_text(strip=True)
            if 'القطاع' in text or 'قطاع' in text:
                # القطاع بيكون في العنصر التالي أو نفس العنصر
                parent = tag.find_parent(['div', 'tr'])
                if parent:
                    sector_text = parent.get_text(strip=True)
                    # تنظيف النص
                    sector_text = re.sub(r'(القطاع|قطاع)[:\s]*', '', sector_text)
                    if sector_text and len(sector_text) < 50:
                        data['sector'] = sector_text

        # البحث في JSON-LD أو structured data
        scripts = soup.find_all('script', {'type': 'application/ld+json'})
        for script in scripts:
            try:
                json_data = json.loads(script.string)
                if isinstance(json_data, dict):
                    if 'name' in json_data and not data['nameAr']:
                        name = json_data['name']
                        if any('\u0600' <= c <= '\u06FF' for c in name):
                            data['nameAr'] = name
            except:
                pass

        return data if any(data.values()) else None

    except Exception as e:
        print(f"  Error fetching {symbol}: {e}")
        return None

def get_stocks_needing_names():
    """الحصول على الأسهم اللي محتاجة أسماء عربية"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    c.execute('''
        SELECT symbol, exchange, urlSlug, nameAr
        FROM Stock
        WHERE nameAr IS NULL OR nameAr = ''
        ORDER BY exchange, symbol
    ''')

    stocks = c.fetchall()
    conn.close()
    return stocks

def update_stock_data(symbol, data):
    """تحديث بيانات السهم"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    updates = []
    params = []

    if data.get('nameAr'):
        updates.append('nameAr = ?')
        params.append(data['nameAr'])
    if data.get('sector'):
        updates.append('sector = ?')
        params.append(data['sector'])
    if data.get('industry'):
        updates.append('industry = ?')
        params.append(data['industry'])
    if data.get('description'):
        updates.append('description = ?')
        params.append(data['description'])

    if updates:
        params.append(symbol)
        query = f"UPDATE Stock SET {', '.join(updates)} WHERE symbol = ?"
        c.execute(query, params)
        conn.commit()

    conn.close()

def main():
    print("=" * 60)
    print("استخراج الأسامي العربية من TradingView")
    print("=" * 60)

    # الحصول على الأسهم المحتاجة تحديث
    stocks = get_stocks_needing_names()
    print(f"\nعدد الأسهم المحتاجة تحديث: {len(stocks)}")

    if not stocks:
        print("كل الأسهم ليها أسماء عربية!")
        return

    # إحصائيات
    updated = 0
    failed = 0

    for i, (symbol, exchange, urlSlug, currentName) in enumerate(stocks):
        print(f"\n[{i+1}/{len(stocks)}] {symbol} ({exchange})")

        # تحديد الرابط
        if urlSlug:
            tv_exchange = EXCHANGE_URLS.get(exchange, exchange)
            url = f"{BASE_URL}{urlSlug}-{tv_exchange}/"
        else:
            url = get_stock_url(symbol, exchange)
            if not url:
                print(f"  No URL for {symbol}")
                failed += 1
                continue

        print(f"  Fetching: {url}")

        # استخراج البيانات
        data = extract_arabic_data(url, symbol)

        if data and any(data.values()):
            update_stock_data(symbol, data)
            print(f"  ✓ Updated: {data.get('nameAr', 'N/A')}")
            updated += 1
        else:
            print(f"  ✗ No Arabic data found")
            failed += 1

        # تأخير لتجنب الحظر
        time.sleep(1)

    print("\n" + "=" * 60)
    print(f"النتائج:")
    print(f"  تم تحديث: {updated}")
    print(f"  فشل: {failed}")
    print("=" * 60)

if __name__ == '__main__':
    main()
