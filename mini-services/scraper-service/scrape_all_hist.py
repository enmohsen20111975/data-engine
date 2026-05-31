#!/usr/bin/env python3
"""استخراج البيانات التاريخية لكل البورصات"""
import subprocess, json, sqlite3, base64, time, uuid, sys
from datetime import datetime

DB = '/home/z/my-project/db/data-factory.db'
SUFFIX = {'KSA':'.SR','EGX':'.CA','KSE':'.KW','QE':'.QA','UAE':'.AE','BAH':'.BH'}

def run_js(js):
    enc = base64.b64encode(js.encode()).decode()
    r = subprocess.run(f"agent-browser eval -b '{enc}'", shell=True, capture_output=True, text=True, timeout=30)
    o = r.stdout.strip()
    if o.startswith('"') and o.endswith('"'): o = o[1:-1]
    return o.replace('\\"', '"')

def parse_num(v):
    if not v or v == '-': return None
    try: return float(v.replace(',', ''))
    except: return None

def parse_date(d):
    try: return datetime.strptime(d.strip(), '%b %d, %Y').strftime('%Y-%m-%d')
    except: return None

print("\n" + "="*60)
print("📊 استخراج البيانات التاريخية لكل البورصات")
print("="*60)

conn = sqlite3.connect(DB)
c = conn.cursor()
c.execute("SELECT id, symbol, exchange FROM Stock ORDER BY exchange, symbol")
stocks = c.fetchall()
conn.close()

print(f"\nإجمالي الأسهم: {len(stocks)}")

total_all = 0
current_exchange = None

for i, (sid, sym, ex) in enumerate(stocks):
    if ex != current_exchange:
        current_exchange = ex
        print(f"\n{'='*40}")
        print(f"📍 {ex}")
        print(f"{'='*40}")

    print(f"[{i+1}/{len(stocks)}] {sym}...", end=" ", flush=True)

    url = f"https://finance.yahoo.com/quote/{sym}{SUFFIX[ex]}/history/"
    subprocess.run("agent-browser close", shell=True, capture_output=True)
    subprocess.run(f'agent-browser open "{url}" --timeout 20', shell=True, capture_output=True)
    time.sleep(2)

    data = run_js('(function(){const t=document.querySelector("table");if(!t)return"[]";const r=t.querySelectorAll("tr"),d=[];for(let i=1;i<r.length;i++){const c=r[i].querySelectorAll("td");if(c.length>4)d.push({d:c[0]?.innerText||"",o:c[1]?.innerText||"",h:c[2]?.innerText||"",l:c[3]?.innerText||"",c:c[4]?.innerText||"",v:c[6]?.innerText||""})}return JSON.stringify(d)})()')

    try:
        parsed = json.loads(data)
        if not parsed:
            print("∅")
            continue
        saved = 0
        conn = sqlite3.connect(DB)
        cur = conn.cursor()
        now = datetime.now().isoformat()
        for row in parsed:
            dt = parse_date(row.get('d', ''))
            if not dt: continue
            cur.execute('SELECT id FROM HistoricalData WHERE stockId=? AND date=?', (sid, dt))
            if cur.fetchone(): continue
            hid = f'hist_{uuid.uuid4().hex[:12]}'
            cur.execute('INSERT INTO HistoricalData (id, stockId, date, open, high, low, close, volume, createdAt) VALUES (?,?,?,?,?,?,?,?,?)',
                       (hid, sid, dt, parse_num(row.get('o')), parse_num(row.get('h')), parse_num(row.get('l')),
                        parse_num(row.get('c')), parse_num(row.get('v')), now))
            conn.commit()
            saved += 1
        conn.close()
        total_all += saved
        print(f"✓{saved}")
    except Exception as e:
        print(f"⚠️")

    # تقدم كل 50 سهم
    if (i + 1) % 50 == 0:
        print(f"\n--- تقدم: {i+1}/{len(stocks)} | إجمالي: {total_all} ---\n")

subprocess.run("agent-browser close", shell=True, capture_output=True)

print("\n" + "="*60)
print(f"✅ اكتمل! إجمالي السجلات: {total_all}")
print("="*60 + "\n")
