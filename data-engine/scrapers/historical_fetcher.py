#!/usr/bin/env python3
"""
Yahoo Finance Historical Data Fetcher
=====================================
سحب البيانات التاريخية من Yahoo Finance

الأصول المدعومة:
- 🇪🇬 الأسهم المصرية (EGX)
- 🇸🇦 الأسهم السعودية (TADAWUL)
- 🇰🇼 الأسهم الكويتية (KSE)
- 🇶🇦 الأسهم القطرية (QE)
- 🥇 الذهب والمعادن
- 💱 العملات العربية
- ₿ العملات الرقمية
- 📈 المؤشرات العالمية

البيانات:
- Open, High, Low, Close (OHLC)
- Volume
- فترات: يومي، أسبوعي، شهري
"""

import json
import sys
import os
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path

# Paths
DATA_DIR = Path(__file__).parent.parent / 'data'
STATUS_FILE = Path(__file__).parent.parent.parent / 'data' / 'historical_status.json'
DB_PATH = DATA_DIR / 'data_engine.db'

# Status management
def update_status(status_update):
    """Update the status file"""
    status_file = STATUS_FILE
    try:
        with open(status_file, 'r') as f:
            status = json.load(f)
    except:
        status = {
            'running': False,
            'progress': {'current': 0, 'total': 0, 'symbol': ''},
            'logs': [],
            'results': [],
            'lastUpdate': None
        }
    
    status.update(status_update)
    
    if len(status.get('logs', [])) > 100:
        status['logs'] = status['logs'][-100:]
    
    with open(status_file, 'w') as f:
        json.dump(status, f, indent=2, ensure_ascii=False)

def log_message(message):
    """Print and log a message"""
    print(f"[LOG] {message}")
    update_status({
        'logs': [f"[{datetime.now().strftime('%H:%M:%S')}] {message}"]
    })

# Yahoo Finance symbols - جميع الأصول المدعومة
YAHOO_SYMBOLS = {
    '🇪🇬 الأسهم المصرية (EGX)': {
        'symbols': [
            # البنوك
            ('COMI.CA', 'Commercial International Bank'),
            ('HRHO.CA', 'Housing and Development Bank'),
            ('CIEB.CA', 'Cairo International Bank'),
            ('SAUD.CA', 'Saudi Egyptian Investment'),
            ('ETRS.CA', 'ETRS'),
            ('FAIT.CA', 'FAIT'),
            ('BTFH.CA', 'BTFH'),
            # الاتصالات
            ('ETEL.CA', 'Telecom Egypt'),
            ('ORWE.CA', 'Orascom Investment'),
            # العقارات
            ('HELI.CA', 'Heliopolis Housing'),
            ('OCDI.CA', 'OCDI'),
            ('EGCH.CA', 'EGCH'),
            # الصناعات
            ('SWDY.CA', 'El Sewedy Electric'),
            ('EAST.CA', 'Eastern Company'),
            ('SKPC.CA', 'SKPC'),
            ('ALCN.CA', 'Alcon'),
            # الطاقة
            ('AMOC.CA', 'Alexandria Mineral Oils'),
            ('SIPC.CA', 'SIPC'),
            # أخرى
            ('EMFD.CA', 'EMFD'),
            ('PHDC.CA', 'PHDC'),
            ('MTIE.CA', 'MTIE'),
        ]
    },
    '🇸🇦 الأسهم السعودية (TADAWUL)': {
        'symbols': [
            # البنوك الكبرى
            ('1120.SR', 'Al Rajhi Bank'),
            ('1060.SR', 'Saudi National Bank'),
            ('1180.SR', 'Alinma Bank'),
            ('1210.SR', 'Al Riyadh Bank'),
            ('1020.SR', 'Bank Albilad'),
            ('1050.SR', 'Bank AlJazira'),
            ('1150.SR', 'Alinma Bank'),
            ('2380.SR', 'Riyad Bank'),
            ('7203.SR', 'Saudi British Bank'),
            # البترول والبتروكيماويات
            ('2222.SR', 'Saudi Aramco'),
            ('2010.SR', 'Saudi Basic Industries (SABIC)'),
            ('2020.SR', 'SABIC'),
            ('2270.SR', 'Yanbu National Petrochemical'),
            ('2310.SR', 'Sahara Intl Petrochem'),
            ('2280.SR', 'Savola Group'),
            # الاتصالات
            ('7010.SR', 'Almarai'),
            ('7020.SR', 'Etihad Etisalat'),
            ('7030.SR', 'Zain Saudi'),
            # التجزئة
            ('4210.SR', 'Jarir Marketing'),
            # الرعاية الصحية
            ('4002.SR', 'Dr Sulaiman Al Habib'),
            ('4190.SR', 'Saudi German Hospitals'),
            # التأمين
            ('8240.SR', 'Al Rajhi Takaful'),
            ('8070.SR', 'Alinma Tokio Marine'),
            # الصناعات
            ('1830.SR', 'Red Sea International'),
            ('1832.SR', 'Al Ayuni Investment'),
            ('3004.SR', 'Saudi Ceramic'),
            # أخرى
            ('4001.SR', 'Saudi Telecom'),
        ]
    },
    '🇰🇼 الأسهم الكويتية (KSE)': {
        'symbols': [
            # البنوك
            ('NBK.KW', 'National Bank of Kuwait'),
            ('KFH.KW', 'Kuwait Finance House'),
            ('BOUBYAN.KW', 'Boubyan Bank'),
            ('KIB.KW', 'Kuwait Int Bank'),
            ('CBK.KW', 'Commercial Bank'),
            # الاتصالات
            ('ZAIN.KW', 'Zain Group'),
            ('OOREDOO.KW', 'Ooredoo Kuwait'),
        ]
    },
    '🇶🇦 الأسهم القطرية (QE)': {
        'symbols': [
            # البنوك
            ('QNBK.QA', 'Qatar National Bank'),
            ('QIBK.QA', 'Qatar Islamic Bank'),
            # التأمين
            ('QISI.QA', 'Qatar Islamic Insurance'),
            ('QATI.QA', 'Qatar Insurance'),
            # البتروكيماويات
            ('QGRI.QA', 'Qatar Gas'),
            ('MPHC.QA', 'Mesaieed Petrochemical'),
            # أخرى
            ('QFLS.QA', 'Qatar Flour'),
        ]
    },
    '🥇 الذهب والمعادن': {
        'symbols': [
            ('GC=F', 'Gold Futures (ذهب)'),
            ('SI=F', 'Silver Futures (فضة)'),
            ('CL=F', 'Crude Oil (نفط خام)'),
            ('HG=F', 'Copper Futures (نحاس)'),
            ('PL=F', 'Platinum (بلاتين)'),
        ]
    },
    '💱 العملات العربية': {
        'symbols': [
            ('EGPUSD=X', 'EGP/USD (جنيه مصري)'),
            ('SARUSD=X', 'SAR/USD (ريال سعودي)'),
            ('KWDUSD=X', 'KWD/USD (دينار كويتي)'),
            ('QARUSD=X', 'QAR/USD (ريال قطري)'),
            ('AEDUSD=X', 'AED/USD (درهم إماراتي)'),
            ('BHDUSD=X', 'BHD/USD (دينار بحريني)'),
            ('OMRUSD=X', 'OMR/USD (ريال عماني)'),
            ('JODUSD=X', 'JOD/USD (دينار أردني)'),
        ]
    },
    '₿ العملات الرقمية': {
        'symbols': [
            ('BTC-USD', 'Bitcoin'),
            ('ETH-USD', 'Ethereum'),
            ('BNB-USD', 'Binance Coin'),
            ('XRP-USD', 'Ripple'),
            ('SOL-USD', 'Solana'),
            ('ADA-USD', 'Cardano'),
            ('DOGE-USD', 'Dogecoin'),
            ('DOT-USD', 'Polkadot'),
            ('LINK-USD', 'Chainlink'),
        ]
    },
    '📈 مؤشرات عالمية': {
        'symbols': [
            ('^GSPC', 'S&P 500'),
            ('^DJI', 'Dow Jones'),
            ('^IXIC', 'NASDAQ'),
            ('^N225', 'Nikkei 225'),
            ('^FTSE', 'FTSE 100'),
        ]
    }
}

def fetch_historical_data(symbol, period='1mo', interval='1d'):
    """Fetch historical data for a single symbol"""
    try:
        import yfinance as yf
        
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period=period, interval=interval)
        
        if hist.empty:
            return None
        
        # Reset index to get date as column
        hist = hist.reset_index()
        
        # Convert to list of dicts
        data = []
        for _, row in hist.iterrows():
            date_val = row['Date']
            if hasattr(date_val, 'strftime'):
                date_str = date_val.strftime('%Y-%m-%d')
            else:
                date_str = str(date_val)[:10]
            
            data.append({
                'date': date_str,
                'open': float(row['Open']) if row['Open'] else 0,
                'high': float(row['High']) if row['High'] else 0,
                'low': float(row['Low']) if row['Low'] else 0,
                'close': float(row['Close']) if row['Close'] else 0,
                'volume': int(row['Volume']) if row['Volume'] else 0
            })
        
        return data
        
    except ImportError:
        log_message("ERROR: yfinance not installed. Run: pip install yfinance")
        return None
    except Exception as e:
        log_message(f"Error fetching {symbol}: {str(e)[:80]}")
        return None

def save_to_database(symbol, name, category, data):
    """Save historical data to database"""
    if not data:
        return 0
    
    if not DB_PATH.exists():
        DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS historical_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            symbol TEXT,
            name TEXT,
            category TEXT,
            date TEXT,
            open REAL,
            high REAL,
            low REAL,
            close REAL,
            volume INTEGER,
            last_fetch TEXT,
            UNIQUE(symbol, date)
        )
    ''')
    
    # Insert data
    inserted = 0
    for row in data:
        try:
            cursor.execute('''
                INSERT OR REPLACE INTO historical_data 
                (symbol, name, category, date, open, high, low, close, volume, last_fetch)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                symbol, name, category, row['date'],
                row['open'], row['high'], row['low'], row['close'], row['volume'],
                datetime.now().isoformat()
            ))
            inserted += 1
        except:
            pass
    
    conn.commit()
    conn.close()
    return inserted

def fetch_all_historical(period='1mo'):
    """Fetch historical data for all symbols"""
    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(os.path.dirname(STATUS_FILE), exist_ok=True)
    
    # Initialize status
    update_status({
        'running': True,
        'progress': {'current': 0, 'total': 0, 'symbol': ''},
        'logs': [],
        'results': [],
        'lastUpdate': datetime.now().isoformat()
    })
    
    log_message("🚀 بدء سحب البيانات التاريخية من Yahoo Finance...")
    
    # Calculate total
    total_symbols = sum(len(c['symbols']) for c in YAHOO_SYMBOLS.values())
    current = 0
    
    all_results = []
    
    for category, category_data in YAHOO_SYMBOLS.items():
        log_message(f"📊 معالجة {category}...")
        
        for symbol, name in category_data['symbols']:
            current += 1
            update_status({
                'progress': {
                    'current': current,
                    'total': total_symbols,
                    'symbol': symbol
                }
            })
            
            # Fetch data
            data = fetch_historical_data(symbol, period=period)
            
            if data and len(data) > 0:
                # Save to database
                inserted = save_to_database(symbol, name, category, data)
                
                latest_close = data[-1]['close'] if data else 0
                earliest_date = data[0]['date'] if data else ''
                latest_date = data[-1]['date'] if data else ''
                
                result = {
                    'symbol': symbol,
                    'name': name,
                    'category': category,
                    'days': len(data),
                    'earliest_date': earliest_date,
                    'latest_date': latest_date,
                    'latest_close': latest_close,
                    'status': 'success'
                }
                
                all_results.append(result)
                log_message(f"✅ {symbol}: {len(data)} يوم | آخر إغلاق: ${latest_close:.4f}")
            else:
                all_results.append({
                    'symbol': symbol,
                    'name': name,
                    'category': category,
                    'days': 0,
                    'status': 'no_data'
                })
                log_message(f"❌ {symbol}: لا توجد بيانات")
    
    # Update final status
    success_count = len([r for r in all_results if r['status'] == 'success'])
    total_days = sum(r.get('days', 0) for r in all_results)
    
    update_status({
        'running': False,
        'results': all_results,
        'logs': [f"[{datetime.now().strftime('%H:%M:%S')}] ✅ اكتمل! {success_count}/{total_symbols} رمز | {total_days} يوم من البيانات"]
    })
    
    # Save results
    output_file = DATA_DIR / 'historical_latest.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(all_results, f, indent=2, ensure_ascii=False)
    
    log_message(f"🎉 اكتمل سحب البيانات التاريخية!")
    return all_results

def get_summary():
    """Get summary of historical data"""
    try:
        if not DB_PATH.exists():
            return {'total_records': 0, 'symbols': 0, 'categories': []}
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('SELECT COUNT(*) FROM historical_data')
        total_records = cursor.fetchone()[0]
        
        cursor.execute('SELECT COUNT(DISTINCT symbol) FROM historical_data')
        symbols = cursor.fetchone()[0]
        
        cursor.execute('''
            SELECT category, COUNT(DISTINCT symbol) as count 
            FROM historical_data 
            GROUP BY category
        ''')
        categories = [{'name': row[0], 'symbols': row[1]} for row in cursor.fetchall()]
        
        conn.close()
        
        return {
            'total_records': total_records,
            'symbols': symbols,
            'categories': categories
        }
    except Exception as e:
        return {'total_records': 0, 'symbols': 0, 'categories': [], 'error': str(e)}

if __name__ == '__main__':
    try:
        period = sys.argv[1] if len(sys.argv) > 1 else '1mo'
        fetch_all_historical(period=period)
    except Exception as e:
        update_status({
            'running': False,
            'logs': [f"[ERROR] {str(e)}"]
        })
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
