import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

// Mapping البورصات
const EXCHANGE_MAP: Record<string, { yahoo: string | null; country: string }> = {
  'KSA': { yahoo: '.SR', country: 'السعودية' },
  'EGX': { yahoo: '.CA', country: 'مصر' },
  'UAE': { yahoo: null, country: 'الإمارات' },
  'KSE': { yahoo: '.KW', country: 'الكويت' },
  'QE': { yahoo: '.QA', country: 'قطر' },
  'BAH': { yahoo: '.BH', country: 'البحرين' },
};

export async function GET() {
  try {
    // 1. إجمالي الأسهم
    const totalStocks = await db.stock.count();
    
    // 2. الأسهم حسب البورصة
    const stocksByExchange = await db.stock.groupBy({
      by: ['exchange'],
      _count: true
    });
    
    // 3. عدد السجلات التاريخية
    const totalHistoricalRecords = await db.historicalData.count();
    
    // 4. الأسهم اللي ليها بيانات تاريخية
    const stocksWithData = await db.$queryRaw<{ stockId: string; count: bigint }[]>`
      SELECT stockId, COUNT(*) as count 
      FROM HistoricalData 
      GROUP BY stockId
    `;
    
    const stocksWithDataIds = stocksWithData.map(s => s.stockId);
    
    // 5. الأسهم بدون بيانات تاريخية
    const allStocks = await db.stock.findMany({
      select: { id: true, symbol: true, nameAr: true, nameEn: true, exchange: true }
    });
    
    const stocksWithoutData = allStocks.filter(s => !stocksWithDataIds.includes(s.id));
    
    // 6. تفاصيل كل بورصة
    const exchangeDetails = await Promise.all(
      stocksByExchange.map(async (ex) => {
        const exchange = ex.exchange;
        const totalInExchange = ex._count;
        
        // عدد الأسهم اللي ليها بيانات في هذه البورصة
        const stocksInExchange = allStocks.filter(s => s.exchange === exchange);
        const withData = stocksInExchange.filter(s => stocksWithDataIds.includes(s.id)).length;
        const withoutData = stocksInExchange.filter(s => !stocksWithDataIds.includes(s.id)).length;
        
        // عدد السجلات في هذه البورصة
        const recordsInExchange = await db.$queryRaw<[{ count: bigint }]>`
          SELECT COUNT(*) as count 
          FROM HistoricalData hd
          JOIN Stock s ON hd.stockId = s.id
          WHERE s.exchange = ${exchange}
        `;
        
        const yahooSupport = EXCHANGE_MAP[exchange]?.yahoo !== null;
        
        return {
          exchange,
          country: EXCHANGE_MAP[exchange]?.country || exchange,
          totalStocks: totalInExchange,
          stocksWithData: withData,
          stocksWithoutData: withoutData,
          successRate: totalInExchange > 0 ? ((withData / totalInExchange) * 100).toFixed(1) : '0',
          recordsCount: Number(recordsInExchange[0].count),
          yahooSupport
        };
      })
    );
    
    // 7. أمثلة على الأسهم بدون بيانات (أول 50)
    const sampleEmptyStocks = stocksWithoutData.slice(0, 50).map(s => ({
      symbol: s.symbol,
      name: s.nameAr || s.nameEn || '—',
      exchange: s.exchange,
      country: EXCHANGE_MAP[s.exchange]?.country || s.exchange
    }));
    
    return NextResponse.json({
      summary: {
        totalStocks,
        stocksWithData: stocksWithData.length,
        stocksWithoutData: stocksWithoutData.length,
        totalHistoricalRecords,
        dataCoverage: totalStocks > 0 ? ((stocksWithData.length / totalStocks) * 100).toFixed(1) : '0'
      },
      exchangeDetails,
      sampleEmptyStocks,
      stocksExchangesWithoutYahoo: ['UAE'], // الإمارات ليس لها Yahoo
    });
    
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      { error: 'Failed to generate report', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
