/**
 * プレイ状態クラス - メインゲームプレイの管理
 */
import { GAME_RESOLUTION, TILE_SIZE } from '../constants/gameConstants.js';
import { LevelLoader } from '../levels/LevelLoader.js';
import { Player } from '../entities/Player.js';

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
    }
    
    /**
     * 状態開始時の処理
     * @param {Object} params - レベル情報等のパラメータ
     */
    async enter(params = {}) {
        console.log('Entering PlayState', params);
        
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
        
        // プレイヤーの初期化
        this.initializePlayer();
        
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
        this.game.physicsSystem.update();
        
        // プレイヤーの更新（入力処理など）
        if (this.player) {
            this.player.update(deltaTime);
            
            // レベル境界チェック
            if (this.player.x < 0) this.player.x = 0;
            if (this.player.x + this.player.width > this.levelWidth) {
                this.player.x = this.levelWidth - this.player.width;
            }
            
            // 穴に落ちた場合
            if (this.player.y > this.levelHeight) {
                this.player.takeDamage(this.player.maxHealth);
                this.lives = this.player.health;
                
                if (this.lives > 0) {
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
        // 上部のHUD背景
        renderer.drawRect(0, 0, GAME_RESOLUTION.WIDTH, 24, 'rgba(0, 0, 0, 0.5)');
        
        // スコア
        renderer.drawText(`SCORE: ${this.score}`, 8, 8, '#FFFFFF');
        
        // ライフ
        renderer.drawText(`LIVES: ${this.lives}`, 88, 8, '#FFFFFF');
        
        // 時間
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
        // 半透明のオーバーレイ
        renderer.drawRect(0, 0, GAME_RESOLUTION.WIDTH, GAME_RESOLUTION.HEIGHT, 'rgba(0, 0, 0, 0.7)');
        
        // ポーズテキスト
        renderer.drawTextCentered('PAUSED', GAME_RESOLUTION.WIDTH / 2, GAME_RESOLUTION.HEIGHT / 2 - 16, '#FFFFFF');
        renderer.drawTextCentered('PRESS ESC TO RESUME', GAME_RESOLUTION.WIDTH / 2, GAME_RESOLUTION.HEIGHT / 2 + 8, '#FFFFFF');
    }
    
    /**
     * ポーズの切り替え
     */
    togglePause() {
        this.isPaused = !this.isPaused;
        
        if (this.isPaused) {
            if (this.game.musicSystem) {
                this.game.musicSystem.stopBGM();
            }
        } else {
            if (this.game.musicSystem && this.game.musicSystem.isInitialized) {
                this.game.musicSystem.playGameBGM();
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
}