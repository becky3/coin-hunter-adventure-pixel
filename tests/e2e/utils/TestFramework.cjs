const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const { toJSTString, getJSTLogTime } = require('./dateHelper.cjs');

class TestFramework {
    constructor(options = {}) {
        // Require timeout to be explicitly set
        if (!options.timeout) {
            throw new Error('Timeout must be explicitly set for each test. Please specify timeout in milliseconds.');
        }
        
        this.options = {
            headless: options.headless ?? true,
            devtools: options.devtools ?? false,
            screenshotPath: options.screenshotPath ?? 'tests/screenshots',
            timeout: options.timeout,
            logToFile: options.logToFile ?? true,
            logPath: options.logPath ?? 'tests/logs',
            ...options
        };
        
        this.browser = null;
        this.page = null;
        this.testName = '';
        this.startTime = null;
        this.logStream = null;
        this.originalConsoleLog = console.log;
        this.originalConsoleError = console.error;
        this.originalConsoleWarn = console.warn;
        this.isClosing = false;  // 終了処理中フラグ
    }

    async init(testName) {
        this.testName = testName;
        this.startTime = Date.now();
        
        // Setup log file if enabled
        if (this.options.logToFile) {
            this.setupLogFile();
        }
        
        console.log(`\n${'='.repeat(50)}`);
        console.log(`Starting test: ${testName}`);
        console.log(`Time: ${toJSTString()} (JST)`);
        console.log(`${'='.repeat(50)}\n`);

        // Launch browser
        this.browser = await puppeteer.launch({
            headless: this.options.headless,
            devtools: this.options.devtools,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            protocolTimeout: 180000 // 3 minutes timeout for protocol operations
        });

        this.page = await this.browser.newPage();
        
        // Set viewport
        await this.page.setViewport({
            width: 1280,
            height: 720
        });

        // Set page timeout
        this.page.setDefaultTimeout(this.options.timeout);
        console.log(`Test timeout set to: ${this.options.timeout}ms`);

        // Setup console logging
        this.page.on('console', msg => {
            const type = msg.type();
            const text = msg.text();
            
            if (type === 'error') {
                console.error(`[Browser Console ERROR] ${text}`);
            } else if (type === 'warning') {
                console.warn(`[Browser Console WARN] ${text}`);
            } else {
                // Always log for debugging
                console.log(`[Browser Console ${type}] ${text}`);
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

    async safeScreenshot(name) {
        try {
            await Promise.race([
                this.screenshot(name),
                this.wait(2000).then(() => { throw new Error('Screenshot timed out'); })
            ]);
        } catch (screenshotError) {
            console.error(`Failed to take screenshot: ${screenshotError.message}`);
        }
    }

    async waitForGameInitialization(timeout = 10000) {
        console.log('Waiting for game initialization...');
        
        try {
            // Debug: Check if window.game exists
            const gameExists = await this.page.evaluate(() => {
                return typeof window.game !== 'undefined';
            });
            console.log('Game object exists:', gameExists);
            
            if (!gameExists) {
                // Wait a bit and check again
                await this.wait(1000);
            }
            
            // Use the same approach as smoke-test.cjs which is working
            const initialized = await this.page.waitForFunction(
                () => window.game?.gameLoop?.running,
                { timeout }
            ).then(() => true).catch((error) => {
                console.error('waitForFunction error:', error.message);
                return false;
            });
            
            if (!initialized) {
                // Get debug info
                const debugInfo = await this.page.evaluate(() => {
                    return {
                        game: typeof window.game,
                        gameLoop: window.game ? typeof window.game.gameLoop : 'no game',
                        running: window.game?.gameLoop?.running
                    };
                });
                console.log('Debug info:', debugInfo);
                throw new Error('Game initialization failed');
            }
            
            console.log('✅ Game initialized');
            return true;
        } catch (error) {
            console.error('❌ Game initialization timeout');
            await this.safeScreenshot('game-init-timeout');
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
            await this.safeScreenshot(`state-timeout-${stateName}`);
            throw error;
        }
    }

    async getGameState() {
        return await this.page.evaluate(() => {
            const game = window.game;
            if (!game) return null;

            const state = game.stateManager?.currentState;
            let player = null;
            
            // Try different ways to find the player
            if (state) {
                player = state.player || 
                        state.getEntityManager?.()?.getPlayer?.() ||
                        state.entityManager?.getPlayer?.() || 
                        state.entities?.find(e => e.type === 'player');
                
                // Debug logging
                if (!player) {
                    console.log('[TestFramework] Player not found. Debug info:', {
                        stateName: state.name,
                        hasStatePlayer: !!state.player,
                        hasGetEntityManager: !!state.getEntityManager,
                        hasEntityManager: !!state.entityManager,
                        getEntityManagerResult: state.getEntityManager?.(),
                        hasGetPlayer: !!state.entityManager?.getPlayer,
                        getPlayerResult: state.entityManager?.getPlayer?.(),
                        entityManagerPlayer: state.entityManager?.player
                    });
                }
            }

            return {
                running: game.gameLoop?.running,
                currentState: game.stateManager?.currentState?.name,
                states: game.stateManager?.states ? Object.keys(game.stateManager.states) : [],
                player: player ? {
                    position: { x: player.x, y: player.y },
                    velocity: { x: player.vx || 0, y: player.vy || 0 },
                    grounded: player.grounded,
                    health: player.health
                } : null,
                entities: state?.entityManager?.entities?.length || state?.entities?.length || 0
            };
        });
    }

    async pressKey(key, options = {}) {
        console.log(`Pressing key: ${key}`);
        await this.page.keyboard.press(key, options);
    }

    async holdKey(key, duration = 100) {
        if (this.isClosing || !this.page) {
            console.log('Test is closing, skipping holdKey');
            return;
        }
        
        try {
            console.log(`Holding key: ${key} for ${duration}ms`);
            await this.page.keyboard.down(key);
            await this.wait(duration);
            if (!this.isClosing && this.page) {
                await this.page.keyboard.up(key);
            }
        } catch (error) {
            if (error.message.includes('Session closed') || error.message.includes('Target closed')) {
                console.log('Page already closed, ignoring error');
                return;
            }
            throw error;
        }
    }

    async clickAt(x, y) {
        console.log(`Clicking at: (${x}, ${y})`);
        await this.page.mouse.click(x, y);
    }

    async screenshot(name = 'screenshot') {
        const timestamp = toJSTString();
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
        if (this.isClosing) {
            console.log('Test is closing, skipping wait');
            return;
        }
        await new Promise(resolve => setTimeout(resolve, ms));
    }

    async cleanup() {
        this.isClosing = true;  // 終了処理開始
        
        if (this.browser) {
            await this.browser.close();
        }
        
        if (this.startTime) {
            const duration = Date.now() - this.startTime;
            console.log(`\n${'='.repeat(50)}`);
            console.log(`Test completed in: ${(duration / 1000).toFixed(2)}s`);
            console.log(`${'='.repeat(50)}\n`);
        }
        
        // Close log file if enabled
        if (this.logStream) {
            this.cleanupLogFile();
        }
    }
    
    setupLogFile() {
        // Create logs directory if it doesn't exist
        const logsDir = path.resolve(this.options.logPath);
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }
        
        // Generate log filename from test name
        const timestamp = toJSTString();
        const safeTestName = this.testName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
        const logFileName = `${safeTestName}-${timestamp}.log`;
        const logFilePath = path.join(logsDir, logFileName);
        
        // Create write stream
        this.logStream = fs.createWriteStream(logFilePath, { flags: 'a' });
        
        // Override console methods to also write to file
        const self = this;
        console.log = function(...args) {
            const message = args.join(' ');
            self.originalConsoleLog.apply(console, args);
            if (self.logStream) {
                self.logStream.write(`[LOG] ${message}\n`);
            }
        };
        
        console.error = function(...args) {
            const message = args.join(' ');
            self.originalConsoleError.apply(console, args);
            if (self.logStream) {
                self.logStream.write(`[ERROR] ${message}\n`);
            }
        };
        
        console.warn = function(...args) {
            const message = args.join(' ');
            self.originalConsoleWarn.apply(console, args);
            if (self.logStream) {
                self.logStream.write(`[WARN] ${message}\n`);
            }
        };
        
        console.log(`Log file created: ${logFilePath}`);
    }
    
    cleanupLogFile() {
        // Restore original console methods
        console.log = this.originalConsoleLog;
        console.error = this.originalConsoleError;
        console.warn = this.originalConsoleWarn;
        
        // Close stream
        if (this.logStream) {
            this.logStream.end();
            this.logStream = null;
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
                await this.safeScreenshot('test-failure');
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