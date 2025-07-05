const GameTestHelpers = require('./utils/GameTestHelpers.cjs');

// Test for enemy damage mechanics
async function runTest() {
    const test = new GameTestHelpers({
        headless: true,
        slowMo: 0,
        verbose: false
    });

    await test.runTest(async (t) => {
        // Initialize game
        await t.init('Enemy Damage Test');
        
        // Setup error tracking
        await t.injectErrorTracking();
        
        // Navigate to game with stage 0-2 (enemy damage test stage)
        await t.navigateToGame('http://localhost:3000?s=0-2');
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
        
        // Test 1: First damage should make player small
        console.log('\n--- Test 1: First Enemy Damage (Large -> Small) ---');
        
        // Get player size before damage
        const beforeDamageSize = await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const player = state?.player || state?.entityManager?.getPlayer?.();
            return player ? { width: player.width, height: player.height, isSmall: player.isSmall } : null;
        });
        console.log('Player size before damage:', beforeDamageSize);
        
        // Move player to collide with first enemy
        console.log('Moving player towards enemy...');
        await t.movePlayer('right', 1000);
        await t.wait(500);
        
        // Check player after first damage
        const afterFirstDamage = await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const player = state?.player || state?.entityManager?.getPlayer?.();
            return player ? {
                width: player.width,
                height: player.height,
                isSmall: player.isSmall,
                isDead: player.isDead
            } : null;
        });
        
        console.log('Player after first damage:', afterFirstDamage);
        
        // Verify player became small
        if (afterFirstDamage && beforeDamageSize) {
            if (afterFirstDamage.isSmall === true && !beforeDamageSize.isSmall) {
                console.log('✅ Player became small after first damage');
            } else {
                throw new Error('Player did not become small after first damage');
            }
        }
        
        // Check lives didn't change
        const livesAfterFirstDamage = await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            return state?.lives || 0;
        });
        console.log('Lives after first damage:', livesAfterFirstDamage);
        
        if (livesAfterFirstDamage !== initialLives) {
            throw new Error(`Lives changed after first damage. Expected: ${initialLives}, Got: ${livesAfterFirstDamage}`);
        }
        
        await t.screenshot('after-first-damage');
        
        // Test 2: Second damage while small should kill player
        console.log('\n--- Test 2: Second Enemy Damage (Small -> Death) ---');
        
        // Wait for invulnerability to end
        await t.wait(2500);
        
        // Move into enemy again
        await t.movePlayer('right', 1000);
        await t.wait(500);
        
        // Check if player died and respawned
        const afterSecondDamage = await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const player = state?.player || state?.entityManager?.getPlayer?.();
            return player ? {
                position: { x: player.x, y: player.y },
                isSmall: player.isSmall,
                isDead: player.isDead
            } : null;
        });
        
        console.log('Player after second damage:', afterSecondDamage);
        
        // Check lives decreased
        const livesAfterSecondDamage = await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            return state?.lives || 0;
        });
        console.log('Lives after second damage:', livesAfterSecondDamage);
        
        if (livesAfterSecondDamage !== initialLives - 1) {
            throw new Error(`Lives did not decrease correctly. Expected: ${initialLives - 1}, Got: ${livesAfterSecondDamage}`);
        }
        
        // Check HUD display
        const hudText = await t.page.evaluate(() => {
            const debugElement = document.getElementById('debug-info');
            return debugElement ? debugElement.textContent : '';
        });
        console.log('Debug HUD text:', hudText);
        
        await t.screenshot('after-second-damage');
        
        // Test 3: Continue until game over
        console.log('\n--- Test 3: Game Over Test ---');
        
        let currentLives = livesAfterSecondDamage;
        let attemptCount = 0;
        
        while (currentLives > 0 && attemptCount < 5) {
            attemptCount++;
            console.log(`Attempt ${attemptCount} - Current lives: ${currentLives}`);
            
            // Wait for any respawn/invulnerability
            await t.wait(1500);
            
            // Move to enemy
            await t.movePlayer('right', 1500);
            await t.wait(500);
            
            // Check lives
            currentLives = await t.page.evaluate(() => {
                const state = window.game?.stateManager?.currentState;
                return state?.lives || 0;
            });
            console.log(`Lives after attempt ${attemptCount}: ${currentLives}`);
            
            // Check game state
            const gameState = await t.page.evaluate(() => {
                const state = window.game?.stateManager?.currentState;
                return state?.gameState || 'unknown';
            });
            console.log(`Game state: ${gameState}`);
            
            if (gameState === 'gameover') {
                console.log('✅ Game over triggered correctly');
                break;
            }
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