#!/usr/bin/env python3
"""
مستخرج الأسهم الشامل - Full Stock Scraper
يجمع كل البيانات من كل الجداول
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

EXCHANGES = {
    'KSA': {'name': 'السعودية', 'url': 'https://ar.tradingview.com/markets/stocks-ksa/market-movers-all-stocks/'},
    'EGX': {'name': 'مصر', 'url': 'https://ar.tradingview.com/markets/stocks-egypt/market-movers-all-stocks/'},
    'KSE': {'name': 'الكويت', 'url': 'https://ar.tradingview.com/markets/stocks-kuwait/market-movers-all-stocks/'},
    'QE': {'name': 'قطر', 'url': 'https://ar.tradingview.com/markets/stocks-qatar/market-movers-all-stocks/'},
    'UAE': {'name': 'الإمارات', 'url': 'https://ar.tradingview.com/markets/stocks-uae/market-movers-all-stocks/'},
    'BAH': {'name': 'البحرين', 'url': 'https://ar.tradingview.com/markets/stocks-bahrain/market-movers-all-stocks/'},
}

# التبويبات المهمة
TABS = [
    'جميع الأسهم',      # البيانات الأساسية
    'نظرة عامة',        # Overview
    'الأداء',           # Performance
    'القيمة',           # Valuation
    'أرباح',            # Dividends
    'الربحية',          # Margins
    'بيانات الدخل',     # Income Statement
]

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

def load_all_stocks():
    """الضغط على تحميل المزيد لحد ما كل الأسهم تظهر"""
    print("   تحميل جميع الأسهم...")
    for i in range(10):
        result = run_js(r'''
(function(){
  const btn = document.querySelector('.loadMoreWrapper-KFNucXpc button');
  if(btn && !btn.disabled) {
    btn.click();
    return 'loading';
  }
  return 'done';
})()
''')
        if 'done' in result:
            break
        time.sleep(2)
        print(f"      محاولة {i+1}...")
    
    # عدد الأسهم النهائي
    count = run_js(r'''
(function(){
  const tbl = document.querySelectorAll('table')[1];
  return (tbl?.querySelectorAll('tr').length - 1) || 0;
})()
''')
    print(f"   ✓ تم تحميل {count} سهم")
    return int(count) if count.isdigit() else 0

def extract_table_data():
    """استخراج كل البيانات من الجدول"""
    js = r'''
(function(){
  const tbl = document.querySelectorAll('table')[1];
  if(!tbl) return JSON.stringify({error: 'no table'});
  
  const rows = tbl.querySelectorAll('tr');
  const headers = [];
  const data = [];
  
  // استخراج الـ headers
  const ths = rows[0]?.querySelectorAll('th') || [];
  for(let th of ths){
    let txt = th.innerText.trim().split('\n')[0];
    headers.push(txt);
  }
  
  // استخراج البيانات
  for(let i=1; i<rows.length; i++){
    const cells = rows[i].querySelectorAll('td');
    const row = {symbol: '', name: ''};
    
    for(let j=0; j<cells.length; j++){
      const txt = cells[j].innerText.trim();
      const lines = txt.split('\n');
      const key = headers[j] || 'col' + j;
      
      // أول عمود = رمز + اسم
      if(j === 0){
        row['symbol'] = lines[0] || '';
        row['name'] = lines[1] || '';
      } else {
        row[key] = lines[0] || '';
      }
    }
    if(row.symbol) data.push(row);
  }
  
  return JSON.stringify({headers, data});
})()
'''
    result = run_js(js)
    try:
        return json.loads(result)
    except:
        return {'headers': [], 'data': []}

def click_tab(tab_name):
    """الضغط على تبويب معين"""
    js = f'''
(function(){{
  const tabs = document.querySelectorAll('[role="tablist"] button, [role="tab"], button');
  for(let t of tabs){{
    if(t.innerText.includes('{tab_name}')){{
      t.click();
      return 'clicked';
    }}
  }}
  return 'not found';
}})()
'''
    result = run_js(js)
    if 'clicked' in result:
        time.sleep(2)  # انتظار التحميل
        return True
    return False

def scrape_exchange_full(exchange_code):
    """استخراج كل البيانات من بورصة"""
    if exchange_code not in EXCHANGES:
        print(f"خطأ: البورصة {exchange_code} مش موجودة")
        return {}
    
    config = EXCHANGES[exchange_code]
    print(f"\n{'='*50}")
    print(f"استخراج: {config['name']} ({exchange_code})")
    print(f"{'='*50}")
    
    # فتح الصفحة
    print("1. فتح الصفحة...")
    subprocess.run("agent-browser close", shell=True, capture_output=True)
    subprocess.run(f'agent-browser open "{config["url"]}" --timeout 30', shell=True, capture_output=True)
    time.sleep(3)
    
    # تحميل كل الأسهم
    print("2. تحميل جميع الأسهم...")
    total = load_all_stocks()
    
    # استخراج البيانات من كل التبويبات
    all_data = {'symbols': [], 'tables': {}}
    
    for tab in TABS:
        print(f"3. استخراج: {tab}...")
        
        if tab != 'جميع الأسهم':
            if not click_tab(tab):
                print(f"   ⚠️ التبويب {tab} مش موجود")
                continue
        
        table_data = extract_table_data()
        all_data['tables'][tab] = table_data
        
        if tab == 'جميع الأسهم':
            all_data['symbols'] = [d['symbol'] for d in table_data.get('data', [])]
        
        print(f"   ✓ {len(table_data.get('data', []))} سهم - {len(table_data.get('headers', []))} عمود")
    
    print(f"\n✅ اكتمل استخراج {config['name']}")
    return all_data

def parse_number(txt):
    """تحويل النص لرقم"""
    if not txt or txt in ['—', '-', 'N/A', '']:
        return None
    txt = str(txt)
    # إزالة الوحدات والرموز
    for char in [',', 'KWD', 'SAR', 'EGP', 'AED', 'QAR', 'KWF', 'BHD', 'M', 'B', '%']:
        txt = txt.replace(char, '')
    txt = txt.replace('−', '-').strip()
    try:
        return float(txt)
    except:
        return None

def save_full_data(all_data, exchange_code):
    """حفظ كل البيانات في الداتابيز"""
    if not all_data.get('symbols'):
        print("لا توجد بيانات للحفظ")
        return 0
    
    print(f"\n{'='*50}")
    print("حفظ البيانات في الداتابيز...")
    print(f"{'='*50}")
    
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    now = datetime.now().isoformat()
    
    # البيانات الأساسية
    main_table = all_data['tables'].get('جميع الأسهم', {})
    stocks = main_table.get('data', [])
    
    saved = 0
    for stock in stocks:
        symbol = stock.get('symbol', '').strip()
        if not symbol:
            continue
        
        try:
            # حفظ السهم
            c.execute('SELECT id FROM Stock WHERE symbol=? AND exchange=?', (symbol, exchange_code))
            row = c.fetchone()
            
            if row:
                stock_id = row[0]
            else:
                stock_id = f'stock_{uuid.uuid4().hex[:12]}'
                c.execute('''
                    INSERT INTO Stock (id, symbol, nameEn, exchange, createdAt, updatedAt)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (stock_id, symbol, stock.get('name', ''), exchange_code, now, now))
            
            # حفظ البيانات المالية
            price = parse_number(stock.get('سعر', ''))
            change_pct = parse_number(stock.get('التغيير %', ''))
            volume = parse_number(stock.get('حجم تداول', ''))
            market_cap = parse_number(stock.get('القيمة السوقية', ''))
            pe_ratio = parse_number(stock.get('نسبة السعر إلى الأرباح', ''))
            dividend_yield = parse_number(stock.get('عائد الأرباح %', ''))
            
            c.execute('SELECT id FROM StockOverview WHERE stockId=?', (stock_id,))
            if c.fetchone():
                c.execute('''
                    UPDATE StockOverview SET 
                        currentPrice=?, marketCap=?, peRatioTTM=?, dividendYield=?, updatedAt=?
                    WHERE stockId=?
                ''', (price, market_cap, pe_ratio, dividend_yield, now, stock_id))
            else:
                ov_id = f'ov_{uuid.uuid4().hex[:12]}'
                c.execute('''
                    INSERT INTO StockOverview (id, stockId, currentPrice, marketCap, peRatioTTM, dividendYield, createdAt, updatedAt)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''', (ov_id, stock_id, price, market_cap, pe_ratio, dividend_yield, now, now))
            
            conn.commit()
            saved += 1
            
        except Exception as e:
            print(f"خطأ في {symbol}: {e}")
    
    conn.close()
    print(f"✓ تم حفظ {saved} سهم")
    return saved

if __name__ == '__main__':
    print("\n🏭 مستخرج الأسهم الشامل")
    print("البورصات: KSA EGX KSE QE UAE BAH")
    
    code = input("\nأدخل كود البورصة: ").strip().upper() or 'KSE'
    
    data = scrape_exchange_full(code)
    saved = save_full_data(data, code)
    
    subprocess.run("agent-browser close", shell=True, capture_output=True)
    
    print(f"\n{'='*50}")
    print(f"✅ اكتمل! تم حفظ {saved} سهم")
    print(f"{'='*50}\n")
