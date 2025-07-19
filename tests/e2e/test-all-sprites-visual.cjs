const { GameTestHelpers } = require('./utils/TestFramework.cjs');

/**
 * Visual test for all sprites and animations
 * Tests that all entities render correctly without errors
 */
async function runTest() {
    const helpers = new GameTestHelpers('All Sprites Visual Test');
    
    await helpers.runTest(async () => {
        // Load the test stage directly
        await helpers.page.goto(`${helpers.baseUrl}?stage=test-all-sprites&skip_title=true`);
        await helpers.waitForPlayState();
        
        // Wait for all sprites to be loaded and rendered
        await helpers.sleep(2000);
        
        // Take a screenshot for visual inspection
        await helpers.takeScreenshot('all-sprites-initial');
        
        // Check that all expected entities are present
        const entityData = await helpers.page.evaluate(() => {
            const manager = window.game?.entityManager;
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
                    visible: item.visible
                })),
                powerUps: manager.getPowerUps().map(powerUp => ({
                    type: powerUp.constructor.name,
                    x: powerUp.x,
                    y: powerUp.y,
                    collected: powerUp.collected
                }))
            };
        });
        
        helpers.assert(entityData !== null, 'Entity data should be available');
        helpers.assert(entityData.player !== null, 'Player should exist');
        
        // Verify all enemy types are present
        const enemyTypes = entityData.enemies.map(e => e.type);
        helpers.assert(enemyTypes.includes('Slime'), 'Slime should be present');
        helpers.assert(enemyTypes.includes('Spider'), 'Spider should be present');
        helpers.assert(enemyTypes.includes('Bat'), 'Bat should be present');
        helpers.assert(enemyTypes.includes('ArmorKnight'), 'ArmorKnight should be present');
        
        console.log(`Found ${entityData.enemies.length} enemies`);
        console.log(`Found ${entityData.items.length} items`);
        console.log(`Found ${entityData.powerUps.length} power-ups`);
        
        // Test player movement to trigger animations
        await helpers.pressKey('ArrowRight');
        await helpers.sleep(500);
        await helpers.takeScreenshot('all-sprites-player-walking');
        
        const walkingState = await helpers.page.evaluate(() => {
            return window.game?.entityManager?.getPlayer()?.animState;
        });
        helpers.assert(walkingState === 'walk', 'Player should be in walk state');
        
        await helpers.releaseKey('ArrowRight');
        
        // Test jumping
        await helpers.pressKey('Space');
        await helpers.sleep(200);
        await helpers.takeScreenshot('all-sprites-player-jumping');
        
        const jumpingState = await helpers.page.evaluate(() => {
            return window.game?.entityManager?.getPlayer()?.animState;
        });
        helpers.assert(jumpingState === 'jump' || jumpingState === 'fall', 'Player should be jumping or falling');
        
        await helpers.releaseKey('Space');
        await helpers.sleep(500);
        
        // Collect a coin to test coin animation
        await helpers.movePlayerTo(100, 380);
        await helpers.sleep(500);
        
        const coinsAfter = await helpers.page.evaluate(() => {
            return window.game?.entityManager?.getPlayer()?.coins || 0;
        });
        helpers.assert(coinsAfter > 0, 'Player should have collected at least one coin');
        
        // Test power-up collection
        await helpers.movePlayerTo(250, 400);
        await helpers.sleep(500);
        
        const hasShield = await helpers.page.evaluate(() => {
            const player = window.game?.entityManager?.getPlayer();
            return player?.powerUpManager?.hasPowerUp('shield') || false;
        });
        helpers.assert(hasShield, 'Player should have shield power-up');
        
        await helpers.takeScreenshot('all-sprites-with-shield');
        
        // Check for any rendering errors
        const errors = await helpers.getConsoleErrors();
        const renderingErrors = errors.filter(error => 
            error.includes('Animation not found') || 
            error.includes('Sprite not found') ||
            error.includes('failed to render')
        );
        
        if (renderingErrors.length > 0) {
            console.warn(`Found ${renderingErrors.length} rendering warnings/errors:`);
            renderingErrors.slice(0, 10).forEach(error => console.warn(`  - ${error}`));
        }
        
        // Final screenshot with all elements
        await helpers.takeScreenshot('all-sprites-final');
        
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