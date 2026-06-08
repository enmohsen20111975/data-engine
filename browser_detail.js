const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  
  // Click on Analysis tab
  const analysisTab = await page.locator('role=tab[name="التحليلات"]');
  await analysisTab.click();
  await page.waitForTimeout(1000);
  
  // Get detailed element info
  const details = await page.evaluate(() => {
    // Find all badges
    const allBadges = Array.from(document.querySelectorAll('[class*="badge"], [class*="Badge"]')).map(b => b.textContent);
    
    // Find the empty state section
    const emptyStateText = document.body.innerText;
    
    // Get market dropdown options
    const marketSelect = document.querySelector('[role="combobox"]');
    
    return {
      allBadges,
      emptyStatePreview: emptyStateText.substring(0, 3000)
    };
  });
  
  console.log('ALL BADGES FOUND:');
  details.allBadges.forEach((b, i) => console.log(`  ${i + 1}. "${b}"`));
  
  // Take a focused screenshot of the analysis section
  await page.screenshot({ path: '/tmp/03_analysis_detailed.png', fullPage: true });
  
  await browser.close();
}

main().catch(console.error);
