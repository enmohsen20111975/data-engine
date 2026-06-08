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
  
  // Take screenshot of initial page
  await page.screenshot({ path: 'main-page.png', fullPage: true });
  
  console.log('Page title:', await page.title());
  console.log('Page URL:', page.url());
  
  // Check for tabs
  const tabs = await page.$$eval('[role="tab"]', els => els.map(e => e.textContent));
  console.log('Found tabs (role=tab):', tabs);
  
  // Look for any tab-like elements with Arabic text
  const tabButtons = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.filter(b => b.textContent && (
      b.textContent.includes('لوحة التحكم') ||
      b.textContent.includes('قاعدة البيانات') ||
      b.textContent.includes('الأخبار')
    )).map(b => ({ text: b.textContent, className: b.className }));
  });
  console.log('Tab buttons found:', tabButtons);
  
  // Get page content preview
  const allText = await page.evaluate(() => document.body.innerText);
  console.log('Page text preview (first 1000 chars):', allText.substring(0, 1000));
  
  await browser.close();
  console.log('Done!');
}

main().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
