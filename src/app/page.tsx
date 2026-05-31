export default function DataFactory() {
  return (
    <html>
      <head>
        <meta httpEquiv="refresh" content="0;url=/?XTransformPort=5001" />
      </head>
      <body style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%)',
        color: '#fff',
        fontFamily: 'system-ui, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '28px', marginBottom: '16px' }}>🏭 مصنع البيانات</h1>
          <p style={{ opacity: 0.6 }}>جارٍ التحميل...</p>
        </div>
      </body>
    </html>
  );
}
