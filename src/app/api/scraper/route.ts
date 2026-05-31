import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const SCRAPER_PATH = '/home/z/my-project/mini-services/scraper-service/backend.py';
const PYTHON_PATH = '/home/z/my-project/mini-services/scraper-service/venv/bin/python';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;
    
    let command = '';
    
    switch (action) {
      case 'prices':
        command = `${PYTHON_PATH} ${SCRAPER_PATH} --stocks-only`;
        break;
      case 'historical':
        command = `${PYTHON_PATH} ${SCRAPER_PATH} --historical-only`;
        break;
      case 'icons':
        command = `${PYTHON_PATH} ${SCRAPER_PATH} --icons-only`;
        break;
      case 'all':
        command = `${PYTHON_PATH} ${SCRAPER_PATH}`;
        break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    
    // Run in background (don't wait for completion)
    execAsync(command, {
      timeout: 300000, // 5 minutes
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    }).then(({ stdout, stderr }) => {
      console.log('Scraper output:', stdout);
      if (stderr) console.error('Scraper error:', stderr);
    }).catch(error => {
      console.error('Scraper failed:', error);
    });
    
    return NextResponse.json({
      success: true,
      message: `بدأ ${action}... راقب السجلات للمتابعة`
    });
    
  } catch (error) {
    console.error('Error running scraper:', error);
    return NextResponse.json(
      { error: 'Failed to run scraper' },
      { status: 500 }
    );
  }
}
