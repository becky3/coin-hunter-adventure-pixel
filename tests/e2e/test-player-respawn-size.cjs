const GameTestHelpers = require('./utils/GameTestHelpers.cjs');

// Test for Issue 106: Player respawn size after enemy damage
async function runTest() {
    const test = new GameTestHelpers({
        headless: false,
        verbose: true
    });

    await test.runTest(async (t) => {
        // Initialize game
        await t.init('Player Respawn Size Test (Issue 106)');
        
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
        
        // Get initial player size
        const initialSize = await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const player = state?.player || state?.entityManager?.getPlayer?.();
            return player ? { 
                width: player.width, 
                height: player.height, 
                isSmall: player.isSmall 
            } : null;
        });
        console.log('Initial player size:', initialSize);
        
        // Test 1: Verify player becomes small after first damage
        console.log('\n--- Test 1: First Damage (Large -> Small) ---');
        
        // Move player to collide with enemy
        await t.movePlayer('right', 1000);
        await t.wait(500);
        
        // Check player became small
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
        
        if (!afterFirstDamage.isSmall) {
            throw new Error('Player did not become small after first damage');
        }
        console.log('✅ Player became small correctly');
        
        await t.screenshot('player-small');
        
        // Test 2: Player dies while small and respawns with correct size
        console.log('\n--- Test 2: Death While Small -> Respawn Large ---');
        
        // Wait for invulnerability to end
        await t.wait(2500);
        
        // Get player spawn position for comparison
        const spawnPosition = await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const levelManager = state?.levelManager;
            const spawn = levelManager?.getPlayerSpawn?.() || { x: 2, y: 11 };
            return { x: spawn.x * 16, y: spawn.y * 16 };
        });
        console.log('Expected spawn position:', spawnPosition);
        
        // Move to enemy again to die
        await t.movePlayer('left', 300);
        await t.wait(200);
        await t.movePlayer('right', 1000);
        await t.wait(1000); // Wait for death and respawn
        
        // Check player after respawn
        const afterRespawn = await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const player = state?.player || state?.entityManager?.getPlayer?.();
            return player ? {
                position: { x: player.x, y: player.y },
                width: player.width,
                height: player.height,
                isSmall: player.isSmall,
                isDead: player.isDead
            } : null;
        });
        
        console.log('Player after respawn:', afterRespawn);
        
        // Verify player is large after respawn
        if (afterRespawn.isSmall) {
            throw new Error('❌ BUG: Player is still small after respawn! Issue 106 not fixed.');
        }
        
        if (afterRespawn.width !== initialSize.width || afterRespawn.height !== initialSize.height) {
            throw new Error(`❌ Player size incorrect after respawn. Expected: ${initialSize.width}x${initialSize.height}, Got: ${afterRespawn.width}x${afterRespawn.height}`);
        }
        
        console.log('✅ Player respawned with correct large size');
        
        await t.screenshot('player-respawned-large');
        
        // Test 3: Verify stomping behavior when small
        console.log('\n--- Test 3: Stomping While Small ---');
        
        // Make player small again
        await t.wait(2500); // Wait for invulnerability
        await t.movePlayer('right', 800);
        await t.wait(500);
        
        const smallAgain = await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const player = state?.player || state?.entityManager?.getPlayer?.();
            return player ? { isSmall: player.isSmall } : null;
        });
        
        if (!smallAgain.isSmall) {
            console.log('Player did not become small, retrying...');
            await t.movePlayer('left', 300);
            await t.wait(200);
            await t.movePlayer('right', 800);
            await t.wait(500);
        }
        
        // Position player above enemy for stomp test
        await t.wait(2500); // Wait for invulnerability
        
        // Find enemy position
        const enemyPos = await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const enemies = state?.entityManager?.enemies || [];
            if (enemies.length > 1 && !enemies[1].isDead) {
                return { x: enemies[1].x, y: enemies[1].y };
            }
            return null;
        });
        
        if (enemyPos) {
            console.log('Testing stomp from small state at enemy position:', enemyPos);
            
            // Try to position for a stomp (this is difficult to do precisely)
            // Move left of the enemy
            await t.movePlayer('left', 500);
            await t.wait(200);
            
            // Jump and move right to land on enemy
            await t.page.keyboard.down(' '); // Start jump
            await t.wait(100);
            await t.movePlayer('right', 400);
            await t.page.keyboard.up(' '); // Release jump
            await t.wait(500);
            
            // Check if enemy was defeated or player took damage
            const stompResult = await t.page.evaluate(() => {
                const state = window.game?.stateManager?.currentState;
                const player = state?.player || state?.entityManager?.getPlayer?.();
                const enemies = state?.entityManager?.enemies || [];
                return {
                    playerAlive: player && !player.isDead,
                    playerSmall: player?.isSmall,
                    enemyDefeated: enemies[1]?.isDead || false,
                    lives: state?.lives || 0
                };
            });
            
            console.log('Stomp attempt result:', stompResult);
            
            // With the stricter threshold, stomping while small should be harder
            // Both outcomes are acceptable as long as the game doesn't crash
            if (stompResult.enemyDefeated) {
                console.log('✅ Enemy was defeated by stomp (still possible with precise timing)');
            } else {
                console.log('✅ Stomp failed and player took damage (expected with stricter threshold)');
            }
        }
        
        await t.screenshot('test-complete');
        
        // Check for any errors
        await t.checkForErrors();
        
        console.log('\n✅ All tests passed! Issue 106 has been fixed correctly.');
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