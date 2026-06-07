#!/usr/bin/env python3
"""
🔥 TradingView Full Scraper - السحب الشامل
===========================================
يجمع كل البيانات من TradingView العربي:

1. الجدول الرئيسي (بعد تحميل المزيد 3-4 مرات)
2. تبويبات إضافية:
   - تحليلات فنية
   - التدفقات النقدية
   - بَيَان المُوَازَنَة
   - الأداء
   - القيمة
   - أرباح
   - الربحية
   - بيانات الدخل
   - نظرة عامة

الأسواق المدعومة:
- السعودية 🇸🇦
- مصر 🇪🇬
- الكويت 🇰🇼
- قطر 🇶🇦
"""

import json
import sys
import os
import asyncio
from datetime import datetime
from playwright.async_api import async_playwright

# Paths
STATUS_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'data', 'full_scraper_status.json')
OUTPUT_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'data-engine', 'data', 'stocks_full_data.json')
DB_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'data-engine', 'data', 'data_engine.db')

# Market URLs
MARKETS = {
    'السعودية': 'https://ar.tradingview.com/markets/stocks-ksa/market-movers-all-stocks/',
    'مصر': 'https://ar.tradingview.com/markets/stocks-egypt/market-movers-all-stocks/',
    'الكويت': 'https://ar.tradingview.com/markets/stocks-kuwait/market-movers-all-stocks/',
    'قطر': 'https://ar.tradingview.com/markets/stocks-qatar/market-movers-all-stocks/'
}

# Tabs to scrape (Arabic names exactly as they appear)
TABS_TO_SCRAPE = [
    'نظرة عامة',
    'الأداء',
    'القيمة',
    'أرباح',
    'الربحية',
    'بيانات الدخل',
    'بَيَانُ المُوَازَنَة',
    'التدفقات النقدية',
    'تحليلات فنية'
]

def update_status(status_update):
    """Update status file"""
    try:
        with open(STATUS_FILE, 'r') as f:
            status = json.load(f)
    except:
        status = {
            'running': False,
            'startTime': '',
            'currentMarket': '',
            'currentTab': '',
            'progress': {},
            'stocks_count': 0,
            'logs': []
        }
    
    status.update(status_update)
    
    if len(status.get('logs', [])) > 200:
        status['logs'] = status['logs'][-200:]
    
    with open(STATUS_FILE, 'w') as f:
        json.dump(status, f, indent=2, ensure_ascii=False)

def log_message(message):
    """Print and log message"""
    timestamp = datetime.now().strftime('%H:%M:%S')
    print(f"[{timestamp}] {message}")
    
    try:
        with open(STATUS_FILE, 'r') as f:
            status = json.load(f)
    except:
        status = {'logs': []}
    
    status['logs'].append(f"[{timestamp}] {message}")
    if len(status['logs']) > 200:
        status['logs'] = status['logs'][-200:]
    
    with open(STATUS_FILE, 'w') as f:
        json.dump(status, f, indent=2, ensure_ascii=False)

async def click_load_more(page, max_clicks=5):
    """Click 'Load More' button multiple times"""
    click_count = 0
    
    for _ in range(max_clicks):
        try:
            # Look for load more button
            button = await page.wait_for_selector('button:has-text("تحميل المزيد")', timeout=3000)
            if button and await button.is_visible():
                await button.click()
                click_count += 1
                log_message(f"  📥 Click 'Load More' #{click_count}")
                await asyncio.sleep(2)
            else:
                break
        except:
            break
    
    return click_count

async def scrape_main_table(page):
    """Scrape the main stocks table"""
    stocks = await page.evaluate('''
        () => {
            const stocks = [];
            const rows = document.querySelectorAll('table tbody tr');
            
            rows.forEach(row => {
                const cells = row.querySelectorAll('td');
                if (cells.length >= 4) {
                    try {
                        // Cell 0: Symbol
                        const symbolFull = cells[0] ? cells[0].textContent.trim() : '';
                        const symbolMatch = symbolFull.match(/^(\\d+[A-Z]*)/);
                        const symbol = symbolMatch ? symbolMatch[1] : symbolFull.split(/[أ-ي]/)[0];
                        
                        // Arabic name
                        const nameMatch = symbolFull.match(/[أ-ي].+/);
                        const name = nameMatch ? nameMatch[0].replace(/D$/, '').trim() : '';
                        
                        // Cell 1: Price
                        const priceText = cells[1] ? cells[1].textContent.trim() : '0';
                        const priceMatch = priceText.match(/[\\d.]+/);
                        const price = priceMatch ? parseFloat(priceMatch[0]) : 0;
                        
                        // Cell 2: Change %
                        const changeText = cells[2] ? cells[2].textContent.trim() : '0';
                        const changeMatch = changeText.match(/[−+]?[\\d.]+/);
                        let change = changeMatch ? parseFloat(changeMatch[0].replace('−', '-')) : 0;
                        
                        // Cell 3: Volume
                        const volumeText = cells[3] ? cells[3].textContent.trim() : 'N/A';
                        
                        // Cell 5: Market Cap
                        const marketCapText = cells[5] ? cells[5].textContent.trim() : 'N/A';
                        
                        // Cell 10: Sector
                        const sectorText = cells[10] ? cells[10].textContent.trim() : '';
                        
                        // Cell 11: Analyst Rating
                        const ratingText = cells[11] ? cells[11].textContent.trim() : '';
                        
                        if (symbol && price > 0) {
                            stocks.push({
                                symbol: symbol,
                                name: name || symbolFull,
                                price: price,
                                change_percent: change,
                                volume: volumeText,
                                market_cap: marketCapText,
                                sector: sectorText,
                                analyst_rating: ratingText
                            });
                        }
                    } catch (e) {
                        // Skip invalid rows
                    }
                }
            });
            
            return stocks;
        }
    ''')
    
    return stocks

async def scrape_tab_data(page, tab_name):
    """Scrape data from a specific tab"""
    try:
        # Click on the tab
        tab_selector = f'button:has-text("{tab_name}"), [role="tab"]:has-text("{tab_name}")'
        tab = await page.wait_for_selector(tab_selector, timeout=5000)
        if tab:
            await tab.click()
            await asyncio.sleep(1)
            
            # Scrape table data
            data = await page.evaluate('''
                () => {
                    const tables = document.querySelectorAll('table');
                    const result = [];
                    
                    tables.forEach(table => {
                        const rows = table.querySelectorAll('tr');
                        rows.forEach(row => {
                            const cells = row.querySelectorAll('td, th');
                            const rowData = [];
                            cells.forEach(cell => {
                                rowData.push(cell.textContent.trim());
                            });
                            if (rowData.length > 0) {
                                result.push(rowData);
                            }
                        });
                    });
                    
                    return result;
                }
            ''')
            
            return {tab_name: data}
    except Exception as e:
        log_message(f"  ⚠️ Tab '{tab_name}' error: {str(e)[:50]}")
        return {tab_name: []}

async def scrape_market(page, market_name, url):
    """Scrape all data for a single market"""
    log_message(f"🌍 Starting {market_name}...")
    
    try:
        await page.goto(url, timeout=90000, wait_until='networkidle')
        await asyncio.sleep(3)
        
        # Wait for table
        await page.wait_for_selector('table', timeout=30000)
        
        # Click load more
        clicks = await click_load_more(page)
        log_message(f"  📥 Load more clicks: {clicks}")
        
        # Scrape main table
        stocks = await scrape_main_table(page)
        log_message(f"  📊 Main table: {len(stocks)} stocks")
        
        # Add market to each stock
        for s in stocks:
            s['market'] = market_name
            s['tabs_data'] = {}
        
        # Scrape tabs (only first 5 stocks for tabs to save time)
        sample_stocks = stocks[:5] if len(stocks) > 5 else stocks
        
        for tab_name in TABS_TO_SCRAPE:
            log_message(f"  📑 Scraping tab: {tab_name}")
            tab_data = await scrape_tab_data(page, tab_name)
            
            for stock in sample_stocks:
                stock['tabs_data'][tab_name] = tab_data.get(tab_name, [])
        
        update_status({
            'currentMarket': market_name,
            'progress': {market_name: {'stocks': len(stocks), 'status': 'completed'}}
        })
        
        log_message(f"  ✅ {market_name}: {len(stocks)} stocks")
        return stocks
        
    except Exception as e:
        log_message(f"  ❌ {market_name} error: {str(e)[:100]}")
        update_status({
            'progress': {market_name: {'stocks': 0, 'status': 'error'}}
        })
        return []

async def main():
    """Main scraping function"""
    os.makedirs(os.path.dirname(STATUS_FILE), exist_ok=True)
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    
    # Initialize status
    update_status({
        'running': True,
        'startTime': datetime.now().isoformat(),
        'currentMarket': '',
        'currentTab': '',
        'progress': {},
        'stocks_count': 0,
        'logs': []
    })
    
    log_message("=" * 60)
    log_message("🔥 TradingView Full Scraper Started")
    log_message(f"📊 Markets: {list(MARKETS.keys())}")
    log_message(f"📑 Tabs: {TABS_TO_SCRAPE}")
    log_message("=" * 60)
    
    all_stocks = []
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport={'width': 1920, 'height': 1080}
        )
        page = await context.new_page()
        
        for market_name, url in MARKETS.items():
            stocks = await scrape_market(page, market_name, url)
            all_stocks.extend(stocks)
            await asyncio.sleep(3)
        
        await browser.close()
    
    # Save results
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(all_stocks, f, indent=2, ensure_ascii=False)
    
    log_message("=" * 60)
    log_message(f"🎉 Scraping Complete!")
    log_message(f"📊 Total stocks: {len(all_stocks)}")
    log_message(f"💾 Saved to: {OUTPUT_FILE}")
    log_message("=" * 60)
    
    update_status({
        'running': False,
        'stocks_count': len(all_stocks)
    })

if __name__ == '__main__':
    try:
        asyncio.run(main())
    except Exception as e:
        log_message(f"❌ Fatal error: {str(e)}")
        update_status({'running': False})
        sys.exit(1)
