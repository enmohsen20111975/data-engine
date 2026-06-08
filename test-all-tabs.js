const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.launch({
    headless: true
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Navigate to main page
  console.log('Navigating to http://localhost:3000/...');
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 30000 });
  
  console.log('\n=== INITIAL PAGE (DASHBOARD TAB) ===');
  console.log('Page title:', await page.title());
  console.log('Page URL:', page.url());
  
  // Take screenshot of dashboard tab
  await page.screenshot({ path: 'tab-dashboard.png', fullPage: true });
  console.log('Dashboard screenshot saved to tab-dashboard.png');
  
  // Check dashboard content
  const dashboardContent = await page.evaluate(() => {
    const stats = document.body.innerText;
    return {
      hasStatsCards: stats.includes('21.77 MB') && stats.includes('112,638'),
      hasAutoRefresh: stats.includes('حالة التحديث التلقائي') || stats.includes('متوقف'),
      hasTablesOverview: stats.includes('نظرة على الجداول') || stats.includes('historical_data')
    };
  });
  console.log('Dashboard content check:', dashboardContent);
  
  // Check for errors on page
  const errors = await page.evaluate(() => {
    const errorElements = document.querySelectorAll('[class*="error"], [class*="Error"]');
    return Array.from(errorElements).map(e => e.textContent);
  });
  if (errors.length > 0) {
    console.log('ERRORS FOUND ON DASHBOARD:', errors);
  } else {
    console.log('No errors found on dashboard');
  }
  
  // Click on Database tab
  console.log('\n=== DATABASE TAB ===');
  const tabs = await page.$$('button[role="tab"]');
  console.log('Found', tabs.length, 'tabs');
  
  // Find and click the database tab
  const dbTab = await page.locator('button[role="tab"]:has-text("قاعدة البيانات")');
  await dbTab.click();
  await page.waitForTimeout(1000);
  
  // Take screenshot of database tab
  await page.screenshot({ path: 'tab-database.png', fullPage: true });
  console.log('Database screenshot saved to tab-database.png');
  
  // Check database tab content
  const dbContent = await page.evaluate(() => {
    const text = document.body.innerText;
    return {
      hasStocksTable: text.includes('السوق') || text.includes('السعر') || text.includes('الرمز'),
      hasMarketFilter: text.includes('السعودية') || text.includes('مصر') || text.includes('الكويت'),
      hasData: text.includes('سجل') || text.includes('نتيجة')
    };
  });
  console.log('Database content check:', dbContent);
  
  // Get database tab text preview
  const dbText = await page.evaluate(() => document.body.innerText);
  console.log('Database tab text preview (first 800 chars):', dbText.substring(0, 800));
  
  // Click on News tab
  console.log('\n=== NEWS TAB ===');
  const newsTab = await page.locator('button[role="tab"]:has-text("الأخبار")');
  await newsTab.click();
  await page.waitForTimeout(1000);
  
  // Take screenshot of news tab
  await page.screenshot({ path: 'tab-news.png', fullPage: true });
  console.log('News screenshot saved to tab-news.png');
  
  // Check news tab content
  const newsContent = await page.evaluate(() => {
    const text = document.body.innerText;
    const hasNewsCards = text.includes('خبر') || text.includes('أخبار') || text.includes('news');
    return {
      hasNewsCards,
      textLength: text.length
    };
  });
  console.log('News content check:', newsContent);
  
  // Get news tab text preview
  const newsText = await page.evaluate(() => document.body.innerText);
  console.log('News tab text preview (first 800 chars):', newsText.substring(0, 800));
  
  await browser.close();
  console.log('\n=== TEST COMPLETE ===');
}

main().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
