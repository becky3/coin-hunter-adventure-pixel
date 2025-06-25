/**
 * メインゲームクラス
 */
import { InputSystem } from './InputSystem.js';
import { GameStateManager } from '../states/GameStateManager.js';
import { AssetLoader } from '../assets/AssetLoader.js';
import { PixelRenderer } from '../rendering/PixelRenderer.js';
import { PixelArtRenderer } from '../utils/pixelArt.js';
import { LevelLoader } from '../levels/LevelLoader.js';
import { Player } from '../entities/Player.js';
import { MusicSystem } from '../audio/MusicSystem.js';
import { MenuState } from '../states/MenuState.js';
import { PlayState } from '../states/PlayState.js';
import { TestPlayState } from '../states/TestPlayState.js';
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
        
        // PixelArtRendererの初期化と設定
        this.pixelArtRenderer = new PixelArtRenderer(canvas);
        this.renderer.pixelArtRenderer = this.pixelArtRenderer;
        
        // デバッグ用
        this.debug = false;
        window.game = this; // デバッグ用にグローバルに公開
        
        // エンティティ（テスト用）
        this.player = null;
        
        // デバッグパネルのDOM要素キャッシュ
        this.debugElements = null;
    }
    
    async initialize() {
        console.log('Initializing game...');
        
        try {
            // アセットローダーにPixelArtRendererを設定
            this.assetLoader.setRenderer(this.pixelArtRenderer);
            
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
        // ゲームアセットを読み込み
        try {
            await this.assetLoader.preloadGameAssets((loaded, total) => {
                console.log(`Loading assets: ${loaded}/${total}`);
            });
            console.log('All game assets loaded successfully');
        } catch (error) {
            console.warn('Could not load some assets:', error);
        }
    }
    
    createTestPlayer() {
        // テスト用のプレイヤーを作成
        this.player = new Player(50, 150);
        this.player.setInputManager(this.inputSystem);
        this.player.setMusicSystem(this.musicSystem);
        this.player.setAssetLoader(this.assetLoader);
        console.log('Test player created at:', this.player.x, this.player.y);
        console.log('Player size:', this.player.width, 'x', this.player.height);
        
        // 仮の地面を設定（画面の下から40ピクセル上）
        this.testGroundY = GAME_RESOLUTION.HEIGHT - 40;
    }
    
    registerStates() {
        // メニュー状態を登録
        const menuState = new MenuState(this);
        this.stateManager.registerState('menu', menuState);
        
        // プレイ状態を登録
        const playState = new PlayState(this);
        this.stateManager.registerState('play', playState);
        
        // テスト用のシンプルなPlayStateも登録（デバッグ用）
        const testPlayState = new TestPlayState(this);
        this.stateManager.registerState('testplay', testPlayState);
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
        
        // StateManagerに更新を委譲
        this.stateManager.update(this.frameTime);
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
        // StateManagerに描画を委譲
        this.stateManager.render(this.renderer);
        
        // デバッグ情報を更新（表示/非表示の切り替えも含む）
        this.renderDebugOverlay();
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
        // HTMLのデバッグパネルを更新
        const fps = this.frameTime > 0 ? Math.round(1000 / this.frameTime) : 0;
        this.updateHTMLDebugInfo(fps);
    }
    
    /**
     * デバッグパネルのDOM要素をキャッシュ
     */
    cacheDebugElements() {
        this.debugElements = {
            panel: document.getElementById('debugPanel'),
            fps: document.getElementById('fps'),
            frameTime: document.getElementById('frameTime'),
            gameState: document.getElementById('gameState'),
            entityCount: document.getElementById('entityCount'),
            cameraPos: document.getElementById('cameraPos'),
            activeKeys: document.getElementById('activeKeys'),
            musicStatus: document.getElementById('musicStatus'),
            playerSection: document.getElementById('playerSection'),
            playerPos: document.getElementById('playerPos'),
            playerVel: document.getElementById('playerVel'),
            playerHealth: document.getElementById('playerHealth'),
            playerGrounded: document.getElementById('playerGrounded')
        };
    }
    
    /**
     * HTMLのデバッグ情報を更新
     * @param {number} fps - 現在のFPS
     */
    updateHTMLDebugInfo(fps) {
        // DOM要素がキャッシュされていない場合は取得
        if (!this.debugElements) {
            this.cacheDebugElements();
        }
        
        const { panel } = this.debugElements;
        if (!panel) return;
        
        if (this.debug) {
            panel.classList.add('active');
            
            // FPS更新
            if (this.debugElements.fps) {
                this.debugElements.fps.textContent = fps;
                // FPSに応じて色を変更
                if (fps >= 55) {
                    this.debugElements.fps.className = 'debug-value success';
                } else if (fps >= 30) {
                    this.debugElements.fps.className = 'debug-value warning';
                } else {
                    this.debugElements.fps.className = 'debug-value error';
                }
            }
            
            // フレーム時間
            if (this.debugElements.frameTime) {
                this.debugElements.frameTime.textContent = `${this.frameTime.toFixed(1)}ms`;
            }
            
            // ゲーム状態
            if (this.debugElements.gameState) {
                this.debugElements.gameState.textContent = this.stateManager.currentStateName || 'none';
            }
            
            // エンティティ数更新
            if (this.debugElements.entityCount) {
                this.debugElements.entityCount.textContent = this.player ? '1' : '0';
            }
            
            // カメラ位置更新
            if (this.debugElements.cameraPos) {
                this.debugElements.cameraPos.textContent = `${Math.floor(this.renderer.cameraX)}, ${Math.floor(this.renderer.cameraY)}`;
            }
            
            // 入力状態
            const keys = [];
            if (this.inputSystem.isActionPressed('left')) keys.push('←');
            if (this.inputSystem.isActionPressed('right')) keys.push('→');
            if (this.inputSystem.isActionPressed('up')) keys.push('↑');
            if (this.inputSystem.isActionPressed('down')) keys.push('↓');
            if (this.inputSystem.isActionPressed('jump')) keys.push('SPACE');
            if (this.inputSystem.isActionPressed('action')) keys.push('ENTER');
            
            if (this.debugElements.activeKeys) {
                this.debugElements.activeKeys.textContent = keys.length > 0 ? keys.join(' ') : '-';
            }
            
            // 音楽状態
            if (this.debugElements.musicStatus) {
                if (this.musicSystem.isInitialized) {
                    this.debugElements.musicStatus.textContent = this.musicSystem.getMuteState() ? 'MUTED' : 'ON';
                    this.debugElements.musicStatus.className = this.musicSystem.getMuteState() ? 'debug-value warning' : 'debug-value success';
                } else {
                    this.debugElements.musicStatus.textContent = 'OFF';
                    this.debugElements.musicStatus.className = 'debug-value';
                }
            }
            
            // プレイヤー情報
            if (this.debugElements.playerSection && this.player) {
                this.debugElements.playerSection.style.display = 'block';
                
                const playerState = this.player.getState();
                
                // 位置
                if (this.debugElements.playerPos) {
                    this.debugElements.playerPos.textContent = `${Math.floor(playerState.x)}, ${Math.floor(playerState.y)}`;
                }
                
                // 速度
                if (this.debugElements.playerVel) {
                    this.debugElements.playerVel.textContent = `${playerState.vx.toFixed(1)}, ${playerState.vy.toFixed(1)}`;
                }
                
                // 体力
                if (this.debugElements.playerHealth) {
                    this.debugElements.playerHealth.textContent = `${playerState.health}/${playerState.maxHealth}`;
                    if (playerState.health === playerState.maxHealth) {
                        this.debugElements.playerHealth.className = 'debug-value success';
                    } else if (playerState.health > 1) {
                        this.debugElements.playerHealth.className = 'debug-value warning';
                    } else {
                        this.debugElements.playerHealth.className = 'debug-value error';
                    }
                }
                
                // 接地状態
                if (this.debugElements.playerGrounded) {
                    this.debugElements.playerGrounded.textContent = playerState.grounded ? 'Yes' : 'No';
                    this.debugElements.playerGrounded.className = playerState.grounded ? 'debug-value success' : 'debug-value';
                }
            } else if (this.debugElements.playerSection) {
                this.debugElements.playerSection.style.display = 'none';
            }
        } else {
            panel.classList.remove('active');
        }
    }
    
    renderDebugInfo() {
        // デバッグ情報はHTMLパネルに移動したので、ゲーム画面には表示しない
        // テストモード時は必要最小限の情報のみ表示
        
        if (!this.musicSystem.isInitialized) {
            // 音楽開始の案内のみゲーム画面に表示
            const centerX = GAME_RESOLUTION.WIDTH / 2;
            const centerY = GAME_RESOLUTION.HEIGHT / 2;
            this.renderer.drawTextCentered('PRESS ANY KEY', centerX, centerY - 8, '#FFFF00');
            this.renderer.drawTextCentered('TO START MUSIC', centerX, centerY + 8, '#FFFF00');
        }
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