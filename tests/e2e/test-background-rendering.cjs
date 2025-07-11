const puppeteer = require('puppeteer');
const { createLogger } = require('./test-utils.cjs');

const logger = createLogger('test-background-rendering');

async function runTest() {
    logger.log('Starting background rendering test...');
    
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        
        // Set up console logging
        page.on('console', msg => {
            const text = msg.text();
            if (text.includes('[BackgroundRenderer]') || text.includes('camera')) {
                logger.log(`Browser console: ${text}`);
            }
        });
        
        // Navigate to the game
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
        logger.log('Page loaded');
        
        // Wait for game to initialize
        await page.waitForFunction(() => window.game?.currentState?.name === 'menu', {
            timeout: 10000
        });
        logger.log('Game initialized, in menu state');
        
        // Start game
        await page.keyboard.press('Enter');
        await page.waitForFunction(() => window.game?.currentState?.name === 'play', {
            timeout: 5000
        });
        logger.log('Game started');
        
        // Wait for stage to load
        await page.waitForFunction(() => {
            const state = window.game?.currentState;
            return state?.levelManager?.isLoaded();
        }, { timeout: 5000 });
        
        // Add debug logging to background renderer
        await page.evaluate(() => {
            const state = window.game?.currentState;
            if (state && state.backgroundRenderer) {
                const originalRender = state.backgroundRenderer.render.bind(state.backgroundRenderer);
                let logCount = 0;
                state.backgroundRenderer.render = function(renderer) {
                    const camera = renderer.getCameraPosition();
                    
                    // Log every 60 frames (approximately once per second)
                    if (logCount++ % 60 === 0) {
                        console.log(`[BackgroundRenderer] Camera position: ${camera.x}, ${camera.y}`);
                        
                        // Count visible elements
                        let visibleClouds = 0;
                        let visibleTrees = 0;
                        
                        for (const layer of this.layers) {
                            for (const element of layer.elements) {
                                const screenX = element.x - camera.x;
                                if (screenX > -100 && screenX < 256 + 100) {
                                    if (element.type === 'cloud') visibleClouds++;
                                    if (element.type === 'tree') visibleTrees++;
                                }
                            }
                        }
                        
                        console.log(`[BackgroundRenderer] Visible: ${visibleClouds} clouds, ${visibleTrees} trees`);
                    }
                    
                    originalRender(renderer);
                };
            }
        });
        
        // Test at different player positions
        const testPositions = [0, 100, 200, 372, 500, 1000];
        
        for (const x of testPositions) {
            logger.log(`\nTesting at player X=${x}`);
            
            // Warp player to position
            await page.evaluate((x) => {
                const state = window.game?.currentState;
                const player = state?.entityManager?.getPlayer();
                if (player) {
                    player.x = x;
                    player.y = 200; // Keep Y constant
                    state.cameraController.update(0);
                }
            }, x);
            
            // Wait a moment for rendering
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Get camera and element info
            const info = await page.evaluate(() => {
                const state = window.game?.currentState;
                const renderer = state?.renderer;
                const camera = renderer?.getCameraPosition();
                const player = state?.entityManager?.getPlayer();
                
                // Count all background elements
                let totalClouds = 0;
                let totalTrees = 0;
                let visibleClouds = 0;
                let visibleTrees = 0;
                const cloudPositions = [];
                const treePositions = [];
                
                if (state?.backgroundRenderer?.layers) {
                    for (const layer of state.backgroundRenderer.layers) {
                        for (const element of layer.elements) {
                            if (element.type === 'cloud') {
                                totalClouds++;
                                cloudPositions.push({ x: element.x, y: element.y });
                                const screenX = element.x - camera.x;
                                if (screenX > -100 && screenX < 256 + 100) {
                                    visibleClouds++;
                                }
                            } else if (element.type === 'tree') {
                                totalTrees++;
                                treePositions.push({ x: element.x, y: element.y });
                                const screenX = element.x - camera.x;
                                if (screenX > -100 && screenX < 256 + 100) {
                                    visibleTrees++;
                                }
                            }
                        }
                    }
                }
                
                return {
                    playerX: player?.x,
                    playerY: player?.y,
                    cameraX: camera?.x,
                    cameraY: camera?.y,
                    totalClouds,
                    totalTrees,
                    visibleClouds,
                    visibleTrees,
                    firstCloudX: cloudPositions[0]?.x,
                    firstTreeX: treePositions[0]?.x,
                    firstTreeY: treePositions[0]?.y
                };
            });
            
            logger.log(`Player: (${info.playerX}, ${info.playerY})`);
            logger.log(`Camera: (${info.cameraX}, ${info.cameraY})`);
            logger.log(`Total elements: ${info.totalClouds} clouds, ${info.totalTrees} trees`);
            logger.log(`Visible elements: ${info.visibleClouds} clouds, ${info.visibleTrees} trees`);
            logger.log(`First cloud X: ${info.firstCloudX}, First tree X: ${info.firstTreeX}, Y: ${info.firstTreeY}`);
        }
        
        logger.log('\nBackground rendering test completed successfully!');
        
    } catch (error) {
        logger.error('Test failed:', error);
        throw error;
    } finally {
        await browser.close();
    }
}

// Run the test
runTest().catch(error => {
    logger.error('Test execution failed:', error);
    process.exit(1);
});