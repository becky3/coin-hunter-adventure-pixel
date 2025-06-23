/**
 * メインゲームクラス
 */
import { InputManager } from './InputManager.js';
import { GameStateManager } from '../states/GameStateManager.js';
import { AssetLoader } from '../assets/AssetLoader.js';
import { PixelRenderer } from '../rendering/PixelRenderer.js';
import { LevelLoader } from '../levels/LevelLoader.js';

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
    }
    
    async initialize() {
        console.log('Initializing game...');
        
        try {
            // アセットローダーにレンダラーを設定
            this.assetLoader.setRenderer(this.renderer);
            
            // テスト用のアセットを読み込み
            console.log('Loading test assets...');
            await this.loadTestAssets();
            
            // レベルリストを読み込み
            console.log('Loading stage list...');
            await this.levelLoader.loadStageList();
            
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
        
        // デバッグ: 入力状態を取得（将来の使用のため）
        // const input = this.inputManager.getInput();
        
        // 状態管理の更新
        this.stateManager.update(this.frameTime);
    }
    
    render() {
        // レンダラーでクリア
        this.renderer.clear('#5C94FC');
        
        // 状態管理の描画
        this.stateManager.render(this.ctx);
        
        // デバッグ情報の表示
        this.renderDebugInfo();
    }
    
    renderDebugInfo() {
        const input = this.inputManager.getInput();
        
        // タイトル
        this.renderer.drawText('Coin Hunter Adventure - Pixel Edition', 20, 20, '#FFFFFF', 20);
        this.renderer.drawText('Core Systems Test', 20, 50, '#FFFF00', 16);
        
        // システム状態
        this.renderer.drawText('=== Core Systems Status ===', 20, 90, '#FFFFFF', 14);
        this.renderer.drawText(`✓ InputManager: Active`, 20, 110, '#00FF00', 12);
        this.renderer.drawText(`✓ GameStateManager: Active`, 20, 130, '#00FF00', 12);
        this.renderer.drawText(`✓ AssetLoader: Active`, 20, 150, '#00FF00', 12);
        this.renderer.drawText(`✓ PixelRenderer: Active`, 20, 170, '#00FF00', 12);
        this.renderer.drawText(`✓ LevelLoader: Active`, 20, 190, '#00FF00', 12);
        
        // 入力状態
        this.renderer.drawText('=== Input State ===', 20, 230, '#FFFFFF', 14);
        this.renderer.drawText(`Left: ${input.left ? 'ON' : 'OFF'}`, 20, 250, input.left ? '#00FF00' : '#FF0000', 12);
        this.renderer.drawText(`Right: ${input.right ? 'ON' : 'OFF'}`, 120, 250, input.right ? '#00FF00' : '#FF0000', 12);
        this.renderer.drawText(`Jump: ${input.jump ? 'ON' : 'OFF'}`, 220, 250, input.jump ? '#00FF00' : '#FF0000', 12);
        this.renderer.drawText(`Action: ${input.action ? 'ON' : 'OFF'}`, 320, 250, input.action ? '#00FF00' : '#FF0000', 12);
        
        // アセット情報
        const loadProgress = this.assetLoader.getLoadingProgress();
        this.renderer.drawText('=== Asset Loader ===', 20, 290, '#FFFFFF', 14);
        this.renderer.drawText(`Loaded: ${loadProgress.loaded} / ${loadProgress.total}`, 20, 310, '#FFFFFF', 12);
        
        // レベル情報
        const stages = this.levelLoader.getStageList();
        this.renderer.drawText('=== Level Loader ===', 20, 350, '#FFFFFF', 14);
        this.renderer.drawText(`Stages: ${stages.length} loaded`, 20, 370, '#FFFFFF', 12);
        
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