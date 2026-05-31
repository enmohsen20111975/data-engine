import { NextRequest, NextResponse } from 'next/server';
import {
  startScraping,
  stopScraping,
  getScrapingStatus,
  getStocks,
  getScrapeJobs,
  EXCHANGES,
  DATA_TYPES,
} from '@/lib/scraper';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  try {
    switch (action) {
      case 'exchanges':
        return NextResponse.json({
          success: true,
          exchanges: Object.entries(EXCHANGES).map(([code, data]) => ({
            code,
            ...data,
          })),
        });

      case 'data-types':
        return NextResponse.json({
          success: true,
          dataTypes: DATA_TYPES,
        });

      case 'status':
        return NextResponse.json({
          success: true,
          status: getScrapingStatus(),
        });

      case 'stocks':
        const exchange = searchParams.get('exchange') || undefined;
        const stocks = await getStocks(exchange);
        return NextResponse.json({
          success: true,
          stocks: stocks.map(s => ({
            id: s.id,
            symbol: s.symbol,
            nameEn: s.nameEn,
            nameAr: s.nameAr,
            exchange: s.exchange,
            country: s.country,
            sector: s.sector,
            overview: s.overview ? {
              currentPrice: s.overview.currentPrice,
              marketCap: s.overview.marketCap,
              peRatio: s.overview.peRatio,
            } : null,
            _count: s._count,
          })),
        });

      case 'jobs':
        const limit = parseInt(searchParams.get('limit') || '20');
        const jobs = await getScrapeJobs(limit);
        return NextResponse.json({
          success: true,
          jobs,
        });

      default:
        return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Scraper API error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      action, 
      exchange, 
      dataTypes,
      startDate,
      endDate,
    } = body;

    switch (action) {
      case 'start':
        if (!exchange) {
          return NextResponse.json({ success: false, error: 'Exchange is required' }, { status: 400 });
        }
        
        if (!dataTypes || dataTypes.length === 0) {
          return NextResponse.json({ success: false, error: 'At least one data type is required' }, { status: 400 });
        }

        const result = await startScraping(exchange, {
          exchange,
          dataTypes,
          startDate,
          endDate,
          source: 'tradingview',
        });
        return NextResponse.json(result);

      case 'stop':
        const stopResult = await stopScraping();
        return NextResponse.json(stopResult);

      default:
        return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Scraper API error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
