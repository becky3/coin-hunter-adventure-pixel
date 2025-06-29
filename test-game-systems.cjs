const puppeteer = require('puppeteer');

(async () => {
    console.log('🎮 Testing Game Systems...\n');
    
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
            if (msg.type() === 'log' || msg.type() === 'error' || msg.type() === 'warning') {
                consoleMessages.push({
                    type: msg.type(),
                    text: msg.text()
                });
            }
        });
        
        page.on('pageerror', error => {
            errors.push(error.toString());
        });
        
        console.log('📄 Loading game page...');
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Test menu state
        console.log('\n🎮 Testing Menu State...');
        const menuState = await page.evaluate(() => {
            const menuOptions = document.querySelectorAll('.menu-option');
            const debugInfo = document.getElementById('debug-info');
            let currentState = 'unknown';
            if (debugInfo) {
                const stateElement = Array.from(debugInfo.querySelectorAll('div')).find(div => div.textContent.includes('State:'));
                if (stateElement) {
                    currentState = stateElement.textContent.split(':')[1].trim();
                }
            }
            return {
                hasMenuOptions: menuOptions.length > 0,
                currentState: currentState
            };
        });
        
        console.log(`- Current state: ${menuState.currentState}`);
        console.log(`- Menu visible: ${menuState.hasMenuOptions ? 'Yes' : 'No'}`);
        
        // Test input system
        console.log('\n⌨️ Testing Input System...');
        
        // Press Enter to start game
        await page.keyboard.press('Enter');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const afterEnter = await page.evaluate(() => {
            const debugInfo = document.getElementById('debug-info');
            let currentState = 'unknown';
            if (debugInfo) {
                const stateElement = Array.from(debugInfo.querySelectorAll('div')).find(div => div.textContent.includes('State:'));
                if (stateElement) {
                    currentState = stateElement.textContent.split(':')[1].trim();
                }
            }
            return currentState;
        });
        
        console.log(`- State after Enter: ${afterEnter}`);
        
        // Test arrow keys
        await page.keyboard.press('ArrowRight');
        await new Promise(resolve => setTimeout(resolve, 100));
        await page.keyboard.press('ArrowLeft');
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const inputState = await page.evaluate(() => {
            const debugInfo = document.getElementById('debug-info');
            let inputText = 'unknown';
            if (debugInfo) {
                const inputElement = Array.from(debugInfo.querySelectorAll('div')).find(div => div.textContent.includes('Input:'));
                if (inputElement) {
                    inputText = inputElement.textContent.split(':')[1].trim();
                }
            }
            return inputText;
        });
        
        console.log(`- Input detection: ${inputState !== 'unknown' ? 'Working' : 'Not working'}`);
        
        // Test FPS counter
        console.log('\n📊 Testing Performance Monitoring...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const performanceData = await page.evaluate(() => {
            const debugInfo = document.getElementById('debug-info');
            let fps = 'unknown';
            let entities = 'unknown';
            if (debugInfo) {
                const fpsElement = Array.from(debugInfo.querySelectorAll('div')).find(div => div.textContent.includes('FPS:'));
                const entitiesElement = Array.from(debugInfo.querySelectorAll('div')).find(div => div.textContent.includes('Entities:'));
                if (fpsElement) {
                    fps = fpsElement.textContent.split(':')[1].trim();
                }
                if (entitiesElement) {
                    entities = entitiesElement.textContent.split(':')[1].trim();
                }
            }
            return { fps, entities };
        });
        
        console.log(`- FPS: ${performanceData.fps}`);
        console.log(`- Entities: ${performanceData.entities}`);
        
        // Test service availability
        console.log('\n🔧 Testing Service Availability...');
        const serviceCheck = await page.evaluate(() => {
            // Check if window has any debug functions
            return {
                hasDebugWarp: typeof window.debugWarp === 'function'
            };
        });
        
        console.log(`- Debug functions: ${serviceCheck.hasDebugWarp ? 'Available' : 'Not available'}`);
        
        // Check for memory leaks
        console.log('\n💾 Checking for memory issues...');
        const memoryBefore = await page.evaluate(() => {
            if (performance.memory) {
                return performance.memory.usedJSHeapSize;
            }
            return null;
        });
        
        // Switch states multiple times
        for (let i = 0; i < 5; i++) {
            await page.keyboard.press('Escape');
            await new Promise(resolve => setTimeout(resolve, 200));
            await page.keyboard.press('Enter');
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        const memoryAfter = await page.evaluate(() => {
            if (performance.memory) {
                return performance.memory.usedJSHeapSize;
            }
            return null;
        });
        
        if (memoryBefore && memoryAfter) {
            const memoryIncrease = ((memoryAfter - memoryBefore) / memoryBefore * 100).toFixed(2);
            console.log(`- Memory increase after state switches: ${memoryIncrease}%`);
        }
        
        // Summary
        console.log('\n📋 Test Summary:');
        const hasErrors = errors.length > 0 || consoleMessages.some(msg => msg.type === 'error');
        console.log(`- JavaScript errors: ${errors.length}`);
        console.log(`- Console errors: ${consoleMessages.filter(msg => msg.type === 'error').length}`);
        console.log(`- Console warnings: ${consoleMessages.filter(msg => msg.type === 'warning').length}`);
        console.log(`\n${hasErrors ? '❌' : '✅'} Overall Result: ${hasErrors ? 'FAILED' : 'PASSED'}`);
        
        if (errors.length > 0) {
            console.log('\n❌ Errors found:');
            errors.forEach(error => console.log(error));
        }
        
        if (consoleMessages.filter(msg => msg.type === 'error').length > 0) {
            console.log('\n❌ Console errors:');
            consoleMessages.filter(msg => msg.type === 'error').forEach(msg => console.log(msg.text));
        }
        
    } catch (error) {
        console.error('❌ Test error:', error);
    } finally {
        await browser.close();
    }
})();