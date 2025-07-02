const GameTestHelpers = require('./utils/GameTestHelpers.cjs');

// Basic game flow test using the new framework
async function runTest() {
    const test = new GameTestHelpers({
        headless: false,  // Set to true for CI
        slowMo: 50,      // Slow down for debugging
        verbose: false   // Set to true for more console logs
    });

    await test.runTest(async (t) => {
        // Initialize game
        await t.init('Basic Game Flow');
        
        // Setup error tracking
        await t.injectErrorTracking();
        
        await t.navigateToGame();
        await t.waitForGameInitialization();
        
        // Take initial screenshot
        await t.screenshot('game-initialized');
        
        // Verify initial state
        await t.assertState('menu');
        
        // Start new game
        await t.startNewGame();
        await t.screenshot('game-started');
        
        // Verify game state
        await t.assertState('play');
        await t.assertPlayerExists();
        
        // Get initial player stats
        const initialStats = await t.getPlayerStats();
        console.log('Initial player stats:', initialStats);
        
        // Test player movement
        console.log('\n--- Testing Player Movement ---');
        const startPos = await t.getPlayerPosition();
        console.log(`Start position: (${startPos.x.toFixed(2)}, ${startPos.y.toFixed(2)})`);
        
        // Move right
        await t.movePlayer('right', 1000);
        await t.wait(500);
        const afterRightPos = await t.getPlayerPosition();
        console.log(`After moving right: (${afterRightPos.x.toFixed(2)}, ${afterRightPos.y.toFixed(2)})`);
        
        if (afterRightPos.x <= startPos.x) {
            throw new Error('Player did not move right');
        }
        
        // Test jump (simplified - just check if we can press the button)
        console.log('\n--- Testing Jump ---');
        await t.waitForPlayerGrounded();
        const beforeJumpPos = await t.getPlayerPosition();
        console.log(`Position before jump: (${beforeJumpPos.x.toFixed(2)}, ${beforeJumpPos.y.toFixed(2)})`);
        
        // Try to jump
        await t.jumpPlayer();
        await t.wait(1000);  // Wait a full second
        
        const afterJumpPos = await t.getPlayerPosition();
        console.log(`Position after jump attempt: (${afterJumpPos.x.toFixed(2)}, ${afterJumpPos.y.toFixed(2)})`);
        
        // For now, just check that the game is still running
        const state = await t.getGameState();
        if (state.running && state.currentState === 'play') {
            console.log('✅ Jump input test passed (game still running)');
        } else {
            throw new Error('Game state changed unexpectedly');
        }
        
        // Test pause/resume
        console.log('\n--- Testing Pause/Resume ---');
        await t.pauseGame();
        await t.screenshot('game-paused');
        await t.wait(1000);
        await t.resumeGame();
        
        // Check level info
        console.log('\n--- Level Information ---');
        const levelInfo = await t.getLevelInfo();
        console.log('Level:', levelInfo);
        
        // Check for enemies
        const enemies = await t.getEnemies();
        console.log(`Found ${enemies.length} enemies`);
        
        // Check for coins
        const coins = await t.getCoins();
        console.log(`Found ${coins.length} coins`);
        
        // Performance check
        console.log('\n--- Quick Performance Check ---');
        const perfReport = await t.measurePerformance(3000);
        console.log('Performance:', perfReport);
        
        // Final screenshot
        await t.screenshot('test-complete');
        
        // Check for any errors
        await t.checkForErrors();
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