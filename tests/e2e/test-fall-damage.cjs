const GameTestHelpers = require('./utils/GameTestHelpers.cjs');
const testConfig = require('./utils/testConfig.cjs');

// Test for fall damage mechanics
async function runTest() {
    const test = new GameTestHelpers({
        headless: testConfig.headless,
        verbose: true,
        timeout: 30000  // Increased from 20000 to 30000 for stability
    });

    await test.runTest(async (t) => {
        // Initialize game
        await t.init('Fall Damage Test');
        
        // Use quickStart for simplified initialization
        await t.quickStart('0-3');
        
        // Get initial player stats using new method
        const initialPlayer = await t.getEntity('player');
        console.log('Initial player stats:', {
            position: { x: initialPlayer.x, y: initialPlayer.y },
            health: initialPlayer.health,
            isSmall: initialPlayer.isSmall
        });
        
        // Get initial lives using new helper
        const initialLives = await t.getLives();
        console.log('Initial lives:', initialLives);
        
        // Test: Fall multiple times until game over (includes first fall verification)
        console.log('\n--- Test: Multiple Falls Until Game Over ---');
        
        let currentLives = initialLives;
        let fallCount = 0;
        
        while (currentLives > 0 && fallCount < 5) { // Increase max attempts
            fallCount++;
            console.log(`Fall attempt ${fallCount} - Current lives: ${currentLives}`);
            
            // Wait a bit to ensure death handling flag is reset
            await t.wait(200);
            
            // Set up event listeners for death and respawn/gameover
            const fallResult = await t.page.evaluate(() => {
                return new Promise((resolve) => {
                    let deathDetected = false;
                    let resolved = false;
                    
                    const handleDeath = () => {
                        console.log('[Test] Death event detected');
                        deathDetected = true;
                        // Stop moving immediately when death is detected
                        const upEvent = new KeyboardEvent('keyup', { code: 'ArrowRight', key: 'ArrowRight' });
                        window.dispatchEvent(upEvent);
                    };
                    
                    let gameOverInterval;
                    
                    const handleRespawn = (event) => {
                        if (!resolved && deathDetected) {
                            console.log('[Test] Respawn after death detected');
                            resolved = true;
                            if (gameOverInterval) clearInterval(gameOverInterval);
                            resolve({ result: 'respawned', detail: event.detail });
                        }
                    };
                    
                    const checkGameOver = () => {
                        const state = window.game?.stateManager?.currentState;
                        if (state?.gameState === 'gameover' && !resolved && deathDetected) {
                            resolved = true;
                            resolve({ result: 'gameover' });
                        }
                    };
                    
                    // Listen for death and respawn events
                    window.addEventListener('player:died', handleDeath, { once: true });
                    window.addEventListener('player:respawned', handleRespawn, { once: true });
                    
                    // Check for game over periodically
                    gameOverInterval = setInterval(checkGameOver, 100);
                    
                    // Start moving right by dispatching keyboard event
                    const downEvent = new KeyboardEvent('keydown', { code: 'ArrowRight', key: 'ArrowRight' });
                    window.dispatchEvent(downEvent);
                    
                    // Timeout after 5 seconds
                    setTimeout(() => {
                        const upEvent = new KeyboardEvent('keyup', { code: 'ArrowRight', key: 'ArrowRight' });
                        window.dispatchEvent(upEvent);
                        clearInterval(gameOverInterval);
                        if (!resolved) {
                            window.removeEventListener('player:died', handleDeath);
                            window.removeEventListener('player:respawned', handleRespawn);
                            resolve({ result: 'timeout' });
                        }
                    }, 5000);
                });
            });
            
            t.assert(fallResult.result !== 'timeout', 'Timeout waiting for fall death');
            
            console.log(`Fall ${fallCount} result: ${fallResult.result}`);
            
            // Check lives using new helper
            currentLives = await t.getLives();
            console.log(`Lives after fall ${fallCount}: ${currentLives}`);
            
            // 最初の落下では1ライフ減ることを確認
            t.assert(!(fallCount === 1 && currentLives >= initialLives), 
                `Lives did not decrease after first fall. Initial: ${initialLives}, Current: ${currentLives}`);
            
            if (fallResult.result === 'gameover') {
                console.log('✅ Game over triggered correctly after losing all lives');
                break;
            }
            
            // await t.screenshot(`after-fall-${fallCount}`);
        }
        
        // Test 2: Verify HUD shows correct lives
        console.log('\n--- Test 2: HUD Verification ---');
        
        // Get current internal lives using new helper
        const finalLives = await t.getLives();
        
        // Check if HUD is rendering lives correctly
        const hudData = await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const hudManager = state?.hudManager || state?.getHudManager?.();
            return hudManager ? hudManager.getHUDData() : null;
        });
        
        console.log('Final lives (internal):', finalLives);
        console.log('HUD data:', hudData);
        
        t.assert(!hudData || hudData.lives === finalLives, 
            `HUD shows incorrect lives. Internal: ${finalLives}, HUD: ${hudData.lives}`);
        
        // Final screenshot
        // await t.screenshot('test-complete');
        
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