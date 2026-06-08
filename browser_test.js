const { chromium } = require('playwright');
const fs = require('fs');

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Navigate to localhost:3000
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  
  // Take screenshot
  await page.screenshot({ path: '/tmp/page_initial.png', fullPage: true });
  console.log('Initial screenshot saved');
  
  // Get all tabs
  const tabs = await page.evaluate(() => {
    const tabElements = document.querySelectorAll('[role="tab"]');
    return Array.from(tabElements).map(tab => ({
      text: tab.textContent,
      id: tab.id,
      ariaSelected: tab.getAttribute('aria-selected')
    }));
  });
  console.log('Tabs found:', JSON.stringify(tabs, null, 2));
  
  // Click on "التحليلات" tab
  const analysisTab = await page.locator('role=tab[name="التحليلات"]');
  if (await analysisTab.count() > 0) {
    await analysisTab.click();
    await page.waitForTimeout(1000);
    
    // Take screenshot of analysis tab
    await page.screenshot({ path: '/tmp/analysis_tab.png', fullPage: true });
    console.log('Analysis tab screenshot saved');
    
    // Get analysis page content
    const analysisContent = await page.evaluate(() => {
      // Find dropdowns
      const marketDropdown = document.querySelector('select[id*="market"], select[name*="market"]');
      const personalityDropdown = document.querySelector('select[id*="personal"], select[name*="personal"]');
      
      // Find buttons
      const runButton = document.querySelector('button');
      
      // Find cards
      const cards = document.querySelectorAll('.card, [class*="card"]');
      
      // Get all text content
      const bodyText = document.body.innerText;
      
      return {
        marketDropdown: marketDropdown ? marketDropdown.outerHTML.substring(0, 500) : 'Not found',
        personalityDropdown: personalityDropdown ? personalityDropdown.outerHTML.substring(0, 500) : 'Not found',
        runButton: runButton ? runButton.textContent : 'Not found',
        cardCount: cards.length,
        bodyTextPreview: bodyText.substring(0, 2000)
      };
    });
    console.log('Analysis content:', JSON.stringify(analysisContent, null, 2));
  } else {
    console.log('Analysis tab not found!');
  }
  
  await browser.close();
}

main().catch(console.error);
