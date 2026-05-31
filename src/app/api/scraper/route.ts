import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

// Use process.cwd() to get the project root directory dynamically
const PROJECT_ROOT = process.cwd();
const SCRAPER_PATH = path.join(PROJECT_ROOT, 'mini-services', 'scraper-service', 'backend.py');
const PYTHON_PATH = path.join(PROJECT_ROOT, 'mini-services', 'scraper-service', 'venv', 'bin', 'python');

// Exchange to country mapping
const EXCHANGE_COUNTRY_MAP: Record<string, string> = {
  'KSA': 'السعودية',
  'EGX': 'مصر',
  'KSE': 'الكويت',
  'QE': 'قطر',
  'UAE': 'الإمارات',
  'BAH': 'البحرين'
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;
    
    let command = '';
    let message = '';
    
    switch (action) {
      case 'prices':
        command = `${PYTHON_PATH} ${SCRAPER_PATH} --stocks-only`;
        message = 'تحديث الأسعار';
        break;
      case 'historical':
        command = `${PYTHON_PATH} ${SCRAPER_PATH} --historical-only`;
        message = 'جلب البيانات التاريخية';
        break;
      case 'icons':
        command = `${PYTHON_PATH} ${SCRAPER_PATH} --icons-only`;
        message = 'تحميل الأيقونات';
        break;
      case 'all':
        command = `${PYTHON_PATH} ${SCRAPER_PATH}`;
        message = 'تحديث شامل';
        break;
      case 'parallel_ksa_egx':
        // Run KSA and EGX in parallel
        runParallelTasks(['KSA', 'EGX']);
        return NextResponse.json({
          success: true,
          message: `بدء المعالجة المتوازية للسعودية ومصر...`
        });
      case 'parallel_kse_qe':
        // Run KSE and QE in parallel
        runParallelTasks(['KSE', 'QE']);
        return NextResponse.json({
          success: true,
          message: `بدء المعالجة المتوازية للكويت وقطر...`
        });
      case 'parallel_uae_bah':
        // Run UAE and BAH in parallel
        runParallelTasks(['UAE', 'BAH']);
        return NextResponse.json({
          success: true,
          message: `بدء المعالجة المتوازية للإمارات والبحرين...`
        });
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    
    // Run in background (don't wait for completion)
    execAsync(command, {
      timeout: 600000, // 10 minutes
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    }).then(({ stdout, stderr }) => {
      console.log(`[${action}] Scraper output:`, stdout.slice(0, 500));
      if (stderr) console.error(`[${action}] Scraper error:`, stderr);
    }).catch(error => {
      console.error(`[${action}] Scraper failed:`, error);
    });
    
    return NextResponse.json({
      success: true,
      message: `بدأ ${message}... راقب السجلات للمتابعة`
    });
    
  } catch (error) {
    console.error('Error running scraper:', error);
    return NextResponse.json(
      { error: 'Failed to run scraper' },
      { status: 500 }
    );
  }
}

// Run parallel tasks for multiple exchanges
async function runParallelTasks(exchanges: string[]) {
  const exchangeFlags = exchanges.map(ex => `--exchange=${ex}`).join(' ');
  const command = `${PYTHON_PATH} ${SCRAPER_PATH} ${exchangeFlags} --parallel`;
  
  execAsync(command, {
    timeout: 600000,
    maxBuffer: 1024 * 1024 * 10
  }).then(({ stdout, stderr }) => {
    console.log(`[parallel ${exchanges.join(',')}] Output:`, stdout.slice(0, 500));
    if (stderr) console.error(`[parallel] Error:`, stderr);
  }).catch(error => {
    console.error(`[parallel] Failed:`, error);
  });
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    availableActions: [
      { action: 'prices', description: 'تحديث أسعار الأسهم' },
      { action: 'historical', description: 'جلب البيانات التاريخية' },
      { action: 'icons', description: 'تحميل أيقونات الأسهم' },
      { action: 'all', description: 'تحديث شامل' },
      { action: 'parallel_ksa_egx', description: 'معالجة متوازية: السعودية + مصر' },
      { action: 'parallel_kse_qe', description: 'معالجة متوازية: الكويت + قطر' },
      { action: 'parallel_uae_bah', description: 'معالجة متوازية: الإمارات + البحرين' }
    ]
  });
}
