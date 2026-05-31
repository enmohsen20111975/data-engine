import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const exchange = searchParams.get('exchange');
    
    const where = exchange ? { exchange } : {};
    
    const stocks = await db.stock.findMany({
      where,
      take: limit,
      orderBy: { symbol: 'asc' }
    });
    
    return NextResponse.json(stocks);
  } catch (error) {
    console.error('Error fetching stocks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stocks' },
      { status: 500 }
    );
  }
}
