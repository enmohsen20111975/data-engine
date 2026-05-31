import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Get total stocks count
    const totalStocks = await db.stock.count();
    
    // Get stocks by exchange
    const stocksByExchangeRaw = await db.stock.groupBy({
      by: ['exchange'],
      _count: true
    });
    
    const stocksByExchange = stocksByExchangeRaw.map(item => ({
      exchange: item.exchange,
      count: item._count
    }));
    
    // Get historical data count
    const historicalCount = await db.historicalData.count();
    
    return NextResponse.json({
      totalStocks,
      stocksByExchange,
      historicalCount
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
