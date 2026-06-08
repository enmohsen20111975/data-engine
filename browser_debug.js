const { chromium } = require('playwright');
const fs = require('fs');

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Collect console messages
  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push(`${msg.type()}: ${msg.text()}`);
  });
  
  // Collect errors
  const errors = [];
  page.on('pageerror', error => {
    errors.push(error.message);
  });
  
  // Navigate to localhost:3000
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  
  // Get all tabs
  const tabs = await page.evaluate(() => {
    const tabElements = document.querySelectorAll('[role="tab"]');
    return Array.from(tabElements).map(tab => ({
      text: tab.textContent,
      id: tab.id,
      ariaSelected: tab.getAttribute('aria-selected')
    }));
  });
  console.log('✅ Tabs found:', tabs.length);
  tabs.forEach(t => console.log(`   - ${t.text} (selected: ${t.ariaSelected})`));
  
  // Click on "التحليلات" tab
  const analysisTab = await page.locator('role=tab[name="التحليلات"]');
  if (await analysisTab.count() > 0) {
    await analysisTab.click();
    await page.waitForTimeout(2000);
    
    // Take screenshot of analysis tab
    await page.screenshot({ path: '/tmp/analysis_tab_full.png', fullPage: true });
    console.log('\n📸 Screenshot saved to /tmp/analysis_tab_full.png');
    
    // Get page content
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log('\n📄 Page content preview:');
    console.log(bodyText.substring(0, 1500));
    
    // Check for error messages
    if (bodyText.includes('error') || bodyText.includes('Error')) {
      console.log('\n❌ ERROR DETECTED ON PAGE');
    }
  }
  
  // Print console messages
  if (consoleMessages.length > 0) {
    console.log('\n🖥️ Console messages:');
    consoleMessages.forEach(m => console.log(`   ${m}`));
  }
  
  // Print errors
  if (errors.length > 0) {
    console.log('\n❌ Page errors:');
    errors.forEach(e => console.log(`   ${e}`));
  }
  
  await browser.close();
}

main().catch(console.error);
