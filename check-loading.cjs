const puppeteer = require('puppeteer');

(async () => {
    console.log('🔍 Checking loading issue...\n');
    
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    
    const consoleMessages = [];
    const errors = [];
    
    page.on('console', msg => {
        const text = msg.text();
        consoleMessages.push({ type: msg.type(), text });
        console.log(`[${msg.type()}] ${text}`);
    });
    
    page.on('pageerror', error => {
        errors.push(error.toString());
        console.log('Page error:', error.toString());
    });
    
    console.log('Loading page...');
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const pageState = await page.evaluate(() => {
        const loading = document.getElementById('loadingScreen');
        const canvas = document.getElementById('gameCanvas');
        return {
            loadingVisible: loading ? getComputedStyle(loading).display !== 'none' : false,
            loadingText: loading ? loading.textContent : '',
            canvasExists: !!canvas,
            bodyText: document.body.textContent.trim()
        };
    });
    
    console.log('\n📊 Page State:');
    console.log('- Loading screen visible:', pageState.loadingVisible);
    console.log('- Loading text:', pageState.loadingText);
    console.log('- Canvas exists:', pageState.canvasExists);
    
    console.log('\n📝 Console messages:', consoleMessages.length);
    console.log('❌ Errors:', errors.length);
    
    await browser.close();
})();