#!/usr/bin/env python3
"""
مستخرج الأسهم المبسط - Simple Stock Scraper
"""
import subprocess
import json
import sqlite3
import base64
import time
import uuid
from datetime import datetime

DB_PATH = '/home/z/my-project/db/data-factory.db'

EXCHANGES = {
    'KSA': 'https://ar.tradingview.com/markets/stocks-ksa/market-movers-all-stocks/',
    'EGX': 'https://ar.tradingview.com/markets/stocks-egypt/market-movers-all-stocks/',
    'KSE': 'https://ar.tradingview.com/markets/stocks-kuwait/market-movers-all-stocks/',
    'QE': 'https://ar.tradingview.com/markets/stocks-qatar/market-movers-all-stocks/',
    'UAE': 'https://ar.tradingview.com/markets/stocks-uae/market-movers-all-stocks/',
    'BAH': 'https://ar.tradingview.com/markets/stocks-bahrain/market-movers-all-stocks/',
}

def run_browser_js(js_code):
    """تنفيذ JavaScript في المتصفح"""
    encoded = base64.b64encode(js_code.encode()).decode()
    cmd = f"agent-browser eval -b '{encoded}'"
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=60)
    output = result.stdout.strip()
    
    # إزالة الـ quotes من الأول والآخر
    if output.startswith('"') and output.endswith('"'):
        output = output[1:-1]
    
    # تحويل الـ escaped quotes
    output = output.replace('\\"', '"')
    
    return output

def scrape(exchange_code):
    """استخراج البيانات من بورصة"""
    if exchange_code not in EXCHANGES:
        print(f"خطأ: البورصة {exchange_code} مش موجودة")
        return []
    
    url = EXCHANGES[exchange_code]
    print(f"\n{'='*40}")
    print(f"استخراج: {exchange_code}")
    print(f"{'='*40}")
    
    # فتح الصفحة
    print("1. فتح الصفحة...")
    subprocess.run("agent-browser close", shell=True, capture_output=True)
    subprocess.run(f'agent-browser open "{url}" --timeout 30', shell=True, capture_output=True)
    time.sleep(3)
    
    # استخراج البيانات
    print("2. قراءة الجدول...")
    js = '''(function(){
  const tbl = document.querySelectorAll('table')[1];
  if(!tbl) return '[]';
  const rows = tbl.querySelectorAll('tr');
  const stocks = [];
  for(let i=1; i<rows.length; i++){
    const cells = rows[i].querySelectorAll('td');
    if(cells.length >= 2){
      const txt = cells[0].innerText || '';
      const ln = txt.split('\\n');
      stocks.push({s:ln[0]||'',n:ln[1]||'',p:cells[1].innerText||''});
    }
  }
  return JSON.stringify(stocks);
})()'''
    
    result = run_browser_js(js)
    
    # تحويل JSON
    try:
        stocks = json.loads(result)
        print(f"3. تم العثور على {len(stocks)} سهم")
        return stocks
    except Exception as e:
        print(f"خطأ: {e}")
        print(f"النتيجة: {result[:200]}")
        return []

def save(stocks, exchange_code):
    """حفظ في الداتابيز"""
    if not stocks:
        print("مفيش أسهم")
        return 0
    
    print(f"4. حفظ {len(stocks)} سهم...")
    
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    now = datetime.now().isoformat()
    saved = 0
    
    for st in stocks:
        sym = st.get('s', '').strip()
        if not sym:
            continue
        
        try:
            # موجود؟
            c.execute('SELECT id FROM Stock WHERE symbol=? AND exchange=?', (sym, exchange_code))
            row = c.fetchone()
            
            if row:
                sid = row[0]
            else:
                sid = f'stock_{uuid.uuid4().hex[:12]}'
                c.execute('INSERT INTO Stock(id,symbol,nameEn,exchange,createdAt,updatedAt) VALUES(?,?,?,?,?,?)',
                         (sid, sym, st.get('n',''), exchange_code, now, now))
            
            # السعر
            p = st.get('p','').replace(',','').replace('KWF','').replace('SAR','').replace('EGP','').replace('AED','').strip()
            try: price = float(p) if p else None
            except: price = None
            
            c.execute('SELECT id FROM StockOverview WHERE stockId=?', (sid,))
            if c.fetchone():
                c.execute('UPDATE StockOverview SET currentPrice=?, updatedAt=? WHERE stockId=?', (price, now, sid))
            else:
                oid = f'ov_{uuid.uuid4().hex[:12]}'
                c.execute('INSERT INTO StockOverview(id,stockId,currentPrice,createdAt,updatedAt) VALUES(?,?,?,?,?)',
                         (oid, sid, price, now, now))
            
            conn.commit()
            saved += 1
        except Exception as e:
            print(f"خطأ {sym}: {e}")
    
    conn.close()
    print(f"5. تم حفظ {saved} سهم ✓")
    return saved

if __name__ == '__main__':
    print("\n🏭 مستخرج الأسهم")
    print("البورصات: KSA EGX KSE QE UAE BAH")
    
    code = input("\nأدخل الكود: ").strip().upper() or 'KSE'
    
    stocks = scrape(code)
    saved = save(stocks, code)
    
    subprocess.run("agent-browser close", shell=True, capture_output=True)
    
    print(f"\n✅ اكتمل: {saved} سهم\n")
