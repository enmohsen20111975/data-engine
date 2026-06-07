#!/usr/bin/env python3
"""
🔥 TradingView Scraper - باقي الأسواق (معدل)
"""

import json
import sqlite3
import asyncio
from datetime import datetime
from playwright.async_api import async_playwright

DB_FILE = '../data/data_engine.db'

MARKETS = {
    'مصر': 'https://ar.tradingview.com/markets/stocks-egypt/market-movers-all-stocks/',
    'الكويت': 'https://ar.tradingview.com/markets/stocks-kuwait/market-movers-all-stocks/',
    'قطر': 'https://ar.tradingview.com/markets/stocks-qatar/market-movers-all-stocks/'
}

TABS = ['الأداء', 'القيمة', 'أرباح', 'الربحية', 'بيانات الدخل', 'بَيَانُ المُوَازَنَة', 'التدفقات النقدية', 'تحليلات فنية']

def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")

async def click_load_more(page):
    for _ in range(5):
        try:
            btn = await page.query_selector('button:has-text("تحميل المزيد")')
            if btn and await btn.is_visible():
                await btn.click()
                await asyncio.sleep(1.5)
            else:
                break
        except:
            break

async def scrape_market(page, market, url):
    log(f"🌍 {market}")

    try:
        # Use 'load' instead of 'networkidle' for faster loading
        await page.goto(url, timeout=60000, wait_until='load')
        await asyncio.sleep(3)  # Wait for JS to execute
        
        # Click load more
        await click_load_more(page)

        # Debug: count rows
        row_count = await page.evaluate('document.querySelectorAll("table tbody tr").length')
        log(f"  📊 Found {row_count} rows in table")

        # Scrape main table
        stocks = await page.evaluate('''
            () => {
                const stocks = [];
                const rows = document.querySelectorAll('table tbody tr');
                rows.forEach(row => {
                    try {
                        const cells = row.querySelectorAll('td');
                        if (cells.length >= 4) {
                            const fullText = cells[0]?.textContent?.trim() || '';
                            // Extract symbol (numbers + optional letters at start)
                            const symMatch = fullText.match(/^(\\d+[A-Z]*)/);
                            const sym = symMatch ? symMatch[1] : fullText.split(/[أ-ي]/)[0];
                            
                            // Extract Arabic name
                            const nameMatch = fullText.match(/[أ-ي].+/);
                            const name = nameMatch ? nameMatch[0].replace(/D$/, '').trim() : '';
                            
                            // Price
                            const priceText = cells[1]?.textContent?.trim() || '0';
                            const price = parseFloat(priceText.match(/[\\d.]+/)?.[0] || 0);
                            
                            if (sym && price > 0) {
                                stocks.push({
                                    symbol: sym,
                                    name: name || fullText,
                                    price: price,
                                    change_percent: parseFloat(cells[2]?.textContent?.match(/[−+]?[\\d.]+/)?.[0]?.replace('−','-') || 0),
                                    volume: cells[3]?.textContent?.trim() || '',
                                    market_cap: cells[5]?.textContent?.trim() || '',
                                    sector: cells[10]?.textContent?.trim() || '',
                                    tabs_data: {}
                                });
                            }
                        }
                    } catch(e) {}
                });
                return stocks;
            }
        ''')
        log(f"  📊 Extracted {len(stocks)} stocks")

        if not stocks:
            log(f"  ⚠️ No stocks extracted, skipping...")
            return []

        lookup = {s['symbol']: s for s in stocks}

        # Scrape each tab
        for tab in TABS:
            try:
                # Try to find and click tab
                tab_btn = await page.query_selector(f'button:has-text("{tab}")')
                if not tab_btn:
                    # Try alternative selector
                    tab_btn = await page.query_selector(f'[role="tab"]:has-text("{tab}")')
                
                if tab_btn:
                    await tab_btn.click()
                    await asyncio.sleep(1.5)
                    await click_load_more(page)

                    # Scrape tab data
                    data = await page.evaluate('''
                        () => {
                            const result = {};
                            const rows = document.querySelectorAll('table tr');
                            let headers = [];
                            
                            rows.forEach((row, i) => {
                                const cells = row.querySelectorAll('td, th');
                                const vals = Array.from(cells).map(c => c.textContent?.trim() || '');
                                
                                if (i === 0) {
                                    headers = vals;
                                } else {
                                    const symMatch = (vals[0] || '').match(/^(\\d+[A-Z]*)/);
                                    const sym = symMatch ? symMatch[1] : vals[0]?.split(/[أ-ي]/)[0];
                                    if (sym) {
                                        result[sym] = { headers, values: vals };
                                    }
                                }
                            });
                            return result;
                        }
                    ''')

                    matched = sum(1 for s in lookup if s in data)
                    for sym in lookup:
                        if sym in data:
                            lookup[sym]['tabs_data'][tab] = data[sym]

                    log(f"  📑 {tab}: {matched}/{len(stocks)}")
                else:
                    log(f"  ⚠️ Tab not found: {tab}")
            except Exception as e:
                log(f"  ⚠️ {tab}: {str(e)[:40]}")

        return stocks

    except Exception as e:
        log(f"  ❌ Error: {str(e)[:80]}")
        return []

def save_to_db(stocks, market):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    for s in stocks:
        cursor.execute('''
            INSERT OR REPLACE INTO stocks
            (symbol, name, price, change_percent, volume, market_cap, sector, market, tabs_data)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            s.get('symbol', ''), s.get('name', ''), s.get('price', 0),
            s.get('change_percent', 0), s.get('volume', ''), s.get('market_cap', ''),
            s.get('sector', ''), market,
            json.dumps(s.get('tabs_data', {}), ensure_ascii=False)
        ))

    conn.commit()
    conn.close()

async def main():
    log("=" * 50)
    log("🔥 Scraping remaining markets...")
    log("=" * 50)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={'width': 1920, 'height': 1080})

        for market, url in MARKETS.items():
            stocks = await scrape_market(page, market, url)
            if stocks:
                save_to_db(stocks, market)
                has_tabs = sum(1 for s in stocks if s.get('tabs_data'))
                log(f"  💾 Saved: {len(stocks)} stocks, {has_tabs} with tabs")
            await asyncio.sleep(2)

        await browser.close()

    log("=" * 50)
    log("🎉 Done!")
    log("=" * 50)

if __name__ == '__main__':
    asyncio.run(main())
