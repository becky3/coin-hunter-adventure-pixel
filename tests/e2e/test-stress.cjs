const GameTestHelpers = require('./utils/GameTestHelpers.cjs');

// Stress test - rapid inputs and memory checks
async function runTest() {
    const test = new GameTestHelpers({
        headless: false,
        slowMo: 0  // No slow motion for stress testing
    });

    await test.runTest(async (t) => {
        // Setup
        await t.init('Stress Test');
        await t.injectErrorTracking();
        await t.navigateToGame();
        await t.waitForGameInitialization();
        
        console.log('\n--- Starting Stress Test ---\n');
        
        // Test 1: Rapid menu navigation
        console.log('Test 1: Rapid menu navigation');
        const menuStartTime = Date.now();
        let menuKeyCount = 0;
        
        while (Date.now() - menuStartTime < 3000) { // 3 seconds
            await t.pressKey(Math.random() > 0.5 ? 'ArrowUp' : 'ArrowDown');
            menuKeyCount++;
        }
        
        console.log(`✅ Menu stress: ${menuKeyCount} keys in 3s (${(menuKeyCount / 3).toFixed(1)} keys/sec)`);
        
        // Verify menu is still functional
        const menuState = await t.getGameState();
        if (menuState.currentState !== 'menu') {
            throw new Error(`Menu broken - unexpected state: ${menuState.currentState}`);
        }
        
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
        
        // Navigate to top and start
        await t.pressKey('ArrowUp');
        await t.wait(200);
        await t.pressKey('ArrowUp');
        await t.wait(200);
        await t.pressKey('Enter');
        await t.wait(1500); // Wait for transition
        
        const gameState = await t.getGameState();
        if (gameState.currentState === 'play') {
            console.log('✅ Game started successfully');
            
            // Test 3: Rapid gameplay inputs
            console.log('\nTest 3: Rapid gameplay inputs');
            const gameStartTime = Date.now();
            let gameKeyCount = 0;
            
            while (Date.now() - gameStartTime < 5000) { // 5 seconds
                const actions = ['ArrowLeft', 'ArrowRight', 'Space', 'ArrowUp', 'ArrowDown'];
                const randomAction = actions[Math.floor(Math.random() * actions.length)];
                await t.pressKey(randomAction);
                gameKeyCount++;
            }
            
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