const { GameTestHelpers } = require('./utils/TestFramework.cjs');

/**
 * Test animation system integration
 */
async function runTest() {
    const helpers = new GameTestHelpers('Animation System Test');
    
    await helpers.runTest(async () => {
        await helpers.startStage(0, 1);
        await helpers.sleep(1000);
        
        // Check if player sprite is rendered
        const playerData = await helpers.page.evaluate(() => {
            const player = window.game?.entityManager?.getPlayer();
            if (!player) return null;
            return {
                x: player.x,
                y: player.y,
                state: player.animState,
                health: player.health
            };
        });
        
        helpers.assert(playerData !== null, 'Player should exist');
        helpers.assert(playerData.health > 0, 'Player should be alive');
        
        // Check if animations are loaded
        const animationsLoaded = await helpers.page.evaluate(() => {
            if (!window.game?.renderer?.pixelArtRenderer) return false;
            const renderer = window.game.renderer.pixelArtRenderer;
            return renderer.sprites.size > 0 || renderer.animations.size > 0;
        });
        
        helpers.assert(animationsLoaded, 'Animations should be loaded');
        
        // Move player and check animation state changes
        await helpers.pressKey('ArrowRight');
        await helpers.sleep(200);
        
        const walkingState = await helpers.page.evaluate(() => {
            const player = window.game?.entityManager?.getPlayer();
            return player?.animState;
        });
        
        helpers.assert(walkingState === 'walk', 'Player should be walking');
        
        await helpers.releaseKey('ArrowRight');
        await helpers.sleep(200);
        
        const idleState = await helpers.page.evaluate(() => {
            const player = window.game?.entityManager?.getPlayer();
            return player?.animState;
        });
        
        helpers.assert(idleState === 'idle', 'Player should be idle');
        
        // Check enemy animations
        const enemyAnimations = await helpers.page.evaluate(() => {
            const enemies = window.game?.entityManager?.getEnemies() || [];
            return enemies.map(enemy => ({
                type: enemy.constructor.name,
                state: enemy.animState,
                x: enemy.x,
                y: enemy.y
            }));
        });
        
        console.log(`Found ${enemyAnimations.length} enemies with animations`);
    });
}

if (require.main === module) {
    runTest().catch(error => {
        console.error('Test failed:', error);
        process.exit(1);
    });
}

module.exports = { runTest };