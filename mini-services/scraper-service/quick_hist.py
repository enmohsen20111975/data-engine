#!/usr/bin/env python3
"""استخراج سريع للبيانات التاريخية"""
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

# البورصة المطلوبة
exchange = sys.argv[1] if len(sys.argv) > 1 else 'KSE'

conn = sqlite3.connect(DB)
c = conn.cursor()
c.execute(f"SELECT id, symbol FROM Stock WHERE exchange='{exchange}'")
stocks = c.fetchall()
conn.close()

print(f"\nاستخراج البيانات التاريخية: {exchange} ({len(stocks)} سهم)")
print("="*50)

total = 0
for i, (sid, sym) in enumerate(stocks):
    print(f"[{i+1}/{len(stocks)}] {sym}...", end=" ", flush=True)

    url = f"https://finance.yahoo.com/quote/{sym}{SUFFIX[exchange]}/history/"
    subprocess.run("agent-browser close", shell=True, capture_output=True)
    subprocess.run(f'agent-browser open "{url}" --timeout 20', shell=True, capture_output=True)
    time.sleep(2)

    data = run_js('(function(){const t=document.querySelector("table");if(!t)return"[]";const r=t.querySelectorAll("tr"),d=[];for(let i=1;i<r.length;i++){const c=r[i].querySelectorAll("td");if(c.length>4)d.push({d:c[0]?.innerText||"",o:c[1]?.innerText||"",h:c[2]?.innerText||"",l:c[3]?.innerText||"",c:c[4]?.innerText||"",v:c[6]?.innerText||""})}return JSON.stringify(d)})()')

    try:
        parsed = json.loads(data)
        if not parsed:
            print("لا توجد بيانات")
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
        total += saved
        print(f"✓ {saved}")
    except Exception as e:
        print(f"⚠️ {e}")
    time.sleep(1)

subprocess.run("agent-browser close", shell=True, capture_output=True)
print("="*50)
print(f"✅ {exchange}: {total} سجل تاريخي\n")
