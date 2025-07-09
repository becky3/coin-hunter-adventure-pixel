const TestFramework = require('./TestFramework.cjs');

class GameTestHelpers extends TestFramework {
    constructor(options = {}) {
        super(options);
    }

    // Game-specific helper methods
    async startNewGame() {
        console.log('Starting new game...');
        
        // PlayState準備完了イベントのリスナーを事前に設定
        await this.page.evaluate(() => {
            window.__playStateReady = false;
            window.addEventListener('playstate:ready', (event) => {
                window.__playStateReady = true;
                console.log('PlayState ready event received:', event.detail);
            });
        });
        
        // Wait for menu state
        await this.waitForState('menu');
        
        // Wait for menu to fully appear (fade in)
        console.log('Waiting for menu to appear...');
        await this.waitForCondition(
            () => {
                const state = window.game?.stateManager?.currentState;
                return state && state.name === 'menu' && state.optionsAlpha >= 1;
            },
            5000,
            'menu fade in'
        );
        
        // Click to focus
        await this.clickAt(100, 100);
        await this.wait(100);

        // Press Space to start, with a delay, like in smoke-test
        console.log('Pressing key: Space (down/up with delay)');
        await this.page.keyboard.down('Space');
        await this.wait(100);
        await this.page.keyboard.up('Space');
        await this.wait(500);  // Wait for state transition
        
        // Wait for play state
        await this.waitForState('play');
        
        // PlayStateの準備完了を待つ
        await this.waitForCondition(
            () => window.__playStateReady === true,
            5000,
            'PlayState ready'
        );
        
        console.log('✅ New game started and ready');
    }

    async pauseGame() {
        console.log('Pausing game...');
        await this.pressKey('Escape');
        await this.wait(500);  // Give more time for pause
        
        const state = await this.page.evaluate(() => {
            const currentState = window.game?.stateManager?.currentState;
            return {
                stateName: currentState?.name,
                isPaused: currentState?.isPaused || false,
                gameState: currentState?.gameState
            };
        });
        
        console.log('State after Escape:', state);
        
        // Some games might change state instead of using isPaused flag
        if (state.isPaused || state.gameState === 'paused' || state.stateName === 'pause') {
            console.log('✅ Game paused');
        } else {
            console.log('⚠️  Pause state unclear, continuing anyway');
        }
    }

    async resumeGame() {
        console.log('Resuming game...');
        await this.pressKey('Escape');
        await this.wait(500);
        
        const state = await this.page.evaluate(() => {
            const currentState = window.game?.stateManager?.currentState;
            return {
                stateName: currentState?.name,
                isPaused: currentState?.isPaused || false,
                gameState: currentState?.gameState
            };
        });
        
        console.log('State after resume:', state);
        
        if (!state.isPaused && state.stateName === 'play') {
            console.log('✅ Game resumed');
        } else {
            console.log('⚠️  Resume state unclear, continuing anyway');
        }
    }

    async movePlayer(direction, duration = 500) {
        const keyMap = {
            'left': 'ArrowLeft',
            'right': 'ArrowRight',
            'up': 'ArrowUp',
            'down': 'ArrowDown'
        };
        
        const key = keyMap[direction.toLowerCase()];
        if (!key) {
            throw new Error(`Invalid direction: ${direction}`);
        }
        
        console.log(`Moving player ${direction} for ${duration}ms`);
        await this.holdKey(key, duration);
    }

    async jumpPlayer() {
        console.log('Player jumping...');
        await this.pressKey('Space');
    }

    async getPlayerPosition() {
        return await this.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            if (!state || state.name !== 'play') return null;
            
            // Try different possible locations for player
            let player = state.player || 
                        state.entityManager?.player || 
                        state.entities?.find(e => e.type === 'player');
            
            if (!player) return null;
            
            // Player uses x, y directly instead of position object
            return {
                x: player.x,
                y: player.y
            };
        });
    }

    async getPlayerStats() {
        return await this.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            if (!state || state.name !== 'play') return null;
            
            // Try different possible locations for player
            let player = state.player || 
                        state.entityManager?.player || 
                        state.entities?.find(e => e.type === 'player');
            
            if (!player) return null;
            
            // Player uses x, y, vx, vy directly
            return {
                position: { x: player.x, y: player.y },
                velocity: { x: player.vx || 0, y: player.vy || 0 },
                health: player.health || 0,
                grounded: player.grounded || false,
                invulnerable: player.invulnerable || false,
                score: player.score || 0
            };
        });
    }

    async waitForPlayerGrounded(timeout = 3000) {
        console.log('Waiting for player to be grounded...');
        await this.waitForCondition(
            () => {
                const state = window.game?.stateManager?.currentState;
                if (!state || state.name !== 'play') return false;
                
                let player = state.player || 
                            state.entityManager?.player || 
                            state.entities?.find(e => e.type === 'player');
                            
                return player && player.grounded;
            },
            timeout,
            'player grounded'
        );
    }

    async waitForPlayerJumping(timeout = 1000) {
        console.log('Waiting for player to jump...');
        await this.waitForCondition(
            () => {
                const state = window.game?.stateManager?.currentState;
                if (!state || state.name !== 'play') return false;
                
                let player = state.player || 
                            state.entityManager?.player || 
                            state.entities?.find(e => e.type === 'player');
                            
                // Player is jumping if not grounded or has upward velocity
                return player && (!player.grounded || player.vy < -1);
            },
            timeout,
            'player jumping'
        );
    }

    async getPlayerJumpState() {
        return await this.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            if (!state || state.name !== 'play') return null;
            
            let player = state.player || 
                        state.entityManager?.player || 
                        state.entities?.find(e => e.type === 'player');
            
            if (!player) return null;
            
            return {
                grounded: player.grounded,
                isJumping: player.isJumping || false,
                velocity_y: player.vy || 0,
                y_position: player.y,
                animState: player.animState || null
            };
        });
    }

    async getEnemies() {
        return await this.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            if (!state) return [];
            
            // Try to get entityManager
            const entityManager = state.getEntityManager?.() || state.entityManager;
            if (!entityManager) return [];
            
            // Get enemies
            const enemies = entityManager.getEnemies?.() || entityManager.enemies || [];
            
            return enemies.map(enemy => ({
                id: enemy.id,
                position: { x: enemy.x, y: enemy.y },
                velocity: { x: enemy.vx || 0, y: enemy.vy || 0 },
                health: enemy.health || 0,
                alive: enemy.health > 0
            }));
        });
    }

    async getCoins() {
        return await this.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            if (!state) return [];
            
            // Check entityManager for coins/items
            const items = state.entityManager?.items || [];
            
            return items
                .filter(item => item.type === 'coin' || item.spriteKey?.includes('coin'))
                .map(coin => ({
                    id: coin.id,
                    position: { x: coin.x, y: coin.y },
                    collected: !coin.active || false
                }));
        });
    }

    async getLevelInfo() {
        return await this.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            if (!state || state.name !== 'play') return null;
            
            const entityCount = (state.entityManager?.enemies?.length || 0) + 
                               (state.entityManager?.items?.length || 0);
            
            const player = state.player || state.entityManager?.player;
            
            return {
                name: state.levelManager?.currentLevel?.name || 'unknown',
                entities: entityCount,
                player: player ? {
                    alive: player.health > 0,
                    position: { x: player.x, y: player.y }
                } : null
            };
        });
    }

    async checkCollision(entity1Type, entity2Type) {
        return await this.page.evaluate((type1, type2) => {
            const state = window.game?.stateManager?.currentState;
            if (!state || !state.entities) return false;
            
            // Simple collision check implementation
            // This would need to match the game's actual collision detection
            return false; // Placeholder
        }, entity1Type, entity2Type);
    }

    async simulateGameplay(duration = 10000) {
        console.log(`Simulating gameplay for ${duration}ms...`);
        
        const actions = [
            () => this.movePlayer('right', 500),
            () => this.jumpPlayer(),
            () => this.movePlayer('left', 300),
            () => this.jumpPlayer(),
            () => this.wait(1000)
        ];
        
        const endTime = Date.now() + duration;
        let actionIndex = 0;
        
        while (Date.now() < endTime) {
            await actions[actionIndex % actions.length]();
            actionIndex++;
            
            // Check for errors periodically
            if (actionIndex % 5 === 0) {
                await this.checkForErrors();
            }
        }
        
        console.log('✅ Gameplay simulation completed');
    }

    async testBasicGameFlow() {
        // Navigate and initialize
        await this.navigateToGame();
        await this.waitForGameInitialization();
        
        // Start game
        await this.startNewGame();
        
        // Verify player exists
        await this.assertPlayerExists();
        
        // Test basic movement
        const startPos = await this.getPlayerPosition();
        await this.movePlayer('right', 1000);
        const endPos = await this.getPlayerPosition();
        
        if (endPos.x <= startPos.x) {
            throw new Error('Player did not move right');
        }
        
        console.log('✅ Basic game flow test passed');
    }

    async monitorPerformance(duration = 10000, actions = null) {
        console.log(`Starting performance monitoring for ${duration}ms...`);
        
        const samples = [];
        const sampleInterval = 1000; // Sample every second
        const endTime = Date.now() + duration;
        
        // If actions provided, run them in parallel
        const actionPromise = actions ? actions() : Promise.resolve();
        
        while (Date.now() < endTime) {
            const metrics = await this.page.metrics();
            const fps = await this.page.evaluate(() => {
                // Try to get FPS from DebugOverlay
                const debugOverlay = window.debugOverlay;
                if (debugOverlay && typeof debugOverlay.getFPS === 'function') {
                    return debugOverlay.getFPS();
                }
                return 0;
            });
            
            samples.push({
                timestamp: Date.now(),
                fps: fps,
                heap: metrics.JSHeapUsedSize,
                documents: metrics.Documents,
                frames: metrics.Frames,
                layoutCount: metrics.LayoutCount
            });
            
            await this.wait(sampleInterval);
        }
        
        await actionPromise;
        
        // Calculate averages
        const avgFps = samples.reduce((sum, s) => sum + s.fps, 0) / samples.length;
        const avgHeap = samples.reduce((sum, s) => sum + s.heap, 0) / samples.length;
        
        const report = {
            duration: duration,
            samples: samples.length,
            averageFps: avgFps.toFixed(2),
            averageHeapMB: (avgHeap / 1024 / 1024).toFixed(2),
            minFps: Math.min(...samples.map(s => s.fps)),
            maxFps: Math.max(...samples.map(s => s.fps)),
            heapGrowth: samples[samples.length - 1].heap - samples[0].heap
        };
        
        console.log('\n📊 Performance Report:');
        console.log(`Average FPS: ${report.averageFps}`);
        console.log(`Average Heap: ${report.averageHeapMB} MB`);
        console.log(`Min/Max FPS: ${report.minFps}/${report.maxFps}`);
        console.log(`Heap Growth: ${(report.heapGrowth / 1024 / 1024).toFixed(2)} MB\n`);
        
        return report;
    }

    // Debug helpers
    async enableDebugMode() {
        await this.page.evaluate(() => {
            if (window.game) {
                window.game.debug = window.game.debug || {};
                window.game.debug.enabled = true;
            }
        });
        console.log('🐛 Debug mode enabled');
    }

    async getDebugInfo() {
        return await this.page.evaluate(() => {
            return window.game?.debug || {};
        });
    }

    async injectErrorTracking() {
        if (!this.page) {
            console.warn('Page not initialized. Call init() first.');
            return;
        }
        await this.page.evaluateOnNewDocument(() => {
            window.__testErrors = [];
            
            window.addEventListener('error', (event) => {
                window.__testErrors.push({
                    type: 'error',
                    message: event.message,
                    filename: event.filename,
                    line: event.lineno,
                    column: event.colno,
                    stack: event.error?.stack
                });
            });
            
            window.addEventListener('unhandledrejection', (event) => {
                window.__testErrors.push({
                    type: 'unhandledRejection',
                    reason: event.reason,
                    promise: event.promise
                });
            });
        });
        console.log('💉 Error tracking injected');
    }

    async injectPlayerEventTracking() {
        await this.page.evaluate(() => {
            window.__testPlayerEvents = [];
            
            // Hook into player creation to add event tracking
            const checkInterval = window.setInterval(() => {
                const state = window.game?.stateManager?.currentState;
                if (state && state.name === 'play') {
                    const player = state.player || state.entityManager?.player;
                    if (player && !player.__testEventsInjected) {
                        player.__testEventsInjected = true;
                        
                        // Override jump method
                        const originalJump = player.jump;
                        if (originalJump) {
                            player.jump = function(...args) {
                                window.__testPlayerEvents.push({
                                    type: 'jump',
                                    time: Date.now(),
                                    position: { x: this.x, y: this.y }
                                });
                                console.log('[Test] Player jumped!');
                                return originalJump.apply(this, args);
                            };
                        }
                        
                        // Override update to track landing
                        const originalUpdate = player.update;
                        if (originalUpdate) {
                            let wasGrounded = player.grounded;
                            player.update = function(...args) {
                                const result = originalUpdate.apply(this, args);
                                
                                // Detect landing
                                if (!wasGrounded && this.grounded) {
                                    window.__testPlayerEvents.push({
                                        type: 'landed',
                                        time: Date.now(),
                                        position: { x: this.x, y: this.y }
                                    });
                                    console.log('[Test] Player landed!');
                                }
                                
                                wasGrounded = this.grounded;
                                return result;
                            };
                        }
                        
                        console.log('[Test] Player event tracking attached');
                        clearInterval(checkInterval);
                    }
                }
            }, 100);
        });
        console.log('🎮 Player event tracking injection started');
        
        // Wait a bit to ensure it's attached
        await this.wait(500);
    }

    async waitForPlayerEvent(eventType, timeout = 5000) {
        console.log(`Waiting for player event: ${eventType}...`);
        
        const startTime = Date.now();
        while (Date.now() - startTime < timeout) {
            const events = await this.page.evaluate(() => window.__testPlayerEvents || []);
            const event = events.find(e => e.type === eventType);
            
            if (event) {
                // Clear the event
                await this.page.evaluate((type) => {
                    window.__testPlayerEvents = window.__testPlayerEvents.filter(e => e.type !== type);
                }, eventType);
                
                console.log(`✅ Player event detected: ${eventType}`);
                return event;
            }
            
            await this.wait(50);
        }
        
        throw new Error(`Timeout waiting for player event: ${eventType}`);
    }

    async clearPlayerEvents() {
        await this.page.evaluate(() => {
            window.__testPlayerEvents = [];
        });
    }
}

module.exports = GameTestHelpers;