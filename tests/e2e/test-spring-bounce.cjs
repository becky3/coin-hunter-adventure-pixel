const GameTestHelpers = require('./utils/GameTestHelpers.cjs');

async function runTest() {
    const test = new GameTestHelpers({ 
        headless: false,
        verbose: true
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
        await t.navigateToGame('http://localhost:3000?s=0-1');
        await t.waitForGameInitialization();
        await t.screenshot('test-initialized');
        
        // Start new game
        await t.startNewGame();
        await t.screenshot('game-started');
        
        // Verify we're in play state
        await t.assertState('play');
        
        // Verify player exists
        const playerExists = await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            return !!state?.player;
        });
        if (!playerExists) {
            throw new Error('Player not found');
        }
        
        // Teleport player directly on top of spring (spring is at x=80, y=160)
        console.log('Teleporting player on top of spring...');
        await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const player = state?.player || state?.entityManager?.getPlayer?.();
            const entityManager = state?.entityManager;
            const items = entityManager?.getItems?.() || [];
            const spring = items.find(e => e.constructor.name === 'Spring');
            
            if (player && spring) {
                // Place player directly on top of the spring
                player.x = spring.x;  
                player.y = spring.y - player.height; // On top of spring
                player.vx = 0;
                player.vy = 0;
                player.grounded = true;
                console.log(`Teleported player to x=${player.x}, y=${player.y} (spring at x=${spring.x}, y=${spring.y})`);
            }
        });
        
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
        
        // Wait for player to be fully grounded
        await t.wait(500);
        
        // Get initial Y position before jump
        const normalStartY = await t.page.evaluate(() => {
            const player = window.game?.stateManager?.currentState?.player;
            return player?.y || 0;
        });
        console.log(`Starting Y position: ${normalStartY}`);
        
        // Perform a normal jump and measure height
        await t.page.keyboard.down(' ');
        await t.wait(300); // Hold jump button for full jump
        await t.page.keyboard.up(' ');
        
        // Track maximum height during normal jump
        let normalMaxHeight = 0;
        
        // Monitor jump for 1.5 seconds
        for (let i = 0; i < 15; i++) {
            await t.wait(100);
            const playerState = await t.page.evaluate(() => {
                const player = window.game?.stateManager?.currentState?.player;
                return {
                    y: player?.y || 0,
                    vy: player?.vy || 0,
                    grounded: player?.grounded || false
                };
            });
            const height = normalStartY - playerState.y;
            if (height > normalMaxHeight) {
                normalMaxHeight = height;
            }
            // Stop if player has landed
            if (playerState.grounded && i > 5) {
                break;
            }
        }
        
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
        
        if (!springInfo.exists) {
            throw new Error('Spring not found in stage. Debug: ' + JSON.stringify(debugInfo));
        }
        
        // Wait a moment then jump on the spring
        await t.wait(200);
        
        // Get Y position before spring bounce
        const springStartY = await t.page.evaluate(() => {
            const player = window.game?.stateManager?.currentState?.player;
            return player?.y || 0;
        });
        console.log('Y position before spring bounce:', springStartY);
        
        // Jump on the spring
        await t.jumpPlayer();
        await t.wait(100); // Brief wait for spring to trigger
        
        // Check if spring was triggered
        const springTriggered = await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const entityManager = state?.entityManager;
            const items = entityManager?.getItems?.() || [];
            const spring = items.find(e => e.constructor.name === 'Spring');
            return spring?.triggered || false;
        });
        console.log('Spring triggered:', springTriggered);
        
        // Track maximum height during spring bounce
        let springMaxHeight = 0;
        
        // Monitor spring bounce for 1.5 seconds
        let bounceActive = true;
        for (let i = 0; i < 15 && bounceActive; i++) {
            await t.wait(100);
            const playerState = await t.page.evaluate(() => {
                const player = window.game?.stateManager?.currentState?.player;
                return {
                    y: player?.y || 0,
                    vy: player?.vy || 0,
                    grounded: player?.grounded || false
                };
            });
            const height = springStartY - playerState.y;
            if (height > springMaxHeight) {
                springMaxHeight = height;
            }
            // Stop monitoring if player is falling down and close to ground
            if (playerState.vy > 0 && height < springMaxHeight * 0.5) {
                bounceActive = false;
            }
        }
        
        console.log(`Spring bounce max height: ${springMaxHeight.toFixed(2)} pixels`);
        
        // Verify spring bounce is approximately 1.5x normal jump
        const bounceRatio = springMaxHeight / normalMaxHeight;
        console.log(`Bounce ratio: ${bounceRatio.toFixed(2)}x`);
        
        if (bounceRatio < 1.4 || bounceRatio > 1.6) {
            throw new Error(`Spring bounce ratio ${bounceRatio.toFixed(2)} is not approximately 1.5x`);
        }
        
        await t.screenshot('spring-bounce-test');
        
        // Test 3: Variable jump on spring
        console.log('\n--- Test 3: Variable Jump on Spring ---');
        
        // Wait for player to land
        await t.waitForCondition(() => {
            const player = window.game?.stateManager?.currentState?.player;
            return player && player.grounded;
        }, 3000, 'player to land');
        
        // Test short spring bounce
        console.log('Testing short spring bounce (quick release)...');
        await t.page.keyboard.down(' ');
        await t.wait(50);
        await t.page.keyboard.up(' ');
        
        // Track height
        let shortBounceHeight = 0;
        const shortStartY = await t.page.evaluate(() => {
            const player = window.game?.stateManager?.currentState?.player;
            return player?.y || 0;
        });
        
        for (let i = 0; i < 10; i++) {
            await t.wait(100);
            const currentY = await t.page.evaluate(() => {
                const player = window.game?.stateManager?.currentState?.player;
                return player?.y || 0;
            });
            const height = shortStartY - currentY;
            if (height > shortBounceHeight) {
                shortBounceHeight = height;
            }
        }
        
        console.log(`Short spring bounce height: ${shortBounceHeight.toFixed(2)} pixels`);
        
        // Verify variable jump works with spring
        if (shortBounceHeight >= springMaxHeight * 0.9) {
            throw new Error('Variable jump not working on spring - short bounce too high');
        }
        
        console.log('✅ Variable jump works correctly with spring');
        
        await t.screenshot('test-complete');
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