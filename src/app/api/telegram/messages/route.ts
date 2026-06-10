import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Get saved messages from database
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const channel = searchParams.get('channel');
    const limit = parseInt(searchParams.get('limit') || '100');
    
    const where = channel ? { channel } : {};
    
    const messages = await db.telegramMessage.findMany({
      where,
      orderBy: { date: 'desc' },
      take: limit
    });
    
    const signals = await db.telegramSignal.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit
    });
    
    const news = await db.telegramNews.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit
    });
    
    return NextResponse.json({
      success: true,
      messages,
      signals,
      news,
      stats: {
        totalMessages: messages.length,
        totalSignals: signals.length,
        totalNews: news.length
      }
    });
  } catch (error) {
    console.error('Error fetching telegram data:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}

// POST - Save messages from scraping to database
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages } = body;
    
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages array required' }, { status: 400 });
    }
    
    let saved = 0;
    let skipped = 0;
    
    for (const msg of messages) {
      try {
        await db.telegramMessage.create({
          data: {
            messageId: msg.id,
            channel: msg.channel,
            text: msg.text,
            date: msg.date,
            views: msg.views,
            forwards: msg.forwards,
            replies: msg.replies
          }
        });
        saved++;
      } catch (e: any) {
        if (e.code === 'P2002') {
          // Duplicate - skip
          skipped++;
        } else {
          console.error('Error saving message:', e);
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      saved,
      skipped,
      total: messages.length
    });
  } catch (error) {
    console.error('Error saving messages:', error);
    return NextResponse.json({ error: 'Failed to save messages' }, { status: 500 });
  }
}
