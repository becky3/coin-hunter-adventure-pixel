const GameTestHelpers = require('./utils/GameTestHelpers.cjs');

// Test for Issue 106: Player respawn size after enemy damage
async function runTest() {
    const test = new GameTestHelpers({
        headless: false,
        verbose: true,
        timeout: 45000
    });

    await test.runTest(async (t) => {
        // Initialize game
        await t.init('Player Respawn Size Test (Issue 106)');
        
        // Setup error tracking
        await t.injectErrorTracking();
        
        // Navigate to game with stage 0-2 (enemy damage test stage)
        await t.navigateToGame('http://localhost:3000?s=0-2&skip_title=true');
        await t.waitForGameInitialization();
        
        // Take initial screenshot
        // await t.screenshot('test-initialized');
        
        // With skip_title=true, we should go directly to play state
        await t.assertState('play');
        
        // Ensure input focus
        await t.ensureInputFocus();
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
        
        // Get initial lives and position
        const beforeDamage = await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const player = state?.player || state?.entityManager?.getPlayer?.();
            return {
                lives: state?.lives || 0,
                player: player ? {
                    x: player.x,
                    y: player.y,
                    width: player.width,
                    height: player.height,
                    isSmall: player.isSmall
                } : null
            };
        });
        console.log('Before damage:', beforeDamage);
        
        // Move right until we take damage (player becomes small)
        let damageReceived = false;
        for (let i = 0; i < 5 && !damageReceived; i++) {
            await t.movePlayer('right', 300);
            await t.wait(200);
            
            const currentState = await t.page.evaluate(() => {
                const state = window.game?.stateManager?.currentState;
                const player = state?.player || state?.entityManager?.getPlayer?.();
                return {
                    lives: state?.lives || 0,
                    isSmall: player?.isSmall || false
                };
            });
            
            if (currentState.isSmall) {
                damageReceived = true;
                console.log('✅ Player became small after collision');
            }
        }
        
        t.assert(damageReceived, 'Failed to receive damage from enemy');
        
        // await t.screenshot('player-small');
        
        // Test 2: Player dies while small and respawns with correct size
        console.log('\n--- Test 2: Death While Small -> Respawn Large ---');
        
        // Wait for invulnerability to end
        await t.wait(2500);
        
        // Get current state before second collision
        const beforeSecondCollision = await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const player = state?.player || state?.entityManager?.getPlayer?.();
            return {
                lives: state?.lives || 0,
                isSmall: player?.isSmall || false,
                position: player ? { x: player.x, y: player.y } : null
            };
        });
        console.log('Before second collision:', beforeSecondCollision);
        
        // Move to collide with enemy again (should die this time)
        let playerDied = false;
        const initialLives = beforeSecondCollision.lives;
        
        for (let i = 0; i < 5 && !playerDied; i++) {
            // Move towards enemies
            await t.movePlayer('right', 400);
            await t.wait(300);
            
            const currentState = await t.page.evaluate(() => {
                const state = window.game?.stateManager?.currentState;
                return state?.lives || 0;
            });
            
            if (currentState < initialLives) {
                playerDied = true;
                console.log(`✅ Player died! Lives: ${initialLives} -> ${currentState}`);
                break;
            }
            
            // Try moving left then right to find enemy
            await t.movePlayer('left', 200);
            await t.wait(200);
        }
        
        t.assert(playerDied, 'Player did not die from second collision while small');
        
        // Wait for respawn animation
        await t.wait(1000);
        
        // Check player after respawn
        const afterRespawn = await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const player = state?.player || state?.entityManager?.getPlayer?.();
            const spawn = state?.levelManager?.getPlayerSpawn?.() || { x: 2, y: 11 };
            return {
                player: player ? {
                    position: { x: Math.round(player.x), y: Math.round(player.y) },
                    width: player.width,
                    height: player.height,
                    isSmall: player.isSmall,
                    isDead: player.isDead,
                    invulnerable: player.invulnerable
                } : null,
                spawn: { x: spawn.x * 16, y: spawn.y * 16 }
            };
        });
        
        console.log('Player after respawn:', afterRespawn);
        
        // Check if player respawned at spawn position
        if (afterRespawn.player && 
            Math.abs(afterRespawn.player.position.x - afterRespawn.spawn.x) < 50) {
            console.log('✅ Player respawned near spawn position');
        }
        
        // Verify player is large after respawn
        t.assert(!afterRespawn.player.isSmall, '❌ BUG: Player is still small after respawn! Issue 106 not fixed.');
        
        t.assert(afterRespawn.player.width === initialSize.width && afterRespawn.player.height === initialSize.height, 
            `❌ Player size incorrect after respawn. Expected: ${initialSize.width}x${initialSize.height}, Got: ${afterRespawn.player.width}x${afterRespawn.player.height}`);
        
        console.log('✅ Player respawned with correct large size');
        
        // await t.screenshot('player-respawned-large');
        
        // Test 3: Verify horizontal collision behavior when small
        console.log('\n--- Test 3: Horizontal Collision While Small ---');
        
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
        
        // Wait for invulnerability to end
        await t.wait(2500);
        
        // Find next enemy position
        const enemyInfo = await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const enemies = state?.entityManager?.enemies || [];
            const aliveEnemies = enemies.filter(e => !e.isDead);
            if (aliveEnemies.length > 0) {
                const enemy = aliveEnemies[0];
                return { 
                    x: enemy.x, 
                    y: enemy.y,
                    index: enemies.indexOf(enemy),
                    type: enemy.constructor.name
                };
            }
            return null;
        });
        
        if (enemyInfo) {
            console.log('Testing horizontal collision with enemy:', enemyInfo);
            
            // Get player position
            const playerPos = await t.page.evaluate(() => {
                const state = window.game?.stateManager?.currentState;
                const player = state?.player || state?.entityManager?.getPlayer?.();
                return player ? { x: player.x, y: player.y } : null;
            });
            
            console.log('Player position before collision:', playerPos);
            
            // Move away and then collide horizontally (not from above)
            await t.movePlayer('left', 800);
            await t.wait(500);
            
            // Get initial game state
            const beforeCollision = await t.page.evaluate(() => {
                const state = window.game?.stateManager?.currentState;
                const enemies = state?.entityManager?.enemies || [];
                return {
                    lives: state?.lives || 0,
                    enemyStates: enemies.map(e => ({ isDead: e.isDead }))
                };
            });
            
            console.log('Before collision - Lives:', beforeCollision.lives);
            
            // Move horizontally into enemy (no jumping)
            await t.movePlayer('right', 1500);
            await t.wait(500);
            
            // Check result after collision
            const afterCollision = await t.page.evaluate((enemyIndex) => {
                const state = window.game?.stateManager?.currentState;
                const player = state?.player || state?.entityManager?.getPlayer?.();
                const enemies = state?.entityManager?.enemies || [];
                const targetEnemy = enemies[enemyIndex];
                
                return {
                    playerDied: player?.isDead || false,
                    playerSmall: player?.isSmall,
                    lives: state?.lives || 0,
                    enemyDied: targetEnemy?.isDead || false,
                    enemyIndex: enemyIndex
                };
            }, enemyInfo.index);
            
            console.log('After horizontal collision:', afterCollision);
            
            // Verify correct behavior
            t.assert(!(afterCollision.enemyDied && afterCollision.lives === beforeCollision.lives), 
                '❌ BUG: Enemy was defeated by horizontal collision while player was small! Player should have taken damage instead.');
            
            if (afterCollision.lives < beforeCollision.lives && !afterCollision.enemyDied) {
                console.log('✅ Correct: Player took damage from horizontal collision while small, enemy survived');
            } else {
                console.log('Result:', {
                    livesBefore: beforeCollision.lives,
                    livesAfter: afterCollision.lives,
                    enemyDied: afterCollision.enemyDied
                });
            }
        }
        
        // await t.screenshot('test-complete');
        
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