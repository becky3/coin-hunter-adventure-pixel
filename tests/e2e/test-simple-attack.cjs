const GameTestHelpers = require('./utils/GameTestHelpers.cjs');

// Simple test to check if Period key works
async function runTest() {
    const test = new GameTestHelpers({
        headless: false,
        verbose: true,
        timeout: 30000
    });

    await test.runTest(async (t) => {
        // Initialize game
        await t.init('Simple Attack Key Test');
        
        // Setup error tracking
        await t.injectErrorTracking();
        
        // Navigate to game with stage 0-5
        await t.navigateToGame('http://localhost:3000?s=0-5&skip_title=true');
        await t.waitForGameInitialization();
        
        // With skip_title=true, we should go directly to play state
        await t.assertState('play');
        
        // Ensure input focus
        await t.ensureInputFocus();
        
        console.log('\\n--- Testing Period key recognition ---');
        
        // Test Period key detection
        await t.page.keyboard.press('Period');
        await t.wait(100);
        
        // Check if Period was detected
        const keyCheck = await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const player = state?.player || state?.entityManager?.getPlayer?.();
            const inputManager = player?.getInputManager?.();
            
            return {
                hasInputManager: !!inputManager,
                periodKeyCode: 'Period',
                isKeyPressed: inputManager?.isKeyPressed ? inputManager.isKeyPressed('Period') : 'N/A',
                isActionPressed: inputManager?.isActionPressed ? inputManager.isActionPressed('attack') : 'N/A',
                debugInfo: inputManager?.getDebugInfo ? inputManager.getDebugInfo() : null
            };
        });
        
        console.log('Key check result:', keyCheck);
        
        // Try pressing multiple times
        console.log('\\n--- Pressing Period key multiple times ---');
        for (let i = 0; i < 3; i++) {
            await t.page.keyboard.press('Period');
            await t.wait(100);
            
            const pressCheck = await t.page.evaluate(() => {
                const state = window.game?.stateManager?.currentState;
                const player = state?.player || state?.entityManager?.getPlayer?.();
                const inputManager = player?.getInputManager?.();
                return {
                    isKeyPressed: inputManager?.isKeyPressed ? inputManager.isKeyPressed('Period') : 'N/A',
                    isActionPressed: inputManager?.isActionPressed ? inputManager.isActionPressed('attack') : 'N/A'
                };
            });
            console.log(`Press ${i + 1}:`, pressCheck);
        }
        
        // Check for any errors
        await t.checkForErrors();
        
        console.log('\\n✅ Simple attack key test completed!');
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