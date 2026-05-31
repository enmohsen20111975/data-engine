/**
 * Investing.com Scraper Service
 * Uses agent-browser to scrape stock data from Investing.com
 */

import { serve } from "bun";
import { execSync } from "child_process";
import path from "path";

// Use absolute path to database
const DB_PATH = "/home/z/my-project/db/data-factory.db";

// Dynamic import for Prisma to handle errors
let prisma: any;
try {
  const { PrismaClient } = await import("@prisma/client");
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: `file:${DB_PATH}`
      }
    }
  });
  console.log("✅ Prisma client initialized with database:", DB_PATH);
} catch (error) {
  console.error("❌ Failed to initialize Prisma:", error);
}

const PORT = 3002;

// Supported countries and their URLs
const COUNTRIES: Record<string, { url: string; exchange: string }> = {
  egypt: { url: "https://sa.investing.com/equities/egypt", exchange: "EGX" },
  "saudi-arabia": { url: "https://sa.investing.com/equities/saudi-arabia", exchange: "TADAWUL" },
  "united-arab-emirates": { url: "https://sa.investing.com/equities/united-arab-emirates", exchange: "ADX" },
  qatar: { url: "https://sa.investing.com/equities/qatar", exchange: "QE" },
  kuwait: { url: "https://sa.investing.com/equities/kuwait", exchange: "KSE" },
  bahrain: { url: "https://sa.investing.com/equities/bahrain", exchange: "BHB" },
  oman: { url: "https://sa.investing.com/equities/oman", exchange: "MSM" },
  jordan: { url: "https://sa.investing.com/equities/jordan", exchange: "ASE" },
  morocco: { url: "https://sa.investing.com/equities/morocco", exchange: "CSE" },
  tunisia: { url: "https://sa.investing.com/equities/tunisia", exchange: "TSE" },
};

// Current job state
let currentJob: {
  id: string;
  country: string;
  status: string;
  shouldStop: boolean;
} | null = null;

// Run agent-browser command
async function runBrowserCommand(cmd: string): Promise<string> {
  try {
    const result = execSync(`agent-browser ${cmd}`, { 
      encoding: "utf-8",
      timeout: 60000,
      maxBuffer: 50 * 1024 * 1024 
    });
    return result;
  } catch (error: any) {
    console.error("Browser command error:", error.message);
    throw error;
  }
}

// Log action
async function logAction(jobId: string, action: string, message: string, stockSymbol?: string, details?: any) {
  await prisma.scrapeLog.create({
    data: {
      jobId,
      action,
      message,
      stockSymbol,
      details: details ? JSON.stringify(details) : null,
    },
  });
  console.log(`[${action}] ${message}`);
}

// Update job progress
async function updateProgress(jobId: string, data: Partial<{
  status: string;
  progress: number;
  currentStage: string;
  currentStock: string;
  totalStocks: number;
  processedStocks: number;
  failedStocks: number;
  errorMsg: string;
}>) {
  await prisma.scrapeJob.update({
    where: { id: jobId },
    data,
  });
}

// Extract stock links from page
async function extractStockLinks(jobId: string): Promise<Array<{ symbol: string; name: string; url: string }>> {
  await logAction(jobId, "fetch-list", "Getting stock list from page");
  
  // Get page content
  const html = await runBrowserCommand("eval \"document.body.innerHTML\"");
  
  // Parse HTML to extract stock links
  const stockRegex = /href="[^"]*\/equities\/([^"-]+)[^"]*"[^>]*>([^<]+)<\/a>/gi;
  const stocks: Array<{ symbol: string; name: string; url: string }> = [];
  const seen = new Set<string>();
  
  let match;
  while ((match = stockRegex.exec(html)) !== null) {
    const slug = match[1];
    const name = match[2].trim();
    
    if (!seen.has(slug) && name.length > 0) {
      seen.add(slug);
      stocks.push({
        symbol: slug.toUpperCase().replace(/-/g, "").substring(0, 10),
        name,
        url: `https://sa.investing.com/equities/${slug}`,
      });
    }
  }
  
  await logAction(jobId, "fetch-list", `Found ${stocks.length} stocks`, undefined, { count: stocks.length });
  return stocks;
}

// Scrape historical data for a stock
async function scrapeHistoricalData(jobId: string, symbol: string, stockId: string): Promise<number> {
  const url = `https://sa.investing.com/equities/${stockId}-historical-data`;
  
  await logAction(jobId, "fetch-historical", `Fetching historical data for ${symbol}`, symbol);
  
  try {
    // Navigate to historical data page
    await runBrowserCommand(`open "${url}"`);
    await runBrowserCommand("wait 3000");
    
    // Get page HTML
    const html = await runBrowserCommand("eval \"document.body.innerHTML\"");
    
    // Parse historical data table
    const rowRegex = /<time[^>]*datetime="(\d{2}\/\d{2}\/\d{4})"[^>]*>\s*\d{2}\/\d{2}\/\d{4}\s*<\/time>[\s\S]*?<td[^>]*>([\d.]+)<\/td>[\s\S]*?<td[^>]*>([\d.]+)<\/td>[\s\S]*?<td[^>]*>([\d.]+)<\/td>[\s\S]*?<td[^>]*>([\d.]+)<\/td>[\s\S]*?<td[^>]*>([\d.KMB]+)<\/td>/gi;
    
    let recordsImported = 0;
    let match;
    
    while ((match = rowRegex.exec(html)) !== null) {
      const dateStr = match[1];
      const close = parseFloat(match[2]);
      const open = parseFloat(match[3]);
      const high = parseFloat(match[4]);
      const low = parseFloat(match[5]);
      const volumeStr = match[6];
      
      // Parse date
      const [day, month, year] = dateStr.split("/").map(Number);
      const date = new Date(year, month - 1, day);
      
      // Parse volume
      let volume = parseFloat(volumeStr);
      if (volumeStr.includes("M")) volume *= 1000000;
      else if (volumeStr.includes("K")) volume *= 1000;
      else if (volumeStr.includes("B")) volume *= 1000000000;
      
      // Find or create stock in database
      const stock = await prisma.stock.upsert({
        where: { symbol },
        update: {},
        create: {
          symbol,
          nameAr: symbol,
          urlSlug: stockId,
          exchange: "AUTO",
        },
      });
      
      // Save historical data
      await prisma.historicalData.upsert({
        where: {
          stockId_date: { stockId: stock.id, date },
        },
        update: { open, high, low, close, volume },
        create: { stockId: stock.id, date, open, high, low, close, volume },
      });
      
      recordsImported++;
    }
    
    await logAction(jobId, "fetch-historical", `Imported ${recordsImported} records for ${symbol}`, symbol);
    return recordsImported;
  } catch (error) {
    await logAction(jobId, "error", `Failed to fetch historical data for ${symbol}`, symbol);
    return 0;
  }
}

// Main scraping function
async function startScraping(country: string): Promise<string> {
  const countryConfig = COUNTRIES[country];
  if (!countryConfig) {
    throw new Error(`Unknown country: ${country}`);
  }
  
  // Create job
  const job = await prisma.scrapeJob.create({
    data: {
      country,
      exchange: countryConfig.exchange,
      status: "running",
      startedAt: new Date(),
    },
  });
  
  currentJob = {
    id: job.id,
    country,
    status: "running",
    shouldStop: false,
  };
  
  // Run scraping in background
  scrapeLoop(job.id, country, countryConfig.url).catch(async (error) => {
    console.error("Scraping error:", error);
    await updateProgress(job.id, {
      status: "failed",
      errorMsg: error.message,
    });
    currentJob = null;
  });
  
  return job.id;
}

async function scrapeLoop(jobId: string, country: string, startUrl: string) {
  try {
    // Stage 1: Open browser and navigate to stock list
    await updateProgress(jobId, { currentStage: "جارى فتح المتصفح..." });
    await logAction(jobId, "start", "Starting scraping job");
    
    await runBrowserCommand(`open "${startUrl}"`);
    await runBrowserCommand("wait 5000");
    
    // Stage 2: Extract stock list
    await updateProgress(jobId, { currentStage: "جارى استخراج قائمة الأسهم..." });
    const stocks = await extractStockLinks(jobId);
    
    if (stocks.length === 0) {
      throw new Error("No stocks found on the page");
    }
    
    await updateProgress(jobId, {
      totalStocks: stocks.length,
      currentStage: `تم العثور على ${stocks.length} سهم`,
    });
    
    // Stage 3: Process each stock
    for (let i = 0; i < stocks.length; i++) {
      if (currentJob?.shouldStop) {
        await updateProgress(jobId, { status: "cancelled" });
        break;
      }
      
      const stock = stocks[i];
      const progress = ((i + 1) / stocks.length) * 100;
      
      await updateProgress(jobId, {
        progress,
        currentStock: stock.symbol,
        currentStage: `جارى معالجة ${stock.symbol} (${i + 1}/${stocks.length})`,
        processedStocks: i + 1,
      });
      
      try {
        // Scrape historical data
        await scrapeHistoricalData(jobId, stock.symbol, stock.url.split("/").pop() || "");
        
        // Small delay between stocks
        await new Promise((r) => setTimeout(r, 1000));
      } catch (error: any) {
        const currentFailed = (await prisma.scrapeJob.findUnique({ where: { id: jobId } }))?.failedStocks || 0;
        await updateProgress(jobId, { failedStocks: currentFailed + 1 });
        await logAction(jobId, "error", `Failed to process ${stock.symbol}: ${error.message}`, stock.symbol);
      }
    }
    
    // Stage 4: Complete
    await updateProgress(jobId, {
      status: "completed",
      progress: 100,
      currentStage: "اكتمل بنجاح",
      completedAt: new Date(),
    });
    
    await runBrowserCommand("close");
    await logAction(jobId, "complete", "Scraping job completed");
    
  } catch (error: any) {
    await updateProgress(jobId, {
      status: "failed",
      errorMsg: error.message,
    });
    await logAction(jobId, "error", error.message);
    await runBrowserCommand("close").catch(() => {});
  }
  
  currentJob = null;
}

// HTTP Server
serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;
    
    // CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
    
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    
    // GET /countries - List supported countries
    if (path === "/countries" && req.method === "GET") {
      return Response.json({ success: true, countries: Object.keys(COUNTRIES) }, { headers: corsHeaders });
    }
    
    // POST /start - Start scraping
    if (path === "/start" && req.method === "POST") {
      try {
        console.log("Received /start request");
        
        if (!prisma) {
          return Response.json({ success: false, error: "Database not initialized" }, { headers: corsHeaders });
        }
        
        if (currentJob) {
          return Response.json(
            { success: false, error: "Job already running", jobId: currentJob.id },
            { headers: corsHeaders }
          );
        }
        
        const body = await req.json();
        const country = body.country || "egypt";
        console.log("Starting scrape for country:", country);
        
        const jobId = await startScraping(country);
        console.log("Job created:", jobId);
        return Response.json({ success: true, jobId }, { headers: corsHeaders });
      } catch (error: any) {
        console.error("Start error:", error);
        return Response.json({ success: false, error: error.message }, { headers: corsHeaders });
      }
    }
    
    // GET /status - Get current job status
    if (path === "/status" && req.method === "GET") {
      if (!currentJob) {
        return Response.json({ success: true, running: false }, { headers: corsHeaders });
      }
      
      const job = await prisma.scrapeJob.findUnique({
        where: { id: currentJob.id },
      });
      
      return Response.json({ success: true, running: true, job }, { headers: corsHeaders });
    }
    
    // POST /cancel - Cancel current job
    if (path === "/cancel" && req.method === "POST") {
      if (currentJob) {
        currentJob.shouldStop = true;
        return Response.json({ success: true, message: "Cancellation requested" }, { headers: corsHeaders });
      }
      return Response.json({ success: false, error: "No job running" }, { headers: corsHeaders });
    }
    
    // GET /jobs - List recent jobs
    if (path === "/jobs" && req.method === "GET") {
      const jobs = await prisma.scrapeJob.findMany({
        take: 20,
        orderBy: { createdAt: "desc" },
      });
      return Response.json({ success: true, jobs }, { headers: corsHeaders });
    }
    
    // GET /jobs/:id - Get job details
    if (path.startsWith("/jobs/") && req.method === "GET") {
      const jobId = path.split("/")[2];
      const job = await prisma.scrapeJob.findUnique({
        where: { id: jobId },
        include: {
          logs: {
            take: 50,
            orderBy: { createdAt: "desc" },
          },
        },
      });
      
      if (!job) {
        return Response.json({ success: false, error: "Job not found" }, { status: 404, headers: corsHeaders });
      }
      
      return Response.json({ success: true, job }, { headers: corsHeaders });
    }
    
    return Response.json({ error: "Not found" }, { status: 404, headers: corsHeaders });
  },
});

console.log(`🕷️ Scraper Service running on http://localhost:${PORT}`);
console.log(`Supported countries: ${Object.keys(COUNTRIES).join(", ")}`);
