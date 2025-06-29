const puppeteer = require('puppeteer');

(async () => {
    console.log('🎮 Testing menu with debug logs...\n');
    
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    
    page.on('console', msg => {
        console.log(`[${msg.type()}] ${msg.text()}`);
    });
    
    try {
        console.log('Loading game...');
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
        
        // Wait for menu to be ready
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('\nPressing Enter key...');
        await page.keyboard.press('Enter');
        
        // Wait to see logs
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const state = await page.evaluate(() => {
            const gameCore = window.game;
            const stateManager = gameCore.serviceLocator.get('gameStateManager');
            return stateManager.currentStateName;
        });
        
        console.log('\nFinal state:', state);
        
    } catch (error) {
        console.error('Test error:', error);
    } finally {
        await browser.close();
    }
})();