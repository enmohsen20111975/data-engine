#!/usr/bin/env python3
"""
🔥 TradingView Full Scraper - كل الأسواق والتبويبات
"""

import json
import sqlite3
import asyncio
from datetime import datetime
from playwright.async_api import async_playwright

DB_FILE = '../data/data_engine.db'

MARKETS = {
    'السعودية': 'https://ar.tradingview.com/markets/stocks-ksa/market-movers-all-stocks/',
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
            btn = await page.wait_for_selector('button:has-text("تحميل المزيد")', timeout=2000)
            if btn:
                await btn.click()
                await asyncio.sleep(1)
        except:
            break

async def scrape_market(page, market, url):
    log(f"🌍 {market}")

    try:
        await page.goto(url, timeout=90000)
        await asyncio.sleep(2)
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
                        const change = parseFloat(cells[2]?.textContent?.match(/[−+]?[\\d.]+/)?.[0]?.replace('−','-') || 0);
                        if (sym && price > 0) {
                            stocks.push({
                                symbol: sym, name, price,
                                change_percent: change,
                                volume: cells[3]?.textContent?.trim() || '',
                                market_cap: cells[5]?.textContent?.trim() || '',
                                sector: cells[10]?.textContent?.trim() || '',
                                tabs_data: {}
                            });
                        }
                    }
                });
                return stocks;
            }
        ''')
        log(f"  📊 {len(stocks)} stocks")

        lookup = {s['symbol']: s for s in stocks}

        # Scrape each tab
        for tab in TABS:
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
                            if (i === 0) return;
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

                log(f"  📑 {tab}: {matched}/{len(stocks)}")
            except Exception as e:
                log(f"  ⚠️ {tab}: {str(e)[:40]}")

        return stocks

    except Exception as e:
        log(f"  ❌ Error: {str(e)[:60]}")
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
    log("🔥 TradingView Full Scraper")
    log(f"📊 Markets: {len(MARKETS)}, Tabs: {len(TABS)}")
    log("=" * 50)

    all_stocks = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={'width': 1920, 'height': 1080})

        for market, url in MARKETS.items():
            stocks = await scrape_market(page, market, url)
            if stocks:
                save_to_db(stocks, market)
                has_tabs = sum(1 for s in stocks if s.get('tabs_data'))
                log(f"  💾 Saved: {len(stocks)} stocks, {has_tabs} with tabs")
            all_stocks.extend(stocks)
            await asyncio.sleep(1)

        await browser.close()

    # Save JSON
    with open('../data/stocks_full_data.json', 'w', encoding='utf-8') as f:
        json.dump(all_stocks, f, indent=2, ensure_ascii=False)

    # Summary
    has_tabs = sum(1 for s in all_stocks if s.get('tabs_data'))
    log("=" * 50)
    log(f"🎉 Done! {len(all_stocks)} stocks, {has_tabs} with tabs")
    log("=" * 50)

if __name__ == '__main__':
    asyncio.run(main())
