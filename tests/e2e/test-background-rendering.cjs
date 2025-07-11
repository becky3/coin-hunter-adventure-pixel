const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const TEST_NAME = 'background-rendering';
const SERVER_URL = process.env.TEST_SERVER_URL || 'http://localhost:3000';
const LOG_DIR = path.join(__dirname, '..', 'logs');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

const logFile = path.join(LOG_DIR, `${TEST_NAME}-${Date.now()}.log`);
let browser, page;

function log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    fs.appendFileSync(logFile, logMessage + '\n');
}

async function cleanup() {
    if (page) await page.close();
    if (browser) await browser.close();
}

async function runTest() {
    log(`Starting ${TEST_NAME} test`);
    
    try {
        browser = await puppeteer.launch({
            headless: process.env.CI === 'true' ? 'new' : false,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            devtools: false
        });
        
        page = await browser.newPage();
        
        // Set up console logging
        page.on('console', msg => {
            const text = msg.text();
            if (text.includes('[BackgroundRenderer]') || text.includes('[AssetLoader]') || text.includes('cloud')) {
                log(`Console: ${text}`);
            }
        });
        
        page.on('pageerror', error => {
            log(`Page error: ${error.message}`);
        });
        
        log(`Navigating to ${SERVER_URL}?stage=1`);
        await page.goto(`${SERVER_URL}?stage=1`);
        
        // Wait for game to load
        await page.waitForSelector('canvas', { timeout: 10000 });
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        log('Starting game...');
        await page.keyboard.press('Enter');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check background renderer state
        const backgroundInfo = await page.evaluate(() => {
            const gameCore = window.gameCore;
            if (!gameCore || !gameCore.currentState) return null;
            
            const state = gameCore.currentState;
            if (!state.backgroundRenderer) return null;
            
            const renderer = state.backgroundRenderer;
            const layers = renderer.layers || [];
            
            return {
                layerCount: layers.length,
                layers: layers.map((layer, index) => ({
                    index,
                    elementCount: layer.elements ? layer.elements.length : 0,
                    elements: layer.elements ? layer.elements.slice(0, 3).map(el => ({
                        type: el.type,
                        spriteKey: el.spriteKey,
                        x: el.x,
                        y: el.y
                    })) : []
                }))
            };
        });
        
        if (backgroundInfo) {
            log(`Background layers: ${JSON.stringify(backgroundInfo, null, 2)}`);
            
            // Verify layers exist
            if (backgroundInfo.layerCount === 0) {
                throw new Error('No background layers found');
            }
            log('✓ Background layers loaded successfully');
        } else {
            log('Warning: Could not access background renderer');
        }
        
        // Check loaded assets and palettes
        const assetInfo = await page.evaluate(() => {
            const gameCore = window.gameCore;
            if (!gameCore || !gameCore.assetLoader) return null;
            
            const assetLoader = gameCore.assetLoader;
            const cloudAssets = [];
            
            // Check if cloud sprites are loaded
            ['environment/cloud1', 'environment/cloud2'].forEach(key => {
                if (assetLoader.isLoaded(key)) {
                    cloudAssets.push(key);
                }
            });
            
            // Check renderer for cloud sprites
            const renderer = gameCore.renderer;
            const pixelArtRenderer = renderer ? renderer.pixelArtRenderer : null;
            const cloudSprites = [];
            
            if (pixelArtRenderer && pixelArtRenderer.sprites) {
                ['environment/cloud1', 'environment/cloud2'].forEach(key => {
                    if (pixelArtRenderer.sprites.has(key)) {
                        cloudSprites.push(key);
                    }
                });
            }
            
            return {
                loadedClouds: cloudAssets,
                rendererClouds: cloudSprites
            };
        });
        
        if (assetInfo) {
            log(`Asset info: ${JSON.stringify(assetInfo, null, 2)}`);
            
            if (assetInfo.loadedClouds.length > 0) {
                log(`✓ Cloud sprites loaded: ${assetInfo.loadedClouds.join(', ')}`);
            }
            
            if (assetInfo.rendererClouds.length > 0) {
                log(`✓ Cloud sprites in renderer: ${assetInfo.rendererClouds.join(', ')}`);
            }
        }
        
        // Move camera to test parallax
        log('Testing camera movement...');
        const initialCameraX = await page.evaluate(() => {
            const gameCore = window.gameCore;
            if (!gameCore || !gameCore.cameraController) return 0;
            return gameCore.cameraController.camera.x;
        });
        
        // Move right
        await page.keyboard.down('ArrowRight');
        await new Promise(resolve => setTimeout(resolve, 2000));
        await page.keyboard.up('ArrowRight');
        
        const finalCameraX = await page.evaluate(() => {
            const gameCore = window.gameCore;
            if (!gameCore || !gameCore.cameraController) return 0;
            return gameCore.cameraController.camera.x;
        });
        
        log(`Camera moved from ${initialCameraX} to ${finalCameraX}`);
        
        // Take screenshot for visual verification
        const screenshotPath = path.join(LOG_DIR, `${TEST_NAME}-${Date.now()}.png`);
        await page.screenshot({ path: screenshotPath });
        log(`Screenshot saved to ${screenshotPath}`);
        
        log(`✅ ${TEST_NAME} test passed`);
        return { success: true };
        
    } catch (error) {
        log(`❌ Test failed: ${error.message}`);
        throw error;
    }
}

// Run the test
(async () => {
    try {
        await runTest();
        await cleanup();
        process.exit(0);
    } catch (error) {
        await cleanup();
        process.exit(1);
    }
})();