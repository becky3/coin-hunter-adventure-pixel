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

    async ensureInputFocus() {
        // Common pattern for ensuring browser input focus
        await this.clickAt(100, 100);
        await this.wait(500);
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

    // ============================================================================
    // 新しい簡易メソッド - テスト作成を簡単にするためのヘルパー
    // ============================================================================

    /**
     * ゲームを指定ステージで開始する統合メソッド
     * これ1つでゲーム開始からプレイヤー操作可能な状態まで持っていけます
     * 
     * @param {string} stageName - ステージ名（例: '1-1', '0-2', 'test-armor-knight'）
     * @param {Object} options - オプション設定
     * @param {boolean} options.skipTitle - タイトル画面をスキップ（デフォルト: true）
     * @param {boolean} options.ensureFocus - 自動的に入力フォーカスを設定（デフォルト: true）
     * @param {boolean} options.injectErrorTracking - エラー追跡を有効化（デフォルト: true）
     * @returns {Promise<void>}
     * 
     * @example
     * // 最もシンプルな使い方
     * await t.quickStart('1-1');
     * 
     * // オプション指定
     * await t.quickStart('test-enemy', { skipTitle: false });
     */
    async quickStart(stageName, options = {}) {
        const config = {
            skipTitle: true,
            ensureFocus: true,
            injectErrorTracking: true,
            ...options
        };

        console.log(`🚀 Quick starting game with stage: ${stageName}`);
        
        // エラー追跡を設定
        if (config.injectErrorTracking) {
            await this.injectErrorTracking();
        }
        
        // URLを構築
        const params = new URLSearchParams();
        params.append('s', stageName);
        if (config.skipTitle) {
            params.append('skip_title', 'true');
        }
        // テストモードを有効化（AudioContext無効化など）
        params.append('test', 'true');
        const url = `http://localhost:3000?${params.toString()}`;
        
        // ゲームに移動
        await this.navigateToGame(url);
        await this.waitForGameInitialization();
        
        if (config.skipTitle) {
            // skip_titleの場合は直接play状態になる
            await this.assertState('play');
            
            if (config.ensureFocus) {
                await this.ensureInputFocus();
            }
        } else {
            // タイトル画面を経由する場合
            await this.startNewGame();
        }
        
        // プレイヤーの存在を確認
        console.log('Checking player existence...');
        const gameState = await this.getGameState();
        console.log('Game state:', JSON.stringify({
            hasState: !!gameState,
            hasPlayer: !!gameState?.player,
            currentState: gameState?.currentState
        }));
        
        await this.assertPlayerExists();
        
        console.log(`✅ Game ready! You can now control the player.`);
    }

    /**
     * 任意のエンティティを取得する汎用メソッド
     * 
     * @param {string} type - エンティティタイプ
     *   - 'player' - プレイヤーを取得
     *   - 'enemies' - 全ての敵を配列で取得
     *   - 'items' - 全てのアイテムを配列で取得
     *   - クラス名（例: 'ArmorKnight', 'Slime', 'ShieldStone'） - 特定のクラスのエンティティを取得
     * @param {Object} options - 追加オプション
     * @param {boolean} options.single - 配列でなく単一のエンティティを返す（デフォルト: false）
     * @returns {Promise<Object|Array|null>} エンティティまたはエンティティの配列
     * 
     * @example
     * // プレイヤーを取得
     * const player = await t.getEntity('player');
     * 
     * // 全ての敵を取得
     * const enemies = await t.getEntity('enemies');
     * 
     * // 特定の敵を取得
     * const armorKnight = await t.getEntity('ArmorKnight', { single: true });
     * 
     * // 全てのコインを取得
     * const coins = await t.getEntity('Coin');
     */
    async getEntity(type, options = {}) {
        const config = {
            single: false,
            ...options
        };

        return await this.page.evaluate((entityType, opt) => {
            const state = window.game?.stateManager?.currentState;
            if (!state) return null;
            
            const entityManager = state.entityManager || state.getEntityManager?.();
            if (!entityManager) return null;
            
            // プレイヤーの特別処理
            if (entityType === 'player') {
                const player = state.player || entityManager.player || entityManager.getPlayer?.();
                if (!player) return null;
                
                return {
                    x: player.x,
                    y: player.y,
                    vx: player.vx || 0,
                    vy: player.vy || 0,
                    width: player.width,
                    height: player.height,
                    health: player.health,
                    isSmall: player.isSmall,
                    grounded: player.grounded,
                    invulnerable: player.invulnerable || false,
                    score: player.score || 0
                };
            }
            
            // 全ての敵を取得
            if (entityType === 'enemies') {
                const enemies = entityManager.enemies || entityManager.getEnemies?.() || [];
                return enemies.map(enemy => ({
                    type: enemy.constructor.name,
                    x: enemy.x,
                    y: enemy.y,
                    vx: enemy.vx || 0,
                    vy: enemy.vy || 0,
                    width: enemy.width,
                    height: enemy.height,
                    health: enemy.health || 0,
                    alive: enemy.health > 0
                }));
            }
            
            // 全てのアイテムを取得
            if (entityType === 'items') {
                const items = entityManager.items || entityManager.getItems?.() || [];
                return items.map(item => ({
                    type: item.constructor.name,
                    x: item.x,
                    y: item.y,
                    width: item.width,
                    height: item.height,
                    active: item.active !== false,
                    collected: !item.active
                }));
            }
            
            // 特定のクラスのエンティティを取得
            const allEntities = [
                ...(entityManager.enemies || []),
                ...(entityManager.items || [])
            ];
            
            const filtered = allEntities.filter(e => e.constructor.name === entityType);
            
            if (opt.single) {
                const entity = filtered[0];
                if (!entity) return null;
                
                return {
                    type: entity.constructor.name,
                    x: entity.x,
                    y: entity.y,
                    vx: entity.vx || 0,
                    vy: entity.vy || 0,
                    width: entity.width,
                    height: entity.height,
                    health: entity.health,
                    active: entity.active !== false
                };
            }
            
            return filtered.map(entity => ({
                type: entity.constructor.name,
                x: entity.x,
                y: entity.y,
                vx: entity.vx || 0,
                vy: entity.vy || 0,
                width: entity.width,
                height: entity.height,
                health: entity.health,
                active: entity.active !== false
            }));
        }, type, config);
    }

    /**
     * 特定のエンティティがスポーンされるまで待機
     * 
     * @param {string} entityType - エンティティタイプ（クラス名）
     * @param {number} timeout - タイムアウト時間（ミリ秒）
     * @returns {Promise<Object>} スポーンされたエンティティ
     * 
     * @example
     * // 敵の生成を待つ
     * await t.waitForEntity('Slime');
     * 
     * // 5秒待つ
     * await t.waitForEntity('ArmorKnight', 5000);
     */
    async waitForEntity(entityType, timeout = 5000) {
        console.log(`⏳ Waiting for ${entityType} to spawn...`);
        
        const startTime = Date.now();
        let entity = null;
        
        while (Date.now() - startTime < timeout) {
            entity = await this.getEntity(entityType, { single: true });
            if (entity) {
                console.log(`✅ ${entityType} spawned at (${entity.x}, ${entity.y})`);
                return entity;
            }
            await this.wait(100); // 100ms待機
        }
        
        throw new Error(`Timeout waiting for ${entityType} to spawn`);
    }

    /**
     * プレイヤーを特定の座標に移動（テレポート）
     * デバッグやテスト準備に便利
     * 
     * @param {number} x - X座標
     * @param {number} y - Y座標
     * @returns {Promise<void>}
     * 
     * @example
     * // プレイヤーを敵の近くに配置
     * await t.teleportPlayer(200, 100);
     */
    async teleportPlayer(x, y) {
        await this.page.evaluate((posX, posY) => {
            const state = window.game?.stateManager?.currentState;
            const player = state?.player || state?.entityManager?.player;
            if (player) {
                player.x = posX;
                player.y = posY;
                player.vx = 0;
                player.vy = 0;
            }
        }, x, y);
        
        console.log(`📍 Player teleported to (${x}, ${y})`);
    }

    /**
     * ゲーム内のライフ数を取得
     * 
     * @returns {Promise<number>} 現在のライフ数
     * 
     * @example
     * const lives = await t.getLives();
     * console.log(`Remaining lives: ${lives}`);
     */
    async getLives() {
        return await this.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            return state?.lives || 0;
        });
    }

    /**
     * 現在のステージ情報を取得
     * 
     * @returns {Promise<Object>} ステージ情報
     * 
     * @example
     * const stage = await t.getStageInfo();
     * console.log(`Current stage: ${stage.name}`);
     */
    async getStageInfo() {
        return await this.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const levelManager = state?.levelManager || state?.getLevelManager?.();
            const levelData = levelManager?.levelData || {};
            
            return {
                name: levelData.name || 'unknown',
                width: levelData.width || 0,
                height: levelData.height || 0,
                tileSize: levelData.tileSize || 16,
                entityCount: levelData.entities?.length || 0
            };
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