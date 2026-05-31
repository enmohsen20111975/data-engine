#!/usr/bin/env python3
"""
🏛️ مستخرج سريع - نسخة مُحسّنة للسرعة
يستخرج البيانات من صفحة نظرة عامة فقط (أسرع)
"""
import subprocess
import json
import sqlite3
import base64
import time
import uuid
import os
import urllib.request
from datetime import datetime

DB_PATH = '/home/z/my-project/db/data-factory.db'
ICON_DIR = '/home/z/my-project/public/stock-icons'

TV_EXCHANGES = {'KSA': 'TADAWUL', 'EGX': 'EGX', 'KSE': 'KSE', 'QE': 'QE', 'UAE': 'ADX', 'BAH': 'BSE'}

def run_js(js_code):
    encoded = base64.b64encode(js_code.encode()).decode()
    result = subprocess.run(f"agent-browser eval -b '{encoded}'", shell=True, capture_output=True, text=True, timeout=60)
    output = result.stdout.strip()
    if output.startswith('"') and output.endswith('"'): output = output[1:-1]
    return output.replace('\\"', '"')

def open_page(url):
    subprocess.run("agent-browser close", shell=True, capture_output=True)
    result = subprocess.run(f'agent-browser open "{url}" --timeout 20', shell=True, capture_output=True, text=True)
    time.sleep(2)
    return 'error' not in result.stdout.lower()

def close_browser(): subprocess.run("agent-browser close", shell=True, capture_output=True)

def parse_number(val):
    if not val or val in ['—', '-', 'N/A', '']: return None
    try:
        val = str(val).replace(',', '').replace('SAR', '').replace('KWD', '').replace('EGP', '').replace('AED', '').replace('QAR', '').replace('BHD', '').replace('%', '').strip()
        multipliers = {'T': 1e12, 'B': 1e9, 'M': 1e6, 'K': 1e3}
        for suffix, mult in multipliers.items():
            if suffix in val.upper():
                val = val.upper().replace(suffix, '')
                return float(val) * mult
        return float(val.replace('−', '-'))
    except: return None

def extract_all_data():
    """استخراج كل البيانات من صفحة نظرة عامة"""
    js = r'''
(function(){
  const data = {overview: {}, technical: {}, forecast: {}};
  const text = document.body.innerText;
  const lines = text.split('\n');
  
  // === السعر ===
  for(let i=0; i<lines.length; i++){
    const line = lines[i].trim();
    if(line.match(/^\d{4,}$/) || line.match(/^[A-Z]{3,}$/)){
      if(i+1 < lines.length){
        const next = lines[i+1].trim().replace(/[\u202A-\u202E\u200E\u200F]/g, '');
        const match = next.match(/(\d+\.\d{2})/);
        if(match){ data.overview.price = match[1]; break; }
      }
    }
  }
  
  // === البيانات الأساسية ===
  for(let i=0; i<lines.length; i++){
    const line = lines[i].trim();
    const next = (lines[i+1] || '').trim();
    
    if(line.includes('القيمة السوقية') && next.match(/\d/)) data.overview.marketCap = next;
    if(line.includes('السعر إلى نسبة الأرباح')) data.overview.peRatio = next;
    if(line.includes('الأرباح لكل سهم')) data.overview.eps = next;
    if(line.includes('عائد توزيعات')) data.overview.dividendYield = next;
    if(line.includes('بيتا') && !line.includes('البيتا')) data.overview.beta = next;
    if(line.includes('قطاع') && !line.includes('القطاع')) data.overview.sector = next;
    if(line.includes('صناعة') && !line.includes('الصناعة')) data.overview.industry = next;
    if(line.includes('ISIN')) data.overview.isin = next.split(' ')[0];
    if(line.includes('التأسيس')) data.overview.founded = next;
  }
  
  // === أيقونة السهم ===
  const imgs = document.querySelectorAll('img');
  for(let img of imgs){
    const src = img.src || '';
    if(src.includes('logo') || src.includes('symbol-logo')){ data.overview.logoUrl = src; break; }
  }
  
  // === التحليل الفني (من نص الصفحة) ===
  const rsiMatch = text.match(/مؤشر القوة النسبية.*?(\d+\.\d+)/);
  if(rsiMatch) data.technical.rsi = rsiMatch[1];
  
  const stochMatch = text.match(/ستوكاستك.*?(\d+\.\d+)/);
  if(stochMatch) data.technical.stochastic = stochMatch[1];
  
  const macdMatch = text.match(/الماكد.*?(-?\d+\.\d+)/);
  if(macdMatch) data.technical.macd = macdMatch[1];
  
  // === التوقعات ===
  const targetMatch = text.match(/هدف السعر.*?(\d+\.\d+)/);
  if(targetMatch) data.forecast.targetPrice = targetMatch[1];
  
  const analystMatch = text.match(/محلل\s+(\d+)\s+توقعات/);
  if(analystMatch) data.forecast.analystCount = analystMatch[1];
  
  const strongBuyMatch = text.match(/شراء قوي\s+(\d+)/);
  if(strongBuyMatch) data.forecast.strongBuy = strongBuyMatch[1];
  
  const buyMatch = text.match(/\nشراء\s+(\d+)/);
  if(buyMatch) data.forecast.buy = buyMatch[1];
  
  const holdMatch = text.match(/احتفاظ\s+(\d+)/);
  if(holdMatch) data.forecast.hold = holdMatch[1];
  
  return JSON.stringify(data);
})()
'''
    try: return json.loads(run_js(js))
    except: return {}

def download_icon(symbol, url):
    if not url: return None
    try:
        ext = '.svg' if '.svg' in url else '.png'
        path = f"{ICON_DIR}/{symbol}{ext}"
        os.makedirs(ICON_DIR, exist_ok=True)
        urllib.request.urlretrieve(url, path)
        return f"/stock-icons/{symbol}{ext}"
    except: return None

def save_data(symbol, exchange, data):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    now = datetime.now().isoformat()
    ov = data.get('overview', {})
    
    try:
        c.execute('SELECT id FROM Stock WHERE symbol=? AND exchange=?', (symbol, exchange))
        row = c.fetchone()
        stock_id = row[0] if row else f'stock_{uuid.uuid4().hex[:12]}'
        
        if not row:
            c.execute('''INSERT INTO Stock (id, symbol, nameEn, sector, industry, isin, exchange, iconUrl, foundedYear, createdAt, updatedAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                (stock_id, symbol, '', ov.get('sector', ''), ov.get('industry', ''), ov.get('isin', ''),
                 exchange, data.get('iconPath', ''), int(ov.get('founded', 0)) if ov.get('founded') else None, now, now))
        else:
            c.execute('UPDATE Stock SET sector=?, industry=?, isin=?, iconUrl=?, foundedYear=?, updatedAt=? WHERE id=?',
                (ov.get('sector', ''), ov.get('industry', ''), ov.get('isin', ''), data.get('iconPath', ''),
                 int(ov.get('founded', 0)) if ov.get('founded') else None, now, stock_id))
        
        c.execute('DELETE FROM StockOverview WHERE stockId=?', (stock_id,))
        c.execute('''INSERT INTO StockOverview (id, stockId, currentPrice, marketCap, peRatioTTM, dividendYield, eps, beta, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
            (f'ov_{uuid.uuid4().hex[:12]}', stock_id, parse_number(ov.get('price')), parse_number(ov.get('marketCap')),
             parse_number(ov.get('peRatio')), parse_number(ov.get('dividendYield')), parse_number(ov.get('eps')),
             parse_number(ov.get('beta')), now, now))
        
        tech = data.get('technical', {})
        if tech:
            c.execute('DELETE FROM TechnicalIndicators WHERE stockId=?', (stock_id,))
            c.execute('''INSERT INTO TechnicalIndicators (id, stockId, rsi, stochasticK, macd, createdAt)
                VALUES (?, ?, ?, ?, ?, ?)''',
                (f'ti_{uuid.uuid4().hex[:12]}', stock_id, parse_number(tech.get('rsi')),
                 parse_number(tech.get('stochastic')), parse_number(tech.get('macd')), now))
        
        forecast = data.get('forecast', {})
        if forecast:
            c.execute('DELETE FROM AnalystForecasts WHERE stockId=?', (stock_id,))
            c.execute('''INSERT INTO AnalystForecasts (id, stockId, targetPrice, analystCount, strongBuy, buyRating, holdRating, createdAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
                (f'af_{uuid.uuid4().hex[:12]}', stock_id, parse_number(forecast.get('targetPrice')),
                 int(forecast.get('analystCount', 0) or 0), int(forecast.get('strongBuy', 0) or 0),
                 int(forecast.get('buy', 0) or 0), int(forecast.get('hold', 0) or 0), now))
        
        conn.commit()
        return True
    except Exception as e:
        return False
    finally:
        conn.close()

def scrape_exchange(exchange):
    print(f"\n{'='*50}\n📊 {exchange}\n{'='*50}")
    
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute(f"SELECT symbol FROM Stock WHERE exchange = '{exchange}' ORDER BY symbol")
    stocks = [row[0] for row in c.fetchall()]
    conn.close()
    
    success = 0
    for i, symbol in enumerate(stocks):
        url = f"https://ar.tradingview.com/symbols/{TV_EXCHANGES.get(exchange, exchange)}-{symbol}/"
        print(f"[{i+1}/{len(stocks)}] {symbol}...", end=' ')
        
        if open_page(url):
            data = extract_all_data()
            logo_url = data.get('overview', {}).get('logoUrl')
            if logo_url: data['iconPath'] = download_icon(symbol, logo_url)
            if save_data(symbol, exchange, data):
                print("✓")
                success += 1
            else: print("✗ save")
        else: print("✗ open")
        
        time.sleep(1)
    
    close_browser()
    print(f"\n✅ {exchange}: {success}/{len(stocks)}")

def main():
    import sys
    exchanges = ['BAH', 'QE', 'KSE', 'UAE', 'EGX', 'KSA']
    
    if len(sys.argv) > 1:
        ex = sys.argv[1].upper()
        if ex in exchanges: scrape_exchange(ex)
        else: print(f"❌ المتاح: {exchanges}")
    else:
        for ex in exchanges: scrape_exchange(ex)
    
    print("\n🎉 انتهى!")

if __name__ == '__main__':
    main()
