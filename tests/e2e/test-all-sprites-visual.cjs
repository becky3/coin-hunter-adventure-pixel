const GameTestHelpers = require('./utils/GameTestHelpers.cjs');

/**
 * Visual test for all sprites and animations
 * Tests that all entities render correctly without errors
 */
async function runTest() {
    const helpers = new GameTestHelpers({ timeout: 60000 });
    
    await helpers.runTest(async (t) => {
        await t.init('All Sprites Visual Test');
        
        // Use quickStart for simplified initialization
        await t.quickStart('test-all-sprites');
        
        // Wait for all sprites to be loaded and rendered
        await t.wait(2000);
        
        // Take a screenshot for visual inspection
        await t.screenshot('all-sprites-initial');
        
        // Check that all expected entities are present
        const entityData = await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const manager = state?.entityManager;
            if (!manager) return null;
            
            return {
                player: manager.getPlayer() ? {
                    x: manager.getPlayer().x,
                    y: manager.getPlayer().y,
                    state: manager.getPlayer().animState
                } : null,
                enemies: manager.getEnemies().map(enemy => ({
                    type: enemy.constructor.name,
                    x: enemy.x,
                    y: enemy.y,
                    state: enemy.animState,
                    active: enemy.active
                })),
                items: manager.getItems().map(item => ({
                    type: item.constructor.name,
                    x: item.x,
                    y: item.y,
                    visible: item.visible !== undefined ? item.visible : true
                }))
            };
        });
        
        t.assert(entityData !== null, 'Entity data should be available');
        t.assert(entityData.player !== null, 'Player should exist');
        
        // Verify all enemy types are present
        const enemyTypes = entityData.enemies.map(e => e.type);
        t.assert(enemyTypes.includes('Slime'), 'Slime should be present');
        t.assert(enemyTypes.includes('Spider'), 'Spider should be present');
        t.assert(enemyTypes.includes('Bat'), 'Bat should be present');
        t.assert(enemyTypes.includes('ArmorKnight'), 'ArmorKnight should be present');
        
        console.log(`Found ${entityData.enemies.length} enemies`);
        console.log(`Found ${entityData.items.length} items`);
        
        // Test player movement to trigger animations
        await t.movePlayer('right', 500);
        await t.wait(100);
        await t.screenshot('all-sprites-player-walking');
        
        // Test jumping
        await t.jumpPlayer();
        await t.wait(200);
        await t.screenshot('all-sprites-player-jumping');
        
        await t.wait(500);
        
        // Final screenshot with all elements
        await t.screenshot('all-sprites-final');
        
        console.log('Visual test completed. Check screenshots for visual verification.');
    });
}

if (require.main === module) {
    runTest().catch(error => {
        console.error('Test failed:', error);
        process.exit(1);
    });
}

module.exports = runTest;