const { chromium } = require('playwright');
const fs = require('fs');

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 }
  });
  const page = await context.newPage();
  
  const results = {
    analysisRan: false,
    recommendationsCount: 0,
    recommendationCardInfo: [],
    detailModalInfo: {},
    screenshots: [],
    networkRequests: [],
    consoleMessages: [],
    errors: []
  };

  // Capture network requests
  page.on('request', request => {
    if (request.url().includes('/api/')) {
      results.networkRequests.push({
        type: 'request',
        url: request.url(),
        method: request.method()
      });
    }
  });

  page.on('response', async response => {
    if (response.url().includes('/api/analyze')) {
      try {
        const body = await response.json();
        results.networkRequests.push({
          type: 'response',
          url: response.url(),
          status: response.status(),
          body: body
        });
      } catch (e) {
        results.networkRequests.push({
          type: 'response',
          url: response.url(),
          status: response.status(),
          error: 'Could not parse response'
        });
      }
    }
  });

  // Capture console messages
  page.on('console', msg => {
    results.consoleMessages.push({
      type: msg.type(),
      text: msg.text()
    });
  });

  try {
    // Step 1: Navigate to localhost:3000
    console.log('Step 1: Navigating to localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    
    // Step 2: Find and click the "التحليلات" (Analysis) tab
    console.log('Step 2: Clicking Analysis tab...');
    const analysisTab = await page.locator('[role="tab"]:has-text("التحليلات")').first();
    await analysisTab.click();
    await page.waitForTimeout(2000);
    
    // Take screenshot of analysis interface
    console.log('Taking screenshot of analysis interface...');
    await page.screenshot({ path: 'analysis_interface.png', fullPage: false });
    results.screenshots.push('analysis_interface.png');
    
    // Step 3: Select "متوازن" (Balanced) personality
    console.log('Step 3: Selecting Balanced personality...');
    const balancedOption = await page.locator('button:has-text("متوازن")').first();
    await balancedOption.click({ force: true });
    await page.waitForTimeout(1000);
    
    // Step 4: Click the "تشغيل التحليل" (Run Analysis) button
    console.log('Step 4: Clicking Run Analysis button...');
    const runButton = await page.locator('button:has-text("تشغيل التحليل")').first();
    
    // Wait for the button to be clickable
    await page.waitForTimeout(500);
    
    // Use evaluate to click directly
    await runButton.evaluate(el => el.click());
    results.analysisRan = true;
    console.log('Click initiated via evaluate');
    
    // Step 5: Wait for analysis to complete
    console.log('Step 5: Waiting for analysis to complete...');
    
    // Wait for the API response
    await page.waitForTimeout(5000);
    
    // Wait for the loading state to finish (button text changes back)
    let loadingDone = false;
    for (let i = 0; i < 60; i++) {
      const buttonText = await runButton.textContent();
      if (!buttonText?.includes('جاري')) {
        loadingDone = true;
        console.log('Loading finished after', (i+1) * 500, 'ms');
        break;
      }
      await page.waitForTimeout(500);
    }
    
    // Additional wait for rendering
    await page.waitForTimeout(2000);
    
    // Step 6: Take screenshot of results
    console.log('Step 6: Taking screenshot of results...');
    await page.screenshot({ path: 'analysis_results.png', fullPage: true });
    results.screenshots.push('analysis_results.png');
    
    // Get the full page text
    const pageText = await page.evaluate(() => document.body.innerText);
    results.pageText = pageText;
    console.log('\n=== PAGE TEXT (first 2000 chars) ===');
    console.log(pageText.substring(0, 2000));
    console.log('================\n');
    
    // Step 7: Look for recommendations
    console.log('Step 7: Looking for recommendations...');
    
    // Check if analysisResult is displayed
    const resultSection = await page.locator('text=توصية شراء').count();
    console.log(`Found ${resultSection} elements with "توصية شراء"`);
    
    // Look for recommendation cards
    const cards = await page.locator('[class*="cursor-pointer"][class*="hover:shadow"]').all();
    console.log(`Found ${cards.length} clickable cards`);
    
    results.recommendationsCount = cards.length;
    
    // Get content from cards
    for (let i = 0; i < Math.min(cards.length, 5); i++) {
      try {
        const cardText = await cards[i].textContent();
        results.recommendationCardInfo.push(cardText?.substring(0, 300));
      } catch (e) {}
    }
    
    // Step 8: Click on a recommendation card
    console.log('Step 8: Clicking on recommendation card...');
    if (cards.length > 0) {
      await cards[0].click();
      await page.waitForTimeout(2000);
      
      // Take screenshot of modal
      await page.screenshot({ path: 'detail_modal.png', fullPage: false });
      results.screenshots.push('detail_modal.png');
      
      // Get modal content
      const modal = await page.locator('[class*="fixed"][class*="inset-0"][class*="z-50"]').last();
      if (await modal.count() > 0) {
        const modalContent = await modal.textContent();
        results.detailModalInfo.rawContent = modalContent?.substring(0, 2000);
        
        // Look for specific info in modal
        results.detailModalInfo.hasEntryPrice = modalContent?.includes('سعر الدخول') || modalContent?.includes('Entry');
        results.detailModalInfo.hasStopLoss = modalContent?.includes('وقف') || modalContent?.includes('Stop');
        results.detailModalInfo.hasTakeProfit = modalContent?.includes('الهدف') || modalContent?.includes('Take');
        
        console.log('Modal found with content');
      } else {
        console.log('No modal found');
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    results.errors.push(error.message);
  } finally {
    await browser.close();
  }
  
  // Write results to file
  fs.writeFileSync('test_results.json', JSON.stringify(results, null, 2));
  console.log('\n=== FINAL RESULTS ===');
  console.log('Analysis ran:', results.analysisRan);
  console.log('Recommendations count:', results.recommendationsCount);
  console.log('Network requests:', JSON.stringify(results.networkRequests, null, 2));
  console.log('Console messages:', results.consoleMessages);
  console.log('Recommendation cards info:', results.recommendationCardInfo);
  console.log('Detail modal info:', results.detailModalInfo);
  console.log('Errors:', results.errors);
}

main().catch(console.error);
