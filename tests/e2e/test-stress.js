const GameTestHelpers = require('./utils/GameTestHelpers');

// Stress test - rapid state changes and inputs
async function runTest() {
    const test = new GameTestHelpers({
        headless: false,
        slowMo: 0,
        verbose: false
    });

    await test.runTest(async (t) => {
        // Setup
        await t.init('Stress Test');
        await t.injectErrorTracking();
        await t.navigateToGame();
        await t.waitForGameInitialization();
        
        console.log('\n--- Starting Stress Test ---\n');
        
        // Test 1: Rapid state transitions
        console.log('Test 1: Rapid state transitions');
        for (let i = 0; i < 10; i++) {
            await t.pressKey('Enter');  // Start game
            await t.wait(500);
            await t.pressKey('Escape'); // Pause
            await t.wait(100);
            await t.pressKey('Escape'); // Resume
            await t.wait(100);
            await t.pressKey('Escape'); // Pause
            await t.wait(100);
            await t.pressKey('Escape'); // Back to menu
            await t.wait(100);
            await t.pressKey('Escape'); // Confirm
            await t.wait(500);
        }
        console.log('✅ State transition stress test passed');
        
        // Test 2: Rapid input during gameplay
        console.log('\nTest 2: Rapid input stress test');
        await t.startNewGame();
        
        const startTime = Date.now();
        const duration = 10000; // 10 seconds
        let inputCount = 0;
        
        while (Date.now() - startTime < duration) {
            // Random inputs
            const actions = [
                () => t.pressKey('ArrowLeft'),
                () => t.pressKey('ArrowRight'),
                () => t.pressKey('Space'),
                () => t.pressKey('ArrowUp'),
                () => t.pressKey('ArrowDown')
            ];
            
            const randomAction = actions[Math.floor(Math.random() * actions.length)];
            await randomAction();
            inputCount++;
            
            // No wait - maximum stress
        }
        
        console.log(`✅ Processed ${inputCount} inputs in ${duration}ms (${(inputCount / (duration / 1000)).toFixed(1)} inputs/sec)`);
        
        // Test 3: Memory leak check
        console.log('\nTest 3: Memory leak check');
        const initialHeap = (await t.page.metrics()).JSHeapUsedSize;
        
        // Create and destroy many game sessions
        for (let i = 0; i < 5; i++) {
            await t.pressKey('Escape'); // To menu
            await t.wait(100);
            await t.pressKey('Escape'); // Confirm
            await t.wait(500);
            await t.startNewGame();
            await t.simulateGameplay(2000);
        }
        
        const finalHeap = (await t.page.metrics()).JSHeapUsedSize;
        const heapGrowth = finalHeap - initialHeap;
        console.log(`Heap growth: ${(heapGrowth / 1024 / 1024).toFixed(2)} MB`);
        
        if (heapGrowth > 100 * 1024 * 1024) {
            console.warn('⚠️  Warning: Significant heap growth detected');
        }
        
        // Test 4: Error resilience
        console.log('\nTest 4: Error resilience check');
        await t.checkForErrors();
        
        // Final state check
        const finalState = await t.getGameState();
        console.log('\nFinal game state:', finalState);
        
        if (!finalState.running) {
            throw new Error('Game stopped running during stress test');
        }
        
        console.log('\n✅ All stress tests passed!');
        await t.screenshot('stress-test-complete');
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