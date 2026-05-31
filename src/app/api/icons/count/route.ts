import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // Count stocks that have iconUrl
    const stocks = await db.stock.findMany({
      select: { iconUrl: true }
    });
    
    const count = stocks.filter(s => s.iconUrl).length;
    
    return NextResponse.json({ count });
  } catch (error) {
    return NextResponse.json({ count: 0 });
  }
}
