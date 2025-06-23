/**
 * メインゲームクラス
 */
import { InputManager } from './InputManager.js';
import { GameStateManager } from '../states/GameStateManager.js';
import { AssetLoader } from '../assets/AssetLoader.js';
import { PixelRenderer } from '../rendering/PixelRenderer.js';
import { LevelLoader } from '../levels/LevelLoader.js';
import { Player } from '../entities/Player.js';

export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = false;
        
        this.running = false;
        this.lastTime = 0;
        
        // FPS設定
        this.targetFPS = 60;
        this.frameTime = 1000 / this.targetFPS;
        
        // コアシステムの初期化
        this.inputManager = new InputManager();
        this.stateManager = new GameStateManager();
        this.assetLoader = new AssetLoader();
        this.renderer = new PixelRenderer(canvas);
        this.levelLoader = new LevelLoader();
        
        // デバッグ用
        this.debug = false;
        window.game = this; // デバッグ用にグローバルに公開
        
        // エンティティ（テスト用）
        this.player = null;
    }
    
    async initialize() {
        console.log('Initializing game...');
        
        try {
            // アセットローダーにレンダラーを設定
            this.assetLoader.setRenderer(this.renderer);
            
            // テスト用のアセットを読み込み
            console.log('Loading test assets...');
            await this.loadTestAssets();
            
            // レベルリストを読み込み（エラーが出ても続行）
            console.log('Loading stage list...');
            try {
                await this.levelLoader.loadStageList();
            } catch (error) {
                console.warn('Stage list loading failed, using defaults:', error);
            }
            
            // テスト用のプレイヤーを作成（必ず実行）
            console.log('Creating test player...');
            this.createTestPlayer();
            
            console.log('Game initialized successfully!');
            return true;
        } catch (error) {
            console.error('Game initialization failed:', error);
            return false;
        }
    }
    
    async loadTestAssets() {
        // テスト用に最小限のアセットを読み込み
        try {
            // プレイヤーアイドルスプライトをテスト
            await this.assetLoader.loadSprite('player', 'player_idle');
            console.log('Test sprite loaded successfully');
        } catch (error) {
            console.warn('Could not load test sprite:', error);
        }
    }
    
    createTestPlayer() {
        // テスト用のプレイヤーを作成
        this.player = new Player(100, 300);
        this.player.setInputManager(this.inputManager);
        console.log('Test player created at:', this.player.x, this.player.y);
        console.log('Player size:', this.player.width, 'x', this.player.height);
        
        // 仮の地面を設定（y = 400）
        this.testGroundY = 400;
        
        // デバッグモードを有効にする
        this.renderer.setDebugMode(true);
    }
    
    start() {
        console.log('Starting game...');
        this.running = true;
        this.lastTime = performance.now();
        this.gameLoop();
    }
    
    gameLoop = (currentTime) => {
        if (!this.running) return;
        
        const deltaTime = currentTime - this.lastTime;
        
        if (deltaTime >= this.frameTime) {
            this.update(deltaTime);
            this.render();
            
            this.lastTime = currentTime - (deltaTime % this.frameTime);
        }
        
        requestAnimationFrame(this.gameLoop);
    };
    
    update() {
        // 入力の更新
        this.inputManager.update();
        
        // テスト用ログ - 更新確認
        const input = this.inputManager.getInput();
        if (input.jump) {
            console.log('===== JUMP KEY DETECTED IN GAME.JS =====');
        }
        
        // 状態管理の更新
        this.stateManager.update(this.frameTime);
        
        // プレイヤーの更新（テスト用）
        if (this.player) {
            // 地面との衝突判定（更新前に判定）
            const willCollideGround = this.player.y + this.player.height + this.player.vy >= this.testGroundY;
            
            // プレイヤーを更新（物理演算と入力処理）
            this.player.update(this.frameTime);
            
            // 地面との衝突処理
            if (this.player.y + this.player.height > this.testGroundY) {
                // 地面にめり込んでいる場合
                this.player.y = this.testGroundY - this.player.height;
                
                // 下向きに移動している場合のみ着地処理
                if (this.player.vy > 0) {
                    this.player.vy = 0;
                    this.player.grounded = true;
                    this.player.isJumping = false;
                }
            } else if (Math.abs(this.player.y + this.player.height - this.testGroundY) < 1) {
                // 地面にぴったり接している場合
                this.player.grounded = true;
            } else {
                // 空中にいる場合
                this.player.grounded = false;
            }
            
            // 画面端の制限
            if (this.player.x < 0) {
                this.player.x = 0;
                this.player.vx = 0;
            }
            if (this.player.x > this.canvas.width - this.player.width) {
                this.player.x = this.canvas.width - this.player.width;
                this.player.vx = 0;
            }
        }
    }
    
    render() {
        // レンダラーでクリア
        this.renderer.clear('#5C94FC');
        
        // テスト用の地面を描画
        if (this.testGroundY) {
            this.renderer.drawRect(0, this.testGroundY, this.canvas.width, this.canvas.height - this.testGroundY, '#8B4513');
        }
        
        // プレイヤーを描画
        if (this.player) {
            this.player.render(this.renderer);
        }
        
        // 状態管理の描画
        this.stateManager.render(this.ctx);
        
        // デバッグ情報の表示
        this.renderDebugInfo();
    }
    
    renderDebugInfo() {
        const input = this.inputManager.getInput();
        
        // タイトル
        this.renderer.drawText('Coin Hunter Adventure - Pixel Edition', 20, 20, '#FFFFFF', 20);
        this.renderer.drawText('Core Systems Test - v2.0 HOT RELOAD TEST', 20, 50, '#00FF00', 16);
        
        // システム状態
        this.renderer.drawText('=== Core Systems Status ===', 20, 90, '#FFFFFF', 14);
        this.renderer.drawText('✓ InputManager: Active', 20, 110, '#00FF00', 12);
        this.renderer.drawText('✓ GameStateManager: Active', 20, 130, '#00FF00', 12);
        this.renderer.drawText('✓ AssetLoader: Active', 20, 150, '#00FF00', 12);
        this.renderer.drawText('✓ PixelRenderer: Active', 20, 170, '#00FF00', 12);
        this.renderer.drawText('✓ LevelLoader: Active', 20, 190, '#00FF00', 12);
        this.renderer.drawText('✓ Entity System: Active', 20, 210, '#00FF00', 12);
        this.renderer.drawText(`✓ Player Entity: ${this.player ? 'Active' : 'Not loaded'}`, 20, 230, this.player ? '#00FF00' : '#FF0000', 12);
        
        // 入力状態
        this.renderer.drawText('=== Input State ===', 20, 270, '#FFFFFF', 14);
        this.renderer.drawText(`Left: ${input.left ? 'ON' : 'OFF'}`, 20, 290, input.left ? '#00FF00' : '#FF0000', 12);
        this.renderer.drawText(`Right: ${input.right ? 'ON' : 'OFF'}`, 120, 290, input.right ? '#00FF00' : '#FF0000', 12);
        this.renderer.drawText(`Jump: ${input.jump ? 'ON' : 'OFF'}`, 220, 290, input.jump ? '#00FF00' : '#FF0000', 12);
        this.renderer.drawText(`Action: ${input.action ? 'ON' : 'OFF'}`, 320, 290, input.action ? '#00FF00' : '#FF0000', 12);
        
        // プレイヤー状態
        if (this.player) {
            const playerState = this.player.getState();
            this.renderer.drawText('=== Player State ===', 20, 330, '#FFFFFF', 14);
            this.renderer.drawText(`Pos: (${Math.floor(playerState.x)}, ${Math.floor(playerState.y)})`, 20, 350, '#FFFFFF', 12);
            this.renderer.drawText(`Vel: (${playerState.vx.toFixed(1)}, ${playerState.vy.toFixed(1)})`, 150, 350, '#FFFFFF', 12);
            this.renderer.drawText(`Health: ${playerState.health}/${playerState.maxHealth}`, 280, 350, '#FFFFFF', 12);
            this.renderer.drawText(`State: ${playerState.animState}`, 20, 370, '#FFFFFF', 12);
            this.renderer.drawText(`Grounded: ${playerState.grounded ? 'Yes' : 'No'}`, 150, 370, playerState.grounded ? '#00FF00' : '#FF0000', 12);
            this.renderer.drawText(`Jumping: ${playerState.isJumping ? 'Yes' : 'No'}`, 280, 370, '#FFFFFF', 12);
        }
        
        // デバッグモード
        if (this.debug) {
            this.renderer.drawText('DEBUG MODE ON', 20, 410, '#FF00FF', 16);
            this.renderer.drawText('Press @ to toggle', 20, 430, '#FF00FF', 12);
        }
        
        // 操作説明
        this.renderer.drawText('Controls: Arrow Keys/WASD = Move, Space/Up/W = Jump, Enter/E = Action', 20, 470, '#CCCCCC', 10);
        this.renderer.drawText('Press @ to toggle debug mode', 20, 485, '#CCCCCC', 10);
    }
    
    stop() {
        this.running = false;
    }
}