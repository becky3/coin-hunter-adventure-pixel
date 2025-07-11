const GameTestHelpers = require('./utils/GameTestHelpers.cjs');

async function runTest() {
    const test = new GameTestHelpers({
        headless: false,
        verbose: true,
        timeout: 30000
    });

    await test.runTest(async (t) => {
        // Initialize test
        await t.init('Enemy Sprite Rendering Test');
        
        // Setup error tracking
        await t.injectErrorTracking();
        
        // Collect console logs
        const consoleLogs = [];
        t.page.on('console', msg => {
            const text = `[${msg.type()}] ${msg.text()}`;
            consoleLogs.push({ type: msg.type(), text: msg.text() });
            if (msg.type() === 'error' || msg.text().includes('Sprite not found')) {
                console.log('  🔸', text);
            }
        });
        
        // Navigate to game with stage 1-2 (has slimes)
        await t.navigateToGame('http://localhost:3000?s=1-2');
        await t.waitForGameInitialization();
        
        // Start new game
        await t.startNewGame();
        await t.wait(500);
        
        // Check for slime entities
        console.log('\n--- Checking Slime Entities ---');
        const slimeInfo = await t.page.evaluate(() => {
            const game = window.game;
            if (!game || !game.stateManager || !game.stateManager.currentState) {
                return { error: 'Game state not available' };
            }
            
            const currentState = game.stateManager.currentState;
            if (!currentState.entityManager) {
                return { error: 'EntityManager not available' };
            }
            
            // EntityManager stores enemies in a separate array
            const entityManager = currentState.entityManager;
            const enemies = entityManager.enemies || [];
            const slimes = enemies.filter(e => e && e.constructor && e.constructor.name === 'Slime');
            
            return {
                slimeCount: slimes.length,
                slimes: slimes.map(slime => ({
                    position: { x: slime.x, y: slime.y },
                    sprite: slime.sprite,
                    spriteKey: slime.spriteKey,
                    active: slime.active,
                    visible: slime.visible,
                    width: slime.width,
                    height: slime.height,
                    hasRenderMethod: typeof slime.render === 'function'
                }))
            };
        });
        
        console.log('Slime entities:', JSON.stringify(slimeInfo, null, 2));
        
        // Check sprite loading
        console.log('\n--- Checking Sprite Loading ---');
        const spriteLoadingInfo = await t.page.evaluate(() => {
            const game = window.game;
            const renderer = game.renderer || game.stateManager?.currentState?.renderer;
            
            if (!renderer || !renderer.pixelArtRenderer) {
                return { error: 'Renderer not available' };
            }
            
            // Check if slime sprites are loaded
            const spriteKeys = [
                'enemies/slime',
                'enemies/slime_idle1',
                'enemies/slime_idle2'
            ];
            
            const loadedSprites = {};
            for (const key of spriteKeys) {
                const sprite = renderer.pixelArtRenderer.sprites.get(key);
                loadedSprites[key] = {
                    loaded: !!sprite,
                    width: sprite ? sprite.width : null,
                    height: sprite ? sprite.height : null
                };
            }
            
            // Also check asset loader
            const assetLoaderInfo = {};
            if (renderer.assetLoader) {
                for (const key of spriteKeys) {
                    assetLoaderInfo[key] = renderer.assetLoader.isLoaded(key);
                }
            }
            
            return {
                pixelArtRenderer: loadedSprites,
                assetLoader: assetLoaderInfo,
                totalSpritesInRenderer: renderer.pixelArtRenderer.sprites.size
            };
        });
        
        console.log('Sprite loading info:', JSON.stringify(spriteLoadingInfo, null, 2));
        
        // Move player right to find slimes
        console.log('\n--- Moving to find slimes ---');
        await t.page.keyboard.down('ArrowRight');
        await t.wait(3000);
        await t.page.keyboard.up('ArrowRight');
        
        await t.screenshot('with-slimes-visible');
        
        // Check rendering calls
        console.log('\n--- Checking Rendering ---');
        const renderingCalls = await t.page.evaluate(() => {
            // Inject tracking into drawSprite
            const game = window.game;
            const renderer = game.renderer;
            const calls = [];
            
            if (renderer) {
                const originalDrawSprite = renderer.drawSprite.bind(renderer);
                renderer.drawSprite = function(sprite, x, y, flipX) {
                    if (typeof sprite === 'string' && sprite.includes('slime')) {
                        calls.push({ sprite, x, y });
                    }
                    return originalDrawSprite(sprite, x, y, flipX);
                };
                
                // Wait for next frame
                return new Promise(resolve => {
                    requestAnimationFrame(() => {
                        renderer.drawSprite = originalDrawSprite;
                        resolve(calls);
                    });
                });
            }
            
            return calls;
        });
        
        console.log('Slime render calls:', renderingCalls);
        
        // Check for sprite errors
        console.log('\n--- Checking for Sprite Errors ---');
        const spriteErrors = consoleLogs.filter(log => 
            log.text.includes('Sprite not found') ||
            log.text.includes('slime') ||
            (log.type === 'error' && log.text.includes('sprite'))
        );
        
        if (spriteErrors.length > 0) {
            console.log('❌ Sprite errors found:');
            spriteErrors.forEach(error => {
                console.log(`  ${error.type}: ${error.text}`);
            });
        } else {
            console.log('✅ No sprite errors detected');
        }
        
        // Verify slimes are visible
        if (slimeInfo.slimeCount > 0) {
            console.log(`✅ Found ${slimeInfo.slimeCount} slime(s) in the game`);
        } else {
            throw new Error('No slimes found in the level');
        }
        
        // Verify sprites are loaded
        const allSpritesLoaded = Object.values(spriteLoadingInfo.pixelArtRenderer)
            .some(sprite => sprite.loaded);
        
        if (allSpritesLoaded) {
            console.log('✅ At least one slime sprite is loaded');
        } else {
            throw new Error('No slime sprites are loaded in the renderer');
        }
    });
}

runTest().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});