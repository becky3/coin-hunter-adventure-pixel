const GameTestHelpers = require('./utils/GameTestHelpers.cjs');

async function runTest() {
    const test = new GameTestHelpers({
        headless: false,  // Set to false to see what's happening
        verbose: true,    // Enable verbose logging
        timeout: 30000
    });

    await test.runTest(async (t) => {
        // Initialize test
        await t.init('Sprite Loading and Rendering Test');
        
        // Setup error tracking to capture console errors
        await t.injectErrorTracking();
        
        // Collect console logs
        const consoleLogs = [];
        t.page.on('console', msg => {
            const text = `${msg.type()}: ${msg.text()}`;
            consoleLogs.push(text);
            if (msg.type() === 'error' || msg.type() === 'warning') {
                console.log('  🔸', text);
            }
        });
        
        // Navigate to game
        await t.navigateToGame();
        await t.waitForGameInitialization();
        
        // Start new game
        await t.startNewGame();
        // await t.screenshot('game-started');
        
        // Check for sprite loading errors in console
        console.log('\n--- Console Logs ---');
        const errorLogs = consoleLogs.filter(log => 
            log.includes('error') || 
            log.includes('Error') || 
            log.includes('Failed') ||
            log.includes('sprite') ||
            log.includes('Sprite')
        );
        
        if (errorLogs.length > 0) {
            console.log('Found error/sprite-related logs:');
            errorLogs.forEach(log => console.log('  ', log));
        }
        
        // Check if sprites are being used
        console.log('\n--- Checking Sprite Rendering ---');
        const spriteInfo = await t.page.evaluate(() => {
            const renderer = window.game?.renderer;
            if (!renderer) return { error: 'No renderer found' };
            
            // Check if AssetLoader exists and has sprites
            const assetLoader = window.game?.assetLoader;
            if (!assetLoader) return { error: 'No AssetLoader found' };
            
            // Get loaded sprites count
            const loadedSprites = assetLoader.sprites ? Object.keys(assetLoader.sprites).length : 0;
            const loadedAnimations = assetLoader.animations ? Object.keys(assetLoader.animations).length : 0;
            
            return {
                loadedSprites,
                loadedAnimations,
                hasPixelArtRenderer: !!renderer.pixelArtRenderer,
                hasAssetLoader: !!renderer.assetLoader
            };
        });
        
        console.log('Sprite info:', spriteInfo);
        
        // Check tile rendering
        console.log('\n--- Checking Tile Rendering ---');
        const tileRenderingInfo = await t.page.evaluate(() => {
            // Try to access PlayState and its renderers
            const currentState = window.game?.stateManager?.currentState;
            if (!currentState || currentState.name !== 'play') {
                return { error: 'Not in play state' };
            }
            
            // Check if tile renderer exists
            const hasTileRenderer = !!currentState.tileRenderer;
            const hasBackgroundRenderer = !!currentState.backgroundRenderer;
            
            // Get tile map info
            const tileMap = currentState.levelManager?.getTileMap();
            const tileMapSize = tileMap ? `${tileMap[0]?.length}x${tileMap.length}` : 'No tilemap';
            
            return {
                hasTileRenderer,
                hasBackgroundRenderer,
                tileMapSize,
                currentLevel: currentState.levelManager?.currentLevel || 'unknown'
            };
        });
        
        console.log('Tile rendering info:', tileRenderingInfo);
        
        // Check canvas pixel data
        console.log('\n--- Checking Canvas Pixels ---');
        const canvasData = await t.page.evaluate(() => {
            const canvas = document.querySelector('canvas');
            if (!canvas) return { error: 'No canvas found' };
            
            const ctx = canvas.getContext('2d');
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            // Count different colored pixels
            const colorCounts = {};
            let nonBackgroundPixels = 0;
            
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i+1];
                const b = data[i+2];
                const a = data[i+3];
                
                if (a === 0) continue; // Skip transparent
                
                // Check if not sky blue (#87CEEB)
                if (r !== 135 || g !== 206 || b !== 235) {
                    nonBackgroundPixels++;
                    
                    // Track unique colors (sample every 100th pixel)
                    if (i % 400 === 0) {
                        const color = `rgb(${r},${g},${b})`;
                        colorCounts[color] = (colorCounts[color] || 0) + 1;
                    }
                }
            }
            
            return {
                width: canvas.width,
                height: canvas.height,
                nonBackgroundPixels,
                totalPixels: data.length / 4,
                uniqueColors: Object.keys(colorCounts).length,
                topColors: Object.entries(colorCounts)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 5)
                    .map(([color, count]) => `${color}: ${count}`)
            };
        });
        
        console.log('Canvas data:', canvasData);
        
        if (canvasData.nonBackgroundPixels < 1000) {
            throw new Error(`Very few non-background pixels rendered: ${canvasData.nonBackgroundPixels}`);
        }
        
        // Take final screenshot
        // await t.screenshot('rendering-test-complete');
        
        // Check for any errors
        await t.checkForErrors();
        
        // Print all console logs at the end
        console.log('\n--- All Console Logs ---');
        consoleLogs.slice(-20).forEach(log => console.log('  ', log));
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