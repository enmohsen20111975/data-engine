import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const exchange = searchParams.get('exchange');
    
    const where = exchange ? { exchange } : {};
    
    // Use a reasonable limit to avoid memory issues
    const safeLimit = Math.min(limit, 2000);
    
    const stocks = await db.stock.findMany({
      where,
      take: safeLimit,
      orderBy: { symbol: 'asc' },
      select: {
        id: true,
        symbol: true,
        nameAr: true,
        nameEn: true,
        exchange: true,
        country: true,
        sector: true,
        industry: true,
        iconUrl: true,
        urlSlug: true,
        website: true,
        headquarters: true,
        foundedYear: true,
        description: true,
        isin: true
      }
    });
    
    return NextResponse.json(stocks);
  } catch (error) {
    console.error('Error fetching stocks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stocks', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
