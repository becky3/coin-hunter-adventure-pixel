const GameTestHelpers = require('./utils/GameTestHelpers.cjs');

async function runTest() {
    const test = new GameTestHelpers({ 
        headless: false,
        verbose: true
    });
    
    await test.runTest(async (t) => {
        console.log('\n==================================================');
        console.log('Starting test: Simple Spring Test');
        console.log(`Time: ${new Date().toISOString()}`);
        console.log('==================================================\n');
        
        // Initialize test
        await t.init('Simple Spring Test');
        await t.injectErrorTracking();
        
        // Navigate to stage 0-1 which has a spring
        await t.navigateToGame('http://localhost:3000?s=0-1');
        await t.waitForGameInitialization();
        await t.screenshot('test-initialized');
        
        // Start new game
        await t.startNewGame();
        await t.screenshot('game-started');
        
        // Verify we're in play state
        await t.assertState('play');
        
        // Get spring info
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
            throw new Error('Spring not found in stage');
        }
        
        // Teleport player to just above the spring
        console.log('Teleporting player above spring...');
        const teleportResult = await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const player = state?.player || state?.entityManager?.getPlayer?.();
            const entityManager = state?.entityManager;
            const items = entityManager?.getItems?.() || [];
            const spring = items.find(e => e.constructor.name === 'Spring');
            
            if (player && spring) {
                // Place player on the spring
                player.x = spring.x;  
                player.y = spring.y - player.height; // Exactly on top of spring
                player.vx = 0;
                player.vy = 0.1; // Very small downward velocity
                player.grounded = true; // Set as grounded
                return {
                    success: true,
                    playerPos: { x: player.x, y: player.y },
                    springPos: { x: spring.x, y: spring.y }
                };
            }
            return { success: false };
        });
        console.log('Teleport result:', teleportResult);
        
        // Wait a moment
        await t.wait(500);
        
        // Simulate a small jump to trigger spring
        console.log('Making player jump to trigger spring...');
        await t.jumpPlayer();
        await t.wait(1000); // Wait for jump and land
        
        // Check if spring was triggered
        const springTriggered = await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const entityManager = state?.entityManager;
            const items = entityManager?.getItems?.() || [];
            const spring = items.find(e => e.constructor.name === 'Spring');
            const player = state?.player;
            
            // Check collision manually
            const playerBounds = player ? {
                left: player.x,
                right: player.x + player.width,
                top: player.y,
                bottom: player.y + player.height
            } : null;
            
            const springBounds = spring ? {
                left: spring.x,
                right: spring.x + spring.width,
                top: spring.y,
                bottom: spring.y + spring.height
            } : null;
            
            const isColliding = playerBounds && springBounds && 
                playerBounds.left < springBounds.right &&
                playerBounds.right > springBounds.left &&
                playerBounds.top < springBounds.bottom &&
                playerBounds.bottom > springBounds.top;
            
            return {
                triggered: spring?.triggered || false,
                playerY: player?.y || 0,
                playerHeight: player?.height || 0,
                playerBottom: player ? player.y + player.height : 0,
                playerVy: player?.vy || 0,
                springY: spring?.y || 0,
                springHeight: spring?.height || 0,
                springHasPhysicsSystem: !!spring?.physicsSystem,
                isColliding: isColliding,
                playerBounds: playerBounds,
                springBounds: springBounds
            };
        });
        console.log('Spring status after fall:', springTriggered);
        
        await t.screenshot('spring-test-complete');
        await t.checkForErrors();
        
        if (!springTriggered.triggered) {
            console.log('❌ Spring was not triggered!');
        } else {
            console.log('✅ Spring was triggered!');
        }
        
        console.log('\n✅ Simple spring test completed.');
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