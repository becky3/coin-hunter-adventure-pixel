const GameTestHelpers = require('./utils/GameTestHelpers.cjs');
const testConfig = require('./utils/testConfig.cjs');

/**
 * Test for hole falling physics
 * Tests that entities can fall through 1-tile wide holes
 */
async function runTest() {
    const test = new GameTestHelpers({
        headless: testConfig.headless,
        verbose: false,
        timeout: 30000
    });

    await test.runTest(async (t) => {
        // Initialize test
        await t.init('Hole Falling Test');
        
        // Setup error tracking
        await t.injectErrorTracking();
        
        // Navigate to hole falling test stage
        await t.navigateToGame('http://localhost:3000?s=0-7&skip_title=true');
        
        await t.waitForGameInitialization();
        
        // With skip_title=true, we should go directly to play state
        await t.assertState('play');
        await t.assertPlayerExists();
        
        console.log('\n=== Testing Hole Falling Physics ===');
        
        // Get initial player position
        const initialPos = await t.getPlayerPosition();
        console.log(`Initial position: x=${initialPos.x.toFixed(0)}, y=${initialPos.y.toFixed(0)}`);
        
        // === TEST 1: Standing over 1-tile hole without falling ===
        console.log('\n--- Test 1: Current behavior - NOT falling through 1-tile hole ---');
        
        // Move to the first 1-tile hole (at x=5*16=80)
        await t.page.evaluate(() => {
            const state = window.game.stateManager.currentState;
            const player = state.player;
            if (player) {
                // Position player directly over the 1-tile hole
                player.x = 80; // Center of hole at tile x=5
                player.y = 160; // On the ground level
                player.vx = 0;
                player.vy = 0;
            }
        });
        
        await t.wait(500);
        
        // Check if player is grounded (should be true with current broken physics)
        const overHoleState = await t.page.evaluate(() => {
            const state = window.game.stateManager.currentState;
            const player = state.player;
            return {
                x: player.x,
                y: player.y,
                grounded: player.grounded,
                vy: player.vy,
                width: player.width
            };
        });
        
        console.log('Player state over 1-tile hole:', overHoleState);
        
        // With current broken physics, player should be grounded
        if (overHoleState.grounded) {
            console.log('✅ Confirmed bug: Player is grounded over 1-tile hole');
        } else {
            console.log('⚠️  Unexpected: Player is already falling (bug may be fixed?)');
        }
        
        // === TEST 2: Walking across 1-tile hole ===
        console.log('\n--- Test 2: Walking across 1-tile hole ---');
        
        // Reset player position
        await t.page.evaluate(() => {
            const state = window.game.stateManager.currentState;
            const player = state.player;
            if (player) {
                player.x = 48; // Before the hole
                player.y = 160;
                player.vx = 0;
                player.vy = 0;
            }
        });
        
        await t.wait(300);
        
        // Walk right across the hole
        await t.movePlayer('right', 1000);
        
        const afterWalkPos = await t.getPlayerPosition();
        console.log(`Position after walking: x=${afterWalkPos.x.toFixed(0)}, y=${afterWalkPos.y.toFixed(0)}`);
        
        // Check if player fell
        if (afterWalkPos.y > 170) {
            console.log('✅ Player fell through the hole while walking');
        } else {
            console.log('❌ Bug confirmed: Player walked over 1-tile hole without falling');
        }
        
        // === TEST 3: Testing wider holes ===
        console.log('\n--- Test 3: Testing wider holes ---');
        
        // Test 2-tile hole
        await t.page.evaluate(() => {
            const state = window.game.stateManager.currentState;
            const player = state.player;
            if (player) {
                player.x = 136; // Center of 2-tile hole (tiles 8-9)
                player.y = 160;
                player.vx = 0;
                player.vy = 0;
            }
        });
        
        await t.wait(1000);
        
        const twoTileHoleState = await t.page.evaluate(() => {
            const state = window.game.stateManager.currentState;
            const player = state.player;
            return {
                x: player.x,
                y: player.y,
                grounded: player.grounded,
                fell: player.y > 170
            };
        });
        
        console.log('2-tile hole result:', twoTileHoleState);
        
        if (twoTileHoleState.fell) {
            console.log('✅ Player correctly falls through 2-tile hole');
        } else {
            console.log('⚠️  Player did not fall through 2-tile hole');
        }
        
        // === TEST 4: Edge detection ===
        console.log('\n--- Test 4: Edge detection ---');
        
        // Position player at edge of platform
        await t.page.evaluate(() => {
            const state = window.game.stateManager.currentState;
            const player = state.player;
            if (player) {
                player.x = 72; // Right edge of platform before hole
                player.y = 160;
                player.vx = 0;
                player.vy = 0;
            }
        });
        
        await t.wait(500);
        
        const edgeState = await t.page.evaluate(() => {
            const state = window.game.stateManager.currentState;
            const player = state.player;
            const leftEdge = player.x;
            const rightEdge = player.x + player.width;
            const centerX = player.x + player.width / 2;
            
            return {
                x: player.x,
                y: player.y,
                grounded: player.grounded,
                leftEdge: leftEdge,
                rightEdge: rightEdge,
                centerX: centerX,
                width: player.width
            };
        });
        
        console.log('Edge detection state:', edgeState);
        console.log(`Player spans from x=${edgeState.leftEdge} to x=${edgeState.rightEdge}`);
        console.log(`Center at x=${edgeState.centerX}`);
        
        // === Summary ===
        console.log('\n=== Test Summary ===');
        console.log('Current physics implementation:');
        console.log('- Checks ground from entity left edge to right edge');
        console.log('- Any ground tile found = grounded');
        console.log('- This prevents falling through 1-tile holes');
        console.log('- Need to implement center-based or percentage-based ground detection');
        
        // Check for any errors
        await t.checkForErrors();
        
        console.log('\n=== Hole Falling Test Complete ===');
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