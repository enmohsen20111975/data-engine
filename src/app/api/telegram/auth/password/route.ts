import { NextRequest, NextResponse } from 'next/server'

const TELEGRAM_SERVICE_URL = 'http://localhost:3010'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const response = await fetch(`${TELEGRAM_SERVICE_URL}/auth/password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    
    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Error verifying telegram password:', error)
    return NextResponse.json({
      error: 'خدمة التيليجرام غير متاحة'
    }, { status: 503 })
  }
}
