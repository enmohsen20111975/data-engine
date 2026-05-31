'use client';

import { useState, useEffect } from 'react';

// Types
interface Stock {
  id: string;
  symbol: string;
  nameAr: string | null;
  nameEn: string | null;
  exchange: string;
  country: string | null;
  sector: string | null;
}

interface Stats {
  totalStocks: number;
  historicalCount: number;
  stocksByExchange: { exchange: string; count: number }[];
}

interface ScraperStatus {
  running: boolean;
  lastUpdate: string | null;
  message: string;
}

export default function DataFactory() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [scraperStatus, setScraperStatus] = useState<ScraperStatus>({ running: false, lastUpdate: null, message: '' });
  const [loading, setLoading] = useState(true);
  const [selectedExchange, setSelectedExchange] = useState<string>('all');

  // Fetch data
  const fetchData = async () => {
    try {
      const [statsRes, stocksRes] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/stocks?limit=100')
      ]);
      
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
      
      if (stocksRes.ok) {
        const stocksData = await stocksRes.json();
        setStocks(stocksData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Control actions
  const runScraper = async (action: string) => {
    setScraperStatus({ running: true, lastUpdate: null, message: `جاري ${action}...` });
    
    try {
      const res = await fetch('/api/scraper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      
      const data = await res.json();
      setScraperStatus({
        running: false,
        lastUpdate: new Date().toLocaleString('ar-EG'),
        message: data.message || 'تم بنجاح'
      });
      
      // Refresh data after action
      setTimeout(fetchData, 2000);
    } catch (error) {
      setScraperStatus({
        running: false,
        lastUpdate: null,
        message: 'حدث خطأ'
      });
    }
  };

  // Filter stocks
  const filteredStocks = selectedExchange === 'all' 
    ? stocks 
    : stocks.filter(s => s.exchange === selectedExchange);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%)',
        color: '#fff'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <p>جارٍ التحميل...</p>
        </div>
      </div>
    );
  }

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
        <h1 style={{ fontSize: '36px', marginBottom: '8px', background: 'linear-gradient(90deg, #4ade80, #60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          🏭 Data Engine
        </h1>
        <p style={{ opacity: 0.6 }}>محرك البيانات للبورصات العربية</p>
      </header>

      {/* Stats */}
      {stats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
          marginBottom: '32px'
        }}>
          <StatCard value={stats.totalStocks} label="إجمالي الأسهم" color="#4ade80" />
          <StatCard value={stats.historicalCount.toLocaleString()} label="سجل تاريخي" color="#60a5fa" />
          <StatCard value={stats.stocksByExchange.length} label="بورصات" color="#f472b6" />
          <StatCard value={filteredStocks.length} label="معروض" color="#fbbf24" />
        </div>
      )}

      {/* Exchanges */}
      {stats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: '12px',
          marginBottom: '32px'
        }}>
          <button
            onClick={() => setSelectedExchange('all')}
            style={{
              padding: '12px',
              borderRadius: '8px',
              border: selectedExchange === 'all' ? '2px solid #4ade80' : '1px solid rgba(255,255,255,0.1)',
              background: selectedExchange === 'all' ? 'rgba(74, 222, 128, 0.1)' : 'rgba(255,255,255,0.05)',
              color: '#fff',
              cursor: 'pointer'
            }}
          >
            الكل ({stats.totalStocks})
          </button>
          {stats.stocksByExchange.map((ex) => (
            <button
              key={ex.exchange}
              onClick={() => setSelectedExchange(ex.exchange)}
              style={{
                padding: '12px',
                borderRadius: '8px',
                border: selectedExchange === ex.exchange ? '2px solid #4ade80' : '1px solid rgba(255,255,255,0.1)',
                background: selectedExchange === ex.exchange ? 'rgba(74, 222, 128, 0.1)' : 'rgba(255,255,255,0.05)',
                color: '#fff',
                cursor: 'pointer'
              }}
            >
              {ex.exchange} ({ex.count})
            </button>
          ))}
        </div>
      )}

      {/* Control Panel */}
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '32px'
      }}>
        <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>🎮 لوحة التحكم</h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '12px'
        }}>
          <ControlButton 
            label="📊 تحديث الأسعار" 
            onClick={() => runScraper('prices')}
            disabled={scraperStatus.running}
          />
          <ControlButton 
            label="📈 البيانات التاريخية" 
            onClick={() => runScraper('historical')}
            disabled={scraperStatus.running}
          />
          <ControlButton 
            label="🖼️ تحميل الأيقونات" 
            onClick={() => runScraper('icons')}
            disabled={scraperStatus.running}
          />
          <ControlButton 
            label="🔄 تحديث الكل" 
            onClick={() => runScraper('all')}
            disabled={scraperStatus.running}
            primary
          />
        </div>
        
        {scraperStatus.message && (
          <div style={{
            marginTop: '16px',
            padding: '12px',
            borderRadius: '8px',
            background: scraperStatus.running ? 'rgba(251, 191, 36, 0.1)' : 'rgba(74, 222, 128, 0.1)',
            border: scraperStatus.running ? '1px solid #fbbf24' : '1px solid #4ade80'
          }}>
            {scraperStatus.running ? '⏳' : '✅'} {scraperStatus.message}
            {scraperStatus.lastUpdate && (
              <span style={{ opacity: 0.6, marginRight: '8px' }}>
                - {scraperStatus.lastUpdate}
              </span>
            )}
          </div>
        )}
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
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ fontWeight: 'bold' }}>
            الأسهم ({filteredStocks.length})
          </span>
          <button 
            onClick={fetchData}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'transparent',
              color: '#fff',
              cursor: 'pointer'
            }}
          >
            🔄 تحديث
          </button>
        </div>
        
        <div style={{ overflowX: 'auto', maxHeight: '500px', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, background: '#1a1a2e' }}>
              <tr>
                <th style={{ padding: '12px', textAlign: 'right' }}>الرمز</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>الاسم</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>البورصة</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>الدولة</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>القطاع</th>
              </tr>
            </thead>
            <tbody>
              {filteredStocks.map((stock) => (
                <tr key={stock.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '12px', fontWeight: 'bold', color: '#60a5fa' }}>
                    {stock.symbol}
                  </td>
                  <td style={{ padding: '12px' }}>
                    {stock.nameAr || stock.nameEn || '-'}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      background: 'rgba(96, 165, 250, 0.2)',
                      fontSize: '12px'
                    }}>
                      {stock.exchange}
                    </span>
                  </td>
                  <td style={{ padding: '12px', opacity: 0.6 }}>{stock.country || '-'}</td>
                  <td style={{ padding: '12px', opacity: 0.6 }}>{stock.sector || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <footer style={{ marginTop: '32px', textAlign: 'center', opacity: 0.4 }}>
        <p>Data Engine v1.0 | 6 بورصات عربية | Saudi Arabia, Egypt, Kuwait, Qatar, UAE, Bahrain</p>
      </footer>
    </div>
  );
}

// Components
function StatCard({ value, label, color }: { value: string | number; label: string; color: string }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.05)',
      borderRadius: '12px',
      padding: '20px',
      textAlign: 'center'
    }}>
      <div style={{ fontSize: '32px', fontWeight: 'bold', color }}>{value}</div>
      <div style={{ opacity: 0.6, marginTop: '4px', fontSize: '14px' }}>{label}</div>
    </div>
  );
}

function ControlButton({ label, onClick, disabled, primary }: { label: string; onClick: () => void; disabled?: boolean; primary?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '12px 16px',
        borderRadius: '8px',
        border: primary ? 'none' : '1px solid rgba(255,255,255,0.2)',
        background: primary ? 'linear-gradient(135deg, #4ade80, #22c55e)' : 'transparent',
        color: primary ? '#000' : '#fff',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        fontWeight: primary ? 'bold' : 'normal'
      }}
    >
      {label}
    </button>
  );
}
