import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export async function GET() {
  try {
    const dbPath = path.join(process.cwd(), 'data-engine', 'data', 'data_engine.db');
    const db = new Database(dbPath, { readonly: true });

    // Get all tables
    const tables = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' ORDER BY name
    `).all() as { name: string }[];

    // Get row counts for each table
    const tableStats: { name: string; count: number }[] = [];
    
    for (const table of tables) {
      const result = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get() as { count: number };
      tableStats.push({
        name: table.name,
        count: result.count
      });
    }

    // Get database file size
    const stats = fs.statSync(dbPath);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    db.close();

    return NextResponse.json({
      fileSizeMB,
      tables: tableStats,
      totalTables: tables.length
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
