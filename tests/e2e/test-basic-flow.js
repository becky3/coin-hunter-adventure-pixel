const GameTestHelpers = require('./utils/GameTestHelpers');

// Basic game flow test using the new framework
async function runTest() {
    const test = new GameTestHelpers({
        headless: false,  // Set to true for CI
        slowMo: 50,      // Slow down for debugging
        verbose: false   // Set to true for more console logs
    });

    await test.runTest(async (t) => {
        // Setup error tracking
        await t.injectErrorTracking();
        
        // Initialize game
        await t.init('Basic Game Flow');
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
        
        // Test jump
        console.log('\n--- Testing Jump ---');
        await t.waitForPlayerGrounded();
        const beforeJumpPos = await t.getPlayerPosition();
        
        await t.jumpPlayer();
        await t.wait(200);
        
        const duringJumpPos = await t.getPlayerPosition();
        console.log(`Jump height: ${(beforeJumpPos.y - duringJumpPos.y).toFixed(2)}`);
        
        if (duringJumpPos.y >= beforeJumpPos.y) {
            throw new Error('Player did not jump');
        }
        
        // Wait for landing
        await t.waitForPlayerGrounded();
        
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