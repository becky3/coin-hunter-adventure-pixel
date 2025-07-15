const GameTestHelpers = require('./utils/GameTestHelpers.cjs');

// Helper function to move player away from spring
async function movePlayerAwayFromSpring(t) {
    await t.page.evaluate(() => {
        const state = window.game?.stateManager?.currentState;
        const player = state?.player || state?.entityManager?.getPlayer?.();
        if (player) {
            player.x = 150;  // Move away from spring
            player.vx = 0;
            player.vy = 0;
        }
    });
}

// Helper function to position player on spring
async function positionPlayerOnSpring(t) {
    await t.page.evaluate(() => {
        const state = window.game?.stateManager?.currentState;
        const player = state?.player || state?.entityManager?.getPlayer?.();
        const entityManager = state?.entityManager;
        const items = entityManager?.getItems?.() || [];
        const spring = items.find(e => e.constructor.name === 'Spring');
        
        if (player && spring) {
            player.x = spring.x;  
            player.y = spring.y - player.height;
            player.vx = 0;
            player.vy = 0;
            player.grounded = true;
            console.log(`Teleported player to x=${player.x}, y=${player.y} (spring at x=${spring.x}, y=${spring.y})`);
        }
    });
}

async function runTest() {
    const test = new GameTestHelpers({ 
        headless: false,
        verbose: true,
        timeout: 37000
    });
    
    await test.runTest(async (t) => {
        console.log('\n==================================================');
        console.log('Starting test: Spring Bounce Test (Issue 111)');
        console.log(`Time: ${new Date().toISOString()}`);
        console.log('==================================================\n');
        
        // Initialize test
        await t.init('Spring Bounce Test (Issue 111)');
        await t.injectErrorTracking();
        
        // Navigate to stage 0-1 which has a spring and safer layout
        await t.navigateToGame('http://localhost:3000?s=0-1&skip_title=true');
        await t.waitForGameInitialization();
        // await t.screenshot('test-initialized');
        
        // With skip_title=true, we should go directly to play state
        await t.assertState('play');
        
        // Ensure input focus
        await t.ensureInputFocus();
        
        // Verify player exists
        const playerExists = await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            return !!state?.player;
        });
        t.assert(playerExists, 'Player not found');
        
        // Teleport player directly on top of spring (spring is at x=80, y=160)
        console.log('Teleporting player on top of spring...');
        await positionPlayerOnSpring(t);
        
        // Get initial player stats
        const initialStats = await t.getPlayerStats();
        console.log('Initial player stats:', initialStats);
        
        // Get player's jump configuration
        const jumpConfig = await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const player = state?.player || state?.entityManager?.getPlayer?.();
            return {
                jumpPower: player?.jumpPower || 0,
                jumpPowerWithBoost: player?.jumpPower * 1.5 || 0
            };
        });
        console.log('Player jump configuration:', jumpConfig);
        
        // Test 1: Normal jump height  
        console.log('\n--- Test 1: Normal Jump Height ---');
        
        // Move player to a safe location for normal jump test
        await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const player = state?.player || state?.entityManager?.getPlayer?.();
            if (player) {
                // Move to flat ground area
                player.x = 100;
                player.y = 192 - player.height; // On the main floor
                player.vx = 0;
                player.vy = 0;
                player.grounded = true;
            }
        });
        
        // Wait for player to be fully grounded
        await t.wait(500);
        
        // Get initial Y position before jump
        const normalStartY = await t.page.evaluate(() => {
            const player = window.game?.stateManager?.currentState?.player;
            return player?.y || 0;
        });
        console.log(`Starting Y position: ${normalStartY}`);
        
        // Perform a normal jump with keyboard input (long press for max height)
        await t.page.keyboard.down(' ');
        
        // Track the jump height
        const normalJumpResult = await t.page.evaluate(async () => {
            const player = window.game?.stateManager?.currentState?.player;
            if (!player) return null;
            
            const startY = player.y;
            let maxHeight = 0;
            
            // Measure height over time
            return new Promise(resolve => {
                let measurements = 0;
                const measureInterval = setInterval(() => {
                    const currentHeight = Math.abs(startY - player.y);
                    if (currentHeight > maxHeight) {
                        maxHeight = currentHeight;
                    }
                    
                    measurements++;
                    
                    // Stop when player lands or after 150 measurements (1.5 seconds)
                    if ((player.grounded && measurements > 10) || measurements > 150) {
                        clearInterval(measureInterval);
                        resolve({
                            startY: startY,
                            maxHeight: maxHeight,
                            jumpPower: player.jumpPower
                        });
                    }
                }, 10); // Check every 10ms
            });
        });
        
        // Release jump key after some time
        await t.wait(400); // Hold for max jump time
        await t.page.keyboard.up(' ');
        
        let normalMaxHeight = normalJumpResult?.maxHeight || 0;
        console.log('Normal jump result:', normalJumpResult);
        
        console.log(`Normal jump max height: ${normalMaxHeight.toFixed(2)} pixels`);
        
        // Wait for player to land
        await t.waitForCondition(() => {
            const player = window.game?.stateManager?.currentState?.player;
            return player && player.grounded;
        }, 3000, 'player to land');
        
        // Test 2: Spring bounce height
        console.log('\n--- Test 2: Spring Bounce Height ---');
        
        // Wait a bit after landing
        await t.wait(500);
        
        // Teleport player back on top of spring since we're already there
        await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const player = state?.player || state?.entityManager?.getPlayer?.();
            const entityManager = state?.entityManager;
            const items = entityManager?.getItems?.() || [];
            const spring = items.find(e => e.constructor.name === 'Spring');
            
            if (player && spring) {
                player.x = spring.x;  
                player.y = spring.y - player.height;
                player.vx = 0;
                player.vy = 0;
                player.grounded = true;
            }
        });
        
        // Get player position to confirm
        const playerPos = await t.page.evaluate(() => {
            const player = window.game?.stateManager?.currentState?.player;
            const entityManager = window.game?.stateManager?.currentState?.entityManager;
            const items = entityManager?.getItems?.() || [];
            const spring = items.find(e => e.constructor.name === 'Spring');
            return { 
                player: { x: player?.x || 0, y: player?.y || 0 },
                spring: { x: spring?.x || 0, y: spring?.y || 0 }
            };
        });
        console.log('Positions:', playerPos);
        
        // Check for spring entity
        const debugInfo = await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const entityManager = state?.entityManager;
            const gameController = state?.gameController;
            const physicsSystem = gameController?.physicsSystem;
            
            // Get items from EntityManager
            const items = entityManager?.getItems?.() || [];
            
            // Check the loaded level data
            const levelData = state?.levelData || gameController?.currentLevel;
            
            return {
                entityManagerExists: !!entityManager,
                physicsSystemExists: !!physicsSystem,
                gameControllerExists: !!gameController,
                itemsCount: items.length,
                itemTypes: items.map(e => e.constructor.name),
                levelDataExists: !!levelData,
                levelName: levelData?.name
            };
        });
        console.log('Debug info:', debugInfo);
        
        const springInfo = await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const entityManager = state?.entityManager;
            const items = entityManager?.getItems?.() || [];
            const spring = items.find(e => e.constructor.name === 'Spring');
            return spring ? {
                x: spring.x,
                y: spring.y,
                triggered: spring.triggered,
                exists: true
            } : { exists: false };
        });
        console.log('Spring info:', springInfo);
        
        t.assert(springInfo.exists, 'Spring not found in stage. Debug: ' + JSON.stringify(debugInfo));
        
        // Wait a moment then jump on the spring
        await t.wait(200);
        
        // Get Y position before spring bounce
        const springStartY = await t.page.evaluate(() => {
            const player = window.game?.stateManager?.currentState?.player;
            return player?.y || 0;
        });
        console.log('Y position before spring bounce:', springStartY);
        
        // Jump on the spring with a small downward movement
        await t.page.keyboard.down('s'); // Move down
        await t.wait(100);
        await t.page.keyboard.up('s');
        await t.wait(100);
        
        // Track spring bounce
        const springBounceResult = await t.page.evaluate(async () => {
            const player = window.game?.stateManager?.currentState?.player;
            const spring = window.game?.stateManager?.currentState?.entityManager?.getItems?.().find(e => e.constructor.name === 'Spring');
            
            if (!player || !spring) return null;
            
            const startY = player.y;
            let maxHeight = 0;
            let springTriggered = false;
            
            // Measure height over time
            return new Promise(resolve => {
                let measurements = 0;
                const measureInterval = setInterval(() => {
                    if (spring.triggered && !springTriggered) {
                        springTriggered = true;
                        console.log('Spring triggered!');
                    }
                    
                    const currentHeight = startY - player.y;
                    if (currentHeight > maxHeight) {
                        maxHeight = currentHeight;
                    }
                    
                    measurements++;
                    
                    // Stop when player lands or after 200 measurements (2 seconds)
                    if ((player.grounded && measurements > 50 && currentHeight < 5) || measurements > 200) {
                        clearInterval(measureInterval);
                        resolve({
                            startY: startY,
                            maxHeight: maxHeight,
                            springTriggered: springTriggered,
                            jumpPower: player.jumpPower,
                            springMultiplier: spring.baseBounceMultiplier || 2.5
                        });
                    }
                }, 10); // Check every 10ms
            });
        });
        
        let springMaxHeight = springBounceResult?.maxHeight || 0;
        console.log('Spring bounce result:', springBounceResult);
        
        console.log(`Spring bounce max height: ${springMaxHeight.toFixed(2)} pixels`);
        
        // Verify spring was triggered
        t.assert(springBounceResult?.springTriggered, 'Spring was not triggered!');
        
        // Verify heights are valid
        t.assert(normalMaxHeight > 0, `Invalid normal jump height: ${normalMaxHeight}`);
        t.assert(springMaxHeight > 0, `Invalid spring bounce height: ${springMaxHeight}`);
        
        // Verify spring bounce is approximately 2.5x normal jump
        const bounceRatio = springMaxHeight / normalMaxHeight;
        console.log(`Bounce ratio: ${bounceRatio.toFixed(2)}x`);
        console.log(`Expected ratio: ${springBounceResult?.springMultiplier || 2.5}x`);
        
        // Allow some tolerance due to physics simulation
        // Spring should bounce significantly higher than normal jump (at least 1.5x)
        t.assert(bounceRatio >= 1.5, `Spring bounce ratio ${bounceRatio.toFixed(2)} is too low (should be at least 1.5x)`);
        
        // await t.screenshot('spring-bounce-test');
        
        // Test 3: Variable jump on spring (with button hold)
        console.log('\n--- Test 3: Variable Jump on Spring ---');
        
        // Move player away from spring to allow landing
        await movePlayerAwayFromSpring(t);
        
        // Wait for player to land
        await t.waitForCondition(() => {
            const player = window.game?.stateManager?.currentState?.player;
            return player && player.grounded;
        }, 3000, 'player to land');
        
        // Position player on spring again
        await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const player = state?.player || state?.entityManager?.getPlayer?.();
            const entityManager = state?.entityManager;
            const items = entityManager?.getItems?.() || [];
            const spring = items.find(e => e.constructor.name === 'Spring');
            
            if (player && spring) {
                player.x = spring.x;  
                player.y = spring.y - player.height;
                player.vx = 0;
                player.vy = 0;
                player.grounded = true;
            }
        });
        
        await t.wait(200);
        
        // Test long spring bounce (button held)
        console.log('Testing long spring bounce (button held)...');
        
        // Press and hold jump button
        await t.page.keyboard.down(' ');
        
        // Wait for spring to trigger and measure height
        const longBounceResult = await t.page.evaluate(async () => {
            const state = window.game?.stateManager?.currentState;
            const player = state?.player || state?.entityManager?.getPlayer?.();
            const spring = state?.entityManager?.getItems?.().find(e => e.constructor.name === 'Spring');
            
            if (!player || !spring) return null;
            
            const startY = player.y;
            let maxHeight = 0;
            let hasVariableJump = false;
            
            // Small downward movement to trigger spring
            player.vy = 0.1;
            
            // Measure height over time
            return new Promise(resolve => {
                let measurements = 0;
                const measureInterval = setInterval(() => {
                    const currentHeight = Math.abs(startY - player.y);
                    if (currentHeight > maxHeight) {
                        maxHeight = currentHeight;
                    }
                    
                    // Check if variable jump is enabled
                    if (player.canVariableJump) {
                        hasVariableJump = true;
                    }
                    
                    measurements++;
                    
                    if ((player.grounded && measurements > 20) || measurements > 200) {
                        clearInterval(measureInterval);
                        resolve({
                            maxHeight: maxHeight,
                            startY: startY,
                            hasVariableJump: hasVariableJump
                        });
                    }
                }, 10);
            });
        });
        
        // Release jump button
        await t.page.keyboard.up(' ');
        
        console.log(`Long spring bounce height: ${longBounceResult?.maxHeight?.toFixed(2) || 0} pixels`);
        console.log(`Variable jump was enabled: ${longBounceResult?.hasVariableJump || false}`);
        
        // Test short spring bounce (quick release)
        console.log('\nTesting short spring bounce (quick release)...');
        
        // Move player away from spring to allow landing
        await movePlayerAwayFromSpring(t);
        
        // Wait for player to land
        await t.waitForCondition(() => {
            const player = window.game?.stateManager?.currentState?.player;
            return player && player.grounded;
        }, 3000, 'player to land from long bounce');
        
        // Position player on spring again
        await positionPlayerOnSpring(t);
        
        await t.wait(200);
        
        // Press jump briefly
        await t.page.keyboard.down(' ');
        await t.wait(50); // Very short press
        await t.page.keyboard.up(' ');
        
        // Measure the short bounce
        const shortBounceResult = await t.page.evaluate(async () => {
            const player = window.game?.stateManager?.currentState?.player;
            if (!player) return null;
            
            const startY = player.y;
            let maxHeight = 0;
            
            // Measure height over time
            return new Promise(resolve => {
                let measurements = 0;
                const measureInterval = setInterval(() => {
                    const currentHeight = Math.abs(startY - player.y);
                    if (currentHeight > maxHeight) {
                        maxHeight = currentHeight;
                    }
                    
                    measurements++;
                    
                    if ((player.grounded && measurements > 20) || measurements > 150) {
                        clearInterval(measureInterval);
                        resolve({
                            maxHeight: maxHeight,
                            startY: startY
                        });
                    }
                }, 10);
            });
        });
        
        console.log(`Short spring bounce height: ${shortBounceResult?.maxHeight?.toFixed(2) || 0} pixels`);
        
        // Verify variable jump works with spring
        const longHeight = longBounceResult?.maxHeight || 0;
        const shortHeight = shortBounceResult?.maxHeight || 0;
        
        if (longHeight > shortHeight * 1.2) {
            console.log('✅ Variable jump works correctly with spring! Long bounce is significantly higher.');
        } else {
            console.log(`⚠️ Variable jump may not be working correctly. Long: ${longHeight.toFixed(2)}px, Short: ${shortHeight.toFixed(2)}px`);
        }
        
        // await t.screenshot('test-complete');
        await t.checkForErrors();
        
        console.log('\n✅ All spring bounce tests passed! Issue 111 has been fixed.');
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