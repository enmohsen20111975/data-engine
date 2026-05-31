#!/usr/bin/env python3
"""
مستخرج البيانات التاريخية - Historical Data Scraper
من Yahoo Finance
"""
import subprocess
import json
import sqlite3
import base64
import time
import uuid
import re
from datetime import datetime

DB_PATH = '/home/z/my-project/db/data-factory.db'

# Yahoo Finance symbols mapping
YAHOO_SYMBOLS = {
    'KSA': {'suffix': '.SR', 'exchange': 'TADAWUL'},
    'EGX': {'suffix': '.CA', 'exchange': 'EGX'},
    'KSE': {'suffix': '.KW', 'exchange': 'KSE'},
    'QE': {'suffix': '.QA', 'exchange': 'QE'},
    'UAE': {'suffix': '.AE', 'exchange': 'ADX'},  # أو .DFM
    'BAH': {'suffix': '.BH', 'exchange': 'BSE'},
}

def run_js(js_code):
    """تنفيذ JavaScript"""
    encoded = base64.b64encode(js_code.encode()).decode()
    result = subprocess.run(
        f"agent-browser eval -b '{encoded}'",
        shell=True, capture_output=True, text=True, timeout=120
    )
    output = result.stdout.strip()
    if output.startswith('"') and output.endswith('"'):
        output = output[1:-1]
    output = output.replace('\\"', '"')
    return output

def get_yahoo_symbol(symbol, exchange_code):
    """تحويل رمز السهم لرمز Yahoo Finance"""
    if exchange_code not in YAHOO_SYMBOLS:
        return None
    
    suffix = YAHOO_SYMBOLS[exchange_code]['suffix']
    return f"{symbol}{suffix}"

def scrape_historical_data(symbol, exchange_code, days=365):
    """استخراج البيانات التاريخية من Yahoo Finance"""
    yahoo_symbol = get_yahoo_symbol(symbol, exchange_code)
    if not yahoo_symbol:
        return []
    
    url = f"https://finance.yahoo.com/quote/{yahoo_symbol}/history/"
    
    print(f"   استخراج {symbol} من Yahoo Finance...")
    
    # فتح الصفحة
    subprocess.run("agent-browser close", shell=True, capture_output=True)
    subprocess.run(f'agent-browser open "{url}" --timeout 30', shell=True, capture_output=True)
    time.sleep(3)
    
    # التحقق من أن الصفحة فتحت صح
    title = run_js("document.title")
    if 'lookup' in title.lower() or 'error' in title.lower():
        print(f"   ⚠️ السهم {symbol} مش موجود على Yahoo Finance")
        return []
    
    # استخراج البيانات
    js = r'''
(function(){
  const table = document.querySelector('table');
  if(!table) return JSON.stringify({error: 'no table'});
  
  const rows = table.querySelectorAll('tr');
  const data = [];
  
  // headers
  const headers = [];
  const ths = rows[0]?.querySelectorAll('th') || [];
  for(let th of ths){
    headers.push(th.innerText.trim());
  }
  
  // data rows
  for(let i=1; i<rows.length; i++){
    const cells = rows[i].querySelectorAll('td');
    if(cells.length >= 5){
      const row = {
        date: cells[0]?.innerText?.trim() || '',
        open: cells[1]?.innerText?.trim() || '',
        high: cells[2]?.innerText?.trim() || '',
        low: cells[3]?.innerText?.trim() || '',
        close: cells[4]?.innerText?.trim() || '',
        adjClose: cells[5]?.innerText?.trim() || '',
        volume: cells[6]?.innerText?.trim() || ''
      };
      if(row.date && row.close) data.push(row);
    }
  }
  
  return JSON.stringify({headers, data});
})()
'''
    
    result = run_js(js)
    try:
        parsed = json.loads(result)
        return parsed.get('data', [])
    except:
        return []

def parse_date(date_str):
    """تحويل التاريخ من Yahoo Finance"""
    try:
        # May 28, 2026 -> 2026-05-28
        dt = datetime.strptime(date_str, '%b %d, %Y')
        return dt.strftime('%Y-%m-%d')
    except:
        return None

def parse_number(val):
    """تحويل الأرقام"""
    if not val or val == '-':
        return None
    try:
        return float(val.replace(',', ''))
    except:
        return None

def save_historical_data(stock_id, historical_data):
    """حفظ البيانات التاريخية"""
    if not historical_data:
        return 0
    
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    now = datetime.now().isoformat()
    saved = 0
    
    for row in historical_data:
        date = parse_date(row.get('date', ''))
        if not date:
            continue
        
        try:
            # تحقق لو موجود
            c.execute('SELECT id FROM HistoricalData WHERE stockId=? AND date=?', (stock_id, date))
            if c.fetchone():
                continue
            
            hid = f'hist_{uuid.uuid4().hex[:12]}'
            c.execute('''
                INSERT INTO HistoricalData (id, stockId, date, open, high, low, close, adjustedClose, volume, createdAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                hid, stock_id, date,
                parse_number(row.get('open')),
                parse_number(row.get('high')),
                parse_number(row.get('low')),
                parse_number(row.get('close')),
                parse_number(row.get('adjClose')),
                parse_number(row.get('volume')),
                now
            ))
            conn.commit()
            saved += 1
        except Exception as e:
            print(f"      خطأ: {e}")
    
    conn.close()
    return saved

def main():
    print("\n" + "="*50)
    print("📊 مستخرج البيانات التاريخية")
    print("="*50)
    
    # الحصول على قائمة الأسهم
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    c.execute('''
        SELECT s.id, s.symbol, s.exchange 
        FROM Stock s 
        WHERE s.exchange IN ('KSA', 'EGX', 'KSE', 'QE', 'UAE', 'BAH')
        ORDER BY s.exchange, s.symbol
    ''')
    stocks = c.fetchall()
    conn.close()
    
    print(f"\nعدد الأسهم: {len(stocks)}")
    
    total_saved = 0
    for i, (stock_id, symbol, exchange) in enumerate(stocks[:10]):  # نجرب 10 أسهم الأول
        print(f"\n[{i+1}/10] {symbol} ({exchange})")
        
        data = scrape_historical_data(symbol, exchange)
        if data:
            saved = save_historical_data(stock_id, data)
            print(f"   ✓ تم حفظ {saved} يوم")
            total_saved += saved
        
        time.sleep(2)  # انتظار بين الطلبات
    
    print(f"\n{'='*50}")
    print(f"✅ اكتمل! تم حفظ {total_saved} سجل تاريخي")
    print(f"{'='*50}\n")
    
    subprocess.run("agent-browser close", shell=True, capture_output=True)

if __name__ == '__main__':
    main()
