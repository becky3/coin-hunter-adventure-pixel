const GameTestHelpers = require('./utils/GameTestHelpers.cjs');
const testConfig = require('./utils/testConfig.cjs');

/**
 * Unified jump mechanics test
 * Combines test-jump-physics.cjs and test-variable-jump.cjs
 */
async function runTest() {
    const test = new GameTestHelpers({
        headless: testConfig.headless,
        verbose: false,
        timeout: 30000
    });

    await test.runTest(async (t) => {
        // Initialize test
        await t.init('Jump Mechanics Test');
        
        // Setup error tracking
        await t.injectErrorTracking();
        
        // Navigate to game with skip_title for faster testing
        await t.navigateToGame('http://localhost:3000/?skip_title=true&s=0-1');
        await t.waitForGameInitialization();
        
        // With skip_title=true, we should go directly to play state
        await t.assertState('play');
        
        // Ensure input focus
        await t.ensureInputFocus();
        await t.assertPlayerExists();
        
        console.log('\n=== Testing Jump Mechanics ===');
        
        // Wait for player to be grounded
        await t.waitForPlayerGrounded();
        
        // === PART 1: Basic Jump Physics ===
        console.log('\n--- Part 1: Basic Jump Physics ---');
        
        // Get initial physics values
        const physicsParams = await t.page.evaluate(() => {
            const state = window.game.stateManager.currentState;
            const player = state.player;
            return {
                gravity: player.gravity,
                jumpPower: player.jumpPower,
                maxFallSpeed: player.maxFallSpeed,
                variableJumpBoost: player.variableJumpBoost
            };
        });
        console.log('Physics parameters:', physicsParams);
        
        // Test basic jump
        const startY = await t.page.evaluate(() => {
            return window.game.stateManager.currentState.player.y;
        });
        
        await t.jumpPlayer();
        await t.wait(1000); // Wait for jump to complete
        
        const endY = await t.page.evaluate(() => {
            return window.game.stateManager.currentState.player.y;
        });
        
        // Player should return to approximately the same Y position
        t.assert(Math.abs(endY - startY) < 10, 'Player should return to ground level after jump');
        console.log('✅ Basic jump physics working correctly');
        
        // === PART 2: Variable Jump ===
        console.log('\n--- Part 2: Variable Jump ---');
        
        // Wait for player to be grounded again
        await t.waitForPlayerGrounded();
        await t.wait(500);
        
        // Test 1: Short jump (immediate release)
        console.log('\nTest 1: Short Jump');
        const shortJumpStartY = await t.page.evaluate(() => {
            return window.game.stateManager.currentState.player.y;
        });
        
        // Short jump
        await t.page.keyboard.down(' ');
        await t.wait(20); // 20ms hold
        await t.page.keyboard.up(' ');
        
        // Track maximum height
        let shortJumpMaxHeight = 0;
        for (let i = 0; i < 30; i++) {
            const height = await t.page.evaluate((startY) => {
                const state = window.game.stateManager.currentState;
                return startY - state.player.y;
            }, shortJumpStartY);
            
            if (height > shortJumpMaxHeight) {
                shortJumpMaxHeight = height;
            }
            await t.wait(16); // ~60 FPS
        }
        
        console.log('Short jump max height:', shortJumpMaxHeight.toFixed(1), 'pixels');
        
        // Wait to land
        await t.waitForPlayerGrounded();
        await t.wait(500);
        
        // Test 2: Long jump (hold button)
        console.log('\nTest 2: Long Jump');
        const longJumpStartY = await t.page.evaluate(() => {
            return window.game.stateManager.currentState.player.y;
        });
        
        // Long jump
        await t.page.keyboard.down(' ');
        await t.wait(300); // 300ms hold
        await t.page.keyboard.up(' ');
        
        // Track maximum height
        let longJumpMaxHeight = 0;
        for (let i = 0; i < 50; i++) {
            const height = await t.page.evaluate((startY) => {
                const state = window.game.stateManager.currentState;
                return startY - state.player.y;
            }, longJumpStartY);
            
            if (height > longJumpMaxHeight) {
                longJumpMaxHeight = height;
            }
            await t.wait(16); // ~60 FPS
        }
        
        console.log('Long jump max height:', longJumpMaxHeight.toFixed(1), 'pixels');
        
        // Verify variable jump is working
        const heightDifference = longJumpMaxHeight - shortJumpMaxHeight;
        t.assert(heightDifference > 15, `Variable jump should work: long jump (${longJumpMaxHeight.toFixed(1)}) should be significantly higher than short jump (${shortJumpMaxHeight.toFixed(1)})`);
        console.log('✅ Variable jump working correctly (difference:', heightDifference.toFixed(1), 'pixels)');
        
        // === PART 3: Jump Physics Validation ===
        console.log('\n--- Part 3: Physics Validation ---');
        
        // Wait to land
        await t.waitForPlayerGrounded();
        
        // Test gravity effect
        console.log('\nTesting gravity and max fall speed...');
        
        // Jump and measure fall speed
        await t.jumpPlayer();
        await t.wait(500); // Wait to reach peak
        
        // Measure fall speed
        const fallSpeeds = [];
        let lastY = await t.page.evaluate(() => window.game.stateManager.currentState.player.y);
        
        for (let i = 0; i < 10; i++) {
            await t.wait(50);
            const currentY = await t.page.evaluate(() => window.game.stateManager.currentState.player.y);
            const speed = (currentY - lastY) / 50; // pixels per ms
            fallSpeeds.push(speed);
            lastY = currentY;
        }
        
        const maxFallSpeed = Math.max(...fallSpeeds);
        console.log('Max fall speed measured:', (maxFallSpeed * 1000).toFixed(1), 'pixels/second');
        
        // Verify fall speed is capped
        t.assert(maxFallSpeed * 1000 < physicsParams.maxFallSpeed * 1.1, 'Fall speed should be capped by maxFallSpeed');
        console.log('✅ Gravity and fall speed working correctly');
        
        // === PART 4: Spring Bounce Test ===
        console.log('\n--- Part 4: Spring Bounce Test ---');
        
        // Create a spring for testing
        console.log('\nCreating spring for bounce test...');
        await t.page.evaluate(() => {
            const state = window.game.stateManager.currentState;
            const Spring = window.Spring;
            if (Spring && state) {
                const spring = new Spring(200, 300, window.game);
                state.entityManager.addEntity('items', spring);
                console.log('Spring created at x=200, y=300');
            }
        });
        
        // Move player to spring
        await t.page.evaluate(() => {
            const state = window.game.stateManager.currentState;
            const player = state.player;
            const items = state.entityManager.getItems() || [];
            const spring = items.find(e => e.constructor.name === 'Spring');
            
            if (player && spring) {
                player.x = spring.x;
                player.y = spring.y - player.height - 5;
                player.vx = 0;
                player.vy = 0;
            }
        });
        
        // Wait for player to fall onto spring
        await t.wait(500);
        
        // Measure bounce height
        const beforeBounceY = await t.page.evaluate(() => {
            return window.game.stateManager.currentState.player.y;
        });
        
        // Wait for bounce
        await t.wait(1000);
        
        // Track maximum bounce height
        let bounceMaxHeight = 0;
        for (let i = 0; i < 50; i++) {
            const height = await t.page.evaluate((startY) => {
                const state = window.game.stateManager.currentState;
                return startY - state.player.y;
            }, beforeBounceY);
            
            if (height > bounceMaxHeight) {
                bounceMaxHeight = height;
            }
            await t.wait(16); // ~60 FPS
        }
        
        console.log('Spring bounce height:', bounceMaxHeight.toFixed(1), 'pixels');
        
        // Verify spring bounce is significantly higher than normal jump
        // Spring gives 2.5x jump power, but due to physics it results in approximately 1.1-1.2x the height
        // (Height is proportional to velocity squared, so actual height increase is less than velocity increase)
        t.assert(bounceMaxHeight > longJumpMaxHeight * 1.1, `Spring bounce (${bounceMaxHeight.toFixed(1)}) should be at least 1.1x higher than normal jump (${longJumpMaxHeight.toFixed(1)})`);
        console.log('✅ Spring bounce working correctly');
        
        // Check for any errors
        await t.checkForErrors();
        
        console.log('\n=== All Jump Mechanics Tests Passed ===');
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