import { db } from '@/lib/db';

async function getStocks() {
  try {
    const stocks = await db.stock.findMany({
      take: 50,
      orderBy: { symbol: 'asc' }
    });
    return stocks;
  } catch (error) {
    console.error('Error fetching stocks:', error);
    return [];
  }
}

async function getStats() {
  try {
    const totalStocks = await db.stock.count();
    const stocksByExchange = await db.stock.groupBy({
      by: ['exchange'],
      _count: true
    });
    const historicalCount = await db.historicalData.count();
    
    return { totalStocks, stocksByExchange, historicalCount };
  } catch (error) {
    console.error('Error fetching stats:', error);
    return { totalStocks: 0, stocksByExchange: [], historicalCount: 0 };
  }
}

export default async function DataFactory() {
  const [stocks, stats] = await Promise.all([getStocks(), getStats()]);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%)',
      color: '#fff',
      fontFamily: 'system-ui, sans-serif',
      padding: '24px'
    }}>
      {/* Header */}
      <header style={{ marginBottom: '32px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>🏭 Data Engine</h1>
        <p style={{ opacity: 0.6 }}>محرك البيانات للبورصات العربية</p>
      </header>

      {/* Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '32px'
      }}>
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '12px',
          padding: '20px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#4ade80' }}>
            {stats.totalStocks}
          </div>
          <div style={{ opacity: 0.6, marginTop: '4px' }}>إجمالي الأسهم</div>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '12px',
          padding: '20px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#60a5fa' }}>
            {stats.historicalCount.toLocaleString()}
          </div>
          <div style={{ opacity: 0.6, marginTop: '4px' }}>سجل تاريخي</div>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '12px',
          padding: '20px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#f472b6' }}>
            {stats.stocksByExchange.length}
          </div>
          <div style={{ opacity: 0.6, marginTop: '4px' }}>بورصات</div>
        </div>
      </div>

      {/* Exchanges */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '12px',
        marginBottom: '32px'
      }}>
        {stats.stocksByExchange.map((ex: any) => (
          <div key={ex.exchange} style={{
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '8px',
            padding: '16px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{ex.exchange}</div>
            <div style={{ fontSize: '24px', color: '#4ade80', marginTop: '4px' }}>
              {ex._count}
            </div>
          </div>
        ))}
      </div>

      {/* Stocks Table */}
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '12px',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          fontWeight: 'bold'
        }}>
          الأسهم (أول 50)
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                <th style={{ padding: '12px', textAlign: 'right' }}>الرمز</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>الاسم</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>البورصة</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>الدولة</th>
              </tr>
            </thead>
            <tbody>
              {stocks.map((stock: any) => (
                <tr key={stock.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '12px', fontWeight: 'bold', color: '#60a5fa' }}>
                    {stock.symbol}
                  </td>
                  <td style={{ padding: '12px', opacity: 0.8 }}>
                    {stock.nameAr || stock.nameEn || '-'}
                  </td>
                  <td style={{ padding: '12px' }}>{stock.exchange}</td>
                  <td style={{ padding: '12px', opacity: 0.6 }}>{stock.country || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <footer style={{ marginTop: '32px', textAlign: 'center', opacity: 0.4 }}>
        <p>Data Engine v1.0 | 6 بورصات عربية</p>
      </footer>
    </div>
  );
}
