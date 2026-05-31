// Parser for Investing.com MHTML files
import { JSDOM } from 'jsdom';

// واجهات البيانات
export interface StockLink {
  name: string;
  symbol: string;
  url: string;
}

export interface HistoricalDataRow {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  changePct: number | null;
}

export interface ParsedHistoricalData {
  symbol: string;
  name: string;
  exchange: string;
  data: HistoricalDataRow[];
}

// دالة لفك تشفير quoted-printable
function decodeQuotedPrintable(str: string): string {
  // Handle soft line breaks
  str = str.replace(/=\r?\n/g, '');
  
  // Decode encoded characters
  str = str.replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });
  
  return str;
}

// استخراج HTML من ملف MHTML
export function extractHtmlFromMhtml(mhtmlContent: string): string {
  // البحث عن جزء HTML في الملف
  const htmlMatch = mhtmlContent.match(/Content-Type: text\/html[\s\S]*?Content-Location: [^\r\n]+[\r\n]+([\s\S]+?)(?=------MultipartBoundary|$)/i);
  
  if (htmlMatch) {
    let html = htmlMatch[1];
    // فك التشفير quoted-printable
    if (mhtmlContent.includes('Content-Transfer-Encoding: quoted-printable')) {
      html = decodeQuotedPrintable(html);
    }
    return html;
  }
  
  // محاولة بديلة - البحث عن HTML مباشرة
  const directHtmlMatch = mhtmlContent.match(/<!DOCTYPE html>[\s\S]+<\/html>/i);
  if (directHtmlMatch) {
    let html = directHtmlMatch[0];
    if (mhtmlContent.includes('quoted-printable')) {
      html = decodeQuotedPrintable(html);
    }
    return html;
  }
  
  throw new Error('Could not extract HTML from MHTML file');
}

// استخراج روابط الأسهم من صفحة قائمة الأسهم
export function parseStockListPage(html: string): StockLink[] {
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const stocks: StockLink[] = [];
  
  // البحث عن جدول الأسهم
  const tables = doc.querySelectorAll('table');
  
  for (const table of tables) {
    const rows = table.querySelectorAll('tbody tr');
    
    for (const row of rows) {
      const cells = row.querySelectorAll('td');
      if (cells.length >= 2) {
        // البحث عن رابط السهم
        const linkElement = row.querySelector('a[href*="/equities/"]');
        if (linkElement) {
          const href = linkElement.getAttribute('href') || '';
          const name = linkElement.textContent?.trim() || '';
          
          // استخراج رمز السهم من الرابط أو من الخلايا
          let symbol = '';
          const symbolMatch = href.match(/\/equities\/([^\/\?-]+)/);
          if (symbolMatch) {
            symbol = symbolMatch[1].toUpperCase();
          }
          
          // محاولة استخراج الرمز من خلية أخرى
          const symbolCell = cells[cells.length - 1]; // عادة الرمز في آخر خلية
          if (symbolCell) {
            const symbolText = symbolCell.textContent?.trim() || '';
            if (symbolText && symbolText.length <= 10 && /^[A-Z]+$/.test(symbolText)) {
              symbol = symbolText;
            }
          }
          
          if (name && href) {
            stocks.push({
              name,
              symbol,
              url: href
            });
          }
        }
      }
    }
  }
  
  // إزالة التكرارات
  const uniqueStocks = stocks.filter((stock, index, self) =>
    index === self.findIndex(s => s.symbol === stock.symbol)
  );
  
  return uniqueStocks;
}

// استخراج البيانات التاريخية من صفحة السهم
export function parseHistoricalDataPage(html: string): ParsedHistoricalData | null {
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  
  // استخراج رمز السهم من العنوان أو الـ URL
  let symbol = '';
  let name = '';
  let exchange = '';
  
  // من العنوان
  const title = doc.querySelector('title')?.textContent || '';
  const symbolMatch = title.match(/\(([A-Z]+)\)/);
  if (symbolMatch) {
    symbol = symbolMatch[1];
  }
  
  // من meta tag
  const metaVars = doc.querySelector('meta[name="global-translation-variables"]');
  if (metaVars) {
    const content = metaVars.getAttribute('content') || '';
    try {
      const vars = JSON.parse(content.replace(/&quot;/g, '"'));
      symbol = vars.SYMBOL || symbol;
      name = vars.FULL_NAME || vars.SHORT_NAME || '';
      exchange = vars.EXCHANGE || '';
    } catch (e) {
      // تجاهل خطأ التحليل
    }
  }
  
  // استخراج البيانات التاريخية من الجدول
  const data: HistoricalDataRow[] = [];
  
  // البحث عن جدول البيانات التاريخية
  const tables = doc.querySelectorAll('table');
  
  for (const table of tables) {
    const rows = table.querySelectorAll('tbody tr');
    
    for (const row of rows) {
      const cells = row.querySelectorAll('td');
      if (cells.length >= 6) {
        try {
          // التاريخ
          const dateCell = cells[0];
          const timeElement = dateCell.querySelector('time');
          const dateStr = timeElement?.getAttribute('datetime') || timeElement?.textContent || '';
          
          // السعر الأخير (الإغلاق)
          const closeStr = cells[1].textContent?.trim() || '';
          
          // سعر الفتح
          const openStr = cells[2].textContent?.trim() || '';
          
          // أعلى سعر
          const highStr = cells[3].textContent?.trim() || '';
          
          // أقل سعر
          const lowStr = cells[4].textContent?.trim() || '';
          
          // الحجم
          const volumeStr = cells[5].textContent?.trim() || '';
          
          // نسبة التغير
          const changeStr = cells[6]?.textContent?.trim() || '';
          
          if (dateStr && closeStr) {
            const date = parseDate(dateStr);
            const close = parseNumber(closeStr);
            const open = parseNumber(openStr);
            const high = parseNumber(highStr);
            const low = parseNumber(lowStr);
            const volume = parseVolume(volumeStr);
            const changePct = parseChangePercent(changeStr);
            
            if (!isNaN(close) && date) {
              data.push({
                date,
                open,
                high,
                low,
                close,
                volume,
                changePct
              });
            }
          }
        } catch (e) {
          // تجاهل الصفوف غير الصالحة
        }
      }
    }
  }
  
  if (symbol && data.length > 0) {
    return {
      symbol,
      name,
      exchange,
      data
    };
  }
  
  return null;
}

// تحويل التاريخ من صيغة DD/MM/YYYY إلى Date
function parseDate(dateStr: string): Date | null {
  try {
    // صيغة DD/MM/YYYY
    const match = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (match) {
      const day = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1; // الأشهر تبدأ من 0
      const year = parseInt(match[3], 10);
      return new Date(year, month, day);
    }
  } catch (e) {
    // تجاهل
  }
  return null;
}

// تحويل النص الرقمي إلى رقم
function parseNumber(str: string): number {
  if (!str) return NaN;
  // إزالة المسافات والفواصل
  const cleaned = str.replace(/[\s,]/g, '');
  const num = parseFloat(cleaned);
  return num;
}

// تحويل الحجم (مثل 5.26M إلى رقم)
function parseVolume(str: string): number {
  if (!str) return 0;
  
  const cleaned = str.replace(/[\s,]/g, '').toUpperCase();
  
  if (cleaned.includes('K')) {
    return parseFloat(cleaned) * 1000;
  } else if (cleaned.includes('M')) {
    return parseFloat(cleaned) * 1000000;
  } else if (cleaned.includes('B')) {
    return parseFloat(cleaned) * 1000000000;
  }
  
  return parseFloat(cleaned) || 0;
}

// تحويل نسبة التغير
function parseChangePercent(str: string): number | null {
  if (!str) return null;
  
  const cleaned = str.replace(/[%\s+]/g, '');
  const num = parseFloat(cleaned);
  
  if (isNaN(num)) return null;
  
  // إذا كان النص يحتوي على سالب
  if (str.includes('-')) {
    return -Math.abs(num);
  }
  
  return num;
}

// استخراج معلومات السهم الأساسية من الصفحة الرئيسية
export function parseStockMainPage(html: string): {
  symbol: string;
  name: string;
  exchange: string;
  isin: string | null;
  sector: string | null;
  industry: string | null;
} | null {
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  
  let symbol = '';
  let name = '';
  let exchange = '';
  let isin: string | null = null;
  let sector: string | null = null;
  let industry: string | null = null;
  
  // من meta tag
  const metaVars = doc.querySelector('meta[name="global-translation-variables"]');
  if (metaVars) {
    const content = metaVars.getAttribute('content') || '';
    try {
      const vars = JSON.parse(content.replace(/&quot;/g, '"'));
      symbol = vars.SYMBOL || '';
      name = vars.FULL_NAME || vars.SHORT_NAME || '';
      exchange = vars.EXCHANGE || '';
      isin = vars.ISIN || null;
      sector = vars.SECTOR || null;
      industry = vars.INDUSTRY || null;
    } catch (e) {
      // تجاهل
    }
  }
  
  if (symbol) {
    return { symbol, name, exchange, isin, sector, industry };
  }
  
  return null;
}
