import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export async function GET() {
  try {
    const statusPath = path.join(process.cwd(), 'scraper_status.json');
    
    if (!existsSync(statusPath)) {
      return NextResponse.json({
        status: 'idle',
        message: 'لا توجد عملية قيد التشغيل',
        logs: []
      });
    }
    
    const content = await readFile(statusPath, 'utf-8');
    const status = JSON.parse(content);
    
    return NextResponse.json(status);
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: 'خطأ في قراءة الحالة',
      logs: []
    });
  }
}
