const GameTestHelpers = require('./utils/GameTestHelpers.cjs');
const testConfig = require('./utils/testConfig.cjs');

async function runTest() {
    const test = new GameTestHelpers({
        headless: false, // デバッグのため一時的にオフ
        verbose: true,
        timeout: 30000
    });

    await test.runTest(async (t) => {
        await t.init('Death and Respawn Test');
        
        // Setup error tracking
        await t.injectErrorTracking();
        
        await t.navigateToGame('http://localhost:3000?s=0-3');
        await t.waitForGameInitialization();
        
        // Verify initial state
        await t.assertState('menu');
        
        // Start new game with stage 0-3
        await t.startNewGame();
        
        // Verify game state
        await t.assertState('play');
        
        // Wait for player to be ready
        await t.assertPlayerExists();
        console.log('Game started, play state active');
        
        // Get initial player position
        const initialPlayerPos = await t.page.evaluate(() => {
            const currentState = window.game.stateManager.currentState;
            const player = currentState?.getEntityManager()?.getPlayer();
            return player ? { x: player.x, y: player.y } : null;
        });
        console.log(`Initial player position: ${JSON.stringify(initialPlayerPos)}`);
        
        // Check for FallingFloor entities
        const fallingFloorInfo = await t.page.evaluate(() => {
            const currentState = window.game.stateManager.currentState;
            const entityManager = currentState?.getEntityManager();
            if (!entityManager) return null;
            
            const platforms = entityManager.getPlatforms();
            const fallingFloors = platforms.filter(p => p.constructor.name === 'FallingFloor');
            
            return {
                count: fallingFloors.length,
                states: fallingFloors.map(f => ({
                    x: f.x,
                    y: f.y,
                    state: f.state
                }))
            };
        });
        console.log(`FallingFloor entities: ${JSON.stringify(fallingFloorInfo)}`);
        
        // Get initial lives
        const initialLives = await t.page.evaluate(() => {
            const currentState = window.game.stateManager.currentState;
            return currentState?.lives || 0;
        });
        console.log(`Initial lives: ${initialLives}`);
        
        // Move player right to fall into the hole
        console.log('Moving player right to fall into hole...');
        await t.movePlayer('right', 1500); // Move right for 1.5 seconds
        
        // Wait for death animation/processing
        await t.wait(500);
        console.log('Player should have fallen and died');
        
        // Wait for intermission state (death screen)
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
        
        // Check current state
        const currentStateName = await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            return state ? state.name : null;
        });
        console.log(`Current state after death: ${currentStateName}`);
        
        // Skip waitForState check as state is already confirmed
        if (currentStateName !== 'intermission') {
            throw new Error(`Expected intermission state but got: ${currentStateName}`);
        }
        console.log('Death intermission state active');
        
        // Wait for play state to resume (intermission lasts 2 seconds)
        console.log('Waiting for intermission to complete (2 seconds)...');
        await t.wait(2500); // IntermissionStateの2秒 + 余裕
        
        // Check current state after waiting
        const stateAfterWait = await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            return state ? state.name : null;
        });
        console.log(`State after 2.5s wait: ${stateAfterWait}`);
        
        if (stateAfterWait !== 'play') {
            // デバッグ情報を収集
            const debugInfo = await t.page.evaluate(() => {
                const state = window.game?.stateManager?.currentState;
                const timer = state?.timer;
                return {
                    currentState: state?.name,
                    timer: timer,
                    stateManagerInfo: window.game?.stateManager ? 'exists' : 'missing'
                };
            });
            console.log('Debug info:', JSON.stringify(debugInfo));
            throw new Error(`Expected play state after intermission but got: ${stateAfterWait}`);
        }
        
        console.log('Game resumed after death');
        
        // Check player respawned at initial position
        const respawnPlayerPos = await t.page.evaluate(() => {
            const currentState = window.game.stateManager.currentState;
            const player = currentState?.getEntityManager()?.getPlayer();
            return player ? { x: player.x, y: player.y } : null;
        });
        console.log(`Respawn player position: ${JSON.stringify(respawnPlayerPos)}`);
        
        // Verify player is at spawn position (with some tolerance)
        // Note: Y position may differ due to physics settling
        t.assert(
            Math.abs(respawnPlayerPos.x - initialPlayerPos.x) <= 1,
            `Player X position should be at spawn. Expected: ${initialPlayerPos.x}, Got: ${respawnPlayerPos.x}`
        );
        t.assert(
            Math.abs(respawnPlayerPos.y - initialPlayerPos.y) <= 20, // より大きな許容範囲
            `Player Y position should be near spawn. Expected: ${initialPlayerPos.y}, Got: ${respawnPlayerPos.y}`
        );
        
        // Check that FallingFloor entities are reset
        const resetFallingFloorInfo = await t.page.evaluate(() => {
            const currentState = window.game.stateManager.currentState;
            const entityManager = currentState?.getEntityManager();
            if (!entityManager) return null;
            
            const platforms = entityManager.getPlatforms();
            const fallingFloors = platforms.filter(p => p.constructor.name === 'FallingFloor');
            
            return {
                count: fallingFloors.length,
                states: fallingFloors.map(f => ({
                    x: f.x,
                    y: f.y,
                    state: f.state
                }))
            };
        });
        console.log(`Reset FallingFloor entities: ${JSON.stringify(resetFallingFloorInfo)}`);
        
        // Verify all FallingFloors are in 'stable' state
        if (resetFallingFloorInfo && resetFallingFloorInfo.count > 0) {
            const unstableFloors = resetFallingFloorInfo.states.filter(f => f.state !== 'stable');
            t.assert(
                unstableFloors.length === 0,
                `All FallingFloor entities should be reset to stable state. Found ${unstableFloors.length} not in 'stable' state`
            );
            console.log('All FallingFloor entities properly reset to stable state');
        }
        
        // Check lives decreased
        const currentLives = await t.page.evaluate(() => {
            const currentState = window.game.stateManager.currentState;
            return currentState?.lives || 0;
        });
        console.log(`Current lives: ${currentLives}`);
        
        t.assert(
            currentLives === initialLives - 1,
            `Lives should decrease by 1. Expected: ${initialLives - 1}, Got: ${currentLives}`
        );
        
        console.log('Death and respawn test completed successfully');
    });
}

if (require.main === module) {
    runTest().catch(err => {
        console.error('Test failed:', err);
        process.exit(1);
    });
}

module.exports = runTest;