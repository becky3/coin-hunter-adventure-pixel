const GameTestHelpers = require('./utils/GameTestHelpers.cjs');

async function runTest() {
    const test = new GameTestHelpers({
        headless: false,
        verbose: true,
        timeout: 60000
    });

    await test.runTest(async (t) => {
        // Initialize game
        await t.init('Input Check Test');
        
        // Setup error tracking
        await t.injectErrorTracking();
        
        // Navigate to simple test stage
        await t.navigateToGame('http://localhost:3000?s=stage0-1&skip_title=true');
        await t.waitForGameInitialization();
        
        // Wait for game to stabilize
        await t.wait(1000);
        
        console.log('\n--- Test 1: Jump Button Test ---');
        // Test jump button (Space)
        console.log('Pressing jump key (Space)...');
        
        // Get initial Y position
        const beforeJump = await t.page.evaluate(() => {
            const player = window.game?.stateManager?.currentState?.player;
            return player ? { y: player.y, grounded: player.grounded } : null;
        });
        console.log('Before jump:', beforeJump);
        
        // Press jump
        await t.pressKey('Space');
        await t.wait(200);
        
        // Check if player jumped
        const duringJump = await t.page.evaluate(() => {
            const player = window.game?.stateManager?.currentState?.player;
            return player ? { y: player.y, grounded: player.grounded, vy: player.vy } : null;
        });
        console.log('During jump:', duringJump);
        
        t.assert(duringJump.y < beforeJump.y || duringJump.vy < 0, 'Player should jump when Space is pressed');
        
        // Wait for landing
        await t.wait(1000);
        
        console.log('\n--- Test 2: Attack Button Test ---');
        // Test attack button (Period)
        console.log('Pressing attack key (Period)...');
        
        // Check if attack key is detected
        await t.page.evaluate(() => {
            // Add temporary logging to InputSystem
            const inputSystem = window.game?.stateManager?.currentState?.player?.getInputManager();
            if (inputSystem) {
                const originalIsActionPressed = inputSystem.isActionPressed;
                inputSystem.isActionPressed = function(action) {
                    const result = originalIsActionPressed.call(this, action);
                    console.log(`[InputSystem] isActionPressed('${action}') = ${result}`);
                    return result;
                };
            }
        });
        
        // Press attack key multiple times
        for (let i = 0; i < 3; i++) {
            console.log(`Press ${i + 1}:`);
            await t.pressKey('Period');
            await t.wait(100);
            await t.pressKey('.');
            await t.wait(100);
        }
        
        console.log('\n--- Test 3: Movement Keys Test ---');
        // Test movement keys
        console.log('Testing movement keys...');
        
        const startPos = await t.page.evaluate(() => {
            const player = window.game?.stateManager?.currentState?.player;
            return player ? { x: player.x } : null;
        });
        console.log('Start position:', startPos);
        
        // Move right
        await t.holdKey('ArrowRight', 500);
        
        const afterRight = await t.page.evaluate(() => {
            const player = window.game?.stateManager?.currentState?.player;
            return player ? { x: player.x } : null;
        });
        console.log('After moving right:', afterRight);
        
        t.assert(afterRight.x > startPos.x, 'Player should move right');
        
        // Move left
        await t.holdKey('ArrowLeft', 500);
        
        const afterLeft = await t.page.evaluate(() => {
            const player = window.game?.stateManager?.currentState?.player;
            return player ? { x: player.x } : null;
        });
        console.log('After moving left:', afterLeft);
        
        t.assert(afterLeft.x < afterRight.x, 'Player should move left');
        
        console.log('\n--- Test 4: Direct Input System Check ---');
        // Direct check of input system
        const inputCheck = await t.page.evaluate(() => {
            const inputSystem = window.game?.stateManager?.currentState?.player?.getInputManager();
            if (!inputSystem) return { error: 'No input system' };
            
            return {
                hasInputSystem: true,
                keyMap: inputSystem.keyMap,
                attackKeys: inputSystem.keyMap?.attack,
                jumpKeys: inputSystem.keyMap?.jump
            };
        });
        console.log('Input system configuration:', JSON.stringify(inputCheck, null, 2));
        
        // Check for any errors
        await t.checkForErrors();
    });
}

runTest().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});