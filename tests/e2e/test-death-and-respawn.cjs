const GameTestHelpers = require('./utils/GameTestHelpers.cjs');
const testConfig = require('./utils/testConfig.cjs');

async function runTest() {
    const test = new GameTestHelpers({
        headless: testConfig.headless,
        verbose: true,
        timeout: 30000
    });

    await test.runTest(async (t) => {
        await t.init('Death and Respawn Test');
        
        // Start the game with stage 0-1
        await t.quickStart('0-1');
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
        
        // Simulate player death by triggering handlePlayerDeath
        await t.page.evaluate(() => {
            const currentState = window.game.stateManager.currentState;
            if (currentState && currentState.handlePlayerDeath) {
                currentState.handlePlayerDeath();
            }
        });
        console.log('Triggered player death');
        
        // Wait for intermission state (death screen)
        await t.waitForState('intermission', { timeout: 5000 });
        console.log('Death intermission state active');
        
        // Wait for play state to resume
        await t.waitForState('play', { timeout: 5000 });
        console.log('Game resumed after death');
        
        // Check player respawned at initial position
        const respawnPlayerPos = await t.page.evaluate(() => {
            const currentState = window.game.stateManager.currentState;
            const player = currentState?.getEntityManager()?.getPlayer();
            return player ? { x: player.x, y: player.y } : null;
        });
        console.log(`Respawn player position: ${JSON.stringify(respawnPlayerPos)}`);
        
        // Verify player is at spawn position (with some tolerance)
        t.assert(
            Math.abs(respawnPlayerPos.x - initialPlayerPos.x) <= 1,
            `Player X position should be at spawn. Expected: ${initialPlayerPos.x}, Got: ${respawnPlayerPos.x}`
        );
        t.assert(
            Math.abs(respawnPlayerPos.y - initialPlayerPos.y) <= 1,
            `Player Y position should be at spawn. Expected: ${initialPlayerPos.y}, Got: ${respawnPlayerPos.y}`
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