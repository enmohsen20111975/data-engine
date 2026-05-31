'use client';

import { useEffect } from 'react';

export default function DataFactory() {
  useEffect(() => {
    // Redirect to Python backend with XTransformPort
    window.location.href = '/?XTransformPort=5001';
  }, []);

  return (
    <div style={{
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
    </div>
  );
}
