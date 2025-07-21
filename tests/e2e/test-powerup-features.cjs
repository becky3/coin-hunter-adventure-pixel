const GameTestHelpers = require('./utils/GameTestHelpers.cjs');
const testConfig = require('./utils/testConfig.cjs');

/**
 * Unified powerup features test
 * Combines test-powerup-system.cjs, test-shield-visual.cjs, and test-bullet-wall-collision.cjs
 */
async function runTest() {
    const test = new GameTestHelpers({
        headless: testConfig.headless,
        verbose: false,
        timeout: 30000
    });

    await test.runTest(async (t) => {
        // Initialize test
        await t.init('PowerUp Features Test');
        
        // Setup error tracking
        await t.injectErrorTracking();
        
        // Navigate to stage 0-5 which has powerup items
        await t.navigateToGame('http://localhost:3000?s=0-5&skip_title=true');
        await t.waitForGameInitialization();
        
        // With skip_title=true, we should go directly to play state
        await t.assertState('play');
        await t.assertPlayerExists();
        
        console.log('\n=== Testing PowerUp Features ===');
        
        // === PART 1: Shield PowerUp System ===
        console.log('\n--- Part 1: Shield PowerUp System ---');
        
        // Get initial player state
        const initialState = await t.page.evaluate(() => {
            const state = window.game.stateManager.currentState;
            const player = state.player;
            return {
                hasShield: player.powerUpManager?.hasPowerUp('SHIELD_STONE'),
                canShoot: player.powerUpManager?.hasPowerUp('POWER_GLOVE'),
                lives: state.lives
            };
        });
        console.log('Initial state:', initialState);
        
        // Find shield power-up
        const shieldStoneInfo = await t.page.evaluate(() => {
            const state = window.game.stateManager.currentState;
            const items = state.entityManager.getItems() || [];
            const shieldStone = items.find(item => item.constructor.name === 'ShieldStone');
            return shieldStone ? { x: shieldStone.x, y: shieldStone.y } : null;
        });
        
        if (shieldStoneInfo) {
            console.log('Shield stone found at:', shieldStoneInfo);
            
            // Move player to shield stone (ensure proper collision)
            await t.page.evaluate((pos) => {
                const state = window.game.stateManager.currentState;
                const player = state.player;
                // Move player near the shield stone, not exactly on it
                player.x = pos.x - 10;
                player.y = pos.y;
            }, shieldStoneInfo);
            
            await t.wait(100);
            
            // Move player into the shield stone to trigger collision
            await t.movePlayer('right', 100);
            await t.wait(500);
            
            // Check if shield was collected
            const afterShieldState = await t.page.evaluate(() => {
                const state = window.game.stateManager.currentState;
                const player = state.player;
                return {
                    hasShield: player.powerUpManager?.hasPowerUp('SHIELD_STONE'),
                    shieldActive: !!player.shieldVisual,
                    shieldClassName: player.shieldVisual?.constructor?.name,
                    powerUpManager: {
                        activePowerUps: player.powerUpManager?.getActivePowerUps()
                    }
                };
            });
            
            console.log('Shield state after collection:', afterShieldState);
            
            t.assert(afterShieldState.hasShield, 'Player should have shield after collecting shield stone');
            t.assert(afterShieldState.shieldActive, 'Shield should be active');
            console.log('✅ Shield collected and activated');
            
            // === PART 2: Shield Visual and Damage Absorption ===
            console.log('\n--- Part 2: Shield Visual and Damage Absorption ---');
            
            // Create an enemy to test shield
            await t.page.evaluate(() => {
                const state = window.game.stateManager.currentState;
                const Slime = window.Slime;
                if (Slime && state) {
                    const enemy = new Slime(100, 300, window.game);
                    state.entityManager.addEntity('enemies', enemy);
                }
            });
            
            // Move player to enemy
            await t.page.evaluate(() => {
                const state = window.game.stateManager.currentState;
                const player = state.player;
                const enemies = state.entityManager.getEnemies() || [];
                const enemy = enemies[0];
                
                if (player && enemy) {
                    player.x = enemy.x;
                    player.y = enemy.y;
                }
            });
            
            const livesBeforeDamage = await t.page.evaluate(() => {
                return window.game.stateManager.currentState.lives;
            });
            
            await t.wait(1000); // Wait for collision
            
            const afterDamageState = await t.page.evaluate(() => {
                const state = window.game.stateManager.currentState;
                const player = state.player;
                return {
                    hasShield: player.powerUpManager?.hasPowerUp('SHIELD_STONE'),
                    shieldActive: !!player.shieldVisual,
                    lives: state.lives,
                    invulnerable: player.invulnerable
                };
            });
            
            t.assert(!afterDamageState.shieldActive, 'Shield should be destroyed after taking damage');
            t.assert(afterDamageState.lives === livesBeforeDamage, 'Lives should not decrease when shield absorbs damage');
            t.assert(afterDamageState.invulnerable, 'Player should be invulnerable after shield breaks');
            console.log('✅ Shield absorbed damage correctly');
        }
        
        // === PART 3: Power Glove and Bullet System ===
        console.log('\n--- Part 3: Power Glove and Bullet System ---');
        
        // Reset player state and find power glove
        await t.page.evaluate(() => {
            const state = window.game.stateManager.currentState;
            const player = state.player;
            player.x = 50;
            player.y = 300;
            player.powerUpManager?.removePowerUp('SHIELD_STONE');
            player.shieldVisual = null;
        });
        
        const powerGloveInfo = await t.page.evaluate(() => {
            const state = window.game.stateManager.currentState;
            const items = state.entityManager.getItems() || [];
            const powerGlove = items.find(item => item.constructor.name === 'PowerGlove');
            return powerGlove ? { x: powerGlove.x, y: powerGlove.y } : null;
        });
        
        if (powerGloveInfo) {
            console.log('Power glove found at:', powerGloveInfo);
            
            // Move player to power glove (ensure proper collision)
            await t.page.evaluate((pos) => {
                const state = window.game.stateManager.currentState;
                const player = state.player;
                // Move player near the power glove, not exactly on it
                player.x = pos.x - 10;
                player.y = pos.y;
            }, powerGloveInfo);
            
            await t.wait(100);
            
            // Move player into the power glove to trigger collision
            await t.movePlayer('right', 300);
            await t.wait(500);
            
            // Check if power glove was collected
            const afterGloveState = await t.page.evaluate(() => {
                const state = window.game.stateManager.currentState;
                const player = state.player;
                return {
                    canShoot: player.powerUpManager?.hasPowerUp('POWER_GLOVE')
                };
            });
            
            t.assert(afterGloveState.canShoot, 'Player should be able to shoot after collecting power glove');
            console.log('✅ Power glove collected');
            
            // Test bullet firing
            console.log('\nTesting bullet firing...');
            
            // Fire a bullet
            await t.page.keyboard.down('x');
            await t.wait(50);
            await t.page.keyboard.up('x');
            
            await t.wait(100);
            
            // Check if bullet was created
            const bulletInfo = await t.page.evaluate(() => {
                const state = window.game.stateManager.currentState;
                const items = state.entityManager.getItems() || [];
                const bullet = items.find(item => item.constructor.name === 'Bullet');
                return bullet ? { exists: true, x: bullet.x, y: bullet.y } : { exists: false };
            });
            
            t.assert(bulletInfo.exists, 'Bullet should be created when firing');
            console.log('✅ Bullet firing works correctly');
            
            // Test bullet wall collision
            console.log('\nTesting bullet wall collision...');
            
            // Wait for bullet to hit a wall or disappear
            await t.wait(1000);
            
            const bulletAfterCollision = await t.page.evaluate(() => {
                const state = window.game.stateManager.currentState;
                const items = state.entityManager.getItems() || [];
                const bullet = items.find(item => item.constructor.name === 'Bullet');
                return { exists: !!bullet };
            });
            
            t.assert(!bulletAfterCollision.exists, 'Bullet should be destroyed after hitting wall or traveling distance');
            console.log('✅ Bullet collision works correctly');
        }
        
        // === PART 4: PowerUp Manager Integration ===
        console.log('\n--- Part 4: PowerUp Manager Integration ---');
        
        // Check PowerUpManager state
        const powerUpManagerState = await t.page.evaluate(() => {
            const state = window.game.stateManager.currentState;
            const player = state.player;
            const manager = player.powerUpManager;
            return {
                exists: !!manager,
                hasShield: manager?.hasPowerUp('SHIELD_STONE') || false,
                canShoot: manager?.hasPowerUp('POWER_GLOVE') || false,
                activePowerUps: manager?.getActivePowerUps() || []
            };
        });
        
        t.assert(powerUpManagerState.exists, 'PowerUpManager should exist');
        console.log('PowerUpManager state:', powerUpManagerState);
        console.log('✅ PowerUpManager integrated correctly');
        
        // Check for any errors
        await t.checkForErrors();
        
        console.log('\n=== All PowerUp Features Tests Passed ===');
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