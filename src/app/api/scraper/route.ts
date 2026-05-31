import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Get paths from environment variables or use defaults
// These are resolved at RUNTIME, not build time
const getPythonPath = () => process.env.PYTHON_PATH || 'python3';
const getScraperPath = () => process.env.SCRAPER_PATH || '';

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
    const { action, period } = body;
    
    // Resolve paths at runtime
    const projectRoot = process.cwd();
    const scraperPath = getScraperPath() || `${projectRoot}/mini-services/scraper-service/backend.py`;
    const pythonPath = getPythonPath();
    
    let command = '';
    let message = '';
    
    // Period for historical data
    const periodFlag = period ? `--period=${period}` : '--period=5y';
    
    switch (action) {
      case 'prices':
        command = `${pythonPath} ${scraperPath} --stocks-only`;
        message = 'تحديث الأسعار';
        break;
      case 'historical':
        command = `${pythonPath} ${scraperPath} --historical-only ${periodFlag}`;
        message = `جلب البيانات التاريخية (${period || '5 سنين'})`;
        break;
      case 'icons':
        command = `${pythonPath} ${scraperPath} --icons-only`;
        message = 'تحميل الأيقونات';
        break;
      case 'all':
        command = `${pythonPath} ${scraperPath} ${periodFlag}`;
        message = 'تحديث شامل';
        break;
      case 'parallel_ksa_egx':
        runParallelTasks(['KSA', 'EGX'], period, pythonPath, scraperPath);
        return NextResponse.json({
          success: true,
          message: `بدء المعالجة المتوازية للسعودية ومصر...`
        });
      case 'parallel_kse_qe':
        runParallelTasks(['KSE', 'QE'], period, pythonPath, scraperPath);
        return NextResponse.json({
          success: true,
          message: `بدء المعالجة المتوازية للكويت وقطر...`
        });
      case 'parallel_uae_bah':
        runParallelTasks(['UAE', 'BAH'], period, pythonPath, scraperPath);
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
async function runParallelTasks(exchanges: string[], period: string | undefined, pythonPath: string, scraperPath: string) {
  const exchangeFlags = exchanges.map(ex => `--exchange=${ex}`).join(' ');
  const periodFlag = period ? `--period=${period}` : '--period=5y';
  const command = `${pythonPath} ${scraperPath} ${exchangeFlags} ${periodFlag}`;
  
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
      { action: 'historical', description: 'جلب البيانات التاريخية', options: ['period'] },
      { action: 'icons', description: 'تحميل أيقونات الأسهم' },
      { action: 'all', description: 'تحديث شامل', options: ['period'] },
      { action: 'parallel_ksa_egx', description: 'معالجة متوازية: السعودية + مصر' },
      { action: 'parallel_kse_qe', description: 'معالجة متوازية: الكويت + قطر' },
      { action: 'parallel_uae_bah', description: 'معالجة متوازية: الإمارات + البحرين' }
    ],
    availablePeriods: [
      { value: '1y', label: 'سنة واحدة' },
      { value: '2y', label: 'سنتين' },
      { value: '5y', label: '5 سنين (default)' },
      { value: '10y', label: '10 سنين' },
      { value: 'max', label: 'كل البيانات المتاحة' }
    ]
  });
}
