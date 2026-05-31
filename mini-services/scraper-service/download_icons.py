#!/usr/bin/env python3
"""
تحميل أيقونات الأسهم من TradingView
"""
import subprocess
import sqlite3
import base64
import time
import os
import urllib.request

DB_PATH = '/home/z/my-project/db/data-factory.db'
ICON_DIR = '/home/z/my-project/public/stock-icons'

# روابط أيقونات TradingView
ICON_BASE_URL = "https://s3-symbol-logo.tradingview.com"

def run_js(js_code):
    """تنفيذ JavaScript"""
    encoded = base64.b64encode(js_code.encode()).decode()
    result = subprocess.run(
        f"agent-browser eval -b '{encoded}'",
        shell=True, capture_output=True, text=True, timeout=60
    )
    output = result.stdout.strip()
    if output.startswith('"') and output.endswith('"'):
        output = output[1:-1]
    return output

def get_stock_icon_url(symbol, exchange):
    """الحصول على رابط أيقونة السهم من صفحة TradingView"""
    # تحويل رمز البورصة لـ TradingView format
    tv_exchanges = {
        'KSA': 'TADAWUL',
        'EGX': 'EGX',
        'KSE': 'KSE',
        'QE': 'QE',
        'UAE': 'ADX',  # أو DFM
        'BAH': 'BSE',
    }
    
    tv_exchange = tv_exchanges.get(exchange, exchange)
    url = f"https://ar.tradingview.com/symbols/{tv_exchange}-{symbol}/"
    
    # فتح الصفحة
    subprocess.run("agent-browser close", shell=True, capture_output=True)
    subprocess.run(f'agent-browser open "{url}" --timeout 20', shell=True, capture_output=True)
    time.sleep(2)
    
    # استخراج رابط الأيقونة
    js = r'''
(function(){
  const imgs = document.querySelectorAll('img');
  for(let img of imgs){
    const src = img.src || '';
    if(src.includes('logo') || src.includes('symbol-logo')){
      return src;
    }
  }
  return null;
})()
'''
    icon_url = run_js(js)
    return icon_url if icon_url and icon_url.startswith('http') else None

def download_icon(symbol, icon_url):
    """تحميل الأيقونة"""
    if not icon_url:
        return False
    
    try:
        # تحديد الامتداد
        ext = '.svg' if '.svg' in icon_url else '.png'
        icon_path = os.path.join(ICON_DIR, f"{symbol}{ext}")
        
        # تحميل الأيقونة
        urllib.request.urlretrieve(icon_url, icon_path)
        return True
    except Exception as e:
        print(f"      خطأ في التحميل: {e}")
        return False

def update_database(symbol, icon_path):
    """تحديث الداتابيز بمسار الأيقونة"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # التحقق من وجود عمود iconUrl
    c.execute("PRAGMA table_info(Stock)")
    columns = [col[1] for col in c.fetchall()]
    
    if 'iconUrl' not in columns:
        c.execute("ALTER TABLE Stock ADD COLUMN iconUrl TEXT")
    
    c.execute("UPDATE Stock SET iconUrl = ? WHERE symbol = ?", (icon_path, symbol))
    conn.commit()
    conn.close()

def main():
    print("\n" + "="*60)
    print("🖼️ تحميل أيقونات الأسهم")
    print("="*60)
    
    # إنشاء المجلد
    os.makedirs(ICON_DIR, exist_ok=True)
    
    # الحصول على قائمة الأسهم
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # نبدأ ببورصة واحدة للتجربة
    c.execute("SELECT symbol, exchange FROM Stock WHERE exchange = 'KSA' LIMIT 20")
    stocks = c.fetchall()
    conn.close()
    
    print(f"\nعدد الأسهم للتجربة: {len(stocks)}")
    
    success = 0
    for i, (symbol, exchange) in enumerate(stocks):
        print(f"\n[{i+1}/{len(stocks)}] {symbol} ({exchange})...", end=' ')
        
        # الحصول على رابط الأيقونة
        icon_url = get_stock_icon_url(symbol, exchange)
        
        if icon_url:
            print(f"✓ رابط: {icon_url[:50]}...")
            if download_icon(symbol, icon_url):
                update_database(symbol, f"/stock-icons/{symbol}.svg")
                success += 1
        else:
            print("❌ لم يتم العثور على أيقونة")
        
        time.sleep(1)
    
    # إغلاق المتصفح
    subprocess.run("agent-browser close", shell=True, capture_output=True)
    
    print(f"\n{'='*60}")
    print(f"✅ تم تحميل {success} أيقونة")
    print(f"📁 المسار: {ICON_DIR}")
    print(f"{'='*60}\n")

if __name__ == '__main__':
    main()
