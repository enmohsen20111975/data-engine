import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stockId = searchParams.get('stockId');
    const symbol = searchParams.get('symbol');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const exchange = searchParams.get('exchange');
    
    // If stockId or symbol provided, get historical data for that stock
    if (stockId || symbol) {
      try {
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
      } catch (err) {
        console.error('Error fetching stock historical data:', err);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
      }
    }
    
    // Get historical data summary - simplified approach
    try {
      // Get stocks with optional exchange filter
      const stocks = exchange 
        ? await db.stock.findMany({ 
            where: { exchange },
            select: { id: true, symbol: true, nameAr: true, nameEn: true, exchange: true, country: true }
          })
        : await db.stock.findMany({
            select: { id: true, symbol: true, nameAr: true, nameEn: true, exchange: true, country: true }
          });
      
      // Limit to first 50 stocks for performance
      const limitedStocks = stocks.slice(0, 50);
      
      const summary = await Promise.all(
        limitedStocks.map(async (stock) => {
          try {
            const count = await db.historicalData.count({
              where: { stockId: stock.id }
            });
            
            return {
              id: stock.id,
              symbol: stock.symbol,
              nameAr: stock.nameAr,
              nameEn: stock.nameEn,
              exchange: stock.exchange,
              country: stock.country,
              recordsCount: count,
              latestDate: null,
              oldestDate: null,
              latestClose: null
            };
          } catch {
            return {
              id: stock.id,
              symbol: stock.symbol,
              nameAr: stock.nameAr,
              nameEn: stock.nameEn,
              exchange: stock.exchange,
              country: stock.country,
              recordsCount: 0,
              latestDate: null,
              oldestDate: null,
              latestClose: null
            };
          }
        })
      );
      
      // Sort by records count descending
      summary.sort((a, b) => b.recordsCount - a.recordsCount);
      
      return NextResponse.json(summary);
    } catch (err) {
      console.error('Error fetching historical summary:', err);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Error in historical API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch historical data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
