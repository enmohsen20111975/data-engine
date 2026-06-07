#!/usr/bin/env python3
"""
🔥 Test Scraper - سوق واحد فقط للتجربة
"""

import json
import sys
import os
import asyncio
import sqlite3
from datetime import datetime
from playwright.async_api import async_playwright

# Paths
DB_FILE = os.path.join(os.path.dirname(__file__), '..', 'data', 'data_engine.db')

# Test with one market
MARKET = {
    'name': 'السعودية',
    'url': 'https://ar.tradingview.com/markets/stocks-ksa/market-movers-all-stocks/'
}

TABS = ['نظرة عامة', 'الأداء', 'القيمة']

def log_message(message):
    timestamp = datetime.now().strftime('%H:%M:%S')
    print(f"[{timestamp}] {message}")

async def click_load_more(page, max_clicks=5):
    click_count = 0
    for _ in range(max_clicks):
        try:
            button = await page.wait_for_selector('button:has-text("تحميل المزيد")', timeout=3000)
            if button and await button.is_visible():
                await button.click()
                click_count += 1
                log_message(f"  📥 Load More #{click_count}")
                await asyncio.sleep(2)
            else:
                break
        except:
            break
    return click_count

async def scrape_main_table(page):
    stocks = await page.evaluate('''
        () => {
            const stocks = [];
            const rows = document.querySelectorAll('table tbody tr');
            
            rows.forEach(row => {
                const cells = row.querySelectorAll('td');
                if (cells.length >= 4) {
                    try {
                        const symbolFull = cells[0] ? cells[0].textContent.trim() : '';
                        const symbolMatch = symbolFull.match(/^(\\d+[A-Z]*)/);
                        const symbol = symbolMatch ? symbolMatch[1] : symbolFull.split(/[أ-ي]/)[0];
                        
                        const nameMatch = symbolFull.match(/[أ-ي].+/);
                        const name = nameMatch ? nameMatch[0].replace(/D$/, '').trim() : '';
                        
                        const priceText = cells[1] ? cells[1].textContent.trim() : '0';
                        const priceMatch = priceText.match(/[\\d.]+/);
                        const price = priceMatch ? parseFloat(priceMatch[0]) : 0;
                        
                        if (symbol && price > 0) {
                            stocks.push({
                                symbol: symbol,
                                name: name || symbolFull,
                                price: price,
                                tabs_data: {}
                            });
                        }
                    } catch (e) {}
                }
            });
            return stocks;
        }
    ''')
    return stocks

async def scrape_tab(page, tab_name):
    """Scrape tab and return dict of symbol -> data"""
    try:
        tab_selector = f'button:has-text("{tab_name}")'
        tab = await page.wait_for_selector(tab_selector, timeout=5000)
        if tab:
            await tab.click()
            await asyncio.sleep(2)
            await click_load_more(page, max_clicks=3)
            
            data = await page.evaluate('''
                () => {
                    const result = {};
                    const table = document.querySelector('table');
                    if (!table) return result;
                    
                    const rows = table.querySelectorAll('tr');
                    let headers = [];
                    
                    rows.forEach((row, i) => {
                        const cells = row.querySelectorAll('td, th');
                        const rowData = Array.from(cells).map(c => c.textContent.trim());
                        
                        if (rowData.length > 0) {
                            if (i === 0) {
                                headers = rowData;
                            } else {
                                const symbolFull = rowData[0] || '';
                                const symbolMatch = symbolFull.match(/^(\\d+[A-Z]*)/);
                                const symbol = symbolMatch ? symbolMatch[1] : symbolFull.split(/[أ-ي]/)[0];
                                
                                if (symbol) {
                                    result[symbol] = {
                                        headers: headers,
                                        values: rowData
                                    };
                                }
                            }
                        }
                    });
                    return result;
                }
            ''')
            return data
    except Exception as e:
        log_message(f"    ⚠️ Error: {str(e)[:50]}")
    return {}

async def main():
    log_message("=" * 50)
    log_message("🔥 Test Scraper - Saudi Market")
    log_message("=" * 50)
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={'width': 1920, 'height': 1080})
        
        # Go to market page
        log_message(f"🌍 Loading {MARKET['name']}...")
        await page.goto(MARKET['url'], timeout=60000, wait_until='networkidle')
        await asyncio.sleep(3)
        
        # Load all stocks
        await click_load_more(page)
        
        # Scrape main table
        stocks = await scrape_main_table(page)
        log_message(f"  📊 Found {len(stocks)} stocks")
        
        # Create lookup dict
        stocks_dict = {s['symbol']: s for s in stocks}
        
        # Scrape tabs
        for tab_name in TABS:
            log_message(f"  📑 Tab: {tab_name}")
            tab_data = await scrape_tab(page, tab_name)
            
            # Distribute to stocks
            matched = 0
            for symbol, stock in stocks_dict.items():
                if symbol in tab_data:
                    stock['tabs_data'][tab_name] = tab_data[symbol]
                    matched += 1
            
            log_message(f"    ✅ Matched: {matched}/{len(stocks)}")
        
        await browser.close()
    
    # Summary
    has_tabs = sum(1 for s in stocks if s.get('tabs_data'))
    log_message("=" * 50)
    log_message(f"✅ Done! {len(stocks)} stocks, {has_tabs} with tabs")
    
    # Show sample
    for s in stocks[:3]:
        print(f"\n📊 {s['symbol']}: {s['name']}")
        for tab, data in s.get('tabs_data', {}).items():
            print(f"  {tab}: {len(data.get('values', [])) if data else 0} values")

if __name__ == '__main__':
    asyncio.run(main())
