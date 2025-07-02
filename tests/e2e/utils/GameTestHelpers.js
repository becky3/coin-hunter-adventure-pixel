const TestFramework = require('./TestFramework');

class GameTestHelpers extends TestFramework {
    constructor(options = {}) {
        super(options);
    }

    // Game-specific helper methods
    async startNewGame() {
        console.log('Starting new game...');
        
        // Wait for menu state
        await this.waitForState('menu');
        
        // Press Enter to start
        await this.pressKey('Enter');
        
        // Wait for play state
        await this.waitForState('play');
        
        console.log('✅ New game started');
    }

    async pauseGame() {
        console.log('Pausing game...');
        await this.pressKey('Escape');
        await this.wait(100);
        
        const isPaused = await this.page.evaluate(() => {
            return window.game?.stateManager?.currentState?.isPaused;
        });
        
        if (isPaused) {
            console.log('✅ Game paused');
        } else {
            throw new Error('Failed to pause game');
        }
    }

    async resumeGame() {
        console.log('Resuming game...');
        await this.pressKey('Escape');
        await this.wait(100);
        
        const isPaused = await this.page.evaluate(() => {
            return window.game?.stateManager?.currentState?.isPaused;
        });
        
        if (!isPaused) {
            console.log('✅ Game resumed');
        } else {
            throw new Error('Failed to resume game');
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
            const player = window.game?.stateManager?.currentState?.player;
            if (!player) return null;
            
            return {
                x: player.position.x,
                y: player.position.y
            };
        });
    }

    async getPlayerStats() {
        return await this.page.evaluate(() => {
            const player = window.game?.stateManager?.currentState?.player;
            if (!player) return null;
            
            return {
                position: { x: player.position.x, y: player.position.y },
                velocity: { x: player.velocity.x, y: player.velocity.y },
                health: player.health,
                grounded: player.grounded,
                invulnerable: player.invulnerable,
                score: player.score || 0
            };
        });
    }

    async waitForPlayerGrounded(timeout = 3000) {
        console.log('Waiting for player to be grounded...');
        await this.waitForCondition(
            () => {
                const player = window.game?.stateManager?.currentState?.player;
                return player && player.grounded;
            },
            timeout,
            'player grounded'
        );
    }

    async getEnemies() {
        return await this.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            if (!state || !state.entities) return [];
            
            return state.entities
                .filter(entity => entity.type === 'enemy')
                .map(enemy => ({
                    id: enemy.id,
                    position: { x: enemy.position.x, y: enemy.position.y },
                    velocity: { x: enemy.velocity.x, y: enemy.velocity.y },
                    health: enemy.health,
                    alive: enemy.alive
                }));
        });
    }

    async getCoins() {
        return await this.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            if (!state || !state.entities) return [];
            
            return state.entities
                .filter(entity => entity.type === 'coin')
                .map(coin => ({
                    id: coin.id,
                    position: { x: coin.position.x, y: coin.position.y },
                    collected: coin.collected || false
                }));
        });
    }

    async getLevelInfo() {
        return await this.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            if (!state || state.name !== 'play') return null;
            
            return {
                name: state.currentLevel?.name || 'unknown',
                entities: state.entities?.length || 0,
                player: state.player ? {
                    alive: state.player.health > 0,
                    position: { x: state.player.position.x, y: state.player.position.y }
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
                return window.game?.debug?.fps || 0;
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
}

module.exports = GameTestHelpers;