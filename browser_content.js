const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  
  // Click on Analysis tab
  const analysisTab = await page.locator('role=tab[name="التحليلات"]');
  await analysisTab.click();
  await page.waitForTimeout(1000);
  
  // Get full page text
  const text = await page.evaluate(() => document.body.innerText);
  console.log('PAGE TEXT:');
  console.log(text);
  
  await browser.close();
}

main().catch(console.error);
