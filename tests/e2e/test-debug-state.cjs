const GameTestHelpers = require('./utils/GameTestHelpers.cjs');

// Debug test to check game state transitions
async function runTest() {
    const test = new GameTestHelpers({
        headless: false,  // Show browser for debugging
        slowMo: 100,      // Slow down to see what's happening
        verbose: true
    });

    await test.runTest(async (t) => {
        await t.init('Debug State Test');
        await t.navigateToGame();
        await t.waitForGameInitialization();
        
        console.log('\n--- Checking Initial State ---');
        let state = await t.getGameState();
        console.log('Game state:', state);
        
        console.log('\n--- Available Input Keys ---');
        const inputKeys = await t.page.evaluate(() => {
            const input = window.game?.inputSystem;
            if (input && input.keyBindings) {
                return Object.entries(input.keyBindings).map(([action, keys]) => ({
                    action,
                    keys: Array.isArray(keys) ? keys : [keys]
                }));
            }
            return null;
        });
        console.log('Input bindings:', inputKeys);
        
        console.log('\n--- Attempting to Start Game ---');
        console.log('Current state before Enter:', state.currentState);
        
        // Try different keys that might start the game
        const keysToTry = ['Enter', 'Space', 'ArrowUp', 'ArrowDown'];
        
        for (const key of keysToTry) {
            console.log(`\nTrying key: ${key}`);
            await t.pressKey(key);
            await t.wait(1000);
            
            state = await t.getGameState();
            console.log(`State after ${key}:`, state.currentState);
            
            if (state.currentState === 'play') {
                console.log('✅ Successfully started game!');
                break;
            }
        }
        
        // If still in menu, check what's happening
        if (state.currentState === 'menu') {
            console.log('\n--- Menu State Debug ---');
            const menuInfo = await t.page.evaluate(() => {
                const menuState = window.game?.stateManager?.currentState;
                if (menuState && menuState.name === 'menu') {
                    return {
                        selectedIndex: menuState.selectedIndex,
                        menuItems: menuState.menuItems,
                        isTransitioning: menuState.isTransitioning
                    };
                }
                return null;
            });
            console.log('Menu info:', menuInfo);
            
            // Try selecting first item and pressing Enter
            console.log('\nTrying to select first menu item...');
            await t.pressKey('ArrowUp');
            await t.wait(500);
            await t.pressKey('ArrowUp');
            await t.wait(500);
            await t.pressKey('Enter');
            await t.wait(1000);
            
            state = await t.getGameState();
            console.log('State after menu navigation:', state.currentState);
        }
        
        // Check console errors
        const consoleErrors = await t.page.evaluate(() => {
            return window.__testErrors || [];
        });
        if (consoleErrors.length > 0) {
            console.log('\n--- Console Errors ---');
            console.log(consoleErrors);
        }
        
        await t.screenshot('debug-final-state');
    });
}

// Run the test
if (require.main === module) {
    runTest().catch(error => {
        console.error('Test failed:', error);
        process.exit(1);
    });
}

module.exports = runTest;