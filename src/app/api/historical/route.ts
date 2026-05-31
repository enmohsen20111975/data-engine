import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stockId = searchParams.get('stockId');
    const symbol = searchParams.get('symbol');
    const limit = parseInt(searchParams.get('limit') || '100');
    const exchange = searchParams.get('exchange');
    
    // If stockId or symbol provided, get historical data for that stock
    if (stockId || symbol) {
      const stock = symbol 
        ? await db.stock.findUnique({ where: { symbol } })
        : await db.stock.findUnique({ where: { id: stockId! } });
      
      if (!stock) {
        return NextResponse.json({ error: 'Stock not found' }, { status: 404 });
      }
      
      const data = await db.historicalData.findMany({
        where: { stockId: stock.id },
        orderBy: { date: 'desc' },
        take: limit
      });
      
      return NextResponse.json({
        stock: {
          id: stock.id,
          symbol: stock.symbol,
          nameAr: stock.nameAr,
          nameEn: stock.nameEn,
          exchange: stock.exchange
        },
        data
      });
    }
    
    // Get historical data summary grouped by stock
    const stocks = exchange 
      ? await db.stock.findMany({ where: { exchange } })
      : await db.stock.findMany({});
    
    const summary = await Promise.all(
      stocks.slice(0, 200).map(async (stock) => {
        const count = await db.historicalData.count({
          where: { stockId: stock.id }
        });
        const latest = await db.historicalData.findFirst({
          where: { stockId: stock.id },
          orderBy: { date: 'desc' }
        });
        const oldest = await db.historicalData.findFirst({
          where: { stockId: stock.id },
          orderBy: { date: 'asc' }
        });
        
        return {
          id: stock.id,
          symbol: stock.symbol,
          nameAr: stock.nameAr,
          nameEn: stock.nameEn,
          exchange: stock.exchange,
          country: stock.country,
          recordsCount: count,
          latestDate: latest?.date || null,
          oldestDate: oldest?.date || null,
          latestClose: latest?.close || null
        };
      })
    );
    
    // Sort by records count descending
    summary.sort((a, b) => b.recordsCount - a.recordsCount);
    
    return NextResponse.json(summary);
    
  } catch (error) {
    console.error('Error fetching historical data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch historical data' },
      { status: 500 }
    );
  }
}
