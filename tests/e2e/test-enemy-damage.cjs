const GameTestHelpers = require('./utils/GameTestHelpers.cjs');
const testConfig = require('./utils/testConfig.cjs');

// Test for enemy damage mechanics
async function runTest() {
    const test = new GameTestHelpers({
        headless: testConfig.headless,
        verbose: true,
        timeout: 60000
    });

    await test.runTest(async (t) => {
        // Initialize game
        await t.init('Enemy Damage Test');
        
        // Use quickStart for simplified initialization
        await t.quickStart('0-2');
        
        // Get initial player stats using new method
        const initialPlayer = await t.getEntity('player');
        console.log('Initial player stats:', {
            position: { x: initialPlayer.x, y: initialPlayer.y },
            health: initialPlayer.health,
            isSmall: initialPlayer.isSmall,
            grounded: initialPlayer.grounded
        });
        
        // Get initial lives using new helper
        const initialLives = await t.getLives();
        console.log('Initial lives:', initialLives);
        
        // Test 1: First damage should make player small
        console.log('\n--- Test 1: First Enemy Damage (Large -> Small) ---');
        
        // Check if enemies exist using new method
        const enemies = await t.getEntity('enemies');
        const enemyInfo = {
            enemyCount: enemies.length,
            enemies: enemies.map(e => ({ x: e.x, y: e.y, type: e.type }))
        };
        
        const detailedEnemyInfo = await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const entityManager = state?.entityManager;
            if (!entityManager) return { error: 'No EntityManager' };
            
            const enemyDetails = entityManager.enemies ? entityManager.enemies.map(e => ({
                type: e.constructor.name,
                position: { x: e.x, y: e.y },
                size: { width: e.width, height: e.height },
                velocity: { vx: e.vx, vy: e.vy },
                alive: !e.isDead,
                visible: e.visible !== false
            })) : [];
            
            return {
                enemies: entityManager.enemies ? entityManager.enemies.length : 0,
                items: entityManager.items ? entityManager.items.length : 0,
                enemyTypes: entityManager.enemies ? entityManager.enemies.map(e => e.constructor.name) : [],
                levelEntities: state?.levelManager?.getEntities?.() || [],
                enemyDetails: enemyDetails
            };
        });
        console.log('Entity info:', enemyInfo);
        console.log('Detailed enemy info:', detailedEnemyInfo);
        
        t.assert(enemyInfo.enemyCount > 0, 'Enemies should be found in level - stage should load correctly');
        
        // Check enemy positions
        console.log('Enemy positions:');
        if (detailedEnemyInfo.enemyDetails) {
            detailedEnemyInfo.enemyDetails.forEach((enemy, index) => {
                console.log(`  Enemy ${index + 1} (${enemy.type}): x=${enemy.position.x}, y=${enemy.position.y}, alive=${enemy.alive}`);
            });
        }
        
        // Check level entities from stage data
        const levelInfo = await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const levelManager = state?.levelManager || state?.getLevelManager?.();
            return {
                entities: levelManager?.levelData?.entities || [],
                dimensions: levelManager?.getLevelDimensions?.() || { width: 0, height: 0 },
                tileSize: levelManager?.levelData?.tileSize || 16
            };
        });
        console.log('Level entities from stage data:', levelInfo.entities);
        console.log('Level dimensions:', levelInfo.dimensions);
        console.log('Expected enemy Y in pixels:', levelInfo.entities[0]?.y * levelInfo.tileSize);
        
        // Check tile map at enemy spawn position
        const tileCheck = await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const levelManager = state?.levelManager || state?.getLevelManager?.();
            const tileMap = levelManager?.getTileMap?.() || [];
            const spawn = { x: 8, y: 12 }; // First slime spawn
            
            return {
                tileMapHeight: tileMap.length,
                tileAtSpawn: tileMap[spawn.y] ? tileMap[spawn.y][spawn.x] : 'out of bounds',
                tileBelowSpawn: tileMap[spawn.y + 1] ? tileMap[spawn.y + 1][spawn.x] : 'out of bounds',
                row12: tileMap[12] ? tileMap[12].slice(0, 10).join('') : 'row not found',
                row13: tileMap[13] ? tileMap[13].slice(0, 10).join('') : 'row not found'
            };
        });
        console.log('Tile check at enemy spawn:', tileCheck);
        
        // Check physics system state via service locator
        const physicsState = await t.page.evaluate(() => {
            const game = window.game;
            if (!game || !game.serviceLocator) return { error: 'No game or service locator' };
            
            const physicsSystem = game.serviceLocator.get('physics');
            if (!physicsSystem) return { error: 'No physics system in service locator' };
            
            return {
                entityCount: physicsSystem.getEntityCount?.() || 0,
                hasTileMap: physicsSystem.tileMap !== null && physicsSystem.tileMap !== undefined,
                tileMapRows: physicsSystem.tileMap ? physicsSystem.tileMap.length : 0,
                gravity: physicsSystem.gravity,
                tileSize: physicsSystem.tileSize,
                entities: game.stateManager?.currentState?.entityManager ? game.stateManager.currentState.entityManager.getAllActiveEntities().length : 0
            };
        });
        console.log('Physics system state:', physicsState);
        
        // Wait a frame to ensure physics has been applied
        await t.wait(100);
        
        // Re-check enemy positions after physics update
        const enemyPositionsAfterPhysics = await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const entityManager = state?.entityManager;
            if (!entityManager || !entityManager.enemies) return [];
            
            return entityManager.enemies.map((e, i) => ({
                index: i,
                x: Math.round(e.x),
                y: Math.round(e.y),
                vy: e.vy,
                grounded: e.grounded
            }));
        });
        console.log('Enemy positions after physics update:');
        enemyPositionsAfterPhysics.forEach(e => {
            console.log(`  Enemy ${e.index + 1}: x=${e.x}, y=${e.y}, vy=${e.vy}, grounded=${e.grounded}`);
        });
        
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
            t.assert(afterFirstDamage.isSmall === true && !beforeDamageSize.isSmall, 'Player should become small after first damage');
            console.log('✅ Player became small after first damage');
        }
        
        // Check lives didn't change
        const livesAfterFirstDamage = await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            return state?.lives || 0;
        });
        console.log('Lives after first damage:', livesAfterFirstDamage);
        
        t.assert(livesAfterFirstDamage === initialLives, `Lives should not change after first damage. Expected: ${initialLives}, Got: ${livesAfterFirstDamage}`);
        
        // await t.screenshot('after-first-damage');
        
        // Test 2: Second damage while small should kill player
        console.log('\n--- Test 2: Second Enemy Damage (Small -> Death) ---');
        
        // Wait for invulnerability to end
        await t.wait(2500);
        
        // Move back and then into enemy again
        await t.movePlayer('left', 500);
        await t.wait(200);
        await t.movePlayer('right', 1000);
        await t.wait(500);
        
        // Check if player died and respawned
        const afterSecondDamage = await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const player = state?.player || state?.entityManager?.getPlayer?.();
            return player ? {
                position: { x: player.x, y: player.y },
                isSmall: player.isSmall,
                isDead: player.isDead,
                invulnerable: player.invulnerable,
                invulnerabilityTime: player.invulnerabilityTime
            } : null;
        });
        
        console.log('Player after second damage:', afterSecondDamage);
        
        // Check lives decreased
        const livesAfterSecondDamage = await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            return state?.lives || 0;
        });
        console.log('Lives after second damage:', livesAfterSecondDamage);
        
        t.assert(livesAfterSecondDamage === initialLives - 1, `Lives should decrease correctly. Expected: ${initialLives - 1}, Got: ${livesAfterSecondDamage}`);
        
        // Check HUD display
        const hudText = await t.page.evaluate(() => {
            const debugElement = document.getElementById('debug-info');
            return debugElement ? debugElement.textContent : '';
        });
        console.log('Debug HUD text:', hudText);
        
        // await t.screenshot('after-second-damage');
        
        // Test 3: Continue until game over
        console.log('\n--- Test 3: Game Over Test ---');
        
        let currentLives = livesAfterSecondDamage;
        let attemptCount = 0;
        
        while (currentLives > 0 && attemptCount < 5) {
            attemptCount++;
            console.log(`Attempt ${attemptCount} - Current lives: ${currentLives}`);
            
            // Check if test is closing
            if (t.isClosing) {
                console.log('Test is closing, ending loop');
                break;
            }
            
            // Wait for any respawn/invulnerability
            await t.wait(1500);
            
            // Move to enemy
            await t.movePlayer('right', 1500);
            await t.wait(500);
            
            // Check if test is still running
            if (t.isClosing || !t.page) {
                console.log('Test is closing, ending game over test');
                break;
            }
            
            // Check lives
            let gameState = 'unknown';
            try {
                currentLives = await t.page.evaluate(() => {
                    const state = window.game?.stateManager?.currentState;
                    return state?.lives || 0;
                });
                console.log(`Lives after attempt ${attemptCount}: ${currentLives}`);
                
                // Check game state
                gameState = await t.page.evaluate(() => {
                    const state = window.game?.stateManager?.currentState;
                    return state?.gameState || 'unknown';
                });
                console.log(`Game state: ${gameState}`);
            } catch (error) {
                if (error.message.includes('detached Frame') || error.message.includes('Session closed')) {
                    console.log('Page already closed during evaluation, ending test');
                    break;
                }
                throw error;
            }
            
            if (gameState === 'gameover') {
                console.log('✅ Game over triggered correctly');
                break;
            }
        }
        
        // Check if game over was achieved
        t.assert(currentLives === 0, `Game over should be triggered. Lives remaining: ${currentLives} after ${attemptCount} attempts`);
        
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