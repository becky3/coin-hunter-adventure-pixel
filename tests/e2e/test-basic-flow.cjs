const GameTestHelpers = require('./utils/GameTestHelpers.cjs');

// Basic game flow test using the new framework
async function runTest() {
    const test = new GameTestHelpers({
        headless: true,  // Set to true for CI
        verbose: false,  // Set to true for more console logs
        timeout: 20000
    });

    await test.runTest(async (t) => {
        // Initialize game
        await t.init('Basic Game Flow (with Smoke Tests)');
        
        // Setup error tracking
        await t.injectErrorTracking();
        
        await t.navigateToGame('http://localhost:3000?s=0-1');
        
        // === SMOKE TEST SECTION (from smoke-test.cjs) ===
        console.log('\n=== Running Smoke Tests ===');
        
        // Smoke Test 1: Game Initialization
        console.log('Smoke Test 1: Game Initialization');
        const initialized = await t.page.waitForFunction(
            () => window.game?.gameLoop?.running,
            { timeout: 10000 }
        ).then(() => true).catch(() => false);
        
        t.assert(initialized, 'Game should be initialized and running');
        console.log('  ✓ Game initialization successful');
        
        // Smoke Test 2: Basic Rendering Check
        console.log('\nSmoke Test 2: Basic Rendering Check');
        const hasContent = await t.page.evaluate(() => {
            const canvas = document.getElementById('gameCanvas');
            const ctx = canvas?.getContext('2d');
            
            if (!ctx) return false;
            
            const imageData = ctx.getImageData(0, 0, 100, 100);
            const data = imageData.data;
            
            // Check for non-black pixels
            for (let i = 0; i < data.length; i += 4) {
                if (data[i] !== 0 || data[i+1] !== 0 || data[i+2] !== 0) {
                    return true;
                }
            }
            return false;
        });
        
        t.assert(hasContent, 'Canvas should have rendered content');
        console.log('  ✓ Rendering check successful');
        
        console.log('\n=== Smoke Tests Complete ===\n');
        
        // === ORIGINAL TEST SECTION ===
        await t.waitForGameInitialization();
        
        // Take initial screenshot
        // await t.screenshot('game-initialized');
        
        // Verify initial state
        await t.assertState('menu');
        
        // Start new game
        await t.startNewGame();
        // await t.screenshot('game-started');
        
        // Verify game state
        await t.assertState('play');
        
        // startNewGameでPlayState準備完了を待っているので、すぐにプレイヤーをチェックできる
        await t.assertPlayerExists();
        
        // Get initial player stats
        const initialStats = await t.getPlayerStats();
        console.log('Initial player stats:', initialStats);
        
        // Test player movement
        console.log('\n--- Testing Player Movement ---');
        const startPos = await t.getPlayerPosition();
        console.log(`Start position: (${startPos.x.toFixed(2)}, ${startPos.y.toFixed(2)})`);
        
        // Check initial debug display
        const initialDebugDisplay = await t.page.evaluate(() => {
            const debugElement = document.getElementById('debug-info');
            if (!debugElement) return null;
            
            // Debug: Check all div elements
            const allDivs = debugElement.querySelectorAll('div');
            const divContents = [];
            allDivs.forEach((div, index) => {
                divContents.push(`${index}: ${div.textContent}`);
            });
            
            // Find Player X and Player Y divs by text content
            let playerXSpan = null;
            let playerYSpan = null;
            allDivs.forEach(div => {
                if (div.textContent.startsWith('Player X:')) {
                    playerXSpan = div.querySelector('span');
                } else if (div.textContent.startsWith('Player Y:')) {
                    playerYSpan = div.querySelector('span');
                }
            });
            
            return {
                playerX: playerXSpan?.textContent || 'NOT FOUND',
                playerY: playerYSpan?.textContent || 'NOT FOUND',
                divContents: divContents
            };
        });
        console.log(`Debug display - Initial X: ${initialDebugDisplay?.playerX}, Y: ${initialDebugDisplay?.playerY}`);
        
        // Move right
        await t.movePlayer('right', 1000);
        await t.wait(500);
        const afterRightPos = await t.getPlayerPosition();
        console.log(`After moving right: (${afterRightPos.x.toFixed(2)}, ${afterRightPos.y.toFixed(2)})`);
        
        t.assert(afterRightPos.x > startPos.x, 'Player should move right');
        
        // Check debug display after movement
        const afterMoveDebugDisplay = await t.page.evaluate(() => {
            const debugElement = document.getElementById('debug-info');
            if (!debugElement) return null;
            
            // Find Player X and Player Y divs by text content
            const allDivs = debugElement.querySelectorAll('div');
            let playerXSpan = null;
            let playerYSpan = null;
            allDivs.forEach(div => {
                if (div.textContent.startsWith('Player X:')) {
                    playerXSpan = div.querySelector('span');
                } else if (div.textContent.startsWith('Player Y:')) {
                    playerYSpan = div.querySelector('span');
                }
            });
            
            return {
                playerX: playerXSpan?.textContent || 'NOT FOUND',
                playerY: playerYSpan?.textContent || 'NOT FOUND'
            };
        });
        console.log(`Debug display - After move X: ${afterMoveDebugDisplay?.playerX}, Y: ${afterMoveDebugDisplay?.playerY}`);
        
        // Verify debug display is updating
        t.assert(initialDebugDisplay && initialDebugDisplay.playerX !== 'NOT FOUND', 'Debug display should be found and player X coordinate should be displayed');
        
        t.assert(afterMoveDebugDisplay && afterMoveDebugDisplay.playerX !== 'NOT FOUND', 'Debug display should be found after movement and player X coordinate should be displayed');
        
        t.assert(initialDebugDisplay.playerX !== afterMoveDebugDisplay.playerX, `Debug display X coordinate should update. Initial: ${initialDebugDisplay.playerX}, After move: ${afterMoveDebugDisplay.playerX}`);
        
        console.log('✅ Debug display is updating correctly');
        
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
        t.assert(state.running && state.currentState === 'play', 'Game should still be running in play state after jump');
        console.log('✅ Jump input test passed (game still running)');
        
        // Test pause/resume
        console.log('\n--- Testing Pause/Resume ---');
        await t.pauseGame();
        // await t.screenshot('game-paused');
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
        
        // Final screenshot
        // await t.screenshot('test-complete');
        
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