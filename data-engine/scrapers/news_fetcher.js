#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * News Fetcher for Stock Markets - Production Version
 * جالب الأخبار للأسواق المالية - نسخة الإنتاج
 * 
 * Uses multiple News APIs with fallback:
 * 1. NewsAPI.org (100 req/day)
 * 2. GNews (100 req/day)
 * 3. Currents API (200 req/day)
 * 4. MediaStack (500 req/month)
 * 
 * Supports: Saudi Arabia, Egypt, Kuwait, Qatar
 */

const https = require('https');
const http = require('http');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Database path
const DB_PATH = path.join(__dirname, '..', 'data', 'data_engine.db');
const CONFIG_PATH = path.join(__dirname, '..', 'config', 'api_keys.json');

// Load API keys
const API_KEYS = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));

// Markets configuration - Arabic & English queries
const MARKETS = {
    saudi: {
        name: 'السعودية',
        exchange: 'Tadawul',
        queries: [
            'Saudi stock market TASI news',
            'Tadawul Saudi Arabia financial',
            'Aramco Saudi dividend'
        ]
    },
    egypt: {
        name: 'مصر',
        exchange: 'EGX',
        queries: [
            'Egypt stock market EGX news',
            'Egyptian Exchange Cairo financial'
        ]
    },
    kuwait: {
        name: 'الكويت',
        exchange: 'KSE',
        queries: [
            'Kuwait stock exchange Boursa news',
            'Kuwait financial market'
        ]
    },
    qatar: {
        name: 'قطر',
        exchange: 'QSE',
        queries: [
            'Qatar stock exchange QSE news',
            'Qatar financial market Doha'
        ]
    }
};

// API Providers
const PROVIDERS = [
    {
        name: 'NewsAPI',
        fetch: fetchFromNewsAPI,
        priority: 1
    },
    {
        name: 'GNews',
        fetch: fetchFromGNews,
        priority: 2
    },
    {
        name: 'CurrentsAPI',
        fetch: fetchFromCurrentsAPI,
        priority: 3
    },
    {
        name: 'MediaStack',
        fetch: fetchFromMediaStack,
        priority: 4
    }
];

let db = null;
let requestCount = {};

// ============================================
// HTTP Helper with User-Agent
// ============================================
function makeRequest(url) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const client = urlObj.protocol === 'https:' ? https : http;
        
        const options = {
            hostname: urlObj.hostname,
            path: urlObj.pathname + urlObj.search,
            method: 'GET',
            headers: {
                'User-Agent': 'DataEngine/1.0 (Financial News Aggregator)',
                'Accept': 'application/json'
            }
        };
        
        const req = client.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(new Error('Invalid JSON response'));
                }
            });
        });
        
        req.on('error', reject);
        req.end();
    });
}

// ============================================
// NewsAPI.org
// ============================================
async function fetchFromNewsAPI(query) {
    const apiKey = API_KEYS.newsapi.key;
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&pageSize=10&apiKey=${apiKey}`;
    
    requestCount['newsapi'] = (requestCount['newsapi'] || 0) + 1;
    console.log(`  [NewsAPI] Request #${requestCount['newsapi']}`);
    
    try {
        const data = await makeRequest(url);
        
        if (data.status === 'ok' && data.articles && data.articles.length > 0) {
            return data.articles.map(article => ({
                title: article.title,
                url: article.url,
                snippet: article.description,
                source: article.source?.name || 'NewsAPI',
                published_date: article.publishedAt
            }));
        }
        
        console.log(`    NewsAPI: ${data.totalResults || 0} results`);
        return [];
    } catch (error) {
        throw new Error(`NewsAPI: ${error.message}`);
    }
}

// ============================================
// GNews API
// ============================================
async function fetchFromGNews(query) {
    const apiKey = API_KEYS.gnews.key;
    const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=en&max=10&apikey=${apiKey}`;
    
    requestCount['gnews'] = (requestCount['gnews'] || 0) + 1;
    console.log(`  [GNews] Request #${requestCount['gnews']}`);
    
    try {
        const data = await makeRequest(url);
        
        if (data.articles && data.articles.length > 0) {
            return data.articles.map(article => ({
                title: article.title,
                url: article.url,
                snippet: article.description,
                source: article.source?.name || 'GNews',
                published_date: article.publishedAt
            }));
        }
        
        console.log(`    GNews: ${data.totalArticles || 0} results`);
        return [];
    } catch (error) {
        throw new Error(`GNews: ${error.message}`);
    }
}

// ============================================
// Currents API
// ============================================
async function fetchFromCurrentsAPI(query) {
    const apiKey = API_KEYS.currentsapi.key;
    const url = `https://api.currentsapi.services/v1/search?keywords=${encodeURIComponent(query)}&language=en&limit=10&apiKey=${apiKey}`;
    
    requestCount['currentsapi'] = (requestCount['currentsapi'] || 0) + 1;
    console.log(`  [CurrentsAPI] Request #${requestCount['currentsapi']}`);
    
    try {
        const data = await makeRequest(url);
        
        if (data.news && data.news.length > 0) {
            return data.news.map(article => ({
                title: article.title,
                url: article.url,
                snippet: article.description,
                source: article.author || 'CurrentsAPI',
                published_date: article.published
            }));
        }
        
        console.log(`    CurrentsAPI: No results`);
        return [];
    } catch (error) {
        throw new Error(`CurrentsAPI: ${error.message}`);
    }
}

// ============================================
// MediaStack API
// ============================================
async function fetchFromMediaStack(query) {
    const apiKey = API_KEYS.mediastack.key;
    const url = `http://api.mediastack.com/v1/news?keywords=${encodeURIComponent(query)}&languages=en&limit=10&access_key=${apiKey}`;
    
    requestCount['mediastack'] = (requestCount['mediastack'] || 0) + 1;
    console.log(`  [MediaStack] Request #${requestCount['mediastack']}`);
    
    try {
        const data = await makeRequest(url);
        
        if (data.data && data.data.length > 0) {
            return data.data.map(article => ({
                title: article.title,
                url: article.url,
                snippet: article.description,
                source: article.source || 'MediaStack',
                published_date: article.published_at
            }));
        }
        
        console.log(`    MediaStack: No results`);
        return [];
    } catch (error) {
        throw new Error(`MediaStack: ${error.message}`);
    }
}

// ============================================
// Smart Fetch with Fallback
// ============================================
async function searchNewsWithFallback(query) {
    // Try each provider in order
    for (const provider of PROVIDERS) {
        try {
            const results = await provider.fetch(query);
            if (results && results.length > 0) {
                console.log(`  ✓ Got ${results.length} results from ${provider.name}`);
                return { provider: provider.name, results };
            }
        } catch (error) {
            console.log(`  ✗ ${provider.name} failed: ${error.message}`);
        }
    }
    
    return { provider: null, results: [] };
}

// ============================================
// Database Functions
// ============================================
function initialize() {
    return new Promise((resolve, reject) => {
        db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) reject(err);
            else {
                createNewsTable();
                console.log('✓ Database initialized');
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
            provider TEXT,
            fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
}

function saveNewsToDb(items, market, query, provider) {
    return new Promise((resolve) => {
        if (!items || items.length === 0) {
            resolve(0);
            return;
        }
        
        const stmt = db.prepare(`
            INSERT OR IGNORE INTO market_news 
            (title, url, snippet, source, market, search_query, published_date, provider)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        let savedCount = 0;
        let pending = items.length;
        
        for (const item of items) {
            stmt.run(
                item.title || '',
                item.url || '',
                item.snippet || '',
                item.source || '',
                market,
                query,
                item.published_date || '',
                provider,
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

// ============================================
// Main Fetch Function
// ============================================
async function fetchAllNews() {
    console.log('='.repeat(60));
    console.log('📰 News Fetcher - Production Version');
    console.log(`📅 Time: ${new Date().toISOString()}`);
    console.log('='.repeat(60));
    
    let totalSaved = 0;
    const stats = {};
    
    for (const [marketKey, marketInfo] of Object.entries(MARKETS)) {
        console.log(`\n🌍 ${marketInfo.name} (${marketInfo.exchange})`);
        stats[marketKey] = { total: 0, byProvider: {} };
        
        for (const query of marketInfo.queries) {
            console.log(`  🔍 Searching: ${query}`);
            
            const { provider, results } = await searchNewsWithFallback(query);
            
            if (results.length > 0) {
                const saved = await saveNewsToDb(results, marketKey, query, provider);
                totalSaved += saved;
                stats[marketKey].total += saved;
                stats[marketKey].byProvider[provider] = (stats[marketKey].byProvider[provider] || 0) + saved;
                console.log(`    💾 Saved ${saved} articles`);
            } else {
                console.log(`    ❌ No results`);
            }
            
            // Delay to avoid rate limits (1 second)
            await new Promise(r => setTimeout(r, 1000));
        }
    }
    
    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`\n✅ Total saved: ${totalSaved} articles`);
    console.log('\n📈 API Usage:');
    for (const [api, count] of Object.entries(requestCount)) {
        console.log(`   ${api}: ${count} requests`);
    }
    console.log('\n📂 By Market:');
    for (const [market, data] of Object.entries(stats)) {
        console.log(`   ${market}: ${data.total} articles`);
    }
    console.log('='.repeat(60));
    
    return totalSaved;
}

function close() {
    if (db) {
        db.close();
    }
}

// ============================================
// CLI
// ============================================
async function main() {
    const args = process.argv.slice(2);
    const command = args[0] || '--fetch';
    
    try {
        await initialize();
        
        if (command === '--stats') {
            // Show stats
            db.get('SELECT COUNT(*) as count FROM market_news', (err, row) => {
                console.log(`Total news: ${row?.count || 0}`);
            });
            
            db.all(`
                SELECT market, provider, COUNT(*) as count 
                FROM market_news 
                GROUP BY market, provider
            `, (err, rows) => {
                console.log('\nBy Market & Provider:');
                rows?.forEach(r => {
                    console.log(`  ${r.market} (${r.provider}): ${r.count}`);
                });
                close();
            });
        } else if (command === '--keys') {
            // Show API keys info
            console.log('\n🔑 API Keys:');
            for (const [name, info] of Object.entries(API_KEYS)) {
                console.log(`\n${name.toUpperCase()}:`);
                console.log(`  Dashboard: ${info.dashboard}`);
                console.log(`  Limit: ${info.limit}`);
            }
            close();
        } else {
            await fetchAllNews();
            close();
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        close();
        process.exit(1);
    }
}

main();
