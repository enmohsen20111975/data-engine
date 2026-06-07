#!/usr/bin/env python3
"""
Test - سوق السعودية بس
"""

import json
import sqlite3
import asyncio
from playwright.async_api import async_playwright

DB_FILE = '../data/data_engine.db'
TABS = ['الأداء', 'القيمة', 'أرباح', 'الربحية']

async def click_load_more(page):
    for _ in range(5):
        try:
            btn = await page.wait_for_selector('button:has-text("تحميل المزيد")', timeout=2000)
            if btn:
                await btn.click()
                await asyncio.sleep(1)
        except:
            break

async def main():
    print("🚀 Starting Saudi market test...")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={'width': 1920, 'height': 1080})

        # Load page
        await page.goto('https://ar.tradingview.com/markets/stocks-ksa/market-movers-all-stocks/', timeout=60000)
        await asyncio.sleep(2)

        # Load all
        await click_load_more(page)

        # Get main table
        stocks = await page.evaluate('''
            () => {
                const stocks = [];
                document.querySelectorAll('table tbody tr').forEach(row => {
                    const cells = row.querySelectorAll('td');
                    if (cells.length >= 4) {
                        const sym = cells[0]?.textContent?.match(/^(\\d+[A-Z]*)/)?.[1] || '';
                        const name = cells[0]?.textContent?.match(/[أ-ي].+/)?.[0]?.replace(/D$/,'').trim() || '';
                        const price = parseFloat(cells[1]?.textContent?.match(/[\\d.]+/)?.[0] || 0);
                        if (sym && price > 0) {
                            stocks.push({symbol: sym, name, price, tabs_data: {}});
                        }
                    }
                });
                return stocks;
            }
        ''')
        print(f"📊 Found {len(stocks)} stocks")

        # Symbol lookup
        lookup = {s['symbol']: s for s in stocks}

        # Scrape tabs
        for tab in TABS:
            print(f"📑 {tab}...")
            try:
                btn = await page.wait_for_selector(f'button:has-text("{tab}")', timeout=5000)
                await btn.click()
                await asyncio.sleep(1)
                await click_load_more(page)

                data = await page.evaluate('''
                    () => {
                        const result = {};
                        document.querySelectorAll('table tr').forEach((row, i) => {
                            const cells = row.querySelectorAll('td, th');
                            const vals = Array.from(cells).map(c => c.textContent?.trim() || '');
                            if (i === 0) return; // skip header
                            const sym = vals[0]?.match(/^(\\d+[A-Z]*)/)?.[1] || vals[0]?.split(/[أ-ي]/)[0];
                            if (sym) result[sym] = vals;
                        });
                        return result;
                    }
                ''')

                matched = sum(1 for s in lookup if s in data)
                for sym in lookup:
                    if sym in data:
                        lookup[sym]['tabs_data'][tab] = data[sym]
                print(f"  ✅ {matched} matched")
            except Exception as e:
                print(f"  ⚠️ Error: {str(e)[:50]}")

        await browser.close()

    # Save to DB
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    saved = 0
    for s in stocks:
        if s.get('tabs_data'):
            cursor.execute('''
                UPDATE stocks SET tabs_data = ? WHERE symbol = ?
            ''', (json.dumps(s['tabs_data'], ensure_ascii=False), s['symbol']))
            if cursor.rowcount > 0:
                saved += 1

    conn.commit()
    conn.close()

    # Summary
    has_tabs = sum(1 for s in stocks if s.get('tabs_data'))
    print(f"\n✅ Done! {len(stocks)} stocks, {has_tabs} with tabs, {saved} saved to DB")

    # Show sample
    for s in stocks[:3]:
        print(f"\n{s['symbol']}: {s['name']}")
        for t, d in s.get('tabs_data', {}).items():
            print(f"  {t}: {len(d)} values")

if __name__ == '__main__':
    asyncio.run(main())
