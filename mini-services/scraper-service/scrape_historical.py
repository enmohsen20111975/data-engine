#!/usr/bin/env python3
"""
مستخرج البيانات التاريخية الشامل - All Historical Data Scraper
من Yahoo Finance
"""
import subprocess
import json
import sqlite3
import base64
import time
import uuid
from datetime import datetime
import sys

DB_PATH = '/home/z/my-project/db/data-factory.db'

# Yahoo Finance suffixes
YAHOO_SUFFIXES = {
    'KSA': '.SR',
    'EGX': '.CA',
    'KSE': '.KW',
    'QE': '.QA',
    'UAE': '.AE',
    'BAH': '.BH',
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

def get_yahoo_url(symbol, exchange):
    """الحصول على رابط Yahoo Finance"""
    if exchange not in YAHOO_SUFFIXES:
        return None
    suffix = YAHOO_SUFFIXES[exchange]
    return f"https://finance.yahoo.com/quote/{symbol}{suffix}/history/"

def extract_historical_data():
    """استخراج البيانات التاريخية"""
    js = r'''
(function(){
  const tables = document.querySelectorAll('table');
  let tableData = [];
  
  for(let t=0; t<tables.length; t++){
    const table = tables[t];
    const rows = table.querySelectorAll('tr');
    
    const headerRow = rows[0];
    const headers = [];
    const ths = headerRow?.querySelectorAll('th') || [];
    for(let th of ths){
      headers.push(th.innerText?.trim() || '');
    }
    
    if(headers[0]?.includes('Date') || headers[0]?.includes('date')){
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
          if(row.date && row.close){
            tableData.push(row);
          }
        }
      }
      break;
    }
  }
  
  return JSON.stringify(tableData);
})()
'''
    result = run_js(js)
    try:
        return json.loads(result)
    except:
        return []

def parse_date(date_str):
    """تحويل التاريخ"""
    try:
        dt = datetime.strptime(date_str, '%b %d, %Y')
        return dt.strftime('%Y-%m-%d')
    except:
        return None

def parse_number(val):
    """تحويل الأرقام"""
    if not val or val in ['-', 'N/A', '']:
        return None
    try:
        return float(val.replace(',', ''))
    except:
        return None

def scrape_stock(symbol, exchange):
    """استخراج بيانات سهم"""
    url = get_yahoo_url(symbol, exchange)
    if not url:
        return []
    
    # فتح الصفحة
    subprocess.run("agent-browser close", shell=True, capture_output=True)
    result = subprocess.run(f'agent-browser open "{url}" --timeout 30', shell=True, capture_output=True, text=True)
    
    if 'lookup' in result.stdout.lower() or 'error' in result.stdout.lower():
        return None  # السهم مش موجود
    
    time.sleep(2)
    
    data = extract_historical_data()
    return data if data else None

def save_historical_data(stock_id, data):
    """حفظ البيانات"""
    if not data:
        return 0
    
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    now = datetime.now().isoformat()
    saved = 0
    
    for row in data:
        date = parse_date(row.get('date', ''))
        if not date:
            continue
        
        try:
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
        except:
            pass
    
    conn.close()
    return saved

def scrape_exchange(exchange_code, limit=None):
    """استخراج بيانات بورصة كاملة"""
    print(f"\n{'='*60}")
    print(f"📊 استخراج بيانات: {exchange_code}")
    print(f"{'='*60}")
    
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    query = '''
        SELECT id, symbol FROM Stock 
        WHERE exchange = ? 
        ORDER BY symbol
    '''
    if limit:
        query += f' LIMIT {limit}'
    
    c.execute(query, (exchange_code,))
    stocks = c.fetchall()
    conn.close()
    
    print(f"   عدد الأسهم: {len(stocks)}")
    
    total_saved = 0
    success = 0
    failed = 0
    
    for i, (stock_id, symbol) in enumerate(stocks):
        print(f"\n   [{i+1}/{len(stocks)}] {symbol}...", end=' ')
        
        data = scrape_stock(symbol, exchange_code)
        
        if data is None:
            print("❌ مش موجود على Yahoo")
            failed += 1
        elif len(data) == 0:
            print("⚠️ لا توجد بيانات")
            failed += 1
        else:
            saved = save_historical_data(stock_id, data)
            print(f"✓ {saved} يوم")
            total_saved += saved
            success += 1
        
        time.sleep(1)
    
    print(f"\n{'='*60}")
    print(f"✅ {exchange_code}: {success} نجح، {failed} فشل، {total_saved} سجل")
    print(f"{'='*60}")
    
    return total_saved

def main():
    print("\n" + "="*60)
    print("📊 مستخرج البيانات التاريخية الشامل")
    print("="*60)
    
    # البورصات بالترتيب
    exchanges = ['KSA', 'EGX', 'KSE', 'QE', 'UAE', 'BAH']
    
    # لو المستخدم حدد بورصة معينة
    if len(sys.argv) > 1:
        exchange = sys.argv[1].upper()
        if exchange in exchanges:
            scrape_exchange(exchange)
        else:
            print(f"❌ البورصة {exchange} مش موجودة")
            print(f"   المتاح: {', '.join(exchanges)}")
        return
    
    # استخراج كل البورصات
    grand_total = 0
    for exchange in exchanges:
        saved = scrape_exchange(exchange)
        grand_total += saved
    
    subprocess.run("agent-browser close", shell=True, capture_output=True)
    
    print("\n" + "="*60)
    print(f"🎉 الإجمالي: {grand_total} سجل تاريخي")
    print("="*60 + "\n")

if __name__ == '__main__':
    main()
