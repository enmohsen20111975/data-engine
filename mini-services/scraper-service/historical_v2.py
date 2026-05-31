#!/usr/bin/env python3
"""
مستخرج البيانات التاريخية v2 - Historical Data Scraper
من Yahoo Finance - طريقة صحيحة
"""
import subprocess
import json
import sqlite3
import base64
import time
import uuid
from datetime import datetime

DB_PATH = '/home/z/my-project/db/data-factory.db'

# Yahoo Finance suffixes لكل بورصة
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
    """استخراج البيانات التاريخية من الصفحة"""
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
    """تحويل التاريخ من Yahoo Finance"""
    try:
        # May 28, 2026 -> 2026-05-28
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
    """استخراج بيانات سهم واحد"""
    url = get_yahoo_url(symbol, exchange)
    if not url:
        return []
    
    print(f"   فتح: {url}")
    
    # إغلاق المتصفح وفتح الصفحة
    subprocess.run("agent-browser close", shell=True, capture_output=True)
    result = subprocess.run(f'agent-browser open "{url}" --timeout 30', shell=True, capture_output=True, text=True)
    
    # التحقق من فتح الصفحة
    if 'lookup' in result.stdout.lower() or 'error' in result.stdout.lower():
        print(f"   ⚠️ السهم مش موجود")
        return []
    
    time.sleep(3)  # انتظار التحميل
    
    # استخراج البيانات
    data = extract_historical_data()
    print(f"   ✓ تم استخراج {len(data)} يوم")
    
    return data

def save_historical_data(stock_id, data, symbol):
    """حفظ البيانات التاريخية في الداتابيز"""
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
        
        open_p = parse_number(row.get('open'))
        high = parse_number(row.get('high'))
        low = parse_number(row.get('low'))
        close = parse_number(row.get('close'))
        adj_close = parse_number(row.get('adjClose'))
        volume = parse_number(row.get('volume'))
        
        try:
            # تحقق لو موجود
            c.execute('SELECT id FROM HistoricalData WHERE stockId=? AND date=?', (stock_id, date))
            if c.fetchone():
                continue
            
            hid = f'hist_{uuid.uuid4().hex[:12]}'
            c.execute('''
                INSERT INTO HistoricalData (id, stockId, date, open, high, low, close, adjustedClose, volume, createdAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (hid, stock_id, date, open_p, high, low, close, adj_close, volume, now))
            conn.commit()
            saved += 1
        except Exception as e:
            print(f"      خطأ: {e}")
    
    conn.close()
    return saved

def main():
    print("\n" + "="*60)
    print("📊 مستخرج البيانات التاريخية v2")
    print("="*60)
    
    # الحصول على قائمة الأسهم
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # نختار بورصة معينة للاختبار
    c.execute('''
        SELECT id, symbol, exchange 
        FROM Stock 
        WHERE exchange = ?
        ORDER BY symbol
        LIMIT 5
    ''', ('KSA',))
    
    stocks = c.fetchall()
    conn.close()
    
    print(f"\n🧪 تجربة على {len(stocks)} سهم سعودي:")
    print("-"*60)
    
    total_saved = 0
    for i, (stock_id, symbol, exchange) in enumerate(stocks):
        print(f"\n[{i+1}/{len(stocks)}] {symbol} ({exchange})")
        
        data = scrape_stock(symbol, exchange)
        if data:
            saved = save_historical_data(stock_id, data, symbol)
            print(f"   ✓ تم حفظ {saved} سجل")
            total_saved += saved
        
        time.sleep(2)
    
    # إغلاق المتصفح
    subprocess.run("agent-browser close", shell=True, capture_output=True)
    
    print("\n" + "="*60)
    print(f"✅ اكتمل! تم حفظ {total_saved} سجل تاريخي")
    print("="*60 + "\n")

if __name__ == '__main__':
    main()
