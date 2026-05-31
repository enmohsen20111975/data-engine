#!/usr/bin/env python3
"""
🏛️ مستخرج البيانات الشامل من TradingView
يسحب كل البيانات المتاحة من صفحة السهم
"""
import subprocess
import json
import sqlite3
import base64
import time
import uuid
import os
import re
from datetime import datetime

DB_PATH = '/home/z/my-project/db/data-factory.db'
ICON_DIR = '/home/z/my-project/public/stock-icons'

# ترجمة رموز البورصات
TV_EXCHANGES = {
    'KSA': 'TADAWUL',
    'EGX': 'EGX',
    'KSE': 'KSE',
    'QE': 'QE',
    'UAE': 'ADX',
    'BAH': 'BSE',
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

def open_page(url):
    """فتح صفحة"""
    subprocess.run("agent-browser close", shell=True, capture_output=True)
    result = subprocess.run(f'agent-browser open "{url}" --timeout 30', shell=True, capture_output=True, text=True)
    time.sleep(3)
    return 'error' not in result.stdout.lower()

def close_browser():
    """إغلاق المتصفح"""
    subprocess.run("agent-browser close", shell=True, capture_output=True)

def parse_number(val):
    """تحويل النص لرقم"""
    if not val or val in ['—', '-', 'N/A', '']:
        return None
    try:
        # إزالة الوحدات
        val = str(val)
        for char in [',', 'SAR', 'KWD', 'EGP', 'AED', 'QAR', 'BHD', '%']:
            val = val.replace(char, '')
        
        # تحويل T, B, M
        multipliers = {'T': 1e12, 'B': 1e9, 'M': 1e6, 'K': 1e3}
        for suffix, mult in multipliers.items():
            if suffix in val.upper():
                val = val.upper().replace(suffix, '')
                return float(val) * mult
        
        return float(val.replace('−', '-').strip())
    except:
        return None

def extract_overview_data():
    """استخراج البيانات من صفحة نظرة عامة"""
    js = r'''
(function(){
  const data = {};
  const text = document.body.innerText;
  const lines = text.split('\n');
  
  for(let i=0; i<lines.length; i++){
    const line = lines[i].trim();
    const next = lines[i+1]?.trim() || '';
    
    // السعر الحالي
    if(line.includes('SAR') || line.includes('KWD') || line.includes('EGP') || line.includes('AED') || line.includes('QAR') || line.includes('BHD')){
      const match = line.match(/(\d+\.?\d*)\s*(SAR|KWD|EGP|AED|QAR|BHD)/);
      if(match) data.price = match[1];
    }
    
    // القيمة السوقية
    if(line.includes('القيمة السوقية')) data.marketCap = next;
    
    // P/E
    if(line.includes('السعر إلى نسبة الأرباح')) data.peRatio = next;
    
    // EPS
    if(line.includes('الأرباح لكل سهم')) data.eps = next;
    
    // عائد التوزيعات
    if(line.includes('عائد توزيعات')) data.dividendYield = next;
    
    // Beta
    if(line.includes('بيتا') && !line.includes('البيتا')) data.beta = next;
    
    // الموظفين
    if(line.includes('الموظفون') || line.includes('الموظفين')) data.employees = next;
    
    // CEO
    if(line.includes('المدير التنفيذي')) data.ceo = next;
    
    // الموقع
    if(line.includes('الموقع الإلكتروني')) data.website = next;
    
    // التأسيس
    if(line.includes('التأسيس')) data.founded = next;
    
    // ISIN
    if(line.includes('ISIN')) data.isin = next.split(' ')[0];
  }
  
  // أيقونة السهم
  const imgs = document.querySelectorAll('img');
  for(let img of imgs){
    const src = img.src || '';
    if(src.includes('logo') || src.includes('symbol-logo')){
      data.logoUrl = src;
      break;
    }
  }
  
  // القطاع والصناعة
  const sectorMatch = text.match(/قطاع\s*\n\s*([^\n]+)/);
  if(sectorMatch) data.sector = sectorMatch[1];
  
  const industryMatch = text.match(/صناعة\s*\n\s*([^\n]+)/);
  if(industryMatch) data.industry = industryMatch[1];
  
  return JSON.stringify(data);
})()
'''
    result = run_js(js)
    try:
        return json.loads(result)
    except:
        return {}

def extract_financial_data():
    """استخراج البيانات المالية"""
    js = r'''
(function(){
  const data = {income: {}, balance: {}, cashflow: {}, ratios: {}};
  const text = document.body.innerText;
  const lines = text.split('\n');
  
  for(let i=0; i<lines.length; i++){
    const line = lines[i].trim();
    const next = lines[i+1]?.trim() || '';
    
    // نسب الربحية
    if(line.includes('هامش الربح') && !line.includes('صافي')) data.ratios.grossMargin = next;
    if(line.includes('هامش التشغيل')) data.ratios.operatingMargin = next;
    if(line.includes('هامش EBITDA')) data.ratios.ebitdaMargin = next;
    if(line.includes('صافي الهامش')) data.ratios.netMargin = next;
    
    // نسب السيولة
    if(line.includes('السيولة السريعة')) data.ratios.quickRatio = next;
    if(line.includes('النسبة الجارية')) data.ratios.currentRatio = next;
    
    // نسب الملاءة
    if(line.includes('الدين إلى الأصول')) data.ratios.debtToAssets = next;
    if(line.includes('الدين إلى حقوق')) data.ratios.debtToEquity = next;
    
    // لكل سهم
    if(line.includes('العائد لكل سهم')) data.ratios.revenuePerShare = next;
    if(line.includes('EBITDA لكل سهم')) data.ratios.ebitdaPerShare = next;
    if(line.includes('القيمة الدفترية للسهم')) data.ratios.bookValuePerShare = next;
    
    // الإيرادات والأرباح
    if(line.includes('الإيرادات') && !line.includes('تفاصيل')) data.income.revenue = next;
    if(line.includes('صافي الربح')) data.income.netIncome = next;
    if(line.includes('EBITDA') && !line.includes('لكل')) data.income.ebitda = next;
    if(line.includes('EBIT') && !line.includes('لكل') && !line.includes('EBITDA')) data.income.ebit = next;
  }
  
  return JSON.stringify(data);
})()
'''
    result = run_js(js)
    try:
        return json.loads(result)
    except:
        return {}

def extract_technical_data():
    """استخراج التحليل الفني"""
    js = r'''
(function(){
  const data = {oscillators: {}, movingAverages: {}, pivot: {}};
  const text = document.body.innerText;
  const lines = text.split('\n');
  
  for(let i=0; i<lines.length; i++){
    const line = lines[i].trim();
    const next = lines[i+1]?.trim() || '';
    
    // RSI
    if(line.includes('مؤشر القوة النسبية') || line.includes('RSI')){
      const match = line.match(/(\d+\.?\d*)/);
      if(match) data.oscillators.rsi = match[1];
    }
    
    // Stochastic
    if(line.includes('ستوكاستك') || line.includes('Stochastic')){
      const match = line.match(/(\d+\.?\d*)/);
      if(match) data.oscillators.stochastic = match[1];
    }
    
    // MACD
    if(line.includes('الماكد') || line.includes('MACD')){
      const match = line.match(/(-?\d+\.?\d*)/);
      if(match) data.oscillators.macd = match[1];
    }
    
    // Pivot Points
    if(line.includes('P\t') || line === 'P'){
      data.pivot.pivot = lines[i+1]?.trim();
    }
    if(line === 'R1') data.pivot.r1 = next;
    if(line === 'R2') data.pivot.r2 = next;
    if(line === 'R3') data.pivot.r3 = next;
    if(line === 'S1') data.pivot.s1 = next;
    if(line === 'S2') data.pivot.s2 = next;
    if(line === 'S3') data.pivot.s3 = next;
  }
  
  // الملخص
  const summaryMatch = text.match(/الملخص[\s\S]*?(\d+)\s*حيادية\s*(\d+)\s*شراء\s*(\d+)\s*بيع/);
  if(summaryMatch){
    data.summary = {
      neutral: summaryMatch[1],
      buy: summaryMatch[2],
      sell: summaryMatch[3]
    };
  }
  
  return JSON.stringify(data);
})()
'''
    result = run_js(js)
    try:
        return json.loads(result)
    except:
        return {}

def extract_forecast_data():
    """استخراج التوقعات"""
    js = r'''
(function(){
  const data = {};
  const text = document.body.innerText;
  const lines = text.split('\n');
  
  for(let i=0; i<lines.length; i++){
    const line = lines[i].trim();
    const next = lines[i+1]?.trim() || '';
    
    // السعر المستهدف
    if(line.includes('هدف السعر') || line.includes('السعر المستهدف')){
      const match = next.match(/(\d+\.?\d*)/);
      if(match) data.targetPrice = match[1];
    }
    
    // تقديرات
    if(line.includes('أقصى تقدير') || line.includes('تقدير أقصى')){
      const match = next.match(/(\d+\.?\d*)/);
      if(match) data.maxEstimate = match[1];
    }
    if(line.includes('أدنى تقدير') || line.includes('تقدير أدنى')){
      const match = next.match(/(\d+\.?\d*)/);
      if(match) data.minEstimate = match[1];
    }
    
    // عدد المحللين
    if(line.includes('محلل') && line.includes('توقعات')){
      const match = line.match(/(\d+)/);
      if(match) data.analystCount = match[1];
    }
    
    // التوصيات
    if(line.includes('شراء قوي')) data.strongBuy = next;
    if(line === 'شراء' && !line.includes('قوي')) data.buy = next;
    if(line.includes('احتفاظ')) data.hold = next;
    if(line === 'بيع' && !line.includes('قوي')) data.sell = next;
  }
  
  return JSON.stringify(data);
})()
'''
    result = run_js(js)
    try:
        return json.loads(result)
    except:
        return {}

def download_icon(symbol, url):
    """تحميل أيقونة السهم"""
    if not url:
        return None
    
    try:
        import urllib.request
        ext = '.svg' if '.svg' in url else '.png'
        path = f"{ICON_DIR}/{symbol}{ext}"
        os.makedirs(ICON_DIR, exist_ok=True)
        urllib.request.urlretrieve(url, path)
        return f"/stock-icons/{symbol}{ext}"
    except:
        return None

def save_stock_data(symbol, exchange, data):
    """حفظ كل البيانات في الداتابيز"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    now = datetime.now().isoformat()
    
    # تحديث بيانات السهم
    overview = data.get('overview', {})
    
    try:
        c.execute('SELECT id FROM Stock WHERE symbol=? AND exchange=?', (symbol, exchange))
        row = c.fetchone()
        
        if row:
            stock_id = row[0]
            c.execute('''
                UPDATE Stock SET 
                    nameEn = ?, nameAr = ?, sector = ?, industry = ?, isin = ?, iconUrl = ?, updatedAt = ?
                WHERE id = ?
            ''', (
                overview.get('name', ''),
                overview.get('nameAr', ''),
                overview.get('sector', ''),
                overview.get('industry', ''),
                overview.get('isin', ''),
                data.get('iconPath', ''),
                now,
                stock_id
            ))
        else:
            stock_id = f'stock_{uuid.uuid4().hex[:12]}'
            c.execute('''
                INSERT INTO Stock (id, symbol, nameEn, sector, industry, isin, exchange, iconUrl, createdAt, updatedAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                stock_id, symbol,
                overview.get('name', ''),
                overview.get('sector', ''),
                overview.get('industry', ''),
                overview.get('isin', ''),
                exchange,
                data.get('iconPath', ''),
                now, now
            ))
        
        # حفظ نظرة عامة
        c.execute('DELETE FROM StockOverview WHERE stockId=?', (stock_id,))
        c.execute('''
            INSERT INTO StockOverview (id, stockId, currentPrice, marketCap, peRatioTTM, dividendYield, eps, beta, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            f'ov_{uuid.uuid4().hex[:12]}', stock_id,
            parse_number(overview.get('price')),
            parse_number(overview.get('marketCap')),
            parse_number(overview.get('peRatio')),
            parse_number(overview.get('dividendYield')),
            parse_number(overview.get('eps')),
            parse_number(overview.get('beta')),
            now, now
        ))
        
        # حفظ النسب المالية
        ratios = data.get('financial', {}).get('ratios', {})
        if ratios:
            c.execute('DELETE FROM FinancialRatios WHERE stockId=?', (stock_id,))
            c.execute('''
                INSERT INTO FinancialRatios (id, stockId, grossMargin, operatingMargin, ebitdaMargin, netMargin, quickRatio, currentRatio, debtToEquity, debtToAssets, createdAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                f'fr_{uuid.uuid4().hex[:12]}', stock_id,
                parse_number(ratios.get('grossMargin')),
                parse_number(ratios.get('operatingMargin')),
                parse_number(ratios.get('ebitdaMargin')),
                parse_number(ratios.get('netMargin')),
                parse_number(ratios.get('quickRatio')),
                parse_number(ratios.get('currentRatio')),
                parse_number(ratios.get('debtToEquity')),
                parse_number(ratios.get('debtToAssets')),
                now
            ))
        
        # حفظ التحليل الفني
        tech = data.get('technical', {})
        if tech:
            c.execute('DELETE FROM TechnicalIndicators WHERE stockId=?', (stock_id,))
            osc = tech.get('oscillators', {})
            pivot = tech.get('pivot', {})
            c.execute('''
                INSERT INTO TechnicalIndicators (id, stockId, rsi, stochasticK, macd, pivotPoint, r1, r2, r3, s1, s2, s3, createdAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                f'ti_{uuid.uuid4().hex[:12]}', stock_id,
                parse_number(osc.get('rsi')),
                parse_number(osc.get('stochastic')),
                parse_number(osc.get('macd')),
                parse_number(pivot.get('pivot')),
                parse_number(pivot.get('r1')),
                parse_number(pivot.get('r2')),
                parse_number(pivot.get('r3')),
                parse_number(pivot.get('s1')),
                parse_number(pivot.get('s2')),
                parse_number(pivot.get('s3')),
                now
            ))
        
        # حفظ التوقعات
        forecast = data.get('forecast', {})
        if forecast:
            c.execute('DELETE FROM AnalystForecasts WHERE stockId=?', (stock_id,))
            c.execute('''
                INSERT INTO AnalystForecasts (id, stockId, targetPrice, maxEstimate, minEstimate, analystCount, buyRating, holdRating, sellRating, createdAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                f'af_{uuid.uuid4().hex[:12]}', stock_id,
                parse_number(forecast.get('targetPrice')),
                parse_number(forecast.get('maxEstimate')),
                parse_number(forecast.get('minEstimate')),
                int(forecast.get('analystCount', 0) or 0),
                int(forecast.get('buy', 0) or 0) + int(forecast.get('strongBuy', 0) or 0),
                int(forecast.get('hold', 0) or 0),
                int(forecast.get('sell', 0) or 0),
                now
            ))
        
        conn.commit()
        return True
    
    except Exception as e:
        print(f"      خطأ في الحفظ: {e}")
        return False
    
    finally:
        conn.close()

def scrape_stock(symbol, exchange):
    """استخراج كل بيانات سهم"""
    tv_exchange = TV_EXCHANGES.get(exchange, exchange)
    base_url = f"https://ar.tradingview.com/symbols/{tv_exchange}-{symbol}"
    
    all_data = {'overview': {}, 'financial': {}, 'technical': {}, 'forecast': {}}
    
    # 1. صفحة نظرة عامة
    print("      نظرة عامة...", end=' ')
    if open_page(f"{base_url}/"):
        all_data['overview'] = extract_overview_data()
        
        # تحميل الأيقونة
        logo_url = all_data['overview'].get('logoUrl')
        if logo_url:
            all_data['iconPath'] = download_icon(symbol, logo_url)
        
        print("✓", end=' ')
    else:
        print("✗", end=' ')
    
    time.sleep(1)
    
    # 2. القوائم المالية
    print("المالية...", end=' ')
    if open_page(f"{base_url}/financials-overview/"):
        all_data['financial'] = extract_financial_data()
        print("✓", end=' ')
    else:
        print("✗", end=' ')
    
    time.sleep(1)
    
    # 3. التحليل الفني
    print("الفني...", end=' ')
    if open_page(f"{base_url}/technicals/"):
        all_data['technical'] = extract_technical_data()
        print("✓", end=' ')
    else:
        print("✗", end=' ')
    
    time.sleep(1)
    
    # 4. التوقعات
    print("التوقعات...", end=' ')
    if open_page(f"{base_url}/forecast/"):
        all_data['forecast'] = extract_forecast_data()
        print("✓")
    else:
        print("✗")
    
    return all_data

def scrape_exchange(exchange, limit=None):
    """استخراج بيانات بورصة كاملة"""
    print(f"\n{'='*60}")
    print(f"📊 استخراج: {exchange}")
    print(f"{'='*60}")
    
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    query = f"SELECT symbol FROM Stock WHERE exchange = '{exchange}' ORDER BY symbol"
    if limit:
        query += f" LIMIT {limit}"
    
    c.execute(query)
    stocks = [row[0] for row in c.fetchall()]
    conn.close()
    
    print(f"   عدد الأسهم: {len(stocks)}")
    
    success = 0
    for i, symbol in enumerate(stocks):
        print(f"   [{i+1}/{len(stocks)}] {symbol}:", end=' ')
        
        try:
            data = scrape_stock(symbol, exchange)
            if save_stock_data(symbol, exchange, data):
                success += 1
        except Exception as e:
            print(f"      خطأ: {e}")
        
        time.sleep(2)
    
    close_browser()
    print(f"\n   ✅ تم حفظ {success}/{len(stocks)} سهم")

def main():
    print("\n" + "="*60)
    print("🏛️ مستخرج البيانات الشامل من TradingView")
    print("="*60)
    
    import sys
    
    exchanges = ['KSA', 'EGX', 'KSE', 'QE', 'UAE', 'BAH']
    
    if len(sys.argv) > 1:
        exchange = sys.argv[1].upper()
        limit = int(sys.argv[2]) if len(sys.argv) > 2 else None
        
        if exchange in exchanges:
            scrape_exchange(exchange, limit)
        else:
            print(f"❌ البورصة غير موجودة. المتاح: {', '.join(exchanges)}")
    else:
        # استخراج كل البورصات
        for exchange in exchanges:
            scrape_exchange(exchange)
    
    print("\n" + "="*60)
    print("🎉 انتهى الاستخراج!")
    print("="*60 + "\n")

if __name__ == '__main__':
    main()
