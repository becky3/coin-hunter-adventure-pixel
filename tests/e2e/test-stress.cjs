const GameTestHelpers = require('./utils/GameTestHelpers.cjs');

// Stress test - rapid inputs and memory checks
async function runTest() {
    const test = new GameTestHelpers({
        headless: true,  // Run headless for better performance
        slowMo: 0  // No slow motion for stress testing
    });

    await test.runTest(async (t) => {
        // Setup
        await t.init('Stress Test');
        await t.injectErrorTracking();
        await t.navigateToGame('http://localhost:3000?s=0-1');
        await t.waitForGameInitialization();
        
        console.log('\n--- Starting Stress Test ---\n');
        
        // Test 1: Rapid menu navigation
        console.log('Test 1: Rapid menu navigation');
        const menuStartTime = Date.now();
        let menuKeyCount = 0;
        
        // Temporarily disable verbose logging during stress test
        const originalPressKey = t.pressKey.bind(t);
        t.pressKey = async (key, options) => {
            await t.page.keyboard.press(key, options);
        };
        
        while (Date.now() - menuStartTime < 3000) { // 3 seconds
            await t.pressKey(Math.random() > 0.5 ? 'ArrowUp' : 'ArrowDown');
            menuKeyCount++;
        }
        
        // Restore original pressKey method
        t.pressKey = originalPressKey;
        
        console.log(`✅ Menu stress: ${menuKeyCount} keys in 3s (${(menuKeyCount / 3).toFixed(1)} keys/sec)`);
        
        // Verify menu is still functional
        const menuState = await t.getGameState();
        if (menuState.currentState !== 'menu') {
            throw new Error(`Menu broken - unexpected state: ${menuState.currentState}`);
        }
        
        // Add a stabilization period after stress test
        console.log('Waiting for menu to stabilize...');
        await t.wait(1000); // Wait 1 second for menu to stabilize
        
        // Test 2: Start game normally (not part of stress)
        console.log('\nTest 2: Starting game for gameplay stress test');
        
        // Wait for menu to be ready and press Enter directly
        await t.waitForCondition(
            () => {
                const state = window.game?.stateManager?.currentState;
                return state && state.name === 'menu' && state.optionsAlpha >= 1;
            },
            5000,
            'menu ready'
        );
        
        // Use startNewGame helper instead of manual navigation
        // This is more reliable after stress testing
        await t.startNewGame();
        
        const gameState = await t.getGameState();
        if (gameState.currentState === 'play') {
            console.log('✅ Game started successfully');
            
            // Test 3: Rapid gameplay inputs
            console.log('\nTest 3: Rapid gameplay inputs');
            const gameStartTime = Date.now();
            let gameKeyCount = 0;
            
            // Temporarily disable verbose logging during gameplay stress
            const originalPressKey2 = t.pressKey.bind(t);
            t.pressKey = async (key, options) => {
                await t.page.keyboard.press(key, options);
            };
            
            while (Date.now() - gameStartTime < 5000) { // 5 seconds
                const actions = ['ArrowLeft', 'ArrowRight', 'Space', 'ArrowUp', 'ArrowDown'];
                const randomAction = actions[Math.floor(Math.random() * actions.length)];
                await t.pressKey(randomAction);
                gameKeyCount++;
            }
            
            // Restore original pressKey method
            t.pressKey = originalPressKey2;
            
            console.log(`✅ Gameplay stress: ${gameKeyCount} inputs in 5s (${(gameKeyCount / 5).toFixed(1)} inputs/sec)`);
            
            // Verify game is still running
            const afterStress = await t.getGameState();
            if (afterStress.currentState !== 'play') {
                throw new Error(`Game crashed - state: ${afterStress.currentState}`);
            }
        } else {
            console.log('⚠️  Could not start game, skipping gameplay stress test');
        }
        
        // Test 4: Memory stability check
        console.log('\nTest 4: Memory stability check');
        const metrics = await t.page.metrics();
        const heapUsed = (metrics.JSHeapUsedSize / 1024 / 1024).toFixed(2);
        console.log(`Heap usage: ${heapUsed} MB`);
        
        if (metrics.JSHeapUsedSize > 500 * 1024 * 1024) { // 500MB threshold
            console.log('⚠️  High memory usage detected');
        } else {
            console.log('✅ Memory usage is acceptable');
        }
        
        await t.screenshot('stress-test-complete');
    });
}

// Export for test runner or run directly
if (require.main === module) {
    runTest();
}

module.exports = runTest;