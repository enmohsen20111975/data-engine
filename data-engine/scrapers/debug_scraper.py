#!/usr/bin/env python3
"""
Debug - فحص الفرق بين الـ symbols
"""

import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={'width': 1920, 'height': 1080})
        
        url = 'https://ar.tradingview.com/markets/stocks-ksa/market-movers-all-stocks/'
        
        print("🔄 Loading page...")
        await page.goto(url, timeout=60000, wait_until='networkidle')
        await asyncio.sleep(3)
        
        # Click load more
        for i in range(3):
            try:
                button = await page.wait_for_selector('button:has-text("تحميل المزيد")', timeout=3000)
                if button:
                    await button.click()
                    await asyncio.sleep(2)
            except:
                break
        
        # Get main table symbols
        print("\n📊 Main Table Symbols:")
        main_symbols = await page.evaluate('''
            () => {
                const symbols = [];
                const rows = document.querySelectorAll('table tbody tr');
                rows.forEach((row, i) => {
                    if (i < 10) {
                        const cells = row.querySelectorAll('td');
                        if (cells[0]) {
                            symbols.push(cells[0].textContent.trim());
                        }
                    }
                });
                return symbols;
            }
        ''')
        for s in main_symbols:
            print(f"  {s}")
        
        # Click on "نظرة عامة" tab
        print("\n📊 Clicking 'نظرة عامة' tab...")
        try:
            tab = await page.wait_for_selector('button:has-text("نظرة عامة")', timeout=5000)
            await tab.click()
            await asyncio.sleep(2)
        except:
            print("  Could not find tab, trying alternative...")
            await page.evaluate('document.querySelectorAll("button")[10]?.click()')
            await asyncio.sleep(2)
        
        # Get tab table content
        print("\n📊 Tab Table Content (first 5 rows):")
        tab_content = await page.evaluate('''
            () => {
                const rows = [];
                const table = document.querySelector('table');
                if (table) {
                    const trs = table.querySelectorAll('tr');
                    trs.forEach((tr, i) => {
                        if (i < 5) {
                            const cells = tr.querySelectorAll('td, th');
                            const rowData = Array.from(cells).map(c => c.textContent.trim().substring(0, 50));
                            rows.push(rowData);
                        }
                    });
                }
                return rows;
            }
        ''')
        for row in tab_content:
            print(f"  {row}")
        
        await browser.close()

if __name__ == '__main__':
    asyncio.run(main())
