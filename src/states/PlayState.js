/**
 * プレイ状態クラス - メインゲームプレイの管理
 */
import { GAME_RESOLUTION, TILE_SIZE } from '../constants/gameConstants.js';

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
        this.currentLevel = null;
        this.levelData = null;
        this.tileMap = [];
        
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
    enter(params = {}) {
        console.log('Entering PlayState', params);
        
        // レベルの読み込み
        this.currentLevel = params.level || 'level1';
        this.loadLevel(this.currentLevel);
        
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
        
        // 入力処理とプレイヤーの更新
        if (this.player) {
            // 左右移動
            this.player.vx = 0;
            if (this.game.inputSystem.isActionPressed('left')) {
                this.player.vx = -2;
            }
            if (this.game.inputSystem.isActionPressed('right')) {
                this.player.vx = 2;
            }
            
            // ジャンプ
            if (this.game.inputSystem.isActionJustPressed('jump') && this.player.grounded) {
                this.player.vy = -10;
                this.player.grounded = false;
                if (this.game.musicSystem) {
                    this.game.musicSystem.playJumpSound();
                }
            }
            
            // 物理演算
            this.player.vy += 0.5; // 重力
            if (this.player.vy > 15) this.player.vy = 15; // 最大落下速度
            
            // 位置更新
            this.player.x += this.player.vx;
            this.player.y += this.player.vy;
            
            // 簡易的な地面判定（タイルマップベース）
            const tileY = Math.floor((this.player.y + this.player.height) / TILE_SIZE);
            const tileX = Math.floor(this.player.x / TILE_SIZE);
            const tileXRight = Math.floor((this.player.x + this.player.width - 1) / TILE_SIZE);
            
            if (tileY >= 0 && tileY < this.tileMap.length) {
                if ((this.tileMap[tileY] && this.tileMap[tileY][tileX] === 1) ||
                    (this.tileMap[tileY] && this.tileMap[tileY][tileXRight] === 1)) {
                    // 地面に着地
                    this.player.y = (tileY * TILE_SIZE) - this.player.height;
                    this.player.vy = 0;
                    this.player.grounded = true;
                }
            }
            
            // レベル境界チェック
            if (this.player.x < 0) this.player.x = 0;
            if (this.player.x + this.player.width > this.levelWidth) {
                this.player.x = this.levelWidth - this.player.width;
            }
            if (this.player.y > this.levelHeight) {
                // 落下死
                this.player.y = 160; // リスポーン
                this.player.x = 64;
                this.lives--;
            }
        }
        
        // エネミーの更新
        this.enemies.forEach(enemy => enemy.update && enemy.update(deltaTime));
        
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
        renderer.clear('#5C94FC'); // 空の色
        
        // カメラ変換の保存
        renderer.ctx.save();
        
        // カメラのオフセットを適用
        renderer.ctx.translate(-Math.floor(this.camera.x), -Math.floor(this.camera.y));
        
        // タイルマップの描画
        this.renderTileMap(renderer);
        
        // エンティティの描画
        this.items.forEach(item => item.render && item.render(renderer));
        this.enemies.forEach(enemy => enemy.render && enemy.render(renderer));
        
        // プレイヤーの描画
        if (this.player) {
            renderer.ctx.fillStyle = '#FF0000';
            renderer.ctx.fillRect(
                Math.floor(this.player.x),
                Math.floor(this.player.y),
                this.player.width,
                this.player.height
            );
        }
        
        // カメラ変換を戻す
        renderer.ctx.restore();
        
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
    loadLevel(levelName) {
        console.log(`Loading level: ${levelName}`);
        
        // テスト用のダミーデータを使用
        this.createTestLevel();
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
    }
    
    /**
     * プレイヤーの初期化
     */
    initializePlayer() {
        this.player = {
            x: 64,
            y: 160,
            width: 16,
            height: 16,
            vx: 0,
            vy: 0,
            grounded: false
        };
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
                    renderer.ctx.fillStyle = '#228B22';
                    renderer.ctx.fillRect(
                        col * TILE_SIZE,
                        row * TILE_SIZE,
                        TILE_SIZE,
                        TILE_SIZE
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
        renderer.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        renderer.ctx.fillRect(0, 0, GAME_RESOLUTION.WIDTH, 24);
        
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
        renderer.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        renderer.ctx.fillRect(0, 0, GAME_RESOLUTION.WIDTH, GAME_RESOLUTION.HEIGHT);
        
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