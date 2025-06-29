const puppeteer = require('puppeteer');

(async () => {
    console.log('🎮 Testing Game Startup...\n');
    
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        
        // Collect console messages
        const consoleMessages = [];
        const errors = [];
        
        page.on('console', msg => {
            consoleMessages.push({
                type: msg.type(),
                text: msg.text()
            });
        });
        
        page.on('pageerror', error => {
            errors.push(error.toString());
        });
        
        console.log('📄 Loading game page...');
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
        
        // Wait a bit for game initialization
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check for canvas
        const hasCanvas = await page.evaluate(() => {
            const canvas = document.getElementById('gameCanvas');
            return canvas !== null;
        });
        
        console.log(`✅ Canvas element: ${hasCanvas ? 'Found' : 'Not found'}`);
        
        // Check console messages
        console.log('\n📋 Console Messages:');
        consoleMessages.forEach(msg => {
            const icon = msg.type === 'error' ? '❌' : 
                        msg.type === 'warning' ? '⚠️' : 
                        msg.type === 'log' ? '📝' : '❓';
            console.log(`${icon} [${msg.type}] ${msg.text}`);
        });
        
        // Check for errors
        if (errors.length > 0) {
            console.log('\n❌ Page Errors:');
            errors.forEach(error => console.log(error));
        } else {
            console.log('\n✅ No page errors detected');
        }
        
        // Check if game initialized
        const gameState = await page.evaluate(() => {
            // Try to check if game systems are working
            const debugInfo = document.getElementById('debug-info');
            return {
                hasDebugInfo: debugInfo !== null,
                debugVisible: debugInfo ? debugInfo.style.display !== 'none' : false
            };
        });
        
        console.log(`\n🎮 Game State:`);
        console.log(`- Debug overlay created: ${gameState.hasDebugInfo ? 'Yes' : 'No'}`);
        console.log(`- Debug overlay visible: ${gameState.debugVisible ? 'Yes' : 'No'}`);
        
        // Test F3 key for debug toggle
        console.log('\n🔧 Testing debug toggle (F3)...');
        await page.keyboard.press('F3');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const debugAfterF3 = await page.evaluate(() => {
            const debugInfo = document.getElementById('debug-info');
            return debugInfo ? debugInfo.style.display !== 'none' : false;
        });
        
        console.log(`- Debug overlay after F3: ${debugAfterF3 ? 'Visible' : 'Hidden'}`);
        
        // Summary
        const hasErrors = errors.length > 0 || consoleMessages.some(msg => msg.type === 'error');
        console.log(`\n${hasErrors ? '❌' : '✅'} Test Result: ${hasErrors ? 'FAILED' : 'PASSED'}`);
        
    } catch (error) {
        console.error('❌ Test error:', error);
    } finally {
        await browser.close();
    }
})();