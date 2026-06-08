#!/usr/bin/env python3
"""
News Fetcher for Stock Markets
جالب الأخبار للأسواق المالية

Supports:
- Saudi Arabia (Tadawul)
- Egypt (EGX)
- Kuwait (KSE)
- Qatar (QSE)
"""

import os
import sys
import json
import sqlite3
import subprocess
from datetime import datetime
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

# Database path
DB_PATH = Path(__file__).parent.parent / 'data' / 'data_engine.db'

# Markets configuration
MARKETS = {
    'saudi': {
        'name': 'السعودية',
        'exchange': 'Tadawul',
        'search_queries': [
            'Saudi stock market Tadawul news',
            'TASI index Saudi Arabia today',
            'Saudi Arabia economy stock market'
        ]
    },
    'egypt': {
        'name': 'مصر',
        'exchange': 'EGX',
        'search_queries': [
            'Egypt stock market EGX news',
            'EGX30 index Egypt today',
            'Egypt economy stock market'
        ]
    },
    'kuwait': {
        'name': 'الكويت',
        'exchange': 'KSE',
        'search_queries': [
            'Kuwait stock market KSE news',
            'Kuwait bourse today',
            'Kuwait economy stock market'
        ]
    },
    'qatar': {
        'name': 'قطر',
        'exchange': 'QSE',
        'search_queries': [
            'Qatar stock market QSE news',
            'Qatar exchange today',
            'Qatar economy stock market'
        ]
    }
}


def create_news_table():
    """Create news table in database"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS market_news (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            url TEXT UNIQUE,
            snippet TEXT,
            source TEXT,
            market TEXT,
            search_query TEXT,
            published_date TEXT,
            fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    conn.commit()
    conn.close()
    print("✓ Created news table")


def search_news(query: str, num_results: int = 10, recency_days: int = 7) -> list:
    """
    Search for news using z-ai web search
    
    Args:
        query: Search query
        num_results: Number of results to return
        recency_days: Filter results from last N days
    
    Returns:
        List of news items
    """
    try:
        # Use z-ai CLI to search
        cmd = [
            'z-ai', 'function',
            '-n', 'web_search',
            '-a', json.dumps({
                'query': query,
                'num': num_results,
                'recency_days': recency_days
            })
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        
        if result.returncode == 0:
            # Parse the output
            output = result.stdout
            # Find the JSON in the output
            lines = output.strip().split('\n')
            for line in lines:
                if line.startswith('[') or line.startswith('{'):
                    try:
                        data = json.loads(line)
                        return data if isinstance(data, list) else []
                    except json.JSONDecodeError:
                        continue
            
            # Try to parse entire output as JSON
            try:
                data = json.loads(output)
                return data if isinstance(data, list) else []
            except json.JSONDecodeError:
                pass
        
        return []
        
    except Exception as e:
        print(f"Error searching news: {e}")
        return []


def save_news_to_db(news_items: list, market: str, query: str):
    """Save news items to database"""
    if not news_items:
        return 0
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    saved_count = 0
    for item in news_items:
        try:
            cursor.execute('''
                INSERT OR IGNORE INTO market_news 
                (title, url, snippet, source, market, search_query, published_date)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                item.get('name', ''),
                item.get('url', ''),
                item.get('snippet', ''),
                item.get('host_name', ''),
                market,
                query,
                item.get('date', '')
            ))
            
            if cursor.rowcount > 0:
                saved_count += 1
                
        except Exception as e:
            print(f"Error saving news item: {e}")
    
    conn.commit()
    conn.close()
    
    return saved_count


def fetch_all_news(recency_days: int = 7):
    """
    Fetch news for all markets
    
    Args:
        recency_days: Get news from last N days
    """
    print("=" * 60)
    print("Starting news fetcher...")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    
    # Create table if not exists
    create_news_table()
    
    total_saved = 0
    
    for market_key, market_info in MARKETS.items():
        print(f"\n--- Fetching news for {market_info['name']} ({market_info['exchange']}) ---")
        
        for query in market_info['search_queries']:
            print(f"  Searching: {query}")
            
            news_items = search_news(query, num_results=10, recency_days=recency_days)
            
            if news_items:
                saved = save_news_to_db(news_items, market_key, query)
                total_saved += saved
                print(f"    Found {len(news_items)} items, saved {saved} new")
            else:
                print(f"    No results found")
    
    print("\n" + "=" * 60)
    print(f"Total new news items saved: {total_saved}")
    print("=" * 60)
    
    return total_saved


def get_news_stats():
    """Get statistics about news in database"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Total count
    cursor.execute('SELECT COUNT(*) FROM market_news')
    total = cursor.fetchone()[0]
    
    # Count by market
    cursor.execute('''
        SELECT market, COUNT(*) as count 
        FROM market_news 
        GROUP BY market 
        ORDER BY count DESC
    ''')
    by_market = cursor.fetchall()
    
    # Count by source (top 10)
    cursor.execute('''
        SELECT source, COUNT(*) as count 
        FROM market_news 
        GROUP BY source 
        ORDER BY count DESC 
        LIMIT 10
    ''')
    by_source = cursor.fetchall()
    
    conn.close()
    
    return {
        'total': total,
        'by_market': dict(by_market),
        'top_sources': dict(by_source)
    }


def display_recent_news(market: str = None, limit: int = 10):
    """Display recent news from database"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    if market:
        cursor.execute('''
            SELECT title, url, snippet, source, fetched_at 
            FROM market_news 
            WHERE market = ?
            ORDER BY fetched_at DESC 
            LIMIT ?
        ''', (market, limit))
    else:
        cursor.execute('''
            SELECT title, url, snippet, source, market, fetched_at 
            FROM market_news 
            ORDER BY fetched_at DESC 
            LIMIT ?
        ''', (limit,))
    
    rows = cursor.fetchall()
    conn.close()
    
    print(f"\n=== Recent News ({limit} items) ===")
    for i, row in enumerate(rows, 1):
        if market:
            title, url, snippet, source, fetched_at = row
            print(f"\n{i}. {title}")
            print(f"   Source: {source}")
            print(f"   {snippet[:100]}...")
            print(f"   URL: {url}")
        else:
            title, url, snippet, source, mkt, fetched_at = row
            print(f"\n{i}. [{mkt}] {title}")
            print(f"   Source: {source}")
            print(f"   {snippet[:100]}...")
            print(f"   URL: {url}")


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Fetch stock market news')
    parser.add_argument('--fetch', action='store_true', help='Fetch news for all markets')
    parser.add_argument('--stats', action='store_true', help='Show news statistics')
    parser.add_argument('--recent', type=int, help='Show recent N news items')
    parser.add_argument('--market', type=str, help='Filter by market (saudi, egypt, kuwait, qatar)')
    parser.add_argument('--days', type=int, default=7, help='Recency in days (default: 7)')
    
    args = parser.parse_args()
    
    if args.fetch:
        fetch_all_news(recency_days=args.days)
    elif args.stats:
        stats = get_news_stats()
        print(f"\nTotal news: {stats['total']}")
        print(f"\nBy market: {stats['by_market']}")
        print(f"\nTop sources: {stats['top_sources']}")
    elif args.recent:
        display_recent_news(market=args.market, limit=args.recent)
    else:
        # Default: fetch news
        fetch_all_news(recency_days=args.days)
