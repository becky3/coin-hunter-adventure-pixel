const GameTestHelpers = require('./utils/GameTestHelpers.cjs');

// Test for player damage and death mechanics
async function runTest() {
    const test = new GameTestHelpers({
        headless: true,
        slowMo: 0,
        verbose: false
    });

    await test.runTest(async (t) => {
        // Initialize game
        await t.init('Damage and Death Test');
        
        // Setup error tracking
        await t.injectErrorTracking();
        
        // Navigate to game with stage 0-1 (has enemies)
        await t.navigateToGame('http://localhost:3000?s=0-1');
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
        console.log('Initial health:', initialStats.health);
        
        // Check which level was loaded
        const levelInfo = await t.getLevelInfo();
        console.log('Loaded level:', levelInfo.name);
        console.log('Initial lives:', await t.page.evaluate(() => {
            // HUDManagerはCanvasに直接描画するため、DOMから取得できない
            // 代わりにPlayStateから直接取得
            const state = window.game?.stateManager?.currentState;
            if (state && state.name === 'play') {
                // PlayStateのlivesプロパティを直接確認
                return state.lives !== undefined ? `LIVES: ${state.lives}` : 'Lives not found in state';
            }
            return 'PlayState not found';
        }));
        
        // Test 1: First damage should make player small
        console.log('\n--- Test 1: First Damage (Large -> Small) ---');
        
        // Get player size before damage
        const beforeDamageSize = await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const player = state?.player || state?.entityManager?.getPlayer?.();
            return player ? { width: player.width, height: player.height, isSmall: player.isSmall } : null;
        });
        console.log('Player size before damage:', beforeDamageSize);
        
        // Find an enemy
        const enemies = await t.getEnemies();
        console.log('Found enemies:', enemies.length);
        
        if (enemies.length > 0) {
            // Move player to collide with first enemy
            console.log('Moving player towards enemy...');
            const enemy = enemies[0];
            const playerPos = await t.getPlayerPosition();
            
            // Move towards enemy
            if (enemy.position.x > playerPos.x) {
                await t.movePlayer('right', 2000);
            } else {
                await t.movePlayer('left', 2000);
            }
            
            // Wait for collision
            await t.wait(1000);
            
            // Check player after first damage
            const afterFirstDamage = await t.page.evaluate(() => {
                const state = window.game?.stateManager?.currentState;
                const player = state?.player || state?.entityManager?.getPlayer?.();
                return player ? {
                    health: player.health,
                    width: player.width,
                    height: player.height,
                    isSmall: player.isSmall,
                    isDead: player.isDead
                } : null;
            });
            
            console.log('Player after first damage:', afterFirstDamage);
            
            // Verify player became small
            if (afterFirstDamage && beforeDamageSize) {
                if (afterFirstDamage.height < beforeDamageSize.height) {
                    console.log('✅ Player became small after first damage');
                } else {
                    throw new Error('Player did not become small after first damage');
                }
                
                if (afterFirstDamage.health === initialStats.health - 1) {
                    console.log('✅ Health decreased by 1');
                } else {
                    throw new Error(`Health change unexpected. Expected: ${initialStats.health - 1}, Got: ${afterFirstDamage.health}`);
                }
            }
            
            // Check lives didn't change
            const livesAfterDamage = await t.page.evaluate(() => {
                const state = window.game?.stateManager?.currentState;
                if (state && state.name === 'play') {
                    return state.lives !== undefined ? `LIVES: ${state.lives}` : 'Lives not found in state';
                }
                return 'PlayState not found';
            });
            console.log('Lives after damage:', livesAfterDamage);
            
            await t.screenshot('after-first-damage');
        } else {
            console.warn('No enemies found in stage 0-1, skipping damage test');
        }
        
        // Test 2: Death and respawn
        console.log('\n--- Test 2: Death and Respawn ---');
        
        // Make player fall into a pit
        console.log('Moving player to fall into pit...');
        await t.movePlayer('right', 3000);
        await t.wait(2000); // Wait for fall
        
        // Check if player respawned
        const afterFall = await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const player = state?.player || state?.entityManager?.getPlayer?.();
            return player ? {
                position: { x: player.x, y: player.y },
                health: player.health,
                isDead: player.isDead
            } : null;
        });
        
        console.log('Player after fall:', afterFall);
        
        // Check lives decreased
        const livesAfterFall = await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            if (state && state.name === 'play') {
                return state.lives !== undefined ? `LIVES: ${state.lives}` : 'Lives not found in state';
            }
            return 'PlayState not found';
        });
        console.log('Lives after fall:', livesAfterFall);
        
        await t.screenshot('after-fall');
        
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