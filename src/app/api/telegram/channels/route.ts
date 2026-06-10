import { NextRequest, NextResponse } from 'next/server';

const TELEGRAM_SERVICE_URL = 'http://localhost:3010';

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${TELEGRAM_SERVICE_URL}/channels`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error listing channels:', error);
    return NextResponse.json({
      error: 'خدمة التيليجرام غير متاحة'
    }, { status: 503 });
  }
}
