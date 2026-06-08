const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Navigate to localhost:3000
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  
  // Take screenshot of initial page
  await page.screenshot({ path: '/tmp/01_initial_page.png', fullPage: false });
  console.log('✅ Screenshot 1: Initial page saved');
  
  // Get all tabs
  const tabs = await page.evaluate(() => {
    const tabElements = document.querySelectorAll('[role="tab"]');
    return Array.from(tabElements).map(tab => ({
      text: tab.textContent,
      ariaSelected: tab.getAttribute('aria-selected')
    }));
  });
  
  console.log('\n📊 TAB VERIFICATION:');
  console.log(`   Total tabs found: ${tabs.length}`);
  tabs.forEach((t, i) => {
    const selected = t.ariaSelected === 'true' ? '✓ SELECTED' : '';
    console.log(`   ${i + 1}. "${t.text}" ${selected}`);
  });
  
  // Click on "التحليلات" tab
  const analysisTab = await page.locator('role=tab[name="التحليلات"]');
  if (await analysisTab.count() > 0) {
    await analysisTab.click();
    await page.waitForTimeout(1000);
    
    // Take screenshot of analysis tab
    await page.screenshot({ path: '/tmp/02_analysis_tab.png', fullPage: true });
    console.log('\n✅ Screenshot 2: Analysis tab saved');
    
    // Get analysis page elements
    const analysisElements = await page.evaluate(() => {
      // Find market dropdown
      const marketLabel = document.body.innerText.includes('السوق');
      const marketSelect = document.querySelector('[role="combobox"]');
      
      // Find personality dropdown
      const personalityLabel = document.body.innerText.includes('شخصية المستثمر');
      
      // Find run button
      const runButton = document.body.innerText.includes('تشغيل التحليل');
      
      // Find badges
      const badges = Array.from(document.querySelectorAll('[class*="badge"]')).map(b => b.textContent);
      
      // Get all labels
      const labels = Array.from(document.querySelectorAll('label')).map(l => l.textContent);
      
      return {
        marketLabel,
        marketSelect: !!marketSelect,
        personalityLabel,
        runButton,
        badges: badges.slice(0, 10),
        labels
      };
    });
    
    console.log('\n📊 ANALYSIS TAB ELEMENTS:');
    console.log(`   ✓ Market dropdown: ${analysisElements.marketLabel ? 'PRESENT' : 'NOT FOUND'}`);
    console.log(`   ✓ Market select (combobox): ${analysisElements.marketSelect ? 'PRESENT' : 'NOT FOUND'}`);
    console.log(`   ✓ Personality dropdown: ${analysisElements.personalityLabel ? 'PRESENT' : 'NOT FOUND'}`);
    console.log(`   ✓ Run Analysis button: ${analysisElements.runButton ? 'PRESENT' : 'NOT FOUND'}`);
    console.log(`   ✓ Labels found: ${analysisElements.labels.join(', ')}`);
    
    // Check for empty state card
    const emptyState = await page.evaluate(() => {
      return document.body.innerText.includes('محرك التحليل الذكي') && 
             document.body.innerText.includes('اختر السوق وشخصية المستثمر');
    });
    console.log(`   ✓ Empty state card: ${emptyState ? 'PRESENT' : 'NOT FOUND'}`);
    
    // Check for analysis badges
    console.log(`   ✓ Analysis type badges: ${analysisElements.badges.filter(b => b.includes('تحليل')).length > 0 ? 'PRESENT' : 'NOT FOUND'}`);
    
  } else {
    console.log('❌ Analysis tab not found!');
  }
  
  await browser.close();
  console.log('\n✅ Test completed successfully!');
}

main().catch(console.error);
