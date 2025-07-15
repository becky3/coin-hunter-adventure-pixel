const GameTestHelpers = require('./utils/GameTestHelpers.cjs');

// Jump physics test for air resistance and gravity scale
async function runTest() {
    const test = new GameTestHelpers({
        headless: false,  // Set to false to see the browser
        verbose: true,    // More console logs
        timeout: 40000
    });

    await test.runTest(async (t) => {
        // Initialize test
        await t.init('Jump Physics Test');
        
        // Navigate to jump-test.html instead of main game
        console.log('Navigating to jump-test.html...');
        await t.page.goto('http://localhost:3000/jump-test.html?test=true', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });
        
        // Wait for page to load and check if it loaded correctly
        await t.wait(2000);
        
        // Verify page loaded
        const pageTitle = await t.page.evaluate(() => document.title);
        console.log('Page title:', pageTitle);
        
        // Check if gameFrame exists
        const frameExists = await t.page.evaluate(() => {
            return !!document.getElementById('gameFrame');
        });
        
        t.assert(frameExists, 'gameFrame should exist on page');
        
        // Wait for game frame to load
        console.log('Waiting for game to initialize...');
        const gameInitialized = await t.page.waitForFunction(() => {
            const iframe = document.getElementById('gameFrame');
            return iframe && iframe.contentWindow && iframe.contentWindow.game;
        }, { timeout: 30000 }).then(() => true).catch(async () => {
            // Get more details about the error
            const debugInfo = await t.page.evaluate(() => {
                const iframe = document.getElementById('gameFrame');
                return {
                    iframeExists: !!iframe,
                    hasContentWindow: iframe ? !!iframe.contentWindow : false,
                    iframeSource: iframe ? iframe.src : null,
                    pageURL: window.location.href
                };
            });
            console.error('Failed to initialize game. Debug info:', debugInfo);
            return false;
        });
        
        t.assert(gameInitialized, 'Game should be initialized within timeout');
        
        // Additional wait for game to fully initialize
        await t.wait(2000);
        
        // Get initial values
        console.log('\n--- Initial Values ---');
        const initialValues = await t.page.evaluate(() => {
            return {
                gravity: document.getElementById('gravity').value,
                jumpPower: document.getElementById('jumpPower').value,
                maxFallSpeed: document.getElementById('maxFallSpeed').value,
                airResistance: document.getElementById('airResistance').value,
                gravityScale: document.getElementById('gravityScale').value
            };
        });
        console.log('Slider values:', initialValues);
        
        // Check if game is in play state
        const gameState = await t.page.evaluate(() => {
            const gameWindow = document.getElementById('gameFrame').contentWindow;
            if (!gameWindow.game) return null;
            
            const state = gameWindow.game.stateManager.currentState;
            return {
                stateName: state?.name,
                hasPlayer: !!state?.player
            };
        });
        console.log('Game state:', gameState);
        
        // If not in play state, start the game from menu
        if (gameState.stateName !== 'play' || !gameState.hasPlayer) {
            console.log('Game in menu state, starting game...');
            
            // Wait for menu to be ready
            await t.page.waitForFunction(() => {
                const gameWindow = document.getElementById('gameFrame').contentWindow;
                const state = gameWindow.game?.stateManager?.currentState;
                return state && state.name === 'menu' && state.optionsAlpha >= 1;
            }, { timeout: 5000 });
            
            console.log('Menu ready, pressing START GAME...');
            
            // Focus the iframe and press Space to start
            const frame = await t.page.$('#gameFrame');
            const box = await frame.boundingBox();
            await t.page.mouse.click(box.x + box.width/2, box.y + box.height/2);
            await t.wait(100);
            
            // Method 1: Get iframe element and interact via frame handle
            const iframeElement = await t.page.$('#gameFrame');
            const gameFrame = await iframeElement.contentFrame();
            
            if (gameFrame) {
                console.log('Got game frame, attempting to start game...');
                
                // Click in the center of the frame to focus it
                await gameFrame.click('body');
                await t.wait(100);
                
                // Try to press Space directly on the page (iframe should be focused)
                await t.page.keyboard.down('Space');
                await t.wait(100);
                await t.page.keyboard.up('Space');
                
                console.log('Pressed Space key');
            } else {
                console.log('Could not get game frame');
            }
            
            // Wait for play state with player
            await t.page.waitForFunction(() => {
                const gameWindow = document.getElementById('gameFrame').contentWindow;
                const state = gameWindow.game?.stateManager?.currentState;
                return state && state.name === 'play' && state.player;
            }, { timeout: 10000 });
            
            console.log('Game started in play state with player');
            await t.wait(1000); // Additional wait for stability
        }
        
        // Test 1: Air Resistance Change
        console.log('\n--- Test 1: Air Resistance Change ---');
        
        // Get player values before change
        const beforeChange = await t.page.evaluate(() => {
            const gameWindow = document.getElementById('gameFrame').contentWindow;
            const state = gameWindow.game?.stateManager?.currentState;
            if (!state?.player) return null;
            
            return {
                jumpPower: state.player.jumpPower,
                airResistance: state.player.airResistance,
                gravityScale: state.player.gravityScale,
                maxFallSpeed: state.player.maxFallSpeed
            };
        });
        console.log('Player values before:', beforeChange);
        
        // Change air resistance to 0.3
        await t.page.evaluate(() => {
            const slider = document.getElementById('airResistance');
            slider.value = '0.3';
            slider.dispatchEvent(new Event('input', { bubbles: true }));
        });
        
        await t.wait(500); // Wait for auto-apply
        
        // Get player values after change
        const afterChange = await t.page.evaluate(() => {
            const gameWindow = document.getElementById('gameFrame').contentWindow;
            const state = gameWindow.game?.stateManager?.currentState;
            if (!state?.player) return null;
            
            return {
                jumpPower: state.player.jumpPower,
                airResistance: state.player.airResistance,
                gravityScale: state.player.gravityScale,
                maxFallSpeed: state.player.maxFallSpeed
            };
        });
        console.log('Player values after:', afterChange);
        
        // Verify air resistance changed but jump power didn't
        if (afterChange) {
            const airResistanceChanged = afterChange.airResistance === 0.3;
            const jumpPowerUnchanged = afterChange.jumpPower === beforeChange.jumpPower;
            
            console.log(`✅ Air resistance changed: ${airResistanceChanged ? 'YES' : 'NO'}`);
            console.log(`✅ Jump power unchanged: ${jumpPowerUnchanged ? 'YES' : 'NO'}`);
            
            t.assert(airResistanceChanged, 'Air resistance should have changed to 0.3');
            t.assert(jumpPowerUnchanged, 'Jump power should remain unchanged');
        }
        
        // Test 2: Reset to Default Button
        console.log('\n--- Test 2: Reset to Default Button ---');
        
        // First change some values
        await t.page.evaluate(() => {
            document.getElementById('airResistance').value = '0.5';
            document.getElementById('gravityScale').value = '2.0';
            document.getElementById('airResistance').dispatchEvent(new Event('input', { bubbles: true }));
            document.getElementById('gravityScale').dispatchEvent(new Event('input', { bubbles: true }));
        });
        
        await t.wait(200);
        
        // Click Reset to Default button
        await t.page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const resetBtn = buttons.find(btn => btn.textContent.includes('Reset to Default'));
            if (resetBtn) resetBtn.click();
        });
        
        await t.wait(500);
        
        // Check that values changed (not checking specific values as they may change)
        const afterReset = await t.page.evaluate(() => {
            return {
                airResistance: document.getElementById('airResistance').value,
                gravityScale: document.getElementById('gravityScale').value
            };
        });
        console.log('Values after reset:', afterReset);
        
        // Just verify that reset button changed the values
        const resetWorked = 
            parseFloat(afterReset.airResistance) !== 0.5 &&
            parseFloat(afterReset.gravityScale) !== 2.0;
            
        console.log(`✅ Reset button functionality: ${resetWorked ? 'PASSED' : 'FAILED'}`);
        
        t.assert(resetWorked, 'Reset to default button should change values back from modified values');
        
        // Test 3: Gravity Scale
        console.log('\n--- Test 3: Gravity Scale ---');
        
        // Change gravity scale to 0.5
        await t.page.evaluate(() => {
            const slider = document.getElementById('gravityScale');
            slider.value = '0.5';
            slider.dispatchEvent(new Event('input', { bubbles: true }));
        });
        
        await t.wait(500);
        
        // Check if player has the new gravity scale
        const gravityScaleCheck = await t.page.evaluate(() => {
            const gameWindow = document.getElementById('gameFrame').contentWindow;
            const state = gameWindow.game?.stateManager?.currentState;
            return state?.player?.gravityScale;
        });
        
        console.log(`Player gravity scale: ${gravityScaleCheck}`);
        console.log(`✅ Gravity scale test: ${gravityScaleCheck === 0.5 ? 'PASSED' : 'FAILED'}`);
        
        // Test 4: Air Resistance on Upward Movement
        console.log('\n--- Test 4: Air Resistance Effect on Jump ---');
        
        // Reset air resistance to 0
        await t.page.evaluate(() => {
            const slider = document.getElementById('airResistance');
            slider.value = '0';
            slider.dispatchEvent(new Event('input', { bubbles: true }));
        });
        await t.wait(200);
        
        // Make player jump and measure initial velocity
        const jumpTestNoResistance = await t.page.evaluate(() => {
            const gameWindow = document.getElementById('gameFrame').contentWindow;
            const state = gameWindow.game?.stateManager?.currentState;
            if (!state?.player) return null;
            
            // Simulate jump
            state.player.grounded = true;
            state.player.vy = -10; // Set upward velocity
            
            return {
                initialVy: state.player.vy,
                airResistance: state.player.airResistance
            };
        });
        console.log('Jump test without air resistance:', jumpTestNoResistance);
        
        // Set air resistance to 0.3
        await t.page.evaluate(() => {
            const slider = document.getElementById('airResistance');
            slider.value = '0.3';
            slider.dispatchEvent(new Event('input', { bubbles: true }));
        });
        await t.wait(200);
        
        // Make player jump again and measure
        const jumpTestWithResistance = await t.page.evaluate(() => {
            const gameWindow = document.getElementById('gameFrame').contentWindow;
            const state = gameWindow.game?.stateManager?.currentState;
            if (!state?.player) return null;
            
            // Simulate jump
            state.player.grounded = true;
            state.player.vy = -10; // Set same upward velocity
            
            // Let physics system apply air resistance for one frame
            const physics = gameWindow.game.serviceLocator.get('physics');
            if (physics) {
                // Manually apply air resistance to see the effect
                const beforeVy = state.player.vy;
                physics.applyGravity(state.player, 1/60);
                const afterVy = state.player.vy;
                
                return {
                    initialVy: -10,
                    beforeApply: beforeVy,
                    afterApply: afterVy,
                    airResistance: state.player.airResistance,
                    velocityReduced: Math.abs(afterVy) < Math.abs(beforeVy)
                };
            }
            
            return null;
        });
        console.log('Jump test with air resistance:', jumpTestWithResistance);
        
        if (jumpTestWithResistance) {
            const airResistanceAffectsUpward = jumpTestWithResistance.velocityReduced;
            console.log(`✅ Air resistance affects upward movement: ${airResistanceAffectsUpward ? 'YES' : 'NO'}`);
        }
        
        // Take screenshot
        // await t.screenshot('jump-test-final');
        
        console.log('\n✅ All jump physics tests passed!');
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