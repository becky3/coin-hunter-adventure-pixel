const GameTestHelpers = require('./utils/GameTestHelpers.cjs');

// Test for bat display and behavior
async function runTest() {
    const test = new GameTestHelpers({
        headless: false,
        verbose: true,
        timeout: 60000
    });

    await test.runTest(async (t) => {
        // Initialize game
        await t.init('Bat Display Test');
        
        // Setup error tracking
        await t.injectErrorTracking();
        
        // Navigate to stage 2-1 with bats
        await t.navigateToGame('http://localhost:3000?s=2-1&skip_title=true');
        await t.waitForGameInitialization();
        
        // Take initial screenshot
        await t.screenshot('bat-test-initialized');
        
        // Ensure we're in play state
        await t.assertState('play');
        
        // Ensure input focus
        await t.ensureInputFocus();
        await t.assertPlayerExists();
        
        // Test 1: Check if bats exist
        console.log('\n--- Test 1: コウモリの存在確認 ---');
        const batInfo = await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const entityManager = state?.entityManager;
            if (!entityManager) return { error: 'No EntityManager' };
            
            const enemies = entityManager.enemies || [];
            const bats = enemies.filter(e => e.constructor.name === 'Bat');
            
            return {
                totalEnemies: enemies.length,
                batCount: bats.length,
                bats: bats.map(bat => ({
                    x: bat.x,
                    y: bat.y,
                    state: bat.batState,
                    spriteKey: bat.spriteKey,
                    active: bat.active,
                    animState: bat.animState,
                    width: bat.width,
                    height: bat.height,
                    hasEventBus: !!bat.eventBus
                }))
            };
        });
        
        console.log('Enemy info:', JSON.stringify(batInfo, null, 2));
        if (batInfo.batCount === 0) {
            throw new Error(`Expected bats to exist, found ${batInfo.batCount}`);
        }
        
        // Test 2: Check sprite loading
        console.log('\n--- Test 2: スプライトの読み込み確認 ---');
        const spriteInfo = await t.page.evaluate(() => {
            const game = window.game;
            if (!game || !game.serviceLocator) {
                return { error: 'Game or service locator not found' };
            }
            
            const assetLoader = game.serviceLocator.get('assetLoader');
            if (!assetLoader || !assetLoader.sprites) {
                return { error: 'AssetLoader not found' };
            }
            
            const batSprites = [];
            const enemySprites = [];
            
            for (const [key, sprite] of assetLoader.sprites.entries()) {
                if (key.includes('enemies/')) {
                    enemySprites.push(key);
                    if (key.includes('bat')) {
                        batSprites.push({
                            key: key,
                            loaded: sprite.loaded,
                            width: sprite.data?.width,
                            height: sprite.data?.height
                        });
                    }
                }
            }
            
            return {
                totalSprites: assetLoader.sprites.size,
                enemySpriteCount: enemySprites.length,
                enemySprites: enemySprites,
                batSprites: batSprites
            };
        });
        
        console.log('Sprite info:', JSON.stringify(spriteInfo, null, 2));
        if (spriteInfo.error) {
            console.warn('Sprite loading check skipped:', spriteInfo.error);
        } else if (spriteInfo.batSprites && spriteInfo.batSprites.length === 0) {
            throw new Error('Bat sprites should be loaded');
        }
        
        // Test 3: Check animations
        console.log('\n--- Test 3: アニメーションの確認 ---');
        const animationInfo = await t.page.evaluate(() => {
            const renderer = window.game?.renderer;
            if (!renderer || !renderer.pixelArtRenderer) {
                return { error: 'PixelArtRenderer not found' };
            }
            
            const animations = renderer.pixelArtRenderer.animations;
            const batAnimations = [];
            const enemyAnimations = [];
            
            for (const [key, value] of animations.entries()) {
                if (key.includes('enemies/')) {
                    enemyAnimations.push(key);
                    if (key.includes('bat')) {
                        batAnimations.push(key);
                    }
                }
            }
            
            // アニメーションが実際に存在するか確認
            const batHang = animations.get('enemies/bat_hang');
            const batFly1 = animations.get('enemies/bat_fly1');
            const batFly2 = animations.get('enemies/bat_fly2');
            
            return {
                totalAnimations: animations.size,
                enemyAnimationCount: enemyAnimations.length,
                enemyAnimations: enemyAnimations,
                batAnimations: batAnimations,
                batHangExists: !!batHang,
                batFly1Exists: !!batFly1,
                batFly2Exists: !!batFly2,
                batHangFrames: batHang ? batHang.frames.length : 0,
                batFly1Frames: batFly1 ? batFly1.frames.length : 0,
                batFly2Frames: batFly2 ? batFly2.frames.length : 0
            };
        });
        
        console.log('Animation info:', JSON.stringify(animationInfo, null, 2));
        if (animationInfo.error) {
            console.warn('Animation check skipped:', animationInfo.error);
        } else if (animationInfo.batAnimations && animationInfo.batAnimations.length === 0) {
            console.warn('No bat animations found');
        }
        
        // Test 4: Move player under a bat
        console.log('\n--- Test 4: プレイヤー検知テスト ---');
        
        // First, get the first bat's position
        const firstBatPos = await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const entityManager = state?.entityManager;
            const firstBat = entityManager?.enemies?.find(e => e.constructor.name === 'Bat');
            
            if (firstBat) {
                return {
                    x: firstBat.x,
                    y: firstBat.y,
                    state: firstBat.batState,
                    detectionRange: firstBat.detectionRange
                };
            }
            return null;
        });
        
        console.log('First bat position:', firstBatPos);
        
        if (firstBatPos) {
            // Teleport player directly under the bat
            await t.page.evaluate((batPos) => {
                const state = window.game?.stateManager?.currentState;
                const player = state?.entityManager?.player;
                
                if (player) {
                    // Place player directly under the bat
                    player.x = batPos.x;
                    player.y = batPos.y + 32; // 2 tiles below
                    player.vx = 0;
                    player.vy = 0;
                    
                    // Force physics update
                    if (window.game.physicsSystem) {
                        window.game.physicsSystem.update(0.016);
                    }
                }
            }, firstBatPos);
            
            // Wait for AI update
            await t.wait(500);
            
            // Force update the game
            await t.page.evaluate(() => {
                const state = window.game?.stateManager?.currentState;
                if (state && state.update) {
                    // Run multiple update cycles
                    for (let i = 0; i < 10; i++) {
                        state.update(0.016);
                    }
                }
            });
            
            // Check bat state after player approach
            const batStateAfter = await t.page.evaluate(() => {
                const state = window.game?.stateManager?.currentState;
                const entityManager = state?.entityManager;
                const bats = entityManager?.enemies?.filter(e => e.constructor.name === 'Bat') || [];
                
                return bats.map(bat => ({
                    x: bat.x,
                    y: bat.y,
                    state: bat.batState,
                    vx: bat.vx,
                    vy: bat.vy,
                    active: bat.active,
                    flyTime: bat.flyTime
                }));
            });
            
            console.log('Bat states after player approach:', JSON.stringify(batStateAfter, null, 2));
            
            const flyingBats = batStateAfter.filter(bat => bat.state === 'flying');
            if (flyingBats.length > 0) {
                console.log(`✓ ${flyingBats.length} bat(s) started flying!`);
            } else {
                console.log('✗ No bats started flying');
            }
            
            // Take screenshot of bat behavior
            await t.screenshot('bat-player-detection');
        }
        
        // Test 5: Check render method
        console.log('\n--- Test 5: レンダリング確認 ---');
        const renderInfo = await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const firstBat = state?.entityManager?.enemies?.find(e => e.constructor.name === 'Bat');
            
            if (firstBat) {
                // renderメソッドを直接呼び出してみる
                const renderer = window.game?.renderer;
                if (renderer && firstBat.render) {
                    try {
                        // バットのレンダリングメソッドが正常に動作するか確認
                        const testCanvas = document.createElement('canvas');
                        testCanvas.width = 256;
                        testCanvas.height = 240;
                        const testCtx = testCanvas.getContext('2d');
                        
                        const testRenderer = {
                            ...renderer,
                            ctx: testCtx,
                            worldToScreen: (x, y) => ({ x: x - 100, y: y - 100 }),
                            scale: 1,
                            pixelArtRenderer: renderer.pixelArtRenderer
                        };
                        
                        firstBat.render(testRenderer);
                        
                        return {
                            renderMethodExists: true,
                            batState: firstBat.batState,
                            animState: firstBat.animState,
                            x: firstBat.x,
                            y: firstBat.y,
                            hasPixelArtRenderer: !!renderer.pixelArtRenderer
                        };
                    } catch (error) {
                        return {
                            renderMethodExists: true,
                            error: error.message
                        };
                    }
                }
            }
            
            return { error: 'Bat or renderer not found' };
        });
        
        console.log('Render info:', JSON.stringify(renderInfo, null, 2));
        
        // Take final screenshot
        await t.screenshot('bat-test-final');
        
        // Check for errors
        await t.checkForErrors();
    });
}

// Run the test
runTest().catch(console.error);