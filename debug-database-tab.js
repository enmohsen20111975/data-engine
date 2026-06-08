const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.launch({
    headless: true
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Capture console messages
  page.on('console', msg => {
    console.log('BROWSER CONSOLE:', msg.type(), msg.text());
  });
  
  // Capture page errors
  page.on('pageerror', error => {
    console.log('PAGE ERROR:', error.message);
  });
  
  // Navigate to main page
  console.log('Navigating to http://localhost:3000/...');
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 30000 });
  
  console.log('\n=== CLICKING DATABASE TAB ===');
  
  // Click on Database tab
  const dbTab = await page.locator('button[role="tab"]:has-text("قاعدة البيانات")');
  await dbTab.click();
  await page.waitForTimeout(3000);
  
  // Take screenshot of database tab
  await page.screenshot({ path: 'tab-database-error.png', fullPage: true });
  console.log('Database screenshot saved to tab-database-error.png');
  
  // Get full error text
  const errorText = await page.evaluate(() => document.body.innerText);
  console.log('\nDATABASE TAB FULL TEXT:');
  console.log(errorText);
  
  // Check for error details
  const errorDetails = await page.evaluate(() => {
    const errorDiv = document.querySelector('.error, [class*="error"], pre, code');
    return errorDiv ? errorDiv.innerText : 'No error div found';
  });
  console.log('\nERROR DETAILS:', errorDetails);
  
  await browser.close();
}

main().catch(e => {
  console.error('Test Error:', e);
  process.exit(1);
});
