import { NextRequest, NextResponse } from 'next/server'

const TELEGRAM_SERVICE_URL = 'http://localhost:3010'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const response = await fetch(`${TELEGRAM_SERVICE_URL}/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      // Increased timeout for scraping
      signal: AbortSignal.timeout(300000), // 5 minutes
    })
    
    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Error scraping telegram:', error)
    return NextResponse.json({
      error: 'خدمة التيليجرام غير متاحة أو انتهت المهلة'
    }, { status: 503 })
  }
}
