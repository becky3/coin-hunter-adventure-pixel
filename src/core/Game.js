/**
 * メインゲームクラス
 */
import { InputSystem } from './InputSystem.js';
import { GameStateManager } from '../states/GameStateManager.js';
import { AssetLoader } from '../assets/AssetLoader.js';
import { PixelRenderer } from '../rendering/PixelRenderer.js';
import { LevelLoader } from '../levels/LevelLoader.js';
import { Player } from '../entities/Player.js';
import { MusicSystem } from '../audio/MusicSystem.js';
import { MenuState } from '../states/MenuState.js';
import { FPS, GAME_RESOLUTION } from '../constants/gameConstants.js';

export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = false;
        
        this.running = false;
        this.lastTime = 0;
        
        // FPS設定
        this.targetFPS = FPS.TARGET;
        this.frameTime = FPS.FRAME_TIME;
        
        // コアシステムの初期化
        this.inputSystem = new InputSystem();
        this.stateManager = new GameStateManager();
        this.assetLoader = new AssetLoader();
        this.renderer = new PixelRenderer(canvas);
        this.levelLoader = new LevelLoader();
        this.musicSystem = new MusicSystem();
        
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
            
            // 音楽システムの初期化は後で行う（自動再生ポリシー対応）
            console.log('Music system will be initialized on user interaction');
            
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
            
            // クリックイベントで音楽を開始（ブラウザの自動再生ポリシー対応）
            this.setupAudioEvents();
            
            // 状態を登録
            this.registerStates();
            
            // メニュー状態から開始
            this.stateManager.setState('menu');
            
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
        this.player = new Player(50, 150);
        // TODO: Playerクラスを後でInputSystem対応に更新
        // this.player.setInputSystem(this.inputSystem);
        this.player.setMusicSystem(this.musicSystem);
        console.log('Test player created at:', this.player.x, this.player.y);
        console.log('Player size:', this.player.width, 'x', this.player.height);
        
        // 仮の地面を設定（画面の下から40ピクセル上）
        this.testGroundY = GAME_RESOLUTION.HEIGHT - 40;
        
        // デバッグモードを有効にする
        this.renderer.setDebugMode(true);
    }
    
    registerStates() {
        // メニュー状態を登録
        const menuState = new MenuState(this);
        this.stateManager.registerState('menu', menuState);
        
        // TODO: PlayStateを実装後に追加
        // this.stateManager.registerState('play', new PlayState(this));
    }
    
    setupAudioEvents() {
        // 音楽の自動再生制限対策
        let musicStarted = false;
        
        const startMusic = async () => {
            if (musicStarted) return;
            musicStarted = true;
            
            try {
                // 音楽システムが初期化されていない場合は初期化
                if (!this.musicSystem.isInitialized) {
                    console.log('Initializing music system on user interaction...');
                    const initialized = await this.musicSystem.init();
                    if (!initialized) {
                        console.warn('Failed to initialize music system');
                        return;
                    }
                }
                
                // タイトルBGMを再生
                console.log('Starting title BGM...');
                this.musicSystem.playTitleBGM();
            } catch (error) {
                console.error('Error starting music:', error);
            }
        };
        
        // クリックまたはキー入力で音楽を開始（once: trueで自動的にリスナーを削除）
        document.addEventListener('click', startMusic, { once: true });
        document.addEventListener('keydown', startMusic, { once: true });
        
        console.log('Audio events setup complete - waiting for user interaction');
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
        this.inputSystem.update();
        
        // デバッグモードのトグル
        if (this.inputSystem.isActionJustPressed('debug')) {
            this.debug = !this.debug;
            this.renderer.setDebugMode(this.debug);
            console.log('Debug mode:', this.debug ? 'ON' : 'OFF');
        }
        
        // 現在の状態に応じて処理を分岐
        if (this.stateManager.currentStateName === 'menu') {
            // メニュー状態の更新
            this.stateManager.update(this.frameTime);
        } else {
            // ゲームプレイ状態の更新（テスト用）
            this.updateTestMode();
        }
    }
    
    updateTestMode() {
        // テスト用ログ - 更新確認（デバッグモード時のみ）
        if (this.inputSystem.isActionPressed('jump') && this.debug) {
            console.log('===== JUMP KEY DETECTED IN GAME.JS =====');
        }
        
        // 状態管理の更新
        this.stateManager.update(this.frameTime);
        
        // プレイヤーの更新（テスト用）
        if (this.player) {
            // 地面との衝突判定（更新前に判定）
            // const willCollideGround = this.player.y + this.player.height + this.player.vy >= this.testGroundY;
            
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
            if (this.player.x > GAME_RESOLUTION.WIDTH - this.player.width) {
                this.player.x = GAME_RESOLUTION.WIDTH - this.player.width;
                this.player.vx = 0;
            }
        }
    }
    
    render() {
        // 現在の状態に応じて描画を分岐
        if (this.stateManager.currentStateName === 'menu') {
            // メニュー状態の描画
            this.stateManager.render(this.renderer);
        } else {
            // ゲームプレイ状態の描画（テスト用）
            this.renderTestMode();
        }
        
        // デバッグ情報をオーバーレイとして描画
        if (this.debug) {
            this.renderDebugOverlay();
        }
    }
    
    renderTestMode() {
        // レンダラーでクリア
        this.renderer.clear('#5C94FC');
        
        // テスト用の地面を描画
        if (this.testGroundY) {
            this.renderer.drawRect(0, this.testGroundY, GAME_RESOLUTION.WIDTH, GAME_RESOLUTION.HEIGHT - this.testGroundY, '#8B4513');
        }
        
        // プレイヤーを描画
        if (this.player) {
            this.player.render(this.renderer);
        }
        
        // デバッグ情報の表示
        this.renderDebugInfo();
    }
    
    /**
     * デバッグオーバーレイの描画（全画面共通）
     */
    renderDebugOverlay() {
        // 背景（半透明）
        this.renderer.drawRect(5, 5, 100, 75, 'rgba(0, 0, 0, 0.7)');
        
        // デバッグ情報
        this.renderer.drawText('DEBUG MODE', 10, 10, '#00FF00', 6);
        
        // FPS
        const fps = this.frameTime > 0 ? Math.round(1000 / this.frameTime) : 0;
        this.renderer.drawText(`FPS: ${fps}`, 10, 20, '#FFFFFF', 6);
        
        // 現在の状態
        this.renderer.drawText(`State: ${this.stateManager.currentStateName || 'none'}`, 10, 30, '#FFFFFF', 6);
        
        // 入力状態
        const keys = [];
        if (this.inputSystem.isActionPressed('left')) keys.push('L');
        if (this.inputSystem.isActionPressed('right')) keys.push('R');
        if (this.inputSystem.isActionPressed('up')) keys.push('U');
        if (this.inputSystem.isActionPressed('down')) keys.push('D');
        if (this.inputSystem.isActionPressed('jump')) keys.push('J');
        if (this.inputSystem.isActionPressed('action')) keys.push('A');
        
        this.renderer.drawText(`Keys: ${keys.join('') || '-'}`, 10, 40, '#FFFFFF', 6);
        
        // 音楽システム状態
        const musicStatus = this.musicSystem.isInitialized ? 
            (this.musicSystem.getMuteState() ? 'MUTE' : 'ON') : 'OFF';
        this.renderer.drawText(`Mus: ${musicStatus}`, 10, 50, '#FFFFFF', 6);
        
        // デバッグ切り替えの説明
        this.renderer.drawText('@ toggle', 10, 65, '#999999', 5);
        
        // HTMLのデバッグ情報も更新
        this.updateHTMLDebugInfo(fps);
    }
    
    /**
     * HTMLのデバッグ情報を更新
     * @param {number} fps - 現在のFPS
     */
    updateHTMLDebugInfo(fps) {
        const debugElement = document.getElementById('debugInfo');
        if (!debugElement) return;
        
        if (this.debug) {
            debugElement.classList.add('active');
            
            // FPS更新
            const fpsElement = document.getElementById('fps');
            if (fpsElement) fpsElement.textContent = fps;
            
            // エンティティ数更新
            const entityElement = document.getElementById('entityCount');
            if (entityElement) entityElement.textContent = this.player ? '1' : '0';
            
            // カメラ位置更新
            const cameraElement = document.getElementById('cameraPos');
            if (cameraElement) {
                cameraElement.textContent = `${Math.floor(this.renderer.cameraX)}, ${Math.floor(this.renderer.cameraY)}`;
            }
        } else {
            debugElement.classList.remove('active');
        }
    }
    
    renderDebugInfo() {
        
        // タイトル
        this.renderer.drawText('COIN HUNTER', 10, 10, '#FFFFFF', 8);
        this.renderer.drawText('PIXEL EDITION', 10, 20, '#FFFFFF', 8);
        this.renderer.drawText('Systems Test', 10, 35, '#00FF00', 6);
        
        // システム状態
        this.renderer.drawText('== SYSTEMS ==', 10, 50, '#FFFFFF', 6);
        this.renderer.drawText('Input: OK', 10, 60, '#00FF00', 6);
        this.renderer.drawText('State: OK', 10, 70, '#00FF00', 6);
        this.renderer.drawText('Assets: OK', 10, 80, '#00FF00', 6);
        this.renderer.drawText('Render: OK', 10, 90, '#00FF00', 6);
        this.renderer.drawText(`Player: ${this.player ? 'OK' : 'NO'}`, 10, 100, this.player ? '#00FF00' : '#FF0000', 6);
        this.renderer.drawText(`Music: ${this.musicSystem.isInitialized ? 'OK' : 'NO'}`, 10, 110, this.musicSystem.isInitialized ? '#00FF00' : '#FF0000', 6);
        
        // 音楽開始の案内
        if (!this.musicSystem.isInitialized) {
            this.renderer.drawText('PRESS KEY FOR MUSIC', 60, 40, '#FFFF00', 6);
        }
        
        // 入力状態
        this.renderer.drawText('== INPUT ==', 10, 130, '#FFFFFF', 6);
        this.renderer.drawText(`L:${this.inputSystem.isActionPressed('left') ? 'Y' : 'N'}`, 10, 140, this.inputSystem.isActionPressed('left') ? '#00FF00' : '#FF0000', 6);
        this.renderer.drawText(`R:${this.inputSystem.isActionPressed('right') ? 'Y' : 'N'}`, 35, 140, this.inputSystem.isActionPressed('right') ? '#00FF00' : '#FF0000', 6);
        this.renderer.drawText(`J:${this.inputSystem.isActionPressed('jump') ? 'Y' : 'N'}`, 60, 140, this.inputSystem.isActionPressed('jump') ? '#00FF00' : '#FF0000', 6);
        this.renderer.drawText(`A:${this.inputSystem.isActionPressed('action') ? 'Y' : 'N'}`, 85, 140, this.inputSystem.isActionPressed('action') ? '#00FF00' : '#FF0000', 6);
        
        // プレイヤー状態
        if (this.player) {
            const playerState = this.player.getState();
            this.renderer.drawText('== PLAYER ==', 10, 160, '#FFFFFF', 6);
            this.renderer.drawText(`X:${Math.floor(playerState.x)} Y:${Math.floor(playerState.y)}`, 10, 170, '#FFFFFF', 6);
            this.renderer.drawText(`VX:${playerState.vx.toFixed(1)} VY:${playerState.vy.toFixed(1)}`, 10, 180, '#FFFFFF', 6);
            this.renderer.drawText(`HP:${playerState.health}/${playerState.maxHealth}`, 10, 190, '#FFFFFF', 6);
            this.renderer.drawText(`G:${playerState.grounded ? 'Y' : 'N'} J:${playerState.isJumping ? 'Y' : 'N'}`, 10, 200, '#FFFFFF', 6);
        }
        
        // 操作説明
        this.renderer.drawText('ARROWS:MOVE SPACE:JUMP', 10, 220, '#CCCCCC', 5);
        this.renderer.drawText('@ DEBUG | M MUTE', 10, 228, '#CCCCCC', 5);
    }
    
    stop() {
        this.running = false;
        
        // 音楽システムのクリーンアップ
        if (this.musicSystem) {
            this.musicSystem.stopBGM();
            this.musicSystem.destroy();
        }
    }
}