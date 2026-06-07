#!/usr/bin/env python3
"""
Debug - فحص التبويبات المختلفة
"""

import asyncio
from playwright.async_api import async_playwright

TABS = ['الأداء', 'القيمة', 'أرباح', 'الربحية']

async def check_tab(page, tab_name):
    print(f"\n📑 Tab: {tab_name}")
    try:
        # Find and click tab
        tab = await page.wait_for_selector(f'button:has-text("{tab_name}")', timeout=5000)
        await tab.click()
        await asyncio.sleep(2)
        
        # Get table headers and first rows
        content = await page.evaluate('''
            () => {
                const table = document.querySelector('table');
                if (!table) return 'No table';
                
                const rows = [];
                const trs = table.querySelectorAll('tr');
                for (let i = 0; i < Math.min(5, trs.length); i++) {
                    const cells = trs[i].querySelectorAll('td, th');
                    rows.push(Array.from(cells).map(c => c.textContent.trim().substring(0, 40)));
                }
                return rows;
            }
        ''')
        
        if isinstance(content, list):
            print("  Headers:", content[0] if content else 'None')
            for row in content[1:]:
                print(f"  Row: {row[:4]}...")
        else:
            print(f"  Result: {content}")
            
    except Exception as e:
        print(f"  Error: {str(e)[:80]}")

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={'width': 1920, 'height': 1080})
        
        url = 'https://ar.tradingview.com/markets/stocks-ksa/market-movers-all-stocks/'
        
        print("🔄 Loading page...")
        await page.goto(url, timeout=60000, wait_until='networkidle')
        await asyncio.sleep(3)
        
        # Check each tab
        for tab in TABS:
            await check_tab(page, tab)
        
        await browser.close()

if __name__ == '__main__':
    asyncio.run(main())
