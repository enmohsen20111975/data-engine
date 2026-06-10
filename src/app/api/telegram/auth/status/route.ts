import { NextResponse } from 'next/server'

const TELEGRAM_SERVICE_URL = 'http://localhost:3010'

export async function GET() {
  try {
    const response = await fetch(`${TELEGRAM_SERVICE_URL}/auth/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error checking telegram auth:', error)
    return NextResponse.json({
      authenticated: false,
      phone: null,
      error: 'خدمة التيليجرام غير متاحة'
    })
  }
}
