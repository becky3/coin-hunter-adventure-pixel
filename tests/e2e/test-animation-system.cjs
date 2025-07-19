const GameTestHelpers = require('./utils/GameTestHelpers.cjs');

/**
 * Test animation system integration
 */
async function runTest() {
    const helpers = new GameTestHelpers({ timeout: 30000 });
    
    await helpers.runTest(async (t) => {
        await t.init('Animation System Test');
        await t.navigateToGame('http://localhost:3000/?s=0-1&skip_title=true');
        await t.waitForGameInitialization();
        await t.wait(1000);
        
        // Check if player sprite is rendered
        const playerData = await t.page.evaluate(() => {
            const player = window.game?.stateManager?.currentState?.entityManager?.getPlayer();
            if (!player) return null;
            return {
                x: player.x,
                y: player.y,
                state: player.animState,
                health: player.health
            };
        });
        
        t.assert(playerData !== null, 'Player should exist');
        t.assert(playerData.health > 0, 'Player should be alive');
        
        // Check if animations are loaded
        const animationsLoaded = await t.page.evaluate(() => {
            if (!window.game?.renderer?.pixelArtRenderer) return false;
            const renderer = window.game.renderer.pixelArtRenderer;
            return renderer.sprites.size > 0 || renderer.animations.size > 0;
        });
        
        t.assert(animationsLoaded, 'Animations should be loaded');
        
        // Move player and check animation state changes
        await t.pressKey('ArrowRight');
        await t.wait(200);
        
        const walkingState = await t.page.evaluate(() => {
            const player = window.game?.stateManager?.currentState?.entityManager?.getPlayer();
            return player?.animState;
        });
        
        t.assert(walkingState === 'walk', 'Player should be walking');
        
        await t.releaseKey('ArrowRight');
        await t.wait(200);
        
        const idleState = await t.page.evaluate(() => {
            const player = window.game?.stateManager?.currentState?.entityManager?.getPlayer();
            return player?.animState;
        });
        
        t.assert(idleState === 'idle', 'Player should be idle');
        
        // Check enemy animations
        const enemyAnimations = await t.page.evaluate(() => {
            const enemies = window.game?.stateManager?.currentState?.entityManager?.getEnemies() || [];
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

module.exports = runTest;