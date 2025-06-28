/**
 * プレイ状態クラス - メインゲームプレイの管理
 */
import { GAME_RESOLUTION, TILE_SIZE } from '../constants/gameConstants';
import { LevelLoader } from '../levels/LevelLoader.js';
import { Player } from '../entities/Player.js';
import { Slime } from '../entities/enemies/Slime.js';
import { Coin } from '../entities/Coin.js';
import { Spring } from '../entities/Spring.js';
import { GoalFlag } from '../entities/GoalFlag.js';

export class PlayState {
    constructor(game) {
        this.game = game;
        
        // ゲーム状態
        this.score = 0;
        this.lives = 3;
        this.time = 300; // 5分 = 300秒
        this.coinsCollected = 0;
        this.isPaused = false;
        
        // エンティティ
        this.player = null;
        this.enemies = [];
        this.items = [];
        this.platforms = [];
        
        // レベル関連
        this.levelLoader = new LevelLoader();
        this.currentLevel = null;
        this.levelData = null;
        this.tileMap = [];
        this.levelWidth = 0;
        this.levelHeight = 0;
        
        // カメラ
        this.camera = {
            x: 0,
            y: 0,
            width: GAME_RESOLUTION.WIDTH,
            height: GAME_RESOLUTION.HEIGHT
        };
        
        // タイマー関連
        this.lastTimeUpdate = Date.now();
        
        // 入力リスナー
        this.inputListeners = [];
        
        // デバッグ機能をグローバルに公開
        if (typeof window !== 'undefined') {
            window.debugWarp = (x, y) => this.debugWarp(x, y);
        }
    }
    
    /**
     * スプライトの事前読み込み
     */
    async preloadSprites() {
        console.log('Preloading sprites...');
        
        try {
            // terrain sprites
            await this.game.assetLoader.loadSprite('terrain', 'spring');
            await this.game.assetLoader.loadSprite('terrain', 'goal_flag');
            
            // item sprites
            await this.game.assetLoader.loadSprite('items', 'coin_spin1');
            await this.game.assetLoader.loadSprite('items', 'coin_spin2');
            await this.game.assetLoader.loadSprite('items', 'coin_spin3');
            await this.game.assetLoader.loadSprite('items', 'coin_spin4');
            
            console.log('Sprites preloaded successfully');
        } catch (error) {
            console.error('Failed to preload sprites:', error);
        }
    }
    
    /**
     * 状態開始時の処理
     * @param {Object} params - レベル情報等のパラメータ
     */
    async enter(params = {}) {
        console.log('Entering PlayState', params);
        
        // スプライトを事前読み込み
        await this.preloadSprites();
        
        // 物理システムをクリア
        this.game.physicsSystem.entities.clear();
        
        // ステージリストを読み込む
        try {
            await this.levelLoader.loadStageList();
        } catch (error) {
            console.error('Failed to load stage list:', error);
        }
        
        // レベルの読み込み
        this.currentLevel = params.level || 'tutorial';
        await this.loadLevel(this.currentLevel);
        
        // デバッグ情報
        console.log('After loadLevel:');
        console.log('- tileMap:', this.tileMap ? `${this.tileMap.length}x${this.tileMap[0]?.length}` : 'null');
        console.log('- levelWidth:', this.levelWidth);
        console.log('- levelHeight:', this.levelHeight);
        
        // プレイヤーの初期化
        this.initializePlayer();
        
        // 敵の初期化（テスト用）
        this.initializeEnemies();
        
        // アイテムの初期化
        this.initializeItems();
        
        // 入力の設定
        this.setupInputListeners();
        
        // タイマーのリセット
        this.lastTimeUpdate = Date.now();
        
        // BGMの再生
        if (this.game.musicSystem && this.game.musicSystem.isInitialized) {
            this.game.musicSystem.playGameBGM();
        }
    }
    
    /**
     * 状態更新処理
     * @param {number} deltaTime - 前フレームからの経過時間
     */
    update(deltaTime) {
        if (this.isPaused) return;
        
        // タイマーの更新
        this.updateTimer();
        
        // 物理システムの更新（プレイヤーの物理演算と衝突判定を含む）
        this.game.physicsSystem.update(deltaTime);
        
        // プレイヤーの更新（入力処理など）
        if (this.player) {
            this.player.update(deltaTime);
            
            // ライフをプレイヤーのhealthと同期
            this.lives = this.player.health;
            
            // レベル境界チェック
            if (this.player.x < 0) this.player.x = 0;
            if (this.player.x + this.player.width > this.levelWidth) {
                this.player.x = this.levelWidth - this.player.width;
            }
            
            // 穴に落ちた場合
            if (this.player.y > this.levelHeight) {
                this.player.takeDamage(this.player.maxHealth);
                
                if (this.player.health > 0) {
                    this.player.respawn(
                        this.levelData.spawnPoint.x * TILE_SIZE,
                        this.levelData.spawnPoint.y * TILE_SIZE
                    );
                }
            }
        }
        
        // エネミーの更新
        this.enemies.forEach(enemy => {
            if (enemy.update) {
                enemy.update(deltaTime);
            }
        });
        
        // アイテムの更新
        this.items.forEach(item => item.update && item.update(deltaTime));
        
        // コイン収集チェック
        this.checkCoinCollection();
        
        // カメラの更新
        this.updateCamera();
        
        // ゲームオーバー判定
        if (this.time <= 0 || this.lives <= 0) {
            this.gameOver();
        }
    }
    
    /**
     * 描画処理
     * @param {PixelRenderer} renderer - レンダラー
     */
    render(renderer) {
        // 背景色でクリア
        renderer.clear(this.backgroundColor || '#5C94FC'); // レベルの背景色または空の色
        
        // カメラの設定
        renderer.setCamera(this.camera.x, this.camera.y);
        
        // タイルマップの描画
        this.renderTileMap(renderer);
        
        // エンティティの描画
        this.items.forEach(item => item.render && item.render(renderer));
        this.enemies.forEach(enemy => enemy.render && enemy.render(renderer));
        
        // プレイヤーの描画
        if (this.player) {
            this.player.render(renderer);
        }
        
        // カメラをリセット
        renderer.setCamera(0, 0);
        
        // UI（HUD）の描画
        this.renderHUD(renderer);
        
        // ポーズ画面
        if (this.isPaused) {
            this.renderPauseScreen(renderer);
        }
    }
    
    /**
     * 状態終了時の処理
     */
    exit() {
        console.log('Exiting PlayState');
        
        // ポーズ状態をリセット
        this.isPaused = false;
        
        // 入力リスナーの削除
        this.removeInputListeners();
        
        // BGMの停止
        if (this.game.musicSystem) {
            this.game.musicSystem.stopBGM();
        }
        
        // 物理システムのクリア
        if (this.game.physicsSystem) {
            this.game.physicsSystem.entities.clear();
            this.game.physicsSystem.tileMap = null;
        }
        
        // エンティティのクリーンアップ
        this.player = null;
        this.enemies = [];
        this.items = [];
        this.platforms = [];
    }
    
    /**
     * レベルの読み込み
     * @param {string} levelName - レベル名
     */
    async loadLevel(levelName) {
        console.log(`Loading level: ${levelName}`);
        
        try {
            // レベルデータを読み込む
            const levelData = await this.levelLoader.loadStage(levelName);
            this.levelData = levelData;
            
            // タイルマップを設定
            this.tileMap = this.levelLoader.createTileMap(levelData);
            this.levelWidth = levelData.width * levelData.tileSize;
            this.levelHeight = levelData.height * levelData.tileSize;
            
            // 物理システムにタイルマップを設定
            this.game.physicsSystem.setTileMap(this.tileMap, TILE_SIZE);
            
            // 背景色を設定
            this.backgroundColor = this.levelLoader.getBackgroundColor(levelData);
            
            // タイムリミットを設定
            this.time = this.levelLoader.getTimeLimit(levelData);
            
            // プレイヤーの初期位置を設定
            const spawn = this.levelLoader.getPlayerSpawn(levelData);
            if (this.player) {
                this.player.x = spawn.x * TILE_SIZE;
                this.player.y = spawn.y * TILE_SIZE;
            }
            
            // エンティティを生成（後で実装）
            const entities = this.levelLoader.getEntities(levelData);
            console.log(`Level loaded: ${entities.length} entities found`);
            
        } catch (error) {
            console.error('Failed to load level:', error);
            // フォールバックとしてテストレベルを使用
            this.createTestLevel();
        }
    }
    
    /**
     * テスト用レベルの作成
     */
    createTestLevel() {
        // シンプルなタイルマップ（16x15）
        this.tileMap = [
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,1,1,0,0,0,0,0,1,1,1,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
        ];
        
        // レベルサイズ
        this.levelWidth = this.tileMap[0].length * TILE_SIZE;
        this.levelHeight = this.tileMap.length * TILE_SIZE;
        
        // 物理システムにタイルマップを設定
        this.game.physicsSystem.setTileMap(this.tileMap, TILE_SIZE);
    }
    
    /**
     * プレイヤーの初期化
     */
    initializePlayer() {
        // レベルデータからスポーン位置を取得
        let spawnX = 64;
        let spawnY = 160;
        
        if (this.levelData && this.levelData.spawnPoint) {
            spawnX = this.levelData.spawnPoint.x * TILE_SIZE;
            spawnY = this.levelData.spawnPoint.y * TILE_SIZE;
        }
        
        this.player = new Player(spawnX, spawnY);
        this.player.setInputManager(this.game.inputSystem);
        this.player.setMusicSystem(this.game.musicSystem);
        this.player.setAssetLoader(this.game.assetLoader);
        
        // プレイヤーを物理システムに追加
        this.game.physicsSystem.addEntity(this.player, this.game.physicsSystem.layers.PLAYER);
    }
    
    /**
     * 敵の初期化
     */
    initializeEnemies() {
        // 既存の敵をクリア
        this.enemies = [];
        
        // テスト用にスライムを配置
        const slime1 = new Slime(150, 180);
        slime1.direction = -1; // 左向きに設定
        this.enemies.push(slime1);
        this.game.physicsSystem.addEntity(slime1, this.game.physicsSystem.layers.ENEMY);
        
        const slime2 = new Slime(200, 100);
        slime2.direction = -1; // 左向きに設定
        this.enemies.push(slime2);
        this.game.physicsSystem.addEntity(slime2, this.game.physicsSystem.layers.ENEMY);
        
        // スプライトの読み込みはPixelArtRenderer統合後に実装
        // TODO: PixelArtRendererを使用してスプライトを読み込む
    }
    
    /**
     * アイテムの初期化
     */
    initializeItems() {
        // 既存のアイテムをクリア
        this.items = [];
        
        // レベルデータからアイテムを配置
        if (this.levelData && this.levelData.entities) {
            this.levelData.entities.forEach(entity => {
                let item = null;
                
                switch (entity.type) {
                case 'coin':
                    item = new Coin(
                        entity.x * TILE_SIZE,
                        entity.y * TILE_SIZE
                    );
                    break;
                        
                case 'spring':
                    item = new Spring(
                        entity.x * TILE_SIZE,
                        entity.y * TILE_SIZE
                    );
                    // スプリングは物理システムに追加
                    this.game.physicsSystem.addEntity(item, this.game.physicsSystem.layers.ITEM);
                    break;
                        
                case 'goal':
                    item = new GoalFlag(
                        entity.x * TILE_SIZE,
                        entity.y * TILE_SIZE
                    );
                    break;
                }
                
                if (item) {
                    this.items.push(item);
                }
            });
        }
        
        // テスト用にSpringとGoalFlagを追加
        if (!this.levelData || this.items.length === 0) {
            // スプリング（x=5, y=10タイル目）
            const spring = new Spring(5 * TILE_SIZE, 10 * TILE_SIZE);
            this.items.push(spring);
            this.game.physicsSystem.addEntity(spring, this.game.physicsSystem.layers.ITEM);
            
            // ゴールフラグ（x=17, y=12タイル目）
            const goal = new GoalFlag(17 * TILE_SIZE, 12 * TILE_SIZE);
            this.items.push(goal);
        }
    }
    
    /**
     * アイテムの衝突チェック
     */
    checkItemCollisions() {
        if (!this.player) return;
        
        this.items.forEach((item) => {
            // コインの処理
            if (item.constructor.name === 'Coin' && !item.collected) {
                if (item.collidesWith(this.player)) {
                    // コインを収集
                    const scoreGained = item.collect();
                    this.score += scoreGained;
                    this.coinsCollected++;
                    
                    // 効果音を再生
                    if (this.game.musicSystem && this.game.musicSystem.isInitialized) {
                        this.game.musicSystem.playCoinSound();
                    }
                    
                    console.log(`Coin collected! Score: ${this.score}, Total coins: ${this.coinsCollected}`);
                }
            }
            
            // ゴールフラグの処理
            else if (item.constructor.name === 'GoalFlag' && !item.cleared) {
                if (item.collidesWith(this.player)) {
                    // ゴール処理
                    item.clear();
                    
                    // 効果音を再生
                    if (this.game.musicSystem && this.game.musicSystem.isInitialized) {
                        this.game.musicSystem.playGoalSound();
                    }
                    
                    console.log('Stage Clear!');
                    
                    // ステージクリア処理（仮実装）
                    // TODO: リザルト画面への遷移を実装
                    this.stageClear();
                }
            }
        });
        
        // 収集済みのアイテムを配列から削除
        this.items = this.items.filter(item => {
            if (item.constructor.name === 'Coin') {
                return !item.collected;
            }
            return true;
        });
    }
    
    /**
     * コイン収集のチェック（互換性のため残す）
     */
    checkCoinCollection() {
        this.checkItemCollisions();
    }
    
    /**
     * 入力リスナーの設定
     */
    setupInputListeners() {
        // ポーズ
        this.inputListeners.push(
            this.game.inputSystem.on('keyPress', (event) => {
                if (event.action === 'escape') {
                    this.togglePause();
                }
            })
        );
        
        // ポーズ中のQキーでタイトルに戻る
        this.inputListeners.push(
            this.game.inputSystem.on('keyPress', (event) => {
                if (this.isPaused && event.key === 'KeyQ') {
                    this.gameOver();
                }
            })
        );
    }
    
    /**
     * 入力リスナーの削除
     */
    removeInputListeners() {
        this.inputListeners.forEach(removeListener => removeListener());
        this.inputListeners = [];
    }
    
    /**
     * タイマーの更新
     */
    updateTimer() {
        const now = Date.now();
        const elapsed = (now - this.lastTimeUpdate) / 1000;
        
        if (elapsed >= 1) {
            this.time -= 1;
            this.lastTimeUpdate = now;
        }
    }
    
    /**
     * カメラの更新
     */
    updateCamera() {
        if (!this.player) return;
        
        // プレイヤーを中心に追従
        this.camera.x = this.player.x + this.player.width / 2 - this.camera.width / 2;
        this.camera.y = this.player.y + this.player.height / 2 - this.camera.height / 2;
        
        // カメラの範囲制限
        if (this.camera.x < 0) this.camera.x = 0;
        if (this.camera.x + this.camera.width > this.levelWidth) {
            this.camera.x = this.levelWidth - this.camera.width;
        }
        
        if (this.camera.y < 0) this.camera.y = 0;
        if (this.camera.y + this.camera.height > this.levelHeight) {
            this.camera.y = this.levelHeight - this.camera.height;
        }
    }
    
    /**
     * タイルとの衝突判定（PhysicsSystemに移行済み）
     * @deprecated PhysicsSystemを使用してください
     */
    checkTileCollisions() {
        // PhysicsSystemに移行済み
    }
    
    /**
     * タイルマップの描画
     * @param {PixelRenderer} renderer - レンダラー
     */
    renderTileMap(renderer) {
        if (!this.tileMap) {
            console.warn('No tileMap available');
            return;
        }
        
        const startCol = Math.floor(this.camera.x / TILE_SIZE);
        const endCol = Math.ceil((this.camera.x + this.camera.width) / TILE_SIZE);
        const startRow = Math.floor(this.camera.y / TILE_SIZE);
        const endRow = Math.ceil((this.camera.y + this.camera.height) / TILE_SIZE);
        
        for (let row = startRow; row < endRow && row < this.tileMap.length; row++) {
            for (let col = startCol; col < endCol && col < this.tileMap[row].length; col++) {
                const tile = this.tileMap[row][col];
                
                if (tile === 1) {
                    // 地面タイル（緑）
                    renderer.drawRect(
                        col * TILE_SIZE,
                        row * TILE_SIZE,
                        TILE_SIZE,
                        TILE_SIZE,
                        '#228B22'
                    );
                }
            }
        }
    }
    
    /**
     * HUDの描画
     * @param {PixelRenderer} renderer - レンダラー
     */
    renderHUD(renderer) {
        const blackPattern = [
            [1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1]
        ];
        
        for (let y = 0; y < 24; y += 8) {
            for (let x = 0; x < GAME_RESOLUTION.WIDTH; x += 8) {
                this.drawPatternTile(renderer, x, y, blackPattern, '#000000');
            }
        }
        
        this.renderHorizontalBorder(renderer, 24);
        
        // ゲーム情報表示
        renderer.drawText(`SCORE: ${this.score}`, 8, 8, '#FFFFFF');
        renderer.drawText(`LIVES: ${this.lives}`, 88, 8, '#FFFFFF');
        
        const minutes = Math.floor(this.time / 60);
        const seconds = this.time % 60;
        const timeStr = `TIME: ${minutes}:${seconds.toString().padStart(2, '0')}`;
        renderer.drawText(timeStr, 152, 8, '#FFFFFF');
    }
    
    /**
     * ポーズ画面の描画
     * @param {PixelRenderer} renderer - レンダラー
     */
    renderPauseScreen(renderer) {
        // メニューボックス
        const menuWidth = 200;
        const menuHeight = 100;
        const menuX = (GAME_RESOLUTION.WIDTH - menuWidth) / 2;
        const menuY = (GAME_RESOLUTION.HEIGHT - menuHeight) / 2;
        
        const blackPattern = [
            [1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1]
        ];
        
        for (let y = menuY; y < menuY + menuHeight; y += 8) {
            for (let x = menuX; x < menuX + menuWidth; x += 8) {
                this.drawPatternTile(renderer, x, y, blackPattern, '#000000');
            }
        }
        
        this.renderBoxBorder(renderer, menuX - 8, menuY - 8, menuWidth + 16, menuHeight + 16);
        
        // メニューテキスト
        renderer.drawTextCentered('PAUSED', GAME_RESOLUTION.WIDTH / 2, GAME_RESOLUTION.HEIGHT / 2 - 32, '#FFFFFF');
        renderer.drawTextCentered('PRESS ESC TO RESUME', GAME_RESOLUTION.WIDTH / 2, GAME_RESOLUTION.HEIGHT / 2 - 8, '#FFFFFF');
        renderer.drawTextCentered('PRESS Q TO QUIT', GAME_RESOLUTION.WIDTH / 2, GAME_RESOLUTION.HEIGHT / 2 + 16, '#FFFFFF');
    }
    
    /**
     * ポーズの切り替え
     */
    togglePause() {
        this.isPaused = !this.isPaused;
        
        if (this.isPaused) {
            if (this.game.musicSystem) {
                this.game.musicSystem.pauseBGM();
            }
        } else {
            if (this.game.musicSystem && this.game.musicSystem.isInitialized) {
                this.game.musicSystem.resumeBGM();
            }
        }
    }
    
    /**
     * ゲームオーバー処理
     */
    gameOver() {
        console.log('Game Over!');
        // メニューに戻る
        this.game.stateManager.setState('menu');
    }
    
    /**
     * ステージクリア処理
     */
    stageClear() {
        console.log('Stage Clear!');
        // TODO: リザルト画面への遷移を実装
        // 現在は仮実装としてメニューに戻る
        this.game.stateManager.setState('menu');
    }
    
    /**
     * デバッグ用：指定座標にプレイヤーをワープ
     * @param {number} x - X座標（タイル単位またはピクセル単位）
     * @param {number} y - Y座標（タイル単位またはピクセル単位）
     * @param {boolean} tileCoords - trueの場合タイル座標として扱う
     */
    debugWarp(x, y, tileCoords = false) {
        if (!this.player) {
            console.warn('Player not found');
            return;
        }
        
        // タイル座標の場合はピクセル座標に変換
        const pixelX = tileCoords ? x * TILE_SIZE : x;
        const pixelY = tileCoords ? y * TILE_SIZE : y;
        
        // プレイヤーをワープ
        this.player.x = pixelX;
        this.player.y = pixelY;
        this.player.vx = 0;
        this.player.vy = 0;
        this.player.grounded = false;
        
        // カメラも追従
        this.updateCamera();
        
        console.log(`Player warped to (${pixelX}, ${pixelY})`);
    }
    
    /**
     * UIスプライトの読み込み
     */
    async loadUISprites() {
        try {
            if (this.game.assetLoader) {
                await this.game.assetLoader.loadSprite('ui', 'border_horizontal', 1);
                await this.game.assetLoader.loadSprite('ui', 'border_vertical', 1);
                await this.game.assetLoader.loadSprite('ui', 'border_corner', 1);
            }
        } catch (error) {
            console.warn('UI sprites loading error:', error);
        }
    }
    
    /**
     * 水平ボーダーの描画
     * @param {PixelRenderer} renderer - レンダラー
     * @param {number} y - Y座標
     */
    renderHorizontalBorder(renderer, y) {
        const blackPattern = [
            [1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1]
        ];
        
        for (let x = 0; x < GAME_RESOLUTION.WIDTH; x += 8) {
            this.drawPatternTile(renderer, x, y - 2, blackPattern, '#000000');
        }
    }
    
    /**
     * ボックスボーダーの描画
     * @param {PixelRenderer} renderer - レンダラー
     * @param {number} x - X座標
     * @param {number} y - Y座標  
     * @param {number} width - 幅
     * @param {number} height - 高さ
     */
    renderBoxBorder(renderer, x, y, width, height) {
        const blackPattern = [
            [1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1]
        ];
        
        // 上辺
        for (let i = x; i < x + width; i += 8) {
            this.drawPatternTile(renderer, i, y, blackPattern, '#000000');
        }
        
        // 下辺  
        for (let i = x; i < x + width; i += 8) {
            this.drawPatternTile(renderer, i, y + height - 8, blackPattern, '#000000');
        }
        
        // 左辺
        for (let i = y + 8; i < y + height - 8; i += 8) {
            this.drawPatternTile(renderer, x, i, blackPattern, '#000000');
        }
        
        // 右辺
        for (let i = y + 8; i < y + height - 8; i += 8) {
            this.drawPatternTile(renderer, x + width - 8, i, blackPattern, '#000000');
        }
    }
    
    /**
     * パターンタイルの描画
     */
    drawPatternTile(renderer, x, y, pattern, color) {
        const tileSize = 8;
        const imageData = new ImageData(tileSize, tileSize);
        const data = imageData.data;
        
        // カラーコードをRGBに変換
        let r = 255, g = 255, b = 255;
        if (color && color.startsWith('#')) {
            const hex = color.slice(1);
            r = parseInt(hex.substr(0, 2), 16);
            g = parseInt(hex.substr(2, 2), 16);
            b = parseInt(hex.substr(4, 2), 16);
        }
        
        for (let py = 0; py < tileSize; py++) {
            for (let px = 0; px < tileSize; px++) {
                const idx = (py * tileSize + px) * 4;
                if (pattern[py][px] === 1) {
                    data[idx] = r;
                    data[idx + 1] = g;
                    data[idx + 2] = b;
                    data[idx + 3] = 255;
                } else {
                    data[idx + 3] = 0;
                }
            }
        }
        
        renderer.drawSprite(imageData, x, y, 1, false);
    }
    
}