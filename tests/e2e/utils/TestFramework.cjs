const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

class TestFramework {
    constructor(options = {}) {
        this.options = {
            headless: options.headless ?? true,
            slowMo: options.slowMo ?? 0,
            devtools: options.devtools ?? false,
            screenshotPath: options.screenshotPath ?? 'tests/screenshots',
            timeout: options.timeout ?? 30000,
            ...options
        };
        
        this.browser = null;
        this.page = null;
        this.testName = '';
        this.startTime = null;
    }

    async init(testName) {
        this.testName = testName;
        this.startTime = Date.now();
        
        console.log(`\n${'='.repeat(50)}`);
        console.log(`Starting test: ${testName}`);
        console.log(`Time: ${new Date().toISOString()}`);
        console.log(`${'='.repeat(50)}\n`);

        // Launch browser
        this.browser = await puppeteer.launch({
            headless: this.options.headless,
            slowMo: this.options.slowMo,
            devtools: this.options.devtools,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        this.page = await this.browser.newPage();
        
        // Set viewport
        await this.page.setViewport({
            width: 1280,
            height: 720
        });

        // Set default timeout
        this.page.setDefaultTimeout(this.options.timeout);

        // Setup console logging
        this.page.on('console', msg => {
            const type = msg.type();
            const text = msg.text();
            
            if (type === 'error') {
                console.error(`[Browser Console ERROR] ${text}`);
            } else if (type === 'warning') {
                console.warn(`[Browser Console WARN] ${text}`);
            } else if (this.options.verbose) {
                console.log(`[Browser Console] ${text}`);
            }
        });

        // Setup page error handling
        this.page.on('pageerror', error => {
            console.error(`[Page Error] ${error.message}`);
        });

        return this.page;
    }

    async navigateToGame(url = 'http://localhost:3000') {
        console.log(`Navigating to: ${url}`);
        await this.page.goto(url, { waitUntil: 'load' });
        console.log('✅ Page loaded');
    }

    async waitForGameInitialization(timeout = 10000) {
        console.log('Waiting for game initialization...');
        
        try {
            await this.page.waitForFunction(
                () => {
                    return window.game && 
                           window.game.gameLoop && 
                           window.game.gameLoop.running === true;
                },
                { timeout }
            );
            console.log('✅ Game initialized');
            return true;
        } catch (error) {
            console.error('❌ Game initialization timeout');
            await this.screenshot('game-init-timeout');
            throw error;
        }
    }

    async waitForState(stateName, timeout = 5000) {
        console.log(`Waiting for state: ${stateName}...`);
        
        try {
            await this.page.waitForFunction(
                (expectedState) => {
                    const currentState = window.game?.stateManager?.currentState;
                    return currentState && currentState.name === expectedState;
                },
                { timeout },
                stateName
            );
            console.log(`✅ State changed to: ${stateName}`);
            return true;
        } catch (error) {
            console.error(`❌ State change timeout for: ${stateName}`);
            await this.screenshot(`state-timeout-${stateName}`);
            throw error;
        }
    }

    async getGameState() {
        return await this.page.evaluate(() => {
            const game = window.game;
            if (!game) return null;

            return {
                running: game.gameLoop?.running,
                currentState: game.stateManager?.currentState?.name,
                states: game.stateManager?.states ? Object.keys(game.stateManager.states) : [],
                player: game.stateManager?.currentState?.player ? {
                    position: game.stateManager.currentState.player.position,
                    velocity: game.stateManager.currentState.player.velocity,
                    grounded: game.stateManager.currentState.player.grounded,
                    health: game.stateManager.currentState.player.health
                } : null,
                entities: game.stateManager?.currentState?.entities?.length || 0
            };
        });
    }

    async pressKey(key, options = {}) {
        console.log(`Pressing key: ${key}`);
        await this.page.keyboard.press(key, options);
    }

    async holdKey(key, duration = 100) {
        console.log(`Holding key: ${key} for ${duration}ms`);
        await this.page.keyboard.down(key);
        await this.wait(duration);
        await this.page.keyboard.up(key);
    }

    async clickAt(x, y) {
        console.log(`Clicking at: (${x}, ${y})`);
        await this.page.mouse.click(x, y);
    }

    async screenshot(name = 'screenshot') {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `${this.testName}-${name}-${timestamp}.png`;
        const filepath = path.join(this.options.screenshotPath, filename);
        
        // Ensure directory exists
        const dir = path.dirname(filepath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        await this.page.screenshot({ path: filepath, fullPage: true });
        console.log(`📸 Screenshot saved: ${filename}`);
        return filepath;
    }

    async wait(ms) {
        await new Promise(resolve => setTimeout(resolve, ms));
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
        }
        
        if (this.startTime) {
            const duration = Date.now() - this.startTime;
            console.log(`\n${'='.repeat(50)}`);
            console.log(`Test completed in: ${(duration / 1000).toFixed(2)}s`);
            console.log(`${'='.repeat(50)}\n`);
        }
    }

    async runTest(testFunction) {
        try {
            await testFunction(this);
            console.log('\n✅ TEST PASSED\n');
        } catch (error) {
            console.error('\n❌ TEST FAILED\n');
            console.error(error);
            if (this.page) {
                await this.screenshot('test-failure');
            }
            throw error;
        } finally {
            await this.cleanup();
        }
    }

    // Assertion helpers
    async assertState(expectedState) {
        const state = await this.getGameState();
        if (state.currentState !== expectedState) {
            throw new Error(`Expected state '${expectedState}' but got '${state.currentState}'`);
        }
        console.log(`✅ Assert: Current state is '${expectedState}'`);
    }

    async assertPlayerExists() {
        const state = await this.getGameState();
        if (!state.player) {
            throw new Error('Player entity not found');
        }
        console.log('✅ Assert: Player exists');
    }

    async assertEntityCount(expectedCount) {
        const state = await this.getGameState();
        if (state.entities !== expectedCount) {
            throw new Error(`Expected ${expectedCount} entities but got ${state.entities}`);
        }
        console.log(`✅ Assert: Entity count is ${expectedCount}`);
    }

    // Advanced helpers
    async waitForCondition(conditionFunction, timeout = 5000, description = 'condition') {
        console.log(`Waiting for ${description}...`);
        try {
            await this.page.waitForFunction(conditionFunction, { timeout });
            console.log(`✅ ${description} met`);
        } catch (error) {
            console.error(`❌ Timeout waiting for ${description}`);
            throw error;
        }
    }

    async measurePerformance(duration = 5000) {
        console.log(`Measuring performance for ${duration}ms...`);
        
        const startMetrics = await this.page.metrics();
        const startTime = Date.now();
        
        await this.wait(duration);
        
        const endMetrics = await this.page.metrics();
        const endTime = Date.now();
        
        const fps = await this.page.evaluate(() => {
            if (window.game?.debug?.fps) {
                return window.game.debug.fps;
            }
            return null;
        });
        
        return {
            duration: endTime - startTime,
            fps: fps,
            metrics: {
                JSHeapUsedSize: endMetrics.JSHeapUsedSize - startMetrics.JSHeapUsedSize,
                LayoutCount: endMetrics.LayoutCount - startMetrics.LayoutCount,
                RecalcStyleCount: endMetrics.RecalcStyleCount - startMetrics.RecalcStyleCount
            }
        };
    }

    async checkForErrors() {
        const errors = await this.page.evaluate(() => {
            return window.__testErrors || [];
        });
        
        if (errors.length > 0) {
            console.error('❌ Errors detected:');
            errors.forEach(err => console.error(err));
            throw new Error('Page errors detected');
        }
        
        console.log('✅ No errors detected');
    }
}

module.exports = TestFramework;