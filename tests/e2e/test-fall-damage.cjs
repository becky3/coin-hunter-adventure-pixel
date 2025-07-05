const GameTestHelpers = require('./utils/GameTestHelpers.cjs');

// Test for fall damage mechanics
async function runTest() {
    const test = new GameTestHelpers({
        headless: true,
        slowMo: 0,
        verbose: false
    });

    await test.runTest(async (t) => {
        // Initialize game
        await t.init('Fall Damage Test');
        
        // Setup error tracking
        await t.injectErrorTracking();
        
        // Navigate to game with stage 0-3 (fall damage test stage)
        await t.navigateToGame('http://localhost:3000?s=0-3');
        await t.waitForGameInitialization();
        
        // Take initial screenshot
        await t.screenshot('test-initialized');
        
        // Start new game
        await t.startNewGame();
        await t.screenshot('game-started');
        
        // Verify game state
        await t.assertState('play');
        await t.assertPlayerExists();
        
        // Get initial player stats
        const initialStats = await t.getPlayerStats();
        console.log('Initial player stats:', initialStats);
        
        // Get initial lives
        const initialLives = await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            return state?.lives || 0;
        });
        console.log('Initial lives:', initialLives);
        
        // Test 1: Fall into pit
        console.log('\n--- Test 1: First Fall ---');
        
        // Move player to fall into pit
        console.log('Moving player to fall into pit...');
        await t.movePlayer('right', 800); // Move to the pit at x=5-11
        await t.wait(2000); // Wait for fall and respawn
        
        // Check if player respawned
        const afterFirstFall = await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const player = state?.player || state?.entityManager?.getPlayer?.();
            return player ? {
                position: { x: player.x, y: player.y },
                isSmall: player.isSmall
            } : null;
        });
        
        console.log('Player after first fall:', afterFirstFall);
        
        // Check lives decreased
        const livesAfterFirstFall = await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            return state?.lives || 0;
        });
        console.log('Lives after first fall:', livesAfterFirstFall);
        
        if (livesAfterFirstFall !== initialLives - 1) {
            throw new Error(`Lives did not decrease correctly. Expected: ${initialLives - 1}, Got: ${livesAfterFirstFall}`);
        }
        
        // Check HUD display for lives
        await t.wait(500); // Wait for HUD to update
        
        // Take screenshot to verify HUD
        await t.screenshot('after-first-fall');
        
        // Get debug info
        const debugInfo = await t.page.evaluate(() => {
            const debugElement = document.getElementById('debug-info');
            return debugElement ? debugElement.textContent : 'Debug info not found';
        });
        console.log('Debug info:', debugInfo);
        
        // Test 2: Fall multiple times
        console.log('\n--- Test 2: Multiple Falls ---');
        
        let currentLives = livesAfterFirstFall;
        let fallCount = 1;
        
        while (currentLives > 0 && fallCount < 4) {
            fallCount++;
            console.log(`Fall attempt ${fallCount} - Current lives: ${currentLives}`);
            
            // Wait for respawn
            await t.wait(1000);
            
            // Move to fall again
            await t.movePlayer('right', 800);
            await t.wait(2000);
            
            // Check lives
            currentLives = await t.page.evaluate(() => {
                const state = window.game?.stateManager?.currentState;
                return state?.lives || 0;
            });
            console.log(`Lives after fall ${fallCount}: ${currentLives}`);
            
            // Check game state
            const gameState = await t.page.evaluate(() => {
                const state = window.game?.stateManager?.currentState;
                return state?.gameState || 'unknown';
            });
            console.log(`Game state: ${gameState}`);
            
            if (gameState === 'gameover') {
                console.log('✅ Game over triggered correctly after losing all lives');
                break;
            }
            
            await t.screenshot(`after-fall-${fallCount}`);
        }
        
        // Test 3: Verify HUD shows correct lives
        console.log('\n--- Test 3: HUD Verification ---');
        
        // Get current internal lives
        const finalLives = await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            return state?.lives || 0;
        });
        
        // Check if HUD is rendering lives correctly
        const hudData = await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const hudManager = state?.hudManager || state?.getHudManager?.();
            return hudManager ? hudManager.getHUDData() : null;
        });
        
        console.log('Final lives (internal):', finalLives);
        console.log('HUD data:', hudData);
        
        if (hudData && hudData.lives !== finalLives) {
            throw new Error(`HUD shows incorrect lives. Internal: ${finalLives}, HUD: ${hudData.lives}`);
        }
        
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