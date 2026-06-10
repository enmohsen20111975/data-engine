import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Patterns for signal extraction
const SIGNAL_PATTERNS = {
  buy: /(?:شراء|buy|achat|Long|long|شره|توصية شراء)/i,
  sell: /(?:بيع|sell|vente|Short|short|توصية بيع)/i,
  hold: /(?:انتظار|hold|hold|ترقب|مراقبة)/i,
  accumulate: /(?:تجميع|accumulate|accumulation|جمع)/i,
  distribute: /(?:تصريف|distribute|distribution|توزيع)/i
};

// Stock symbol patterns for different markets
const SYMBOL_PATTERNS = {
  saudi: /\b([0-9]{4})(?:\.SR)?\b|\b(\d{4})\b/,
  egypt: /\b([A-Z]{3,4})(?:\.EG)?\b/,
  kuwait: /\b([A-Z]{3,4})(?:\.KW)?\b/,
  qatar: /\b([A-Z]{3,4})(?:\.QA)?\b/
};

// Price patterns
const PRICE_PATTERN = /(?:سعر|price|هدف|target)[:\s]*([0-9,.]+)/i;
const TARGET_PATTERN = /(?:هدف|target|استهداف)[:\s]*([0-9,.]+)/i;
const STOP_PATTERN = /(?:وقف|stop|stop.?loss)[:\s]*([0-9,.]+)/i;

function extractSignal(text: string): { type: string | null; confidence: number } {
  let maxScore = 0;
  let bestMatch = null;
  
  for (const [type, pattern] of Object.entries(SIGNAL_PATTERNS)) {
    const matches = text.match(pattern);
    if (matches) {
      const score = matches.length;
      if (score > maxScore) {
        maxScore = score;
        bestMatch = type;
      }
    }
  }
  
  // Calculate confidence based on presence of key elements
  let confidence = 0.5;
  if (PRICE_PATTERN.test(text)) confidence += 0.15;
  if (TARGET_PATTERN.test(text)) confidence += 0.15;
  if (STOP_PATTERN.test(text)) confidence += 0.1;
  if (/تحليل|analysis|fundamental|technical/i.test(text)) confidence += 0.1;
  
  return { type: bestMatch, confidence: Math.min(confidence, 1) };
}

function extractSymbols(text: string): { symbol: string; market: string }[] {
  const symbols: { symbol: string; market: string }[] = [];
  
  // Saudi stocks (4 digit numbers)
  const saudiMatches = text.matchAll(/\b(\d{4})\b/g);
  for (const match of saudiMatches) {
    symbols.push({ symbol: match[1] + '.SR', market: 'saudi' });
  }
  
  // Named stocks (3-4 letter codes)
  const namedMatches = text.matchAll(/\b([A-Z]{3,4})\b/g);
  for (const match of namedMatches) {
    // Could be Egypt, Kuwait, or Qatar - default to Saudi if known
    symbols.push({ symbol: match[1], market: 'unknown' });
  }
  
  return symbols;
}

function extractPrices(text: string) {
  const priceMatch = text.match(PRICE_PATTERN);
  const targetMatch = text.match(TARGET_PATTERN);
  const stopMatch = text.match(STOP_PATTERN);
  
  return {
    price: priceMatch ? parseFloat(priceMatch[1].replace(',', '')) : null,
    targetPrice: targetMatch ? parseFloat(targetMatch[1].replace(',', '')) : null,
    stopLoss: stopMatch ? parseFloat(stopMatch[1].replace(',', '')) : null
  };
}

function analyzeSentiment(text: string): string {
  const positiveWords = /صعود|ارتفاع|نمو|ربح|توصية شراء|buy|bullish|positive/i;
  const negativeWords = /هبوط|انخفاض|خسارة|توصية بيع|sell|bearish|negative/i;
  
  const positiveCount = (text.match(positiveWords) || []).length;
  const negativeCount = (text.match(negativeWords) || []).length;
  
  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
}

// POST - Process unprocessed messages
export async function POST(request: NextRequest) {
  try {
    // Get unprocessed messages
    const messages = await db.telegramMessage.findMany({
      where: { processed: false },
      take: 100
    });
    
    let signalsCreated = 0;
    let newsCreated = 0;
    let messagesProcessed = 0;
    
    for (const msg of messages) {
      if (!msg.text) continue;
      
      const text = msg.text;
      const { type: signalType, confidence } = extractSignal(text);
      const symbols = extractSymbols(text);
      const prices = extractPrices(text);
      const sentiment = analyzeSentiment(text);
      
      // Create signals if we found signal type and symbols
      if (signalType && symbols.length > 0) {
        for (const { symbol, market } of symbols) {
          try {
            await db.telegramSignal.create({
              data: {
                messageId: msg.messageId,
                channel: msg.channel,
                symbol,
                market: market === 'unknown' ? null : market,
                signalType,
                price: prices.price,
                targetPrice: prices.targetPrice,
                stopLoss: prices.stopLoss,
                confidence,
                rawText: text.substring(0, 500),
                date: msg.date
              }
            });
            signalsCreated++;
          } catch (e) {
            console.error('Error creating signal:', e);
          }
        }
      }
      
      // Create news if no signal but has content
      if (!signalType && text.length > 100) {
        try {
          await db.telegramNews.create({
            data: {
              messageId: msg.messageId,
              channel: msg.channel,
              title: text.substring(0, 100),
              summary: text.substring(0, 300),
              sentiment,
              symbols: JSON.stringify(symbols.map(s => s.symbol)),
              rawText: text.substring(0, 1000),
              date: msg.date
            }
          });
          newsCreated++;
        } catch (e) {
          console.error('Error creating news:', e);
        }
      }
      
      // Mark message as processed
      await db.telegramMessage.update({
        where: { id: msg.id },
        data: {
          processed: true,
          processedAt: new Date().toISOString()
        }
      });
      messagesProcessed++;
    }
    
    return NextResponse.json({
      success: true,
      processed: messagesProcessed,
      signalsCreated,
      newsCreated
    });
  } catch (error) {
    console.error('Error processing messages:', error);
    return NextResponse.json({ error: 'Failed to process messages' }, { status: 500 });
  }
}

// GET - Get processing stats
export async function GET(request: NextRequest) {
  try {
    const totalMessages = await db.telegramMessage.count();
    const processedMessages = await db.telegramMessage.count({
      where: { processed: true }
    });
    const totalSignals = await db.telegramSignal.count();
    const totalNews = await db.telegramNews.count();
    
    // Get signal breakdown
    const signalsByType = await db.telegramSignal.groupBy({
      by: ['signalType'],
      _count: true
    });
    
    // Get channel breakdown
    const messagesByChannel = await db.telegramMessage.groupBy({
      by: ['channel'],
      _count: true
    });
    
    return NextResponse.json({
      success: true,
      stats: {
        totalMessages,
        processedMessages,
        pendingMessages: totalMessages - processedMessages,
        totalSignals,
        totalNews,
        signalsByType: signalsByType.reduce((acc, s) => {
          acc[s.signalType || 'unknown'] = s._count;
          return acc;
        }, {} as Record<string, number>),
        messagesByChannel: messagesByChannel.map(m => ({
          channel: m.channel,
          count: m._count
        }))
      }
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    return NextResponse.json({ error: 'Failed to get stats' }, { status: 500 });
  }
}
