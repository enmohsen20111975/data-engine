#!/usr/bin/env python3
"""
🏛️ مستخرج البيانات الشامل من TradingView v2
يسحب كل البيانات المتاحة من صفحة السهم - طريقة محسنة
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

TV_EXCHANGES = {
    'KSA': 'TADAWUL', 'EGX': 'EGX', 'KSE': 'KSE',
    'QE': 'QE', 'UAE': 'ADX', 'BAH': 'BSE',
}

def run_js(js_code):
    encoded = base64.b64encode(js_code.encode()).decode()
    result = subprocess.run(f"agent-browser eval -b '{encoded}'", shell=True, capture_output=True, text=True, timeout=120)
    output = result.stdout.strip()
    if output.startswith('"') and output.endswith('"'): output = output[1:-1]
    return output.replace('\\"', '"')

def open_page(url):
    subprocess.run("agent-browser close", shell=True, capture_output=True)
    result = subprocess.run(f'agent-browser open "{url}" --timeout 30', shell=True, capture_output=True, text=True)
    time.sleep(3)
    return 'error' not in result.stdout.lower()

def close_browser():
    subprocess.run("agent-browser close", shell=True, capture_output=True)

def parse_number(val):
    if not val or val in ['—', '-', 'N/A', '']: return None
    try:
        val = str(val).replace(',', '').strip()
        multipliers = {'T': 1e12, 'B': 1e9, 'M': 1e6, 'K': 1e3}
        for suffix, mult in multipliers.items():
            if suffix in val.upper():
                val = val.upper().replace(suffix, '')
                return float(val) * mult
        return float(val.replace('−', '-'))
    except: return None

def extract_overview_data():
    """استخراج البيانات بطريقة محسنة"""
    js = r'''
(function(){
  const data = {};
  const text = document.body.innerText;
  const lines = text.split('\n');
  
  // السعر - بعد رمز السهم مباشرة
  for(let i=0; i<lines.length; i++){
    const line = lines[i].trim();
    // رمز السهم
    if(line.match(/^\d{4,}$/) || line.match(/^[A-Z]{3,}$/)){
      // السعر في السطر اللي بعده
      if(i+1 < lines.length){
        const next = lines[i+1].trim();
        // تنظيف من علامات Unicode
        const cleanPrice = next.replace(/[\u202A-\u202E\u200E\u200F]/g, '');
        const match = cleanPrice.match(/(\d+\.\d{2})/);
        if(match){
          data.price = match[1];
          break;
        }
      }
    }
  }
  
  // القيمة السوقية - السطر اللي بعد "القيمة السوقية"
  for(let i=0; i<lines.length; i++){
    if(lines[i].includes('القيمة السوقية') && i+1 < lines.length){
      const next = lines[i+1].trim();
      if(next.match(/\d/)){
        data.marketCap = next;
        break;
      }
    }
  }
  
  // P/E Ratio
  const peMatch = text.match(/السعر إلى نسبة الأرباح[\s\S]*?(\d+[.,]?\d*)/);
  if(peMatch) data.peRatio = peMatch[1];
  
  // EPS
  const epsMatch = text.match(/الأرباح لكل سهم[\s\S]*?(\d+[.,]?\d*)\s*SAR/);
  if(epsMatch) data.eps = epsMatch[1];
  
  // Dividend Yield
  const divMatch = text.match(/عائد توزيعات الأرباح[\s\S]*?(\d+[.,]?\d*)\s*%/);
  if(divMatch) data.dividendYield = divMatch[1];
  
  // Beta
  const betaMatch = text.match(/بيتا[\s\S]*?(\d+[.,]?\d*)/);
  if(betaMatch) data.beta = betaMatch[1];
  
  // القطاع
  const sectorMatch = text.match(/قطاع\s*\n\s*([^\n]+)/);
  if(sectorMatch) data.sector = sectorMatch[1].trim();
  
  // الصناعة
  const industryMatch = text.match(/صناعة\s*\n\s*([^\n]+)/);
  if(industryMatch) data.industry = industryMatch[1].trim();
  
  // CEO
  const ceoMatch = text.match(/المدير التنفيذي\s*\n\s*([^\n]+)/);
  if(ceoMatch) data.ceo = ceoMatch[1].trim();
  
  // Website
  const webMatch = text.match(/الموقع الإلكتروني\s*\n\s*([^\n]+)/);
  if(webMatch) data.website = webMatch[1].trim();
  
  // Founded
  const foundMatch = text.match(/التأسيس\s*\n\s*(\d{4})/);
  if(foundMatch) data.founded = foundMatch[1];
  
  // ISIN
  const isinMatch = text.match(/ISIN\s+(\w+)/);
  if(isinMatch) data.isin = isinMatch[1];
  
  // Employees
  const empMatch = text.match(/الموظفون[\s\S]*?(\d+[.,]?\d*\s*[KBM]?)\s*\n/);
  if(empMatch) data.employees = empMatch[1].trim();
  
  // أيقونة السهم
  const imgs = document.querySelectorAll('img');
  for(let img of imgs){
    const src = img.src || '';
    if(src.includes('logo') || src.includes('symbol-logo')){
      data.logoUrl = src;
      break;
    }
  }
  
  return JSON.stringify(data);
})()
'''
    try: return json.loads(run_js(js))
    except: return {}

def extract_financial_data():
    """استخراج البيانات المالية"""
    js = r'''
(function(){
  const data = {ratios: {}};
  const text = document.body.innerText;
  
  // نسب الربحية
  const grossMatch = text.match(/هامش الربح\s*%[\s\S]*?(\d+[.,]?\d*)/);
  if(grossMatch) data.ratios.grossMargin = grossMatch[1];
  
  const opMatch = text.match(/هامش التشغيل\s*%[\s\S]*?(\d+[.,]?\d*)/);
  if(opMatch) data.ratios.operatingMargin = opMatch[1];
  
  const ebitdaMatch = text.match(/هامش EBITDA\s*%[\s\S]*?(\d+[.,]?\d*)/);
  if(ebitdaMatch) data.ratios.ebitdaMargin = ebitdaMatch[1];
  
  const netMatch = text.match(/صافي الهامش\s*%[\s\S]*?(\d+[.,]?\d*)/);
  if(netMatch) data.ratios.netMargin = netMatch[1];
  
  // نسب السيولة
  const quickMatch = text.match(/السيولة السريعة[\s\S]*?(\d+[.,]?\d*)/);
  if(quickMatch) data.ratios.quickRatio = quickMatch[1];
  
  const currentMatch = text.match(/النسبة الجارية[\s\S]*?(\d+[.,]?\d*)/);
  if(currentMatch) data.ratios.currentRatio = currentMatch[1];
  
  // نسب الملاءة
  const dteMatch = text.match(/الدين إلى حقوق الملكية[\s\S]*?(\d+[.,]?\d*)/);
  if(dteMatch) data.ratios.debtToEquity = dteMatch[1];
  
  const dtaMatch = text.match(/الدين إلى الأصول[\s\S]*?(\d+[.,]?\d*)/);
  if(dtaMatch) data.ratios.debtToAssets = dtaMatch[1];
  
  // لكل سهم
  const bvpsMatch = text.match(/القيمة الدفترية للسهم[\s\S]*?(\d+[.,]?\d*)/);
  if(bvpsMatch) data.ratios.bookValuePerShare = bvpsMatch[1];
  
  return JSON.stringify(data);
})()
'''
    try: return json.loads(run_js(js))
    except: return {}

def extract_technical_data():
    """استخراج التحليل الفني"""
    js = r'''
(function(){
  const data = {oscillators: {}, pivot: {}, summary: {}};
  const text = document.body.innerText;
  
  // RSI
  const rsiMatch = text.match(/مؤشر القوة النسبية.*?(\d+[.,]?\d*)/);
  if(rsiMatch) data.oscillators.rsi = rsiMatch[1];
  
  // Stochastic
  const stochMatch = text.match(/ستوكاستك.*?(\d+[.,]?\d*)/);
  if(stochMatch) data.oscillators.stochastic = stochMatch[1];
  
  // MACD
  const macdMatch = text.match(/الماكد.*?(-?\d+[.,]?\d*)/);
  if(macdMatch) data.oscillators.macd = macdMatch[1];
  
  // Pivot Points - جدول
  const pivotMatch = text.match(/\nP\t\n(\d+[.,]?\d*)/);
  if(pivotMatch) data.pivot.pivot = pivotMatch[1];
  
  const r1Match = text.match(/R1\t\n(\d+[.,]?\d*)/);
  if(r1Match) data.pivot.r1 = r1Match[1];
  
  const s1Match = text.match(/S1\t\n(\d+[.,]?\d*)/);
  if(s1Match) data.pivot.s1 = s1Match[1];
  
  // الملخص
  const buyMatch = text.match(/(\d+)\s*شراء/);
  if(buyMatch) data.summary.buy = buyMatch[1];
  
  const sellMatch = text.match(/(\d+)\s*بيع/);
  if(sellMatch) data.summary.sell = sellMatch[1];
  
  const neutralMatch = text.match(/(\d+)\s*حيادية/);
  if(neutralMatch) data.summary.neutral = neutralMatch[1];
  
  return JSON.stringify(data);
})()
'''
    try: return json.loads(run_js(js))
    except: return {}

def extract_forecast_data():
    """استخراج التوقعات"""
    js = r'''
(function(){
  const data = {};
  const text = document.body.innerText;
  
  // السعر المستهدف
  const targetMatch = text.match(/هدف السعر[\s\S]*?(\d+[.,]?\d*)\s*SAR/);
  if(targetMatch) data.targetPrice = targetMatch[1];
  
  // تقديرات
  const maxMatch = text.match(/تقدير أقصى[\s\S]*?(\d+[.,]?\d*)/);
  if(maxMatch) data.maxEstimate = maxMatch[1];
  
  const minMatch = text.match(/تقدير أدنى[\s\S]*?(\d+[.,]?\d*)/);
  if(minMatch) data.minEstimate = minMatch[1];
  
  // عدد المحللين
  const countMatch = text.match(/محلل\s+(\d+)\s+توقعات/);
  if(countMatch) data.analystCount = countMatch[1];
  
  // التوصيات
  const strongBuyMatch = text.match(/شراء قوي[\s\S]*?(\d+)/);
  if(strongBuyMatch) data.strongBuy = strongBuyMatch[1];
  
  const buyMatch = text.match(/\nشراء\s*\n(\d+)/);
  if(buyMatch) data.buy = buyMatch[1];
  
  const holdMatch = text.match(/احتفاظ[\s\S]*?(\d+)/);
  if(holdMatch) data.hold = holdMatch[1];
  
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

def save_stock_data(symbol, exchange, data):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    now = datetime.now().isoformat()
    overview = data.get('overview', {})
    
    try:
        c.execute('SELECT id FROM Stock WHERE symbol=? AND exchange=?', (symbol, exchange))
        row = c.fetchone()
        stock_id = row[0] if row else f'stock_{uuid.uuid4().hex[:12]}'
        
        if not row:
            c.execute('''INSERT INTO Stock (id, symbol, nameEn, sector, industry, isin, exchange, iconUrl, website, foundedYear, createdAt, updatedAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                (stock_id, symbol, overview.get('name', ''), overview.get('sector', ''), overview.get('industry', ''),
                 overview.get('isin', ''), exchange, data.get('iconPath', ''), overview.get('website', ''),
                 int(overview.get('founded', 0)) if overview.get('founded') else None, now, now))
        else:
            c.execute('''UPDATE Stock SET sector=?, industry=?, isin=?, iconUrl=?, website=?, foundedYear=?, updatedAt=?
                WHERE id=?''',
                (overview.get('sector', ''), overview.get('industry', ''), overview.get('isin', ''),
                 data.get('iconPath', ''), overview.get('website', ''),
                 int(overview.get('founded', 0)) if overview.get('founded') else None, now, stock_id))
        
        # StockOverview
        c.execute('DELETE FROM StockOverview WHERE stockId=?', (stock_id,))
        c.execute('''INSERT INTO StockOverview (id, stockId, currentPrice, marketCap, peRatioTTM, dividendYield, eps, beta, employees, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
            (f'ov_{uuid.uuid4().hex[:12]}', stock_id, parse_number(overview.get('price')),
             parse_number(overview.get('marketCap')), parse_number(overview.get('peRatio')),
             parse_number(overview.get('dividendYield')), parse_number(overview.get('eps')),
             parse_number(overview.get('beta')), parse_number(overview.get('employees')), now, now))
        
        # FinancialRatios
        ratios = data.get('financial', {}).get('ratios', {})
        if ratios:
            c.execute('DELETE FROM FinancialRatios WHERE stockId=?', (stock_id,))
            c.execute('''INSERT INTO FinancialRatios (id, stockId, grossMargin, operatingMargin, ebitdaMargin, netMargin, quickRatio, currentRatio, debtToEquity, debtToAssets, bookValuePerShare, createdAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                (f'fr_{uuid.uuid4().hex[:12]}', stock_id, parse_number(ratios.get('grossMargin')),
                 parse_number(ratios.get('operatingMargin')), parse_number(ratios.get('ebitdaMargin')),
                 parse_number(ratios.get('netMargin')), parse_number(ratios.get('quickRatio')),
                 parse_number(ratios.get('currentRatio')), parse_number(ratios.get('debtToEquity')),
                 parse_number(ratios.get('debtToAssets')), parse_number(ratios.get('bookValuePerShare')), now))
        
        # TechnicalIndicators
        tech = data.get('technical', {})
        if tech.get('oscillators') or tech.get('pivot'):
            c.execute('DELETE FROM TechnicalIndicators WHERE stockId=?', (stock_id,))
            osc = tech.get('oscillators', {})
            pivot = tech.get('pivot', {})
            c.execute('''INSERT INTO TechnicalIndicators (id, stockId, rsi, stochasticK, macd, pivotPoint, r1, s1, createdAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                (f'ti_{uuid.uuid4().hex[:12]}', stock_id, parse_number(osc.get('rsi')),
                 parse_number(osc.get('stochastic')), parse_number(osc.get('macd')),
                 parse_number(pivot.get('pivot')), parse_number(pivot.get('r1')),
                 parse_number(pivot.get('s1')), now))
        
        # AnalystForecasts
        forecast = data.get('forecast', {})
        if forecast:
            c.execute('DELETE FROM AnalystForecasts WHERE stockId=?', (stock_id,))
            c.execute('''INSERT INTO AnalystForecasts (id, stockId, targetPrice, maxEstimate, minEstimate, analystCount, strongBuy, buyRating, holdRating, createdAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                (f'af_{uuid.uuid4().hex[:12]}', stock_id, parse_number(forecast.get('targetPrice')),
                 parse_number(forecast.get('maxEstimate')), parse_number(forecast.get('minEstimate')),
                 int(forecast.get('analystCount', 0) or 0), int(forecast.get('strongBuy', 0) or 0),
                 int(forecast.get('buy', 0) or 0), int(forecast.get('hold', 0) or 0), now))
        
        conn.commit()
        return True
    except Exception as e:
        print(f"\n      خطأ: {e}")
        return False
    finally:
        conn.close()

def scrape_stock(symbol, exchange):
    tv_exchange = TV_EXCHANGES.get(exchange, exchange)
    base_url = f"https://ar.tradingview.com/symbols/{tv_exchange}-{symbol}"
    
    all_data = {'overview': {}, 'financial': {}, 'technical': {}, 'forecast': {}}
    
    # 1. نظرة عامة
    print("نظرة عامة...", end=' ')
    if open_page(f"{base_url}/"):
        all_data['overview'] = extract_overview_data()
        logo_url = all_data['overview'].get('logoUrl')
        if logo_url: all_data['iconPath'] = download_icon(symbol, logo_url)
        print("✓", end=' ')
    else: print("✗", end=' ')
    time.sleep(1)
    
    # 2. المالية
    print("المالية...", end=' ')
    if open_page(f"{base_url}/financials-overview/"):
        all_data['financial'] = extract_financial_data()
        print("✓", end=' ')
    else: print("✗", end=' ')
    time.sleep(1)
    
    # 3. الفني
    print("الفني...", end=' ')
    if open_page(f"{base_url}/technicals/"):
        all_data['technical'] = extract_technical_data()
        print("✓", end=' ')
    else: print("✗", end=' ')
    time.sleep(1)
    
    # 4. التوقعات
    print("التوقعات...", end=' ')
    if open_page(f"{base_url}/forecast/"):
        all_data['forecast'] = extract_forecast_data()
        print("✓")
    else: print("✗")
    
    return all_data

def scrape_exchange(exchange, limit=None):
    print(f"\n{'='*60}\n📊 استخراج: {exchange}\n{'='*60}")
    
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    query = f"SELECT symbol FROM Stock WHERE exchange = '{exchange}' ORDER BY symbol"
    if limit: query += f" LIMIT {limit}"
    c.execute(query)
    stocks = [row[0] for row in c.fetchall()]
    conn.close()
    
    print(f"   عدد الأسهم: {len(stocks)}")
    success = 0
    
    for i, symbol in enumerate(stocks):
        print(f"   [{i+1}/{len(stocks)}] {symbol}:", end=' ')
        try:
            data = scrape_stock(symbol, exchange)
            if save_stock_data(symbol, exchange, data): success += 1
        except Exception as e:
            print(f"خطأ: {e}")
        time.sleep(2)
    
    close_browser()
    print(f"\n   ✅ تم حفظ {success}/{len(stocks)} سهم")

def main():
    print("\n" + "="*60 + "\n🏛️ مستخرج البيانات الشامل من TradingView v2\n" + "="*60)
    
    import sys
    exchanges = ['KSA', 'EGX', 'KSE', 'QE', 'UAE', 'BAH']
    
    if len(sys.argv) > 1:
        exchange = sys.argv[1].upper()
        limit = int(sys.argv[2]) if len(sys.argv) > 2 else None
        if exchange in exchanges: scrape_exchange(exchange, limit)
        else: print(f"❌ البورصة غير موجودة. المتاح: {', '.join(exchanges)}")
    else:
        for exchange in exchanges: scrape_exchange(exchange)
    
    print("\n" + "="*60 + "\n🎉 انتهى الاستخراج!\n" + "="*60 + "\n")

if __name__ == '__main__':
    main()
