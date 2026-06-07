#!/usr/bin/env python3
"""
🔥 TradingView Full Scraper - النسخة النهائية
===============================================
يسحب كل البيانات من التبويبات ويوزعها على كل سهم

لكل سوق:
1. يسحب الجدول الرئيسي (الأسهم الأساسية)
2. يسحب كل التبويبات (جداول بكل الأسهم)
3. يطابق كل صف بالسهم المناسب
4. يحفظ في SQLite Database
"""

import json
import sys
import os
import asyncio
import sqlite3
import re
from datetime import datetime
from playwright.async_api import async_playwright

# Paths
STATUS_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'data', 'full_scraper_status.json')
OUTPUT_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'data-engine', 'data', 'stocks_full_data.json')
DB_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'data-engine', 'data', 'data_engine.db')

# Markets
MARKETS = {
    'السعودية': 'https://ar.tradingview.com/markets/stocks-ksa/market-movers-all-stocks/',
    'مصر': 'https://ar.tradingview.com/markets/stocks-egypt/market-movers-all-stocks/',
    'الكويت': 'https://ar.tradingview.com/markets/stocks-kuwait/market-movers-all-stocks/',
    'قطر': 'https://ar.tradingview.com/markets/stocks-qatar/market-movers-all-stocks/'
}

# Tabs (نظرة عامة = نفس الجدول الرئيسي، فمش محتاجينها)
TABS = ['الأداء', 'القيمة', 'أرباح', 'الربحية', 'بيانات الدخل', 'بَيَانُ المُوَازَنَة', 'التدفقات النقدية', 'تحليلات فنية']

def extract_symbol(text):
    """استخراج رمز السهم من النص (مثل 1010الرياضD -> 1010)"""
    if not text:
        return ''
    # استخراج الأرقام والحروف في البداية
    match = re.match(r'^(\d+[A-Z]*)', text.strip())
    if match:
        return match.group(1)
    return text.split()[0] if text else ''

def update_status(status_update):
    try:
        with open(STATUS_FILE, 'r') as f:
            status = json.load(f)
    except:
        status = {'running': False, 'logs': []}
    status.update(status_update)
    status['logs'] = status.get('logs', [])[-100:]
    with open(STATUS_FILE, 'w') as f:
        json.dump(status, f, indent=2, ensure_ascii=False)

def log_message(msg):
    ts = datetime.now().strftime('%H:%M:%S')
    print(f"[{ts}] {msg}")

async def click_load_more(page, max_clicks=10):
    """Click load more until all data loaded"""
    clicks = 0
    for _ in range(max_clicks):
        try:
            btn = await page.wait_for_selector('button:has-text("تحميل المزيد")', timeout=3000)
            if btn and await btn.is_visible():
                await btn.click()
                clicks += 1
                await asyncio.sleep(1.5)
        except:
            break
    return clicks

async def scrape_main_table(page):
    """Scrape main stocks table"""
    return await page.evaluate('''
        () => {
            const stocks = [];
            document.querySelectorAll('table tbody tr').forEach(row => {
                const cells = row.querySelectorAll('td');
                if (cells.length >= 4) {
                    const symbolFull = cells[0]?.textContent?.trim() || '';
                    const symbolMatch = symbolFull.match(/^(\\d+[A-Z]*)/);
                    const symbol = symbolMatch ? symbolMatch[1] : symbolFull.split(/[أ-ي]/)[0];
                    
                    const nameMatch = symbolFull.match(/[أ-ي].+/);
                    const name = nameMatch ? nameMatch[0].replace(/D$/, '').trim() : '';
                    
                    const priceText = cells[1]?.textContent?.trim() || '0';
                    const price = parseFloat(priceText.match(/[\\d.]+/)?.[0] || 0);
                    
                    const changeText = cells[2]?.textContent?.trim() || '0';
                    const changeMatch = changeText.match(/[−+]?[\\d.]+/);
                    const change = changeMatch ? parseFloat(changeMatch[0].replace('−', '-')) : 0;
                    
                    if (symbol && price > 0) {
                        stocks.push({
                            symbol, name, price,
                            change_percent: change,
                            volume: cells[3]?.textContent?.trim() || '',
                            market_cap: cells[5]?.textContent?.trim() || '',
                            sector: cells[10]?.textContent?.trim() || '',
                            analyst_rating: cells[11]?.textContent?.trim() || '',
                            tabs_data: {}
                        });
                    }
                }
            });
            return stocks;
        }
    ''')

async def scrape_tab(page, tab_name):
    """Scrape a tab and return dict of symbol -> row data"""
    try:
        btn = await page.wait_for_selector(f'button:has-text("{tab_name}")', timeout=5000)
        await btn.click()
        await asyncio.sleep(1.5)
        await click_load_more(page, 5)
        
        return await page.evaluate('''
            () => {
                const result = {};
                const table = document.querySelector('table');
                if (!table) return result;
                
                const rows = table.querySelectorAll('tr');
                let headers = [];
                
                rows.forEach((row, i) => {
                    const cells = row.querySelectorAll('td, th');
                    const values = Array.from(cells).map(c => c.textContent?.trim() || '');
                    
                    if (i === 0) {
                        headers = values;
                    } else if (values.length > 0) {
                        const symbolMatch = (values[0] || '').match(/^(\\d+[A-Z]*)/);
                        const symbol = symbolMatch ? symbolMatch[1] : values[0].split(/[أ-ي]/)[0];
                        
                        if (symbol) {
                            result[symbol] = { headers, values };
                        }
                    }
                });
                return result;
            }
        ''')
    except Exception as e:
        log_message(f"    ⚠️ Tab {tab_name}: {str(e)[:50]}")
        return {}

def save_to_db(stocks, market):
    """Save to SQLite database"""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    # Main stocks table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS stocks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            symbol TEXT UNIQUE,
            name TEXT,
            price REAL,
            change_percent REAL,
            volume TEXT,
            market_cap TEXT,
            sector TEXT,
            analyst_rating TEXT,
            market TEXT,
            tabs_data TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    for s in stocks:
        cursor.execute('''
            INSERT OR REPLACE INTO stocks
            (symbol, name, price, change_percent, volume, market_cap, sector, analyst_rating, market, tabs_data)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            s.get('symbol', ''), s.get('name', ''), s.get('price', 0),
            s.get('change_percent', 0), s.get('volume', ''), s.get('market_cap', ''),
            s.get('sector', ''), s.get('analyst_rating', ''), market,
            json.dumps(s.get('tabs_data', {}), ensure_ascii=False)
        ))
    
    conn.commit()
    conn.close()

async def scrape_market(page, market, url):
    """Scrape all data for one market"""
    log_message(f"🌍 {market}")
    
    try:
        await page.goto(url, timeout=90000, wait_until='networkidle')
        await asyncio.sleep(2)
        await page.wait_for_selector('table', timeout=30000)
        
        clicks = await click_load_more(page)
        log_message(f"  📥 Load more: {clicks}")
        
        stocks = await scrape_main_table(page)
        log_message(f"  📊 Main: {len(stocks)} stocks")
        
        # Symbol lookup
        lookup = {s['symbol']: s for s in stocks}
        
        # Scrape each tab
        for tab in TABS:
            log_message(f"  📑 {tab}")
            data = await scrape_tab(page, tab)
            
            matched = 0
            for sym, stock in lookup.items():
                if sym in data:
                    stock['tabs_data'][tab] = data[sym]
                    matched += 1
            log_message(f"    ✅ {matched}/{len(stocks)}")
        
        # Save
        save_to_db(stocks, market)
        log_message(f"  💾 Saved to DB")
        
        # Count with tabs
        has_tabs = sum(1 for s in stocks if s.get('tabs_data'))
        log_message(f"  ✅ Done: {len(stocks)} stocks, {has_tabs} with tabs")
        
        return stocks
        
    except Exception as e:
        log_message(f"  ❌ Error: {str(e)[:80]}")
        return []

async def main():
    os.makedirs(os.path.dirname(STATUS_FILE), exist_ok=True)
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    
    update_status({'running': True, 'startTime': datetime.now().isoformat()})
    
    log_message("=" * 50)
    log_message("🔥 TradingView Full Scraper")
    log_message(f"📊 Markets: {len(MARKETS)}")
    log_message(f"📑 Tabs: {len(TABS)}")
    log_message("=" * 50)
    
    all_stocks = []
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={'width': 1920, 'height': 1080})
        
        for market, url in MARKETS.items():
            stocks = await scrape_market(page, market, url)
            all_stocks.extend(stocks)
            await asyncio.sleep(2)
        
        await browser.close()
    
    # Save JSON
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(all_stocks, f, indent=2, ensure_ascii=False)
    
    # Summary
    has_tabs = sum(1 for s in all_stocks if s.get('tabs_data'))
    log_message("=" * 50)
    log_message(f"🎉 Done! {len(all_stocks)} stocks, {has_tabs} with tabs")
    log_message(f"💾 {OUTPUT_FILE}")
    log_message("=" * 50)
    
    update_status({'running': False, 'stocks_count': len(all_stocks)})

if __name__ == '__main__':
    try:
        asyncio.run(main())
    except Exception as e:
        log_message(f"❌ Fatal: {e}")
        update_status({'running': False})
