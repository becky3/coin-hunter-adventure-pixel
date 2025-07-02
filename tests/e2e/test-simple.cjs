const puppeteer = require('puppeteer');

async function test() {
    const browser = await puppeteer.launch({
        headless: false,  // Show browser
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.goto('http://localhost:3000');
    
    // Wait for game to load
    await page.waitForFunction(() => window.game?.gameLoop?.running, { timeout: 10000 });
    console.log('Game loaded');
    
    // Get initial state
    let state = await page.evaluate(() => window.game?.stateManager?.currentState?.name);
    console.log('Initial state:', state);
    
    // Press Space
    await page.keyboard.press('Space');
    await new Promise(r => setTimeout(r, 1000));
    
    // Check state after Space
    state = await page.evaluate(() => window.game?.stateManager?.currentState?.name);
    console.log('State after Space:', state);
    
    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/simple-test.png' });
    
    // Wait before closing to see what happens
    console.log('Waiting 5 seconds before closing...');
    await new Promise(r => setTimeout(r, 5000));
    
    await browser.close();
    console.log('Test complete');
}

test().catch(console.error);