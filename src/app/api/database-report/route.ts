import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import Database from 'better-sqlite3'

const DB_PATH = path.join(process.cwd(), 'data-engine', 'data', 'data_engine.db')

interface TableStats {
  name: string
  count: number
  uniqueSymbols: number
  dateRange?: {
    min: string
    max: string
  }
  lastUpdate?: string
  categories?: { name: string; count: number }[]
  markets?: { name: string; count: number }[]
}

export async function GET() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      return NextResponse.json({ error: 'Database not found', tables: [] })
    }

    const db = new Database(DB_PATH, { readonly: true })
    const tables: TableStats[] = []

    // Get all tables
    const tableRows = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name != 'sqlite_sequence'").all() as { name: string }[]
    
    for (const { name } of tableRows) {
      const stats: TableStats = { name, count: 0, uniqueSymbols: 0 }
      
      // Get count
      const countRow = db.prepare(`SELECT COUNT(*) as count FROM "${name}"`).get() as { count: number }
      stats.count = countRow.count
      
      if (stats.count > 0) {
        // Get columns
        const columns = db.pragma(`table_info(${name})`) as { name: string }[]
        const colNames = columns.map(c => c.name)
        
        // Get unique symbols
        if (colNames.includes('symbol')) {
          const symbolRow = db.prepare(`SELECT COUNT(DISTINCT symbol) as cnt FROM "${name}"`).get() as { cnt: number }
          stats.uniqueSymbols = symbolRow.cnt
        }
        
        // Get date range
        if (colNames.includes('date')) {
          try {
            const dateRow = db.prepare(`SELECT MIN(date) as min, MAX(date) as max FROM "${name}"`).get() as { min: string; max: string }
            if (dateRow.min && dateRow.max) {
              stats.dateRange = { min: dateRow.min, max: dateRow.max }
            }
          } catch {}
        }
        
        // Get last update
        if (colNames.includes('last_fetch')) {
          try {
            const updateRow = db.prepare(`SELECT MAX(last_fetch) as last FROM "${name}"`).get() as { last: string }
            if (updateRow.last) {
              stats.lastUpdate = updateRow.last
            }
          } catch {}
        }
        if (colNames.includes('last_update')) {
          try {
            const updateRow = db.prepare(`SELECT MAX(last_update) as last FROM "${name}"`).get() as { last: string }
            if (updateRow.last) {
              stats.lastUpdate = updateRow.last
            }
          } catch {}
        }
        
        // Get categories breakdown
        if (colNames.includes('category')) {
          try {
            const catRows = db.prepare(`SELECT category as name, COUNT(*) as count FROM "${name}" GROUP BY category ORDER BY count DESC`).all() as { name: string; count: number }[]
            stats.categories = catRows
          } catch {}
        }
        
        // Get markets breakdown
        if (colNames.includes('market')) {
          try {
            const marketRows = db.prepare(`SELECT market as name, COUNT(*) as count FROM "${name}" GROUP BY market ORDER BY count DESC LIMIT 10`).all() as { name: string; count: number }[]
            stats.markets = marketRows
          } catch {}
        }
      }
      
      tables.push(stats)
    }
    
    // Calculate totals
    const totals = {
      totalRecords: tables.reduce((sum, t) => sum + t.count, 0),
      totalSymbols: tables.reduce((sum, t) => sum + t.uniqueSymbols, 0),
      tableCount: tables.length
    }
    
    // Get file size
    const stats = fs.statSync(DB_PATH)
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2)
    
    db.close()
    
    return NextResponse.json({
      tables,
      totals,
      fileSize: `${fileSizeMB} MB`,
      lastChecked: new Date().toISOString()
    })
    
  } catch (error) {
    return NextResponse.json({ 
      error: String(error),
      tables: [],
      totals: { totalRecords: 0, totalSymbols: 0, tableCount: 0 }
    }, { status: 500 })
  }
}
