const puppeteer = require('puppeteer');

async function test() {
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Enable console logging
    page.on('console', msg => console.log('[Browser]', msg.text()));
    
    await page.goto('http://localhost:3000');
    
    // Wait for game to load
    await page.waitForFunction(() => window.game?.gameLoop?.running, { timeout: 10000 });
    console.log('Game loaded');
    
    // Get menu info
    const menuInfo = await page.evaluate(() => {
        const state = window.game?.stateManager?.currentState;
        if (state && state.name === 'menu') {
            return {
                name: state.name,
                selectedIndex: state.selectedIndex,
                menuItems: state.menuItems,
                optionsAlpha: state.optionsAlpha
            };
        }
        return null;
    });
    console.log('Menu info:', menuInfo);
    
    // Try arrow keys first
    console.log('\nTrying arrow keys...');
    await page.keyboard.press('ArrowDown');
    await new Promise(r => setTimeout(r, 500));
    
    const afterArrow = await page.evaluate(() => {
        const state = window.game?.stateManager?.currentState;
        return {
            selectedIndex: state?.selectedIndex,
            currentState: state?.name
        };
    });
    console.log('After ArrowDown:', afterArrow);
    
    // Try Enter
    console.log('\nTrying Enter...');
    await page.keyboard.press('Enter');
    await new Promise(r => setTimeout(r, 1000));
    
    const afterEnter = await page.evaluate(() => {
        const state = window.game?.stateManager?.currentState;
        return state?.name;
    });
    console.log('State after Enter:', afterEnter);
    
    // If still in menu, try other approaches
    if (afterEnter === 'menu') {
        console.log('\nTrying mouse click...');
        
        // Get canvas position
        const canvasRect = await page.evaluate(() => {
            const canvas = document.querySelector('canvas');
            const rect = canvas.getBoundingClientRect();
            return {
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height
            };
        });
        
        // Click on where "Start Game" might be
        const clickX = canvasRect.x + canvasRect.width / 2;
        const clickY = canvasRect.y + canvasRect.height / 2 - 50; // Above center
        
        console.log(`Clicking at (${clickX}, ${clickY})`);
        await page.mouse.click(clickX, clickY);
        await new Promise(r => setTimeout(r, 1000));
        
        const afterClick = await page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            return state?.name;
        });
        console.log('State after click:', afterClick);
    }
    
    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/menu-debug.png' });
    
    console.log('\nWaiting 5 seconds...');
    await new Promise(r => setTimeout(r, 5000));
    
    await browser.close();
    console.log('Test complete');
}

test().catch(console.error);