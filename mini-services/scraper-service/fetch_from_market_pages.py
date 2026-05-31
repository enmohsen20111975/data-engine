#!/usr/bin/env python3
"""
سكريبت استخراج الأسهم من TradingView مع كل البيانات
من صفحات القوائم: السعودية، مصر، الكويت، قطر، الإمارات، البحرين
"""

import sqlite3
import requests
from bs4 import BeautifulSoup
import time
import re
import json

DB_PATH = '../../db/data-factory.db'

# روابط قوائم الأسهم في TradingView
MARKET_URLS = {
    'KSA': 'https://ar.tradingview.com/markets/saudi-arabia/stocks-market-movers-all-stocks/',
    'EGX': 'https://ar.tradingview.com/markets/egypt-stocks/stocks-market-movers-all-stocks/',
    'UAE': 'https://ar.tradingview.com/markets/united-arab-emirates/stocks-market-movers-all-stocks/',
    'KSE': 'https://ar.tradingview.com/markets/kuwait/stocks-market-movers-all-stocks/',
    'QE': 'https://ar.tradingview.com/markets/qatar/stocks-market-movers-all-stocks/',
    'BAH': 'https://ar.tradingview.com/markets/bahrain/stocks-market-movers-all-stocks/',
}

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'ar-SA,ar;q=0.9,en;q=0.8',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
}

def extract_stocks_from_page(url, exchange):
    """استخراج قائمة الأسهم من صفحة TradingView"""
    print(f"\nFetching {exchange}: {url}")

    try:
        response = requests.get(url, headers=HEADERS, timeout=30)
        if response.status_code != 200:
            print(f"  Error: Status {response.status_code}")
            return []

        soup = BeautifulSoup(response.text, 'html.parser')

        stocks = []

        # البحث في الـ table rows
        rows = soup.find_all('tr')
        print(f"  Found {len(rows)} rows")

        for row in rows:
            # الرابط فيه الـ symbol و urlSlug
            link = row.find('a', href=True)
            if link:
                href = link.get('href', '')
                # الشكل: /symbols/2222-SAU/ أو /symbols/ACGC-EGX/
                match = re.search(r'/symbols/([^/]+)-([^/]+)/', href)
                if match:
                    symbol = match.group(1)
                    urlSlug = match.group(1).lower()  # TradingView urlSlug بيكون lowercase
                    tv_exchange = match.group(2)

                    # استخراج الاسم
                    name_cell = row.find('sup', class_='apply-common-tooltip')
                    if name_cell:
                        name = name_cell.get_text(strip=True)
                    else:
                        # البحث في td الثاني
                        tds = row.find_all('td')
                        if len(tds) > 1:
                            name = tds[1].get_text(strip=True)
                        else:
                            name = None

                    # استخراج السعر
                    price_cell = row.find('td', class_='right')
                    if price_cell:
                        price_text = price_cell.get_text(strip=True)
                        # تنظيف السعر
                        price = re.sub(r'[^\d.]', '', price_text)
                    else:
                        price = None

                    stocks.append({
                        'symbol': symbol,
                        'urlSlug': urlSlug,
                        'tvExchange': tv_exchange,
                        'nameAr': name,
                        'price': price
                    })

        # إذا مفيش rows، نبحث في روابط تانية
        if not stocks:
            links = soup.find_all('a', href=re.compile(r'/symbols/.+-'))
            for link in links:
                href = link.get('href', '')
                match = re.search(r'/symbols/([^/]+)-([^/]+)/', href)
                if match:
                    stocks.append({
                        'symbol': match.group(1),
                        'urlSlug': match.group(1).lower(),
                        'tvExchange': match.group(2),
                        'nameAr': link.get_text(strip=True),
                        'price': None
                    })

        print(f"  Extracted {len(stocks)} stocks")
        return stocks

    except Exception as e:
        print(f"  Error: {e}")
        return []

def update_database(stocks, exchange):
    """تحديث قاعدة البيانات"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    updated = 0
    inserted = 0

    for stock in stocks:
        symbol = stock['symbol']
        urlSlug = stock['urlSlug']
        nameAr = stock.get('nameAr')
        price = stock.get('price')

        # تحقق لو السهم موجود
        c.execute('SELECT id FROM Stock WHERE symbol = ?', (symbol,))
        existing = c.fetchone()

        if existing:
            # تحديث
            if nameAr:
                c.execute('''
                    UPDATE Stock
                    SET urlSlug = ?, nameAr = ?
                    WHERE symbol = ?
                ''', (urlSlug, nameAr, symbol))
                updated += 1
        else:
            # إدراج جديد
            c.execute('''
                INSERT INTO Stock (symbol, nameAr, urlSlug, exchange, country)
                VALUES (?, ?, ?, ?, ?)
            ''', (symbol, nameAr, urlSlug, exchange, get_country(exchange)))
            inserted += 1

    conn.commit()
    conn.close()

    print(f"  Updated: {updated}, Inserted: {inserted}")
    return updated, inserted

def get_country(exchange):
    """تحويل البورصة للدولة"""
    countries = {
        'KSA': 'السعودية',
        'EGX': 'مصر',
        'UAE': 'الإمارات',
        'KSE': 'الكويت',
        'QE': 'قطر',
        'BAH': 'البحرين'
    }
    return countries.get(exchange, 'غير محدد')

def main():
    print("=" * 60)
    print("استخراج الأسهم من TradingView")
    print("=" * 60)

    total_updated = 0
    total_inserted = 0

    for exchange, url in MARKET_URLS.items():
        stocks = extract_stocks_from_page(url, exchange)

        if stocks:
            updated, inserted = update_database(stocks, exchange)
            total_updated += updated
            total_inserted += inserted

        # تأخير لتجنب الحظر
        time.sleep(2)

    print("\n" + "=" * 60)
    print(f"النتائج الإجمالية:")
    print(f"  تم تحديث: {total_updated}")
    print(f"  تم إضافة: {total_inserted}")
    print("=" * 60)

    # عرض عينة
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    print("\n=== عينة من البيانات ===")
    c.execute('''
        SELECT symbol, nameAr, urlSlug, exchange, country
        FROM Stock
        WHERE nameAr IS NOT NULL
        LIMIT 10
    ''')
    for row in c.fetchall():
        print(f"{row[0]}: {row[1]} ({row[2]}) - {row[3]}/{row[4]}")
    conn.close()

if __name__ == '__main__':
    main()
