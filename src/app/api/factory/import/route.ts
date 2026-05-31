import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { 
  extractHtmlFromMhtml, 
  parseStockListPage, 
  parseHistoricalDataPage,
  parseStockMainPage 
} from '@/lib/parsers';
import { writeFile, readFile, readdir, unlink } from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'upload');

// Helper to ensure upload directory exists
function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) {
    mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

// استيراد قائمة الأسهم من ملف
async function importStockList(fileName: string): Promise<{ count: number; stocks: string[] }> {
  const filePath = path.join(UPLOAD_DIR, fileName);
  const content = await readFile(filePath, 'utf-8');
  
  const html = extractHtmlFromMhtml(content);
  const stocks = parseStockListPage(html);
  
  let importedCount = 0;
  const importedSymbols: string[] = [];
  
  for (const stock of stocks) {
    // استخراج urlSlug من الرابط
    const urlSlugMatch = stock.url.match(/\/equities\/([^\/\?]+)/);
    const urlSlug = urlSlugMatch ? urlSlugMatch[1] : '';
    
    if (stock.symbol && urlSlug) {
      try {
        await db.stock.upsert({
          where: { symbol: stock.symbol },
          update: {
            nameAr: stock.name,
            urlSlug,
            updatedAt: new Date()
          },
          create: {
            symbol: stock.symbol,
            nameAr: stock.name,
            urlSlug,
            exchange: 'EGX' // افتراضي
          }
        });
        importedCount++;
        importedSymbols.push(stock.symbol);
      } catch (e) {
        console.error(`Failed to import stock ${stock.symbol}:`, e);
      }
    }
  }
  
  // تسجيل عملية الاستيراد
  await db.importedFile.create({
    data: {
      fileName,
      fileType: 'stock-list',
      stockSymbol: 'BATCH',
      recordsImported: importedCount,
      status: importedCount > 0 ? 'success' : 'failed'
    }
  });
  
  return { count: importedCount, stocks: importedSymbols };
}

// استيراد البيانات التاريخية من ملف
async function importHistoricalData(fileName: string): Promise<{ count: number; symbol: string }> {
  const filePath = path.join(UPLOAD_DIR, fileName);
  const content = await readFile(filePath, 'utf-8');
  
  const html = extractHtmlFromMhtml(content);
  const parsed = parseHistoricalDataPage(html);
  
  if (!parsed || !parsed.symbol) {
    throw new Error('Could not parse historical data from file');
  }
  
  // البحث عن السهم أو إنشاؤه
  let stock = await db.stock.findUnique({
    where: { symbol: parsed.symbol }
  });
  
  if (!stock) {
    // إنشاء سهم جديد
    stock = await db.stock.create({
      data: {
        symbol: parsed.symbol,
        nameAr: parsed.name || parsed.symbol,
        urlSlug: parsed.symbol.toLowerCase(),
        exchange: parsed.exchange || 'EGX'
      }
    });
  }
  
  let importedCount = 0;
  
  for (const row of parsed.data) {
    try {
      await db.historicalData.upsert({
        where: {
          stockId_date: {
            stockId: stock.id,
            date: row.date
          }
        },
        update: {
          open: row.open,
          high: row.high,
          low: row.low,
          close: row.close,
          volume: row.volume,
          changePct: row.changePct
        },
        create: {
          stockId: stock.id,
          date: row.date,
          open: row.open,
          high: row.high,
          low: row.low,
          close: row.close,
          volume: row.volume,
          changePct: row.changePct
        }
      });
      importedCount++;
    } catch (e) {
      console.error(`Failed to import data for ${parsed.symbol} on ${row.date}:`, e);
    }
  }
  
  // تسجيل عملية الاستيراد
  await db.importedFile.create({
    data: {
      fileName,
      fileType: 'historical-data',
      stockSymbol: parsed.symbol,
      recordsImported: importedCount,
      status: importedCount > 0 ? 'success' : 'failed'
    }
  });
  
  return { count: importedCount, symbol: parsed.symbol };
}

// API Handler
export async function POST(request: NextRequest) {
  try {
    ensureUploadDir();
    const body = await request.json();
    const { action, fileName, fileType } = body;
    
    switch (action) {
      case 'import-stock-list':
        const listResult = await importStockList(fileName);
        return NextResponse.json({ 
          success: true, 
          message: `Imported ${listResult.count} stocks`,
          stocks: listResult.stocks
        });
        
      case 'import-historical':
        const histResult = await importHistoricalData(fileName);
        return NextResponse.json({ 
          success: true, 
          message: `Imported ${histResult.count} records for ${histResult.symbol}`,
          symbol: histResult.symbol,
          count: histResult.count
        });
        
      case 'list-files':
        const files = await readdir(UPLOAD_DIR);
        const fileList = files.filter(f => f.endsWith('.mhtml') || f.endsWith('.html'));
        return NextResponse.json({ 
          success: true, 
          files: fileList 
        });
        
      case 'get-stats':
        const stats = await getDatabaseStats();
        return NextResponse.json({ 
          success: true, 
          stats 
        });
        
      default:
        return NextResponse.json({ 
          success: false, 
          error: 'Unknown action' 
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    ensureUploadDir();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    if (action === 'stats') {
      const stats = await getDatabaseStats();
      return NextResponse.json({ success: true, stats });
    }
    
    if (action === 'files') {
      const files = await readdir(UPLOAD_DIR);
      const fileList = files.filter(f => f.endsWith('.mhtml') || f.endsWith('.html'));
      return NextResponse.json({ success: true, files: fileList });
    }
    
    if (action === 'stocks') {
      const stocks = await db.stock.findMany({
        include: {
          _count: {
            select: { historicalData: true }
          }
        },
        orderBy: { symbol: 'asc' }
      });
      return NextResponse.json({ success: true, stocks });
    }
    
    if (action === 'historical') {
      const symbol = searchParams.get('symbol');
      if (!symbol) {
        return NextResponse.json({ success: false, error: 'Symbol required' }, { status: 400 });
      }
      
      const stock = await db.stock.findUnique({
        where: { symbol },
        include: {
          historicalData: {
            orderBy: { date: 'desc' },
            take: 100
          }
        }
      });
      
      if (!stock) {
        return NextResponse.json({ success: false, error: 'Stock not found' }, { status: 404 });
      }
      
      // Serialize dates to ISO strings
      const serializedStock = {
        ...stock,
        createdAt: stock.createdAt.toISOString(),
        updatedAt: stock.updatedAt.toISOString(),
        historicalData: stock.historicalData.map(h => ({
          ...h,
          date: h.date.toISOString(),
          createdAt: h.createdAt.toISOString()
        }))
      };
      
      return NextResponse.json({ success: true, stock: serializedStock });
    }
    
    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

async function getDatabaseStats() {
  const [stockCount, historicalCount, importedFileCount] = await Promise.all([
    db.stock.count(),
    db.historicalData.count(),
    db.importedFile.count()
  ]);
  
  const recentImports = await db.importedFile.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' }
  });
  
  return {
    stocks: stockCount,
    historicalRecords: historicalCount,
    importedFiles: importedFileCount,
    recentImports
  };
}
