import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'

const execAsync = promisify(exec)

// Use the virtual environment Python with all required packages
const PYTHON_PATH = '/home/z/.venv/bin/python3'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get('symbol')
  const market = searchParams.get('market')
  const personality = searchParams.get('personality') || 'balanced'
  const action = searchParams.get('action') || 'single'

  try {
    // Path to Python script
    const scriptPath = path.join(process.cwd(), 'data-engine', 'analysis_engine', 'cli.py')
    
    let command: string
    
    if (action === 'market') {
      // Analyze entire market
      command = `"${PYTHON_PATH}" "${scriptPath}" --action market --market "${market || ''}" --personality ${personality}`
    } else {
      // Analyze single stock
      if (!symbol) {
        return NextResponse.json({ error: 'Symbol is required for single analysis' }, { status: 400 })
      }
      command = `"${PYTHON_PATH}" "${scriptPath}" --action analyze --symbol ${symbol} --personality ${personality}`
    }

    const { stdout, stderr } = await execAsync(command, {
      timeout: 60000,
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    })

    if (stderr && !stdout) {
      console.error('Python stderr:', stderr)
      return NextResponse.json({ error: stderr }, { status: 500 })
    }

    // Parse JSON output
    try {
      // Try to extract JSON from the output (it may be preceded by progress messages)
      const jsonMatch = stdout.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return NextResponse.json(result);
      }
      const result = JSON.parse(stdout)
      return NextResponse.json(result)
    } catch {
      // Return raw output if not JSON
      return NextResponse.json({ 
        raw: stdout,
        error: 'Could not parse Python output'
      })
    }

  } catch (error) {
    console.error('Analysis error:', error)
    return NextResponse.json({ 
      error: String(error),
      hint: 'Make sure Python and required packages are installed'
    }, { status: 500 })
  }
}
