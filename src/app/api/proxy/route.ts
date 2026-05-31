import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const port = searchParams.get('XTransformPort') || '5001';
  const path = searchParams.get('path') || '/api/status';

  try {
    const response = await fetch(`http://localhost:${port}${path}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to connect to Python backend' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const port = searchParams.get('XTransformPort') || '5001';
  const path = searchParams.get('path') || '/api/status';

  try {
    const body = await request.json();

    const response = await fetch(`http://localhost:${port}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to connect to Python backend' },
      { status: 500 }
    );
  }
}
