#!/usr/bin/env python3
"""
مستخرج شامل لكل البيانات - Full Data Scraper
"""
import subprocess
import json
import sqlite3
import base64
import time
import uuid
import re
import sys
from datetime import datetime

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

def run_js(js_code, timeout=60):
    """تنفيذ JavaScript"""
    encoded = base64.b64encode(js_code.encode()).decode()
    result = subprocess.run(
        f"agent-browser eval -b '{encoded}'",
        shell=True, capture_output=True, text=True, timeout=timeout
    )
    output = result.stdout.strip()
    if output.startswith('"') and output.endswith('"'):
        output = output[1:-1]
    output = output.replace('\\"', '"')
    return output

def open_page(url):
    """فتح صفحة"""
    subprocess.run("agent-browser close", shell=True, capture_output=True)
    result = subprocess.run(f'agent-browser open "{url}" --timeout 30', shell=True, capture_output=True, text=True)
    time.sleep(3)
    return result.stdout

def parse_number(val):
    """تحويل النص لرقم"""
    if not val or val in ['—', '-', 'N/A', '']:
        return None
    try:
        return float(str(val).replace(',', '').replace('%', '').strip())
    except:
        return None

def parse_date(date_str):
    """تحويل التاريخ"""
    try:
        dt = datetime.strptime(date_str.strip(), '%b %d, %Y')
        return dt.strftime('%Y-%m-%d')
    except:
        return None

def get_stocks():
    """الحصول على قائمة الأسهم"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        SELECT s.id, s.symbol, s.exchange 
        FROM Stock s 
        ORDER BY s.exchange, s.symbol
    ''')
    stocks = c.fetchall()
    conn.close()
    return stocks

def scrape_historical_data(symbol, exchange):
    """استخراج البيانات التاريخية من Yahoo Finance"""
    if exchange not in YAHOO_SUFFIXES:
        return []
    
    yahoo_symbol = f"{symbol}{YAHOO_SUFFIXES[exchange]}"
    url = f"https://finance.yahoo.com/quote/{yahoo_symbol}/history/"
    
    open_page(url)
    
    # التحقق
    title = run_js("document.title || ''")
    if 'lookup' in title.lower() or 'error' in title.lower() or 'sign in' in title.lower():
        return []
    
    # استخراج البيانات
    js = r'''
(function(){
  const tbl = document.querySelector('table');
  if(!tbl) return '[]';
  
  const rows = tbl.querySelectorAll('tr');
  const data = [];
  
  for(let i=1; i<rows.length; i++){
    const cells = rows[i].querySelectorAll('td');
    if(cells.length >= 5){
      data.push({
        d: cells[0]?.innerText?.trim() || '',
        o: cells[1]?.innerText?.trim() || '',
        h: cells[2]?.innerText?.trim() || '',
        l: cells[3]?.innerText?.trim() || '',
        c: cells[4]?.innerText?.trim() || '',
        a: cells[5]?.innerText?.trim() || '',
        v: cells[6]?.innerText?.trim() || ''
      });
    }
  }
  return JSON.stringify(data);
})()
'''
    result = run_js(js)
    try:
        return json.loads(result)
    except:
        return []

def save_historical(stock_id, data):
    """حفظ البيانات التاريخية"""
    if not data:
        return 0
    
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    now = datetime.now().isoformat()
    saved = 0
    
    for row in data:
        date = parse_date(row.get('d', ''))
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
                parse_number(row.get('o')),
                parse_number(row.get('h')),
                parse_number(row.get('l')),
                parse_number(row.get('c')),
                parse_number(row.get('a')),
                parse_number(row.get('v')),
                now
            ))
            conn.commit()
            saved += 1
        except:
            pass
    
    conn.close()
    return saved

def scrape_stock_details(symbol, exchange):
    """استخراج تفاصيل السهم من TradingView"""
    # تحديد الـ prefix
    tv_prefix = {
        'KSA': 'TADAWUL',
        'EGX': 'EGX',
        'KSE': 'KSE',
        'QE': 'QE',
        'UAE': 'ADX',
        'BAH': 'BSE'
    }
    
    prefix = tv_prefix.get(exchange, exchange)
    url = f"https://ar.tradingview.com/symbols/{prefix}-{symbol}/"
    
    open_page(url)
    
    # استخراج البيانات الأساسية
    js = r'''
(function(){
  const data = {};
  
  // السعر الحالي
  const priceEl = document.querySelector('[class*="last"] span, [data-widget-placeholder="ticker-value-last"]');
  if(priceEl) data.price = priceEl.innerText;
  
  // التغيير
  const changeEl = document.querySelector('[class*="change"]');
  if(changeEl) data.change = changeEl.innerText;
  
  // كل البيانات من الجداول
  const tables = document.querySelectorAll('table');
  for(let tbl of tables){
    const rows = tbl.querySelectorAll('tr');
    for(let row of rows){
      const cells = row.querySelectorAll('td, th');
      if(cells.length >= 2){
        const key = cells[0]?.innerText?.trim() || '';
        const val = cells[1]?.innerText?.trim() || '';
        if(key && val) data[key] = val;
      }
    }
  }
  
  return JSON.stringify(data);
})()
'''
    result = run_js(js)
    try:
        return json.loads(result)
    except:
        return {}

def save_stock_details(stock_id, details):
    """حفظ تفاصيل السهم"""
    if not details:
        return False
    
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    now = datetime.now().isoformat()
    
    try:
        # تحديث StockOverview
        c.execute('SELECT id FROM StockOverview WHERE stockId=?', (stock_id,))
        if c.fetchone():
            # تحديث الحقول المتاحة
            updates = []
            values = []
            
            if 'القيمة السوقية' in details:
                updates.append('marketCap=?')
                values.append(parse_number(details['القيمة السوقية']))
            if 'نسبة السعر إلى الأرباح' in details:
                updates.append('peRatioTTM=?')
                values.append(parse_number(details['نسبة السعر إلى الأرباح']))
            if 'عائد التوزيعات' in details or 'عائد الأرباح' in details:
                updates.append('dividendYield=?')
                values.append(parse_number(details.get('عائد التوزيعات') or details.get('عائد الأرباح')))
            if 'بيتا' in details or 'Beta' in details:
                updates.append('beta=?')
                values.append(parse_number(details.get('بيتا') or details.get('Beta')))
            if 'المتوسط 50 يوم' in details or '50 يوم' in details:
                updates.append('fiftyDayMA=?')
                values.append(parse_number(details.get('المتوسط 50 يوم') or details.get('50 يوم')))
            if 'المتوسط 200 يوم' in details or '200 يوم' in details:
                updates.append('twoHundredDayMA=?')
                values.append(parse_number(details.get('المتوسط 200 يوم') or details.get('200 يوم')))
            
            if updates:
                values.extend([now, stock_id])
                c.execute(f"UPDATE StockOverview SET {', '.join(updates)}, updatedAt=? WHERE stockId=?", values)
                conn.commit()
    except Exception as e:
        print(f"خطأ: {e}")
    
    conn.close()
    return True

def main():
    print("\n" + "="*60)
    print("🏭 مستخرج البيانات الشامل")
    print("="*60)
    
    # الحصول على الأسهم
    stocks = get_stocks()
    total = len(stocks)
    print(f"\nعدد الأسهم: {total}")
    
    # عداد
    hist_total = 0
    details_total = 0
    failed = []
    
    for i, (stock_id, symbol, exchange) in enumerate(stocks):
        print(f"\n[{i+1}/{total}] {symbol} ({exchange})")
        
        # 1. البيانات التاريخية
        print("   استخراج البيانات التاريخية...")
        hist_data = scrape_historical_data(symbol, exchange)
        if hist_data:
            saved = save_historical(stock_id, hist_data)
            hist_total += saved
            print(f"   ✓ تم حفظ {saved} سجل تاريخي")
        else:
            print("   ⚠️ لا توجد بيانات تاريخية")
            failed.append(f"{symbol} (historical)")
        
        time.sleep(1)
        
        # 2. تفاصيل السهم
        print("   استخراج تفاصيل السهم...")
        details = scrape_stock_details(symbol, exchange)
        if details:
            save_stock_details(stock_id, details)
            details_total += 1
            print(f"   ✓ تم حفظ التفاصيل")
        else:
            print("   ⚠️ لا توجد تفاصيل")
        
        # تقدم كل 50 سهم
        if (i + 1) % 50 == 0:
            print(f"\n--- تقدم: {i+1}/{total} | تاريخي: {hist_total} | تفاصيل: {details_total} ---\n")
    
    print("\n" + "="*60)
    print("📊 ملخص النتائج")
    print("="*60)
    print(f"✓ سجلات تاريخية: {hist_total}")
    print(f"✓ تفاصيل أسهم: {details_total}")
    print(f"⚠️ فشل: {len(failed)}")
    print("="*60 + "\n")
    
    subprocess.run("agent-browser close", shell=True, capture_output=True)

if __name__ == '__main__':
    main()
