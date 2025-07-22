const GameTestHelpers = require('./utils/GameTestHelpers.cjs');

/**
 * Test animation system integration
 */
async function runTest() {
    const helpers = new GameTestHelpers({ timeout: 30000 });
    
    await helpers.runTest(async (t) => {
        await t.init('Animation System Test');
        
        // Use quickStart for simplified initialization
        await t.quickStart('0-1');
        await t.wait(1000);
        
        // Check if player sprite is rendered using new method
        const player = await t.getEntity('player');
        const playerData = player ? {
            x: player.x,
            y: player.y,
            health: player.health
        } : null;
        
        // Get animation state separately
        const animState = await t.page.evaluate(() => {
            const playerEntity = window.game?.stateManager?.currentState?.entityManager?.getPlayer();
            return playerEntity?.animState;
        });
        
        t.assert(playerData !== null, 'Player should exist');
        t.assert(playerData.health > 0, 'Player should be alive');
        
        // Check if animations are loaded
        const animationInfo = await t.page.evaluate(() => {
            const debugInfo = {
                hasAnimationManager: !!window.AnimationManager,
                hasGame: !!window.game,
                hasServiceLocator: !!window.game?.serviceLocator,
                spritesCount: 0,
                animationsCount: 0,
                loaded: false
            };
            
            // Try to get renderer from service locator
            let pixelArtRenderer = null;
            if (window.game?.serviceLocator) {
                const renderer = window.game.serviceLocator.get('renderer');
                if (renderer && renderer.pixelArtRenderer) {
                    pixelArtRenderer = renderer.pixelArtRenderer;
                    debugInfo.spritesCount = pixelArtRenderer.sprites.size;
                    debugInfo.animationsCount = pixelArtRenderer.animations.size;
                    debugInfo.loaded = pixelArtRenderer.sprites.size > 0 || pixelArtRenderer.animations.size > 0;
                }
            }
            
            return debugInfo;
        });
        
        console.log('Animation debug info:', animationInfo);
        const animationsLoaded = animationInfo.loaded;
        
        t.assert(animationsLoaded, 'Animations should be loaded');
        
        // Wait for player to land
        await t.wait(1000);
        
        // Move player and check animation state changes
        await t.pressKey('ArrowRight');
        await t.wait(200);
        
        const walkingState = await t.page.evaluate(() => {
            const player = window.game?.stateManager?.currentState?.entityManager?.getPlayer();
            return {
                animState: player?.animState,
                isSmall: player?.isSmall || false,
                x: player?.x
            };
        });
        
        console.log('Walking state:', walkingState);
        t.assert(walkingState.animState === 'walk' || walkingState.animState === 'idle', 'Player should be walking or idle');
        
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