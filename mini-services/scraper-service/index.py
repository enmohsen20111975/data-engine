#!/usr/bin/env python3
"""
Data Engine - Complete Arabic Stock Exchange Scraper
Single server on port 5001
"""
import subprocess
import re
import time
import uuid
import json
import sqlite3
import threading
from datetime import datetime
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

app = Flask(__name__)
CORS(app)
DB_PATH = '/home/z/my-project/db/data-factory.db'

EXCHANGES = {
    'KSA': {'name': 'السعودية', 'code': 'stocks-ksa'},
    'EGX': {'name': 'مصر', 'code': 'stocks-egypt'},
    'KSE': {'name': 'الكويت', 'code': 'stocks-kuwait'},
    'QE': {'name': 'قطر', 'code': 'stocks-qatar'},
    'UAE': {'name': 'الإمارات', 'code': 'stocks-uae'},
    'BAH': {'name': 'البحرين', 'code': 'stocks-bahrain'},
}

# Global state
state = {
    'is_running': False,
    'progress': 0,
    'exchange': '',
    'stock': '',
    'processed': 0,
    'total': 0,
    'failed': 0,
    'logs': []
}

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def log(msg, level='info'):
    state['logs'].insert(0, {
        'time': datetime.now().isoformat(),
        'level': level,
        'msg': msg
    })
    state['logs'] = state['logs'][:100]
    print(f"[{level}] {msg}")

def run_js(js, timeout=30):
    try:
        escaped = js.replace("'", "'\"'\"'")
        cmd = f"agent-browser eval '{escaped}'"
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=timeout)
        output = result.stdout.strip()
        if output.startswith('"') and output.endswith('"'):
            output = output[1:-1]
        return output
    except Exception as e:
        print(f"[JS] Error: {e}")
        return ""

def run_cmd(cmd, timeout=60):
    try:
        full_cmd = f"agent-browser {cmd}"
        subprocess.run(full_cmd, shell=True, capture_output=True, text=True, timeout=timeout)
    except:
        pass

def parse_num(txt):
    if not txt or txt in ['—', '-', '']:
        return None
    txt = str(txt).replace(',', '').replace('EGP', '').replace('SAR', '').replace('AED', '')
    txt = txt.replace('QAR', '').replace('KWD', '').replace('BHD', '').replace('USD', '')
    txt = txt.replace('−', '-').replace('+', '').replace('%', '').strip()
    txt = re.sub(r'[^\d.\-KMBkmb]', '', txt)
    try:
        mult = 1
        if 'K' in txt.upper():
            mult = 1000
            txt = re.sub(r'[Kk]', '', txt)
        elif 'M' in txt.upper():
            mult = 1000000
            txt = re.sub(r'[Mm]', '', txt)
        elif 'B' in txt.upper():
            mult = 1000000000
            txt = re.sub(r'[Bb]', '', txt)
        return float(txt.strip()) * mult if txt.strip() else None
    except:
        return None

@app.route('/')
def index():
    return '''<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>🏭 مصنع البيانات - Arabic Stock Data Engine v2</title>
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
<meta http-equiv="Pragma" content="no-cache">
<meta http-equiv="Expires" content="0">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',system-ui;background:linear-gradient(135deg,#0a0a0f 0%,#1a1a2e 100%);color:#fff;min-height:100vh;padding:20px}
.container{max-width:1400px;margin:0 auto}
h1{font-size:28px;background:linear-gradient(90deg,#4ade80,#60a5fa);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:8px}
.subtitle{opacity:0.6;margin-bottom:24px}

.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;margin-bottom:24px}
.stat-card{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:20px;transition:all 0.3s}
.stat-card:hover{border-color:rgba(74,222,128,0.3);background:rgba(255,255,255,0.05)}
.stat-value{font-size:32px;font-weight:bold;margin-bottom:4px}
.stat-label{font-size:13px;opacity:0.6}
.stat-card.green .stat-value{color:#4ade80}
.stat-card.blue .stat-value{color:#60a5fa}
.stat-card.yellow .stat-value{color:#fbbf24}
.stat-card.pink .stat-value{color:#f472b6}

.progress-section{background:rgba(74,222,128,0.05);border:1px solid rgba(74,222,128,0.2);border-radius:16px;padding:20px;margin-bottom:24px}
.progress-header{display:flex;justify-content:space-between;margin-bottom:12px;font-size:14px}
.progress-bar{height:8px;background:rgba(255,255,255,0.1);border-radius:4px;overflow:hidden}
.progress-fill{height:100%;background:linear-gradient(90deg,#4ade80,#60a5fa);transition:width 0.3s}
.progress-stats{display:flex;gap:24px;margin-top:12px;font-size:13px;opacity:0.7}

.controls{display:flex;gap:12px;margin-bottom:24px;flex-wrap:wrap}
select,.btn{padding:12px 20px;border-radius:10px;font-size:14px;border:none;cursor:pointer;transition:all 0.2s}
select{background:rgba(255,255,255,0.1);color:#fff;border:1px solid rgba(255,255,255,0.2)}
select option{background:#1a1a2e;color:#fff}
.btn-primary{background:linear-gradient(135deg,#4ade80,#22c55e);color:#000;font-weight:600}
.btn-primary:hover{transform:translateY(-2px);box-shadow:0 4px 20px rgba(74,222,128,0.3)}
.btn-danger{background:#ef4444;color:#fff}
.btn-secondary{background:rgba(255,255,255,0.1);color:#fff;border:1px solid rgba(255,255,255,0.2)}
.btn:disabled{opacity:0.5;cursor:not-allowed;transform:none}

.logs{background:rgba(0,0,0,0.3);border-radius:16px;padding:16px;margin-bottom:24px;max-height:300px;overflow-y:auto}
.logs-title{font-size:14px;opacity:0.6;margin-bottom:12px}
.log-entry{padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:13px;display:flex;gap:12px}
.log-time{opacity:0.4;min-width:70px}
.log-level{min-width:60px;font-weight:600}
.log-level.error{color:#f87171}
.log-level.success{color:#4ade80}
.log-level.warning{color:#fbbf24}
.log-level.info{color:#60a5fa}

.table-container{background:rgba(255,255,255,0.03);border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.08)}
.table-header{display:grid;grid-template-columns:1fr 2fr 1fr 1fr 1fr;padding:16px;background:rgba(255,255,255,0.03);font-weight:600;font-size:13px}
.table-body{max-height:400px;overflow-y:auto}
.table-row{display:grid;grid-template-columns:1fr 2fr 1fr 1fr 1fr;padding:14px 16px;border-top:1px solid rgba(255,255,255,0.05);font-size:14px;transition:background 0.2s}
.table-row:hover{background:rgba(255,255,255,0.02)}
.symbol{color:#4ade80;font-weight:600}
.exchange-badge{background:rgba(255,255,255,0.1);padding:2px 8px;border-radius:4px;font-size:12px}

footer{text-align:center;padding:24px;opacity:0.4;font-size:13px;margin-top:24px}

@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
.loading{animation:pulse 1.5s infinite}
</style>
</head>
<body>
<div class="container">
    <h1>🏭 مصنع البيانات</h1>
    <p class="subtitle">Arabic Stock Exchange Data Engine</p>

    <div class="stats">
        <div class="stat-card green">
            <div class="stat-value" id="stocks">0</div>
            <div class="stat-label">الأسهم</div>
        </div>
        <div class="stat-card blue">
            <div class="stat-value" id="overview">0</div>
            <div class="stat-label">نظرة عامة</div>
        </div>
        <div class="stat-card yellow">
            <div class="stat-value" id="marketCap">0</div>
            <div class="stat-label">قيمة سوقية</div>
        </div>
        <div class="stat-card pink">
            <div class="stat-value" id="exchanges">0</div>
            <div class="stat-label">البورصات</div>
        </div>
    </div>

    <div class="progress-section" id="progressSection" style="display:none">
        <div class="progress-header">
            <span>🔄 جارٍ الاستخراج: <span id="exchangeName"></span></span>
            <span><span id="progressPercent">0</span>%</span>
        </div>
        <div class="progress-bar">
            <div class="progress-fill" id="progressFill" style="width:0%"></div>
        </div>
        <div class="progress-stats">
            <span>✅ تم: <span id="processed">0</span></span>
            <span>❌ فشل: <span id="failed">0</span></span>
            <span>📊 المجموع: <span id="total">0</span></span>
            <span>السهم الحالي: <span id="currentStock">-</span></span>
        </div>
    </div>

    <div class="controls">
        <select id="exchangeSelect">
            <option value="BAH">🇧🇭 البحرين</option>
            <option value="QE">🇶🇦 قطر</option>
            <option value="KSE">🇰🇼 الكويت</option>
            <option value="EGX" selected>🇪🇬 مصر</option>
            <option value="KSA">🇸🇦 السعودية</option>
            <option value="UAE">🇦🇪 الإمارات</option>
        </select>
        <button class="btn btn-primary" id="startBtn" onclick="startScraping()">▶️ بدء الاستخراج</button>
        <button class="btn btn-secondary" onclick="refresh()">🔄 تحديث</button>
        <button class="btn btn-secondary" onclick="clearData()">🗑️ تفريغ البيانات</button>
    </div>

    <div class="logs" id="logsContainer" style="display:none">
        <div class="logs-title">📋 سجل العمليات</div>
        <div id="logsBody"></div>
    </div>

    <div class="table-container">
        <div class="table-header">
            <span>الرمز</span>
            <span>الاسم</span>
            <span>البورصة</span>
            <span>السعر</span>
            <span>القيمة السوقية</span>
        </div>
        <div class="table-body" id="stocksBody">
            <div class="table-row"><span style="opacity:0.5">جارٍ التحميل...</span></div>
        </div>
    </div>

    <footer>
        Python Flask Backend • SQLite Database • TradingView Arabic Data
    </footer>
</div>

<script>
let running = false;
const API = '/?XTransformPort=5001';

function refresh() {
    fetch('/api/stats?XTransformPort=5001').then(r => r.json()).then(d => {
        if(d.s) {
            document.getElementById('stocks').textContent = d.s.stocks || 0;
            document.getElementById('overview').textContent = d.s.overview || 0;
            document.getElementById('marketCap').textContent = d.s.withMarketCap || 0;
            document.getElementById('exchanges').textContent = d.s.exchanges || 0;
        }
    });

    fetch('/api/status?XTransformPort=5001').then(r => r.json()).then(d => {
        if(!d.s) return;
        running = d.s.is_running;
        const ps = document.getElementById('progressSection');
        const btn = document.getElementById('startBtn');
        const select = document.getElementById('exchangeSelect');

        if(running) {
            ps.style.display = 'block';
            btn.textContent = '⏹️ إيقاف';
            btn.className = 'btn btn-danger';
            select.disabled = true;

            document.getElementById('exchangeName').textContent = d.s.exchange || '-';
            document.getElementById('progressPercent').textContent = (d.s.progress || 0).toFixed(0);
            document.getElementById('progressFill').style.width = (d.s.progress || 0) + '%';
            document.getElementById('processed').textContent = d.s.processed || 0;
            document.getElementById('failed').textContent = d.s.failed || 0;
            document.getElementById('total').textContent = d.s.total || 0;
            document.getElementById('currentStock').textContent = d.s.stock || '-';
        } else {
            ps.style.display = 'none';
            btn.textContent = '▶️ بدء الاستخراج';
            btn.className = 'btn btn-primary';
            select.disabled = false;
        }

        // Logs
        const logs = d.s.logs || [];
        if(logs.length > 0) {
            document.getElementById('logsContainer').style.display = 'block';
            let html = '';
            logs.slice(0, 30).forEach(l => {
                const time = (l.time || '').split('T')[1]?.split('.')[0] || '';
                html += `<div class="log-entry">
                    <span class="log-time">${time}</span>
                    <span class="log-level ${l.level || 'info'}">[${l.level || 'info'}]</span>
                    <span>${l.msg}</span>
                </div>`;
            });
            document.getElementById('logsBody').innerHTML = html;
        }
    });

    fetch('/api/stocks?exchange=' + document.getElementById('exchangeSelect').value + '&XTransformPort=5001')
        .then(r => r.json())
        .then(d => {
            if(d.stocks && d.stocks.length > 0) {
                let html = '';
                d.stocks.forEach(s => {
                    html += `<div class="table-row">
                        <span class="symbol">${s.symbol}</span>
                        <span>${s.nameEn || s.nameAr || '-'}</span>
                        <span><span class="exchange-badge">${s.exchange}</span></span>
                        <span>${s.currentPrice || '-'}</span>
                        <span>${s.marketCap ? formatNum(s.marketCap) : '-'}</span>
                    </div>`;
                });
                document.getElementById('stocksBody').innerHTML = html;
            } else {
                document.getElementById('stocksBody').innerHTML = '<div class="table-row"><span style="opacity:0.5">لا توجد بيانات</span></div>';
            }
        });
}

function formatNum(n) {
    if(n >= 1e9) return (n/1e9).toFixed(1) + 'B';
    if(n >= 1e6) return (n/1e6).toFixed(1) + 'M';
    if(n >= 1e3) return (n/1e3).toFixed(1) + 'K';
    return n.toFixed(2);
}

function startScraping() {
    if(running) {
        fetch('/api/stop?XTransformPort=5001', {method: 'POST'});
    } else {
        const exchange = document.getElementById('exchangeSelect').value;
        fetch('/api/start?XTransformPort=5001', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({exchange})
        });
    }
}

function clearData() {
    if(confirm('هل أنت متأكد من تفريغ جميع البيانات؟')) {
        fetch('/api/clear?XTransformPort=5001', {method: 'POST'}).then(refresh);
    }
}

refresh();
setInterval(refresh, 10000);
</script>
</body>
</html>'''

@app.route('/api/status')
def api_status():
    return jsonify({'s': state})

@app.route('/api/stats')
def api_stats():
    try:
        conn = get_db()
        c = conn.cursor()
        c.execute('SELECT COUNT(*) FROM Stock')
        stocks = c.fetchone()[0]
        c.execute('SELECT COUNT(*) FROM StockOverview WHERE currentPrice IS NOT NULL')
        overview = c.fetchone()[0]
        c.execute('SELECT COUNT(DISTINCT exchange) FROM Stock')
        exchanges = c.fetchone()[0]
        c.execute('SELECT COUNT(*) FROM StockOverview WHERE marketCap IS NOT NULL')
        withMarketCap = c.fetchone()[0]
        conn.close()
        return jsonify({'s': {'stocks': stocks, 'overview': overview, 'exchanges': exchanges, 'withMarketCap': withMarketCap}})
    except Exception as e:
        return jsonify({'e': str(e)})

@app.route('/api/stocks')
def api_stocks():
    exchange = request.args.get('exchange', 'EGX')
    try:
        conn = get_db()
        c = conn.cursor()
        c.execute('''
            SELECT s.symbol, s.nameEn, s.nameAr, s.exchange, so.currentPrice, so.marketCap
            FROM Stock s
            LEFT JOIN StockOverview so ON s.id = so.stockId
            WHERE s.exchange = ?
            ORDER BY s.symbol
            LIMIT 100
        ''', (exchange,))
        rows = c.fetchall()
        stocks = []
        for r in rows:
            stocks.append({
                'symbol': r[0],
                'nameEn': r[1],
                'nameAr': r[2],
                'exchange': r[3],
                'currentPrice': r[4],
                'marketCap': r[5]
            })
        conn.close()
        return jsonify({'stocks': stocks})
    except Exception as e:
        return jsonify({'stocks': [], 'error': str(e)})

@app.route('/api/start', methods=['POST'])
def api_start():
    global state
    if state['is_running']:
        return jsonify({'error': 'Already running'})

    data = request.json or {}
    exchange = data.get('exchange', 'EGX')

    # Reset state
    state = {
        'is_running': True,
        'progress': 0,
        'exchange': exchange,
        'stock': '',
        'processed': 0,
        'total': 0,
        'failed': 0,
        'logs': []
    }

    # Start scraping in background thread
    thread = threading.Thread(target=scrape_exchange, args=(exchange,))
    thread.daemon = True
    thread.start()

    return jsonify({'ok': True})

@app.route('/api/stop', methods=['POST'])
def api_stop():
    state['is_running'] = False
    log("تم إيقاف الاستخراج", 'warning')
    return jsonify({'ok': True})

@app.route('/api/clear', methods=['POST'])
def api_clear():
    try:
        conn = get_db()
        c = conn.cursor()
        for t in ['StockOverview', 'IncomeStatement', 'BalanceSheet', 'CashFlowStatement', 'TechnicalAnalysis', 'Stock']:
            c.execute(f'DELETE FROM {t}')
        conn.commit()
        conn.close()
        log("تم تفريغ البيانات", 'success')
        return jsonify({'ok': True})
    except Exception as e:
        return jsonify({'error': str(e)})

def scrape_exchange(exchange):
    global state

    config = EXCHANGES.get(exchange)
    if not config:
        log(f"بورصة غير معروفة: {exchange}", 'error')
        state['is_running'] = False
        return

    log(f"بدء استخراج {config['name']}")

    try:
        # Open browser
        url = f"https://ar.tradingview.com/markets/{config['code']}/market-movers-all-stocks/"
        run_cmd("close", timeout=10)
        time.sleep(0.5)
        run_cmd(f'open "{url}" --timeout 30', timeout=45)
        time.sleep(5)

        # Load more
        for i in range(10):
            if not state['is_running']:
                break
            res = run_js("document.querySelector('.loadMoreWrapper-KFNucXpc button')?.click() || 'done'")
            if 'done' in str(res):
                break
            time.sleep(1.5)

        if not state['is_running']:
            return

        # Get count
        count = run_js("document.querySelectorAll('table')[1]?.querySelectorAll('tr')?.length || 0")
        total = int(re.search(r'\d+', count).group()) - 1 if re.search(r'\d+', count) else 0
        log(f"عدد الأسهم: {total}")

        if total <= 0:
            log("لا توجد أسهم", 'error')
            state['is_running'] = False
            return

        state['total'] = total

        # Extract stocks
        stocks_json = run_js("""
(function(){
  const tbl = document.querySelectorAll('table')[1];
  const trs = tbl?.querySelectorAll('tr') || [];
  const items = [];
  for(let i=1; i<trs.length; i++){
    const cells = trs[i].querySelectorAll('td');
    if(cells.length >= 2) {
      const link = cells[0].querySelector('a');
      const txt = cells[0].innerText || '';
      const parts = txt.split('\\n');
      items.push(JSON.stringify({sym:parts[0]||'',name:parts[1]||'',href:link?.href||'',price:cells[1]?.innerText||''}));
    }
  }
  return items.join('|||');
})()
""", timeout=60)

        stocks = []
        for item in stocks_json.split('|||'):
            if item.strip():
                try:
                    d = json.loads(item)
                    if d.get('sym'):
                        stocks.append({'s': d['sym'], 'n': d['name'], 'h': d['href'], 'p': d['price']})
                except:
                    pass

        log(f"تم استخراج {len(stocks)} سهم", 'success')

        # Save to database
        conn = get_db()
        c = conn.cursor()
        now = int(time.time() * 1000)
        now_str = datetime.now().isoformat()
        saved = 0

        for i, stock in enumerate(stocks):
            if not state['is_running']:
                log("تم الإيقاف", 'warning')
                break

            state['stock'] = stock.get('s', '')
            state['processed'] = i + 1
            state['progress'] = ((i + 1) / len(stocks)) * 100

            symbol = stock.get('s', '').strip()
            if not symbol:
                continue

            try:
                # Check if exists
                c.execute('SELECT id FROM Stock WHERE symbol = ? AND exchange = ?', (symbol, exchange))
                row = c.fetchone()

                if row:
                    stock_id = row[0]
                else:
                    stock_id = f'stock_{uuid.uuid4().hex[:20]}'
                    c.execute('INSERT INTO Stock (id, symbol, nameEn, exchange, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
                             (stock_id, symbol, stock.get('n', ''), exchange, now, now))

                # Save overview
                price = parse_num(stock.get('p'))
                c.execute('SELECT id FROM StockOverview WHERE stockId = ?', (stock_id,))
                ov_row = c.fetchone()

                if ov_row:
                    c.execute('UPDATE StockOverview SET currentPrice = ?, updatedAt = ? WHERE stockId = ?',
                             (price, now_str, stock_id))
                else:
                    ov_id = f'ov_{uuid.uuid4().hex[:20]}'
                    c.execute('INSERT INTO StockOverview (id, stockId, currentPrice, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)',
                             (ov_id, stock_id, price, now_str, now_str))

                conn.commit()
                saved += 1
            except Exception as e:
                state['failed'] += 1
                print(f"Error saving {symbol}: {e}")

        conn.close()
        run_cmd("close", timeout=10)

        state['is_running'] = False
        state['progress'] = 100
        log(f"اكتمل! تم حفظ {saved} سهم", 'success')

    except Exception as e:
        log(f"خطأ: {str(e)}", 'error')
        state['is_running'] = False

if __name__ == '__main__':
    print('🚀 Data Engine على المنفذ 5001...')
    app.run(host='0.0.0.0', port=5001, debug=False, threaded=True)
