const GameTestHelpers = require('./utils/GameTestHelpers.cjs');

async function runTest() {
    const test = new GameTestHelpers({
        headless: false,
        slowMo: 200,
        verbose: true
    });

    await test.runTest(async (t) => {
        await t.init('Key Debug Test');
        await t.navigateToGame();
        await t.waitForGameInitialization();
        await t.startNewGame();
        
        console.log('\n--- Testing Key Input System ---');
        
        // Wait for player to be grounded
        await t.waitForPlayerGrounded();
        
        // Test each key individually
        const keysToTest = [
            { key: 'Space', expected: 'jump' },
            { key: ' ', expected: 'jump (space char)' },
            { key: 'ArrowUp', expected: 'jump/up' },
            { key: 'W', expected: 'jump/up' },
            { key: 'w', expected: 'jump/up (lowercase)' }
        ];
        
        for (const { key, expected } of keysToTest) {
            console.log(`\nTesting key: "${key}" (${expected})`);
            
            // Get position before
            const before = await t.getPlayerPosition();
            console.log(`Before: y=${before.y.toFixed(2)}`);
            
            // Inject logging
            await t.page.evaluate(() => {
                window.__lastKeyPress = null;
                const originalHandleKeyDown = window.game?.inputSystem?.handleKeyDown;
                if (originalHandleKeyDown) {
                    window.game.inputSystem.handleKeyDown = function(event) {
                        window.__lastKeyPress = {
                            key: event.key,
                            code: event.code,
                            keyCode: event.keyCode
                        };
                        console.log(`InputSystem received: key="${event.key}" code="${event.code}" keyCode=${event.keyCode}`);
                        return originalHandleKeyDown.call(this, event);
                    };
                }
            });
            
            // Press key
            await t.pressKey(key);
            await t.wait(300);
            
            // Get key info
            const keyInfo = await t.page.evaluate(() => window.__lastKeyPress);
            console.log('Key received by InputSystem:', keyInfo);
            
            // Check position after
            const after = await t.getPlayerPosition();
            const stats = await t.getPlayerStats();
            console.log(`After: y=${after.y.toFixed(2)}, vy=${stats.velocity.y.toFixed(2)}, grounded=${stats.grounded}`);
            
            // Check if jumped
            if (after.y < before.y || stats.velocity.y < -1) {
                console.log('✅ Jump detected!');
            } else {
                console.log('❌ No jump detected');
            }
            
            // Wait to land if jumped
            if (!stats.grounded) {
                await t.waitForPlayerGrounded();
            }
        }
        
        // Check the actual input mappings
        console.log('\n--- Input Mappings ---');
        const mappings = await t.page.evaluate(() => {
            const player = window.game?.stateManager?.currentState?.player || 
                          window.game?.stateManager?.currentState?.entityManager?.player;
            if (player && player.inputManager) {
                return {
                    keyMap: player.inputManager.keyMap,
                    reverseKeyMap: player.inputManager.reverseKeyMap
                };
            }
            return null;
        });
        console.log('Player input mappings:', JSON.stringify(mappings, null, 2));
        
        await t.screenshot('key-debug');
    });
}

if (require.main === module) {
    runTest().catch(error => {
        console.error('Test failed:', error);
        process.exit(1);
    });
}

module.exports = runTest;