#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * News Fetcher for Stock Markets
 * جالب الأخبار للأسواق المالية
 * 
 * Supports: Saudi Arabia, Egypt, Kuwait, Qatar
 */

const ZAI = require('z-ai-web-dev-sdk').default;
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const DB_PATH = path.join(__dirname, '..', 'data', 'data_engine.db');

// Markets configuration - Arabic queries for Arabic news
const MARKETS = {
    saudi: {
        name: 'السعودية',
        exchange: 'Tadawul',
        queries: [
            'site:argaam.com أخبار تداول أسهم السعودية',
            'site:mubasher.info السعودية أخبار الأسهم',
            'أخبار مالية السعودية ارتفاع انخفاض أسهم',
            'نتائج أعمال الشركات السعودية ربع سنوي',
            'توزيعات أرباح الشركات السعودية 2024'
        ]
    },
    egypt: {
        name: 'مصر',
        exchange: 'EGX',
        queries: [
            'site:mubasher.info مصر أخبار البورصة',
            'أخبار البورصة المصرية ارتفاع انخفاض',
            'نتائج أعمال الشركات المصرية',
            'توصيات أسهم مصرية تحليل فني',
            'توزيعات أرباح الشركات المصرية'
        ]
    },
    kuwait: {
        name: 'الكويت',
        exchange: 'KSE',
        queries: [
            'site:mubasher.info الكويت أخبار بورصة',
            'أخبار بورصة الكويت ارتفاع انخفاض',
            'نتائج أعمال الشركات الكويتية',
            'توزيعات أرباح الشركات الكويتية'
        ]
    },
    qatar: {
        name: 'قطر',
        exchange: 'QSE',
        queries: [
            'site:mubasher.info قطر أخبار بورصة',
            'أخبار بورصة قطر ارتفاع انخفاض',
            'نتائج أعمال الشركات القطرية',
            'توزيعات أرباح الشركات القطرية'
        ]
    }
};

let zai = null;
let db = null;

// Cache for news (1 hour)
const newsCache = new Map();
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

// Rate limiting
const requestTimes = [];
const MAX_REQUESTS_PER_MINUTE = 30;

async function initialize() {
    // Initialize Z-AI
    zai = await ZAI.create();
    console.log('✓ Z-AI initialized');
    
    // Initialize database
    return new Promise((resolve, reject) => {
        db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) reject(err);
            else {
                createNewsTable();
                resolve();
            }
        });
    });
}

function createNewsTable() {
    db.run(`
        CREATE TABLE IF NOT EXISTS market_news (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            url TEXT UNIQUE,
            snippet TEXT,
            source TEXT,
            market TEXT,
            search_query TEXT,
            published_date TEXT,
            sentiment TEXT,
            fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    console.log('✓ News table ready');
}

async function checkRateLimit() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Remove old requests
    while (requestTimes.length > 0 && requestTimes[0] < oneMinuteAgo) {
        requestTimes.shift();
    }
    
    if (requestTimes.length >= MAX_REQUESTS_PER_MINUTE) {
        const waitTime = 60000 - (now - requestTimes[0]);
        console.log(`Rate limit reached. Waiting ${Math.ceil(waitTime/1000)}s...`);
        await new Promise(r => setTimeout(r, waitTime));
        return checkRateLimit();
    }
    
    requestTimes.push(now);
}

async function searchNews(query, numResults = 10, recencyDays = 7) {
    try {
        // Check cache first
        const cacheKey = `${query}_${numResults}_${recencyDays}`;
        const cached = newsCache.get(cacheKey);
        
        if (cached && (Date.now() - cached.time) < CACHE_DURATION) {
            console.log(`  (Using cached results for: ${query})`);
            return cached.data;
        }
        
        // Rate limit check
        await checkRateLimit();
        
        // Retry logic
        let retries = 3;
        let results = null;
        
        while (retries > 0 && !results) {
            try {
                results = await zai.functions.invoke('web_search', {
                    query: query,
                    num: numResults,
                    recency_days: recencyDays
                });
            } catch (e) {
                retries--;
                if (retries > 0) {
                    console.log(`  Retry ${3-retries}/3...`);
                    await new Promise(r => setTimeout(r, 1000));
                }
            }
        }
        
        // Cache the results
        if (results && results.length > 0) {
            newsCache.set(cacheKey, {
                data: results,
                time: Date.now()
            });
        }
        
        return results || [];
    } catch (error) {
        console.error(`Error searching "${query}": ${error.message}`);
        return [];
    }
}

function saveNewsToDb(items, market, query) {
    return new Promise((resolve, reject) => {
        if (!items || items.length === 0) {
            resolve(0);
            return;
        }
        
        const stmt = db.prepare(`
            INSERT OR IGNORE INTO market_news 
            (title, url, snippet, source, market, search_query, published_date)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        
        let savedCount = 0;
        let pending = items.length;
        
        for (const item of items) {
            stmt.run(
                item.name || '',
                item.url || '',
                item.snippet || '',
                item.host_name || '',
                market,
                query,
                item.date || '',
                (err) => {
                    if (!err) savedCount++;
                    pending--;
                    if (pending === 0) {
                        stmt.finalize();
                        resolve(savedCount);
                    }
                }
            );
        }
    });
}

async function fetchAllNews(recencyDays = 7) {
    console.log('='.repeat(60));
    console.log('Starting news fetcher...');
    console.log(`Time: ${new Date().toISOString()}`);
    console.log('='.repeat(60));
    
    let totalSaved = 0;
    
    for (const [marketKey, marketInfo] of Object.entries(MARKETS)) {
        console.log(`\n--- ${marketInfo.name} (${marketInfo.exchange}) ---`);
        
        for (const query of marketInfo.queries) {
            console.log(`  Searching: ${query}`);
            
            const items = await searchNews(query, 10, recencyDays);
            
            if (items.length > 0) {
                const saved = await saveNewsToDb(items, marketKey, query);
                totalSaved += saved;
                console.log(`    Found ${items.length}, saved ${saved} new`);
            } else {
                console.log(`    No results`);
            }
            
            // Small delay between searches
            await new Promise(r => setTimeout(r, 500));
        }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(`Total new items saved: ${totalSaved}`);
    console.log('='.repeat(60));
    
    return totalSaved;
}

function getNewsStats() {
    return new Promise((resolve, reject) => {
        const stats = {
            total: 0,
            byMarket: {},
            topSources: {},
            recentNews: []
        };
        
        // Get total count
        db.get('SELECT COUNT(*) as count FROM market_news', (err, row) => {
            if (row) stats.total = row.count;
        });
        
        // Get count by market
        db.all(`
            SELECT market, COUNT(*) as count 
            FROM market_news 
            GROUP BY market 
            ORDER BY count DESC
        `, (err, rows) => {
            if (rows) {
                rows.forEach(r => stats.byMarket[r.market] = r.count);
            }
        });
        
        // Get top sources
        db.all(`
            SELECT source, COUNT(*) as count 
            FROM market_news 
            GROUP BY source 
            ORDER BY count DESC 
            LIMIT 10
        `, (err, rows) => {
            if (rows) {
                rows.forEach(r => stats.topSources[r.source] = r.count);
            }
            
            // Get recent news
            db.all(`
                SELECT title, url, snippet, source, market, fetched_at 
                FROM market_news 
                ORDER BY fetched_at DESC 
                LIMIT 20
            `, (err, rows) => {
                if (rows) stats.recentNews = rows;
                resolve(stats);
            });
        });
    });
}

function close() {
    if (db) {
        db.close();
    }
}

// Main
async function main() {
    const args = process.argv.slice(2);
    const command = args[0] || '--fetch';
    const days = parseInt(args.find(a => a.startsWith('--days='))?.split('=')[1]) || 7;
    
    try {
        await initialize();
        
        if (command === '--stats') {
            const stats = await getNewsStats();
            console.log('\n=== News Statistics ===');
            console.log(`Total news: ${stats.total}`);
            console.log('\nBy market:', stats.byMarket);
            console.log('\nTop sources:', stats.topSources);
            
            if (stats.recentNews.length > 0) {
                console.log('\n=== Recent News ===');
                stats.recentNews.slice(0, 5).forEach((item, i) => {
                    console.log(`\n${i + 1}. [${item.market}] ${item.title}`);
                    console.log(`   ${item.snippet?.substring(0, 100)}...`);
                });
            }
        } else {
            await fetchAllNews(days);
            
            // Show stats after fetching
            const stats = await getNewsStats();
            console.log(`\nTotal news in database: ${stats.total}`);
        }
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        close();
    }
}

main();
