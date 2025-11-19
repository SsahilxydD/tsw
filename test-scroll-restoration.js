/**
 * Scroll Restoration Automated Test
 * Run with: node test-scroll-restoration.js
 * 
 * Requires: npm install puppeteer
 */

const puppeteer = require('puppeteer');

async function testScrollRestoration() {
  console.log('🚀 Starting scroll restoration test...\n');
  
  const browser = await puppeteer.launch({ 
    headless: false, // Set to true for CI/CD
    defaultViewport: { width: 1280, height: 800 }
  });
  
  const page = await browser.newPage();
  
  try {
    // Navigate to your app (adjust URL as needed)
    const baseUrl = process.env.TEST_URL || 'http://localhost:5173';
    console.log(`📍 Navigating to ${baseUrl}...`);
    await page.goto(baseUrl, { waitUntil: 'networkidle0' });
    
    // Wait for page to load
    await page.waitForTimeout(2000);
    
    // Step 1: Navigate to collection/category page
    console.log('\n📋 Step 1: Navigating to collection page...');
    await page.goto(`${baseUrl}/collection`, { waitUntil: 'networkidle0' });
    await page.waitForTimeout(1000);
    
    // Step 2: Scroll down to find products
    console.log('📜 Step 2: Scrolling down to find products...');
    await page.evaluate(() => {
      window.scrollTo(0, 800); // Scroll down 800px
    });
    await page.waitForTimeout(1000);
    
    // Get current scroll position
    const scrollBefore = await page.evaluate(() => window.scrollY);
    console.log(`   Current scroll position: ${scrollBefore}px`);
    
    // Step 3: Find and click a product link
    console.log('\n🖱️  Step 3: Clicking on a product...');
    const productLink = await page.$('a[href^="/product/"]');
    
    if (!productLink) {
      throw new Error('No product link found on the page');
    }
    
    // Save scroll position before clicking (simulate our system)
    const scrollToSave = await page.evaluate(() => window.scrollY);
    console.log(`   Scroll position to save: ${scrollToSave}px`);
    
    // Click the product
    await productLink.click();
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    await page.waitForTimeout(1000);
    
    // Verify we're on product page
    const productUrl = page.url();
    console.log(`   Navigated to: ${productUrl}`);
    
    if (!productUrl.includes('/product/')) {
      throw new Error('Failed to navigate to product page');
    }
    
    // Step 4: Go back
    console.log('\n⬅️  Step 4: Pressing back button...');
    await page.goBack({ waitUntil: 'networkidle0' });
    await page.waitForTimeout(2000); // Wait for scroll restoration
    
    // Step 5: Check scroll position
    console.log('\n✅ Step 5: Checking scroll restoration...');
    const scrollAfter = await page.evaluate(() => window.scrollY);
    console.log(`   Scroll position after back: ${scrollAfter}px`);
    console.log(`   Expected: ~${scrollToSave}px`);
    
    const difference = Math.abs(scrollAfter - scrollToSave);
    const threshold = 100; // Allow 100px difference for layout changes
    
    if (difference < threshold) {
      console.log(`\n✅ TEST PASSED! Scroll position restored correctly (difference: ${difference}px)`);
      return true;
    } else {
      console.log(`\n❌ TEST FAILED! Scroll position not restored correctly (difference: ${difference}px)`);
      
      // Check sessionStorage
      const storage = await page.evaluate(() => {
        const items = {};
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key.startsWith('scroll_')) {
            items[key] = sessionStorage.getItem(key);
          }
        }
        return items;
      });
      
      console.log('\n📦 SessionStorage contents:');
      console.log(JSON.stringify(storage, null, 2));
      
      return false;
    }
    
  } catch (error) {
    console.error('\n❌ Test error:', error.message);
    return false;
  } finally {
    // Keep browser open for debugging (comment out for automated runs)
    // await browser.close();
    console.log('\n🔍 Browser kept open for inspection. Close manually when done.');
  }
}

// Run the test
testScrollRestoration()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

