import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '30');
    
    const stock = await db.stock.findFirst({
      where: { symbol }
    });
    
    if (!stock) {
      return NextResponse.json({ error: 'Stock not found' }, { status: 404 });
    }
    
    const historical = await db.historicalData.findMany({
      where: { stockId: stock.id },
      orderBy: { date: 'desc' },
      take: limit
    });
    
    return NextResponse.json(historical);
  } catch (error) {
    console.error('Error fetching historical:', error);
    return NextResponse.json({ error: 'Failed to fetch historical data' }, { status: 500 });
  }
}
