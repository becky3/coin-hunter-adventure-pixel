const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const TIMEOUT = 30000;
const BASE_URL = 'http://localhost:3000';

// Test utilities
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function captureConsoleErrors(page) {
    const errors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') {
            errors.push(msg.text());
        }
    });
    return errors;
}

// Background movement test
async function testBackgroundMovement() {
    console.log('\n=== Background Movement Test ===');
    const browser = await puppeteer.launch({ 
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 800, height: 600 });
        
        const errors = await captureConsoleErrors(page);
        
        // Navigate to game
        console.log('Navigating to game...');
        await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: TIMEOUT });
        
        // Start the game
        console.log('Starting game...');
        await page.click('#startButton');
        await sleep(2000);
        
        // Skip intro if present
        await page.keyboard.press('Space');
        await sleep(500);
        
        // Wait for game to be ready
        await page.waitForFunction(() => {
            return window.gameInstance?.stateManager?.currentState?.entityManager?.getPlayer();
        }, { timeout: TIMEOUT });
        
        console.log('Game started successfully');
        
        // Get initial positions
        const initialState = await page.evaluate(() => {
            const game = window.gameInstance;
            const player = game.stateManager.currentState.entityManager.getPlayer();
            const camera = game.stateManager.currentState.cameraController.getCamera();
            const renderer = game.renderer;
            
            // Get background element positions on screen
            const backgroundElements = [];
            const bgRenderer = game.stateManager.currentState.backgroundRenderer;
            if (bgRenderer && bgRenderer.layers) {
                for (const layer of bgRenderer.layers) {
                    for (const element of layer.elements) {
                        // Calculate where the element should appear on screen
                        const screenX = (element.x - camera.x) * renderer.scale;
                        backgroundElements.push({
                            worldX: element.x,
                            screenX: screenX,
                            type: element.type
                        });
                    }
                }
            }
            
            return {
                playerX: player.x,
                cameraX: camera.x,
                backgroundElements: backgroundElements.slice(0, 5) // First 5 elements
            };
        });
        
        console.log('Initial state:', {
            playerX: initialState.playerX,
            cameraX: initialState.cameraX,
            firstBgElement: initialState.backgroundElements[0]
        });
        
        // Move player right
        console.log('Moving player right...');
        await page.keyboard.down('ArrowRight');
        await sleep(2000);
        await page.keyboard.up('ArrowRight');
        
        // Get state after movement
        const afterMoveState = await page.evaluate(() => {
            const game = window.gameInstance;
            const player = game.stateManager.currentState.entityManager.getPlayer();
            const camera = game.stateManager.currentState.cameraController.getCamera();
            const renderer = game.renderer;
            
            // Get background element positions on screen
            const backgroundElements = [];
            const bgRenderer = game.stateManager.currentState.backgroundRenderer;
            if (bgRenderer && bgRenderer.layers) {
                for (const layer of bgRenderer.layers) {
                    for (const element of layer.elements) {
                        // Calculate where the element should appear on screen
                        const screenX = (element.x - camera.x) * renderer.scale;
                        backgroundElements.push({
                            worldX: element.x,
                            screenX: screenX,
                            type: element.type
                        });
                    }
                }
            }
            
            return {
                playerX: player.x,
                cameraX: camera.x,
                backgroundElements: backgroundElements.slice(0, 5) // First 5 elements
            };
        });
        
        console.log('After move state:', {
            playerX: afterMoveState.playerX,
            cameraX: afterMoveState.cameraX,
            firstBgElement: afterMoveState.backgroundElements[0]
        });
        
        // Verify movement
        const playerMoved = afterMoveState.playerX > initialState.playerX;
        const cameraMoved = afterMoveState.cameraX > initialState.cameraX;
        
        console.log('Player moved right:', playerMoved);
        console.log('Camera moved right:', cameraMoved);
        console.log('Player movement:', afterMoveState.playerX - initialState.playerX);
        console.log('Camera movement:', afterMoveState.cameraX - initialState.cameraX);
        
        // Check background movement
        const bgMovement = afterMoveState.backgroundElements[0].screenX - initialState.backgroundElements[0].screenX;
        console.log('Background screen movement:', bgMovement);
        
        // Background should move left (negative) when player moves right
        const backgroundMovedCorrectly = bgMovement < 0;
        console.log('Background moved correctly (left when player moves right):', backgroundMovedCorrectly);
        
        // Check if any console errors occurred
        if (errors.length > 0) {
            console.log('Console errors detected:', errors);
        }
        
        // Test results
        if (!playerMoved) {
            throw new Error('Player did not move right');
        }
        if (!cameraMoved) {
            throw new Error('Camera did not follow player');
        }
        if (!backgroundMovedCorrectly) {
            throw new Error(`Background moved incorrectly. Expected negative movement, got ${bgMovement}`);
        }
        
        console.log('✓ Background movement test PASSED');
        return true;
        
    } catch (error) {
        console.error('✗ Background movement test FAILED:', error.message);
        
        // Save screenshot on failure
        const screenshotDir = path.join(__dirname, '../logs');
        if (!fs.existsSync(screenshotDir)) {
            fs.mkdirSync(screenshotDir, { recursive: true });
        }
        const screenshotPath = path.join(screenshotDir, `background-movement-failure-${Date.now()}.png`);
        await page.screenshot({ path: screenshotPath });
        console.log(`Screenshot saved to: ${screenshotPath}`);
        
        throw error;
    } finally {
        await browser.close();
    }
}

// Main test runner
(async () => {
    const startTime = Date.now();
    console.log('Starting background movement test...');
    console.log(`Timestamp: ${new Date().toISOString()}`);
    
    try {
        await testBackgroundMovement();
        console.log('\n✓ All background movement tests passed!');
        process.exit(0);
    } catch (error) {
        console.error('\n✗ Background movement test failed:', error);
        process.exit(1);
    } finally {
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`\nTotal test time: ${duration}s`);
    }
})();