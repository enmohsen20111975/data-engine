#!/usr/bin/env python3
"""
TradingView Complete Stock Scraper
Supports: Egypt (EGX), Saudi Arabia (TADAWUL), Kuwait, Qatar
Saves ALL prices with timestamp for historical tracking
"""

import json
import sys
import os
import asyncio
import sqlite3
from datetime import datetime
from playwright.async_api import async_playwright
from pathlib import Path

# Paths
DATA_DIR = Path(__file__).parent.parent / 'data'
STATUS_FILE = Path(__file__).parent.parent.parent / 'data' / 'scraper_status.json'
DB_PATH = DATA_DIR / 'data_engine.db'

# Market configurations - Using Arabic TradingView for better results
MARKETS = {
    'السعودية': {
        'url': 'https://ar.tradingview.com/markets/stocks-ksa/market-movers-all-stocks/',
        'expected': 400
    },
    'مصر': {
        'url': 'https://ar.tradingview.com/markets/stocks-egypt/market-movers-all-stocks/',
        'expected': 300
    },
    'الكويت': {
        'url': 'https://ar.tradingview.com/markets/stocks-kuwait/market-movers-all-stocks/',
        'expected': 150
    },
    'قطر': {
        'url': 'https://ar.tradingview.com/markets/stocks-qatar/market-movers-all-stocks/',
        'expected': 60
    }
}

def get_timestamp():
    """Get current timestamp"""
    return datetime.now().strftime('%Y-%m-%d %H:%M:%S')

def update_status(status_update):
    """Update the status file"""
    try:
        with open(STATUS_FILE, 'r') as f:
            status = json.load(f)
    except:
        status = {
            'running': True,
            'startTime': datetime.now().isoformat(),
            'currentMarket': '',
            'progress': {},
            'logs': []
        }
    
    status.update(status_update)
    
    if len(status.get('logs', [])) > 100:
        status['logs'] = status['logs'][-100:]
    
    with open(STATUS_FILE, 'w') as f:
        json.dump(status, f, indent=2, ensure_ascii=False)

def log_message(message):
    """Print and log a message"""
    print(f"[LOG] {message}")
    update_status({'logs': [f"[{datetime.now().strftime('%H:%M:%S')}] {message}"]})

def print_progress(market, count, status_text):
    """Print progress update"""
    print(json.dumps({
        'type': 'progress',
        'market': market,
        'count': count,
        'status': status_text
    }, ensure_ascii=False))
    
    try:
        with open(STATUS_FILE, 'r') as f:
            current = json.load(f)
        progress = current.get('progress', {})
    except:
        progress = {}
    
    progress[market] = {'stocks': count, 'status': status_text}
    update_status({
        'currentMarket': market,
        'progress': progress
    })

def save_to_database(stocks, timestamp):
    """Save stock prices to database with timestamp"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create stock_prices table if not exists
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS stock_prices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT,
            symbol TEXT,
            name TEXT,
            price REAL,
            change_percent REAL,
            volume TEXT,
            market_cap TEXT,
            market TEXT,
            UNIQUE(timestamp, symbol)
        )
    ''')
    
    # Create stocks table if not exists (for current prices)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS stocks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            symbol TEXT UNIQUE,
            name TEXT,
            price REAL,
            change_percent REAL,
            volume TEXT,
            market_cap TEXT,
            market TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Insert stock prices with timestamp (for historical tracking)
    for stock in stocks:
        # Insert into stock_prices (historical)
        cursor.execute('''
            INSERT OR REPLACE INTO stock_prices 
            (timestamp, symbol, name, price, change_percent, volume, market_cap, market)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            timestamp,
            stock['symbol'],
            stock.get('name', ''),
            stock.get('price', 0),
            stock.get('change_percent', 0),
            stock.get('volume', ''),
            stock.get('market_cap', ''),
            stock.get('market', '')
        ))
        
        # Update stocks table (current prices)
        cursor.execute('''
            INSERT OR REPLACE INTO stocks 
            (symbol, name, price, change_percent, volume, market_cap, market)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            stock['symbol'],
            stock.get('name', ''),
            stock.get('price', 0),
            stock.get('change_percent', 0),
            stock.get('volume', ''),
            stock.get('market_cap', ''),
            stock.get('market', '')
        ))
    
    conn.commit()
    conn.close()
    log_message(f"💾 Saved {len(stocks)} stock prices to database with timestamp {timestamp}")

async def scrape_market(page, market_name, config):
    """Scrape stocks for a single market"""
    log_message(f"Starting {market_name}...")
    stocks = []
    
    try:
        await page.goto(config['url'], timeout=90000, wait_until='networkidle')
        await asyncio.sleep(3)
        
        # Wait for table
        try:
            await page.wait_for_selector('table', timeout=30000)
        except:
            log_message(f"⚠ No table found, trying alternative selector...")
            await page.wait_for_selector('[class*="table"]', timeout=15000)
        
        # Extract data using JavaScript - Updated for Arabic TradingView
        stocks_data = await page.evaluate('''
            () => {
                const stocks = [];
                const rows = document.querySelectorAll('table tbody tr');
                
                rows.forEach(row => {
                    const cells = row.querySelectorAll('td');
                    if (cells.length >= 4) {
                        try {
                            // Cell 0: Symbol (contains ticker + name like "1010الرياضD")
                            const symbolFull = cells[0] ? cells[0].textContent.trim() : '';
                            // Extract just the symbol (numbers + letters before Arabic text)
                            const symbolMatch = symbolFull.match(/^(\d+[A-Z]*)/);
                            const symbol = symbolMatch ? symbolMatch[1] : symbolFull.split(/[أ-ي]/)[0];
                            
                            // Extract name (Arabic text after symbol)
                            const nameMatch = symbolFull.match(/[أ-ي].+/);
                            const name = nameMatch ? nameMatch[0].replace(/D$/, '').trim() : '';
                            
                            // Cell 1: Price (like "19.98 SAR")
                            const priceText = cells[1] ? cells[1].textContent.trim() : '0';
                            const priceMatch = priceText.match(/[\d.]+/);
                            const price = priceMatch ? parseFloat(priceMatch[0]) : 0;
                            
                            // Cell 2: Change % (like "−0.15%")
                            const changeText = cells[2] ? cells[2].textContent.trim() : '0';
                            const changeMatch = changeText.match(/[−+]?[\d.]+/);
                            let change = changeMatch ? parseFloat(changeMatch[0].replace('−', '-')) : 0;
                            
                            // Cell 3: Volume (like "748.44 K")
                            const volumeText = cells[3] ? cells[3].textContent.trim() : 'N/A';
                            
                            // Cell 5: Market Cap (like "80.16 B SAR")
                            const marketCapText = cells[5] ? cells[5].textContent.trim() : 'N/A';
                            
                            if (symbol && price > 0) {
                                stocks.push({
                                    symbol: symbol,
                                    name: name || symbolFull,
                                    price: price,
                                    change_percent: change,
                                    volume: volumeText,
                                    market_cap: marketCapText
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
        
        if stocks_data:
            stocks = stocks_data
            for s in stocks:
                s['market'] = market_name
            
            print_progress(market_name, len(stocks), 'completed')
            log_message(f"✓ {market_name}: {len(stocks)} stocks scraped")
        else:
            log_message(f"⚠ {market_name}: No data extracted")
            print_progress(market_name, 0, 'no_data')
        
    except Exception as e:
        log_message(f"✗ {market_name}: Error - {str(e)[:80]}")
        print_progress(market_name, 0, 'error')
    
    return stocks

async def main():
    """Main scraping function"""
    # Create directories if not exist
    os.makedirs(os.path.dirname(STATUS_FILE), exist_ok=True)
    os.makedirs(DATA_DIR, exist_ok=True)
    
    # Get timestamp for this batch
    timestamp = get_timestamp()
    
    # Initialize status
    update_status({
        'running': True,
        'startTime': datetime.now().isoformat(),
        'currentMarket': '',
        'progress': {},
        'logs': []
    })
    
    all_stocks = []
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport={'width': 1920, 'height': 1080}
        )
        page = await context.new_page()
        
        for market_name, config in MARKETS.items():
            stocks = await scrape_market(page, market_name, config)
            all_stocks.extend(stocks)
            await asyncio.sleep(3)  # Be nice to the server
        
        await browser.close()
    
    # Save to database with timestamp
    if all_stocks:
        save_to_database(all_stocks, timestamp)
    
    # Save to JSON
    output_file = DATA_DIR / 'stocks_data.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(all_stocks, f, indent=2, ensure_ascii=False)
    
    log_message(f"Scraping Complete! Total: {len(all_stocks)} stocks")
    update_status({
        'running': False,
        'logs': [f"[{datetime.now().strftime('%H:%M:%S')}] Completed! Total: {len(all_stocks)} stocks"]
    })

if __name__ == '__main__':
    try:
        asyncio.run(main())
    except Exception as e:
        update_status({
            'running': False,
            'logs': [f"[ERROR] {str(e)}"]
        })
        print(f"ERROR: {e}")
        sys.exit(1)
