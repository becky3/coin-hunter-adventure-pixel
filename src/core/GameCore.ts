
// src/core/GameCore.ts

import { ServiceLocator } from '../services/ServiceLocator';
import { ServiceNames } from '../services/ServiceNames';
import { EventBus } from '../services/EventBus';
import { SystemManager } from '../services/SystemManager';
import { GameLoop } from './GameLoop';
import { DebugOverlay } from '../debug/DebugOverlay';
import { InputSystem as InputSystemImpl } from './InputSystem';
import { PhysicsSystem } from '../physics/PhysicsSystem';
import { PixelRenderer } from '../rendering/PixelRenderer';
import { AssetLoader } from '../assets/AssetLoader';
import { MusicSystem } from '../audio/MusicSystem';
import { GameStateManager } from '../states/GameStateManager';
import { MenuState } from '../states/MenuState';
import { PlayState } from '../states/PlayState';


import { InputSystemAdapter } from '../systems/adapters/InputSystemAdapter';
import { PhysicsSystemAdapter } from '../systems/adapters/PhysicsSystemAdapter';
import { StateSystemAdapter } from '../systems/adapters/StateSystemAdapter';
import { RenderSystemAdapter } from '../systems/adapters/RenderSystemAdapter';
import { DebugSystemAdapter } from '../systems/adapters/DebugSystemAdapter';

/**
 * ゲームの初期化とサービス管理を担当
 */
export class GameCore {
    private serviceLocator: ServiceLocator;
    private gameLoop: GameLoop;
    private debugOverlay?: DebugOverlay;
    
    constructor() {
        this.serviceLocator = new ServiceLocator();
        this.gameLoop = new GameLoop();
    }
    
    /**
     * ゲームの初期化
     */
    async init(): Promise<void> {
        console.log('Initializing GameCore...');
        
        // 基本サービスの登録
        this.registerCoreServices();
        
        // システムの登録
        await this.registerSystems();
        
        // ステートの登録
        this.registerStates();
        
        // デバッグオーバーレイの初期化（開発環境のみ）
        if (process.env.NODE_ENV === 'development') {
            this.debugOverlay = new DebugOverlay(this.serviceLocator);
            await this.debugOverlay.init();
        }
        
        // 初期ステートの設定
        const stateManager = this.serviceLocator.get<GameStateManager>(ServiceNames.GAME_STATE_MANAGER);
        await stateManager.setState('menu');
        
        // Loading画面を非表示にする
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
        
        console.log('GameCore initialization complete');
    }
    
    /**
     * 基本サービスの登録
     */
    private registerCoreServices(): void {
        // Canvas要素の取得
        const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
        if (!canvas) {
            throw new Error('Canvas element not found');
        }
        
        // EventBus
        this.serviceLocator.register(ServiceNames.EVENT_BUS, new EventBus());
        
        // SystemManager
        this.serviceLocator.register(ServiceNames.SYSTEM_MANAGER, new SystemManager());
        
        // Renderer
        const renderer = new PixelRenderer(canvas);
        this.serviceLocator.register(ServiceNames.RENDERER, renderer);
        
        // AssetLoader
        const assetLoader = new AssetLoader();
        this.serviceLocator.register(ServiceNames.ASSET_LOADER, assetLoader);
        
        // InputSystem
        const inputSystem = new InputSystemImpl();
        this.serviceLocator.register(ServiceNames.INPUT, inputSystem);
        
        // PhysicsSystem
        const physicsSystem = new PhysicsSystem();
        this.serviceLocator.register(ServiceNames.PHYSICS, physicsSystem);
        
        // MusicSystem
        const musicSystem = new MusicSystem();
        this.serviceLocator.register(ServiceNames.AUDIO, musicSystem);
        
        // GameStateManager
        const stateManager = new GameStateManager();
        this.serviceLocator.register(ServiceNames.GAME_STATE_MANAGER, stateManager);
    }
    
    /**
     * システムの登録
     */
    private async registerSystems(): Promise<void> {
        const systemManager = this.serviceLocator.get<SystemManager>(ServiceNames.SYSTEM_MANAGER);
        
        // 各サービスをISystemアダプターでラップして登録
        const inputSystem = this.serviceLocator.get<InputSystemImpl>(ServiceNames.INPUT);
        const physicsSystem = this.serviceLocator.get<PhysicsSystem>(ServiceNames.PHYSICS);
        const renderer = this.serviceLocator.get<PixelRenderer>(ServiceNames.RENDERER);
        const stateManager = this.serviceLocator.get<GameStateManager>(ServiceNames.GAME_STATE_MANAGER);
        
        // システムアダプターの作成と登録
        systemManager.registerSystem(new InputSystemAdapter(inputSystem));
        systemManager.registerSystem(new PhysicsSystemAdapter(physicsSystem));
        systemManager.registerSystem(new StateSystemAdapter(stateManager));
        systemManager.registerSystem(new RenderSystemAdapter(renderer, stateManager));
        
        if (this.debugOverlay) {
            systemManager.registerSystem(new DebugSystemAdapter(this.debugOverlay));
        }
        
        // システムの初期化
        await systemManager.initSystems();
    }
    
    /**
     * ゲームステートの登録
     */
    private registerStates(): void {
        const stateManager = this.serviceLocator.get<GameStateManager>(ServiceNames.GAME_STATE_MANAGER);
        
        // 各ステートに必要なサービスを注入するためのゲームプロキシを作成
        const gameProxy = this.createGameProxy();
        
        // ステートの登録
        stateManager.registerState(new MenuState(gameProxy));
        stateManager.registerState(new PlayState(gameProxy));
    }
    
    /**
     * 既存のGameインターフェースとの互換性のためのプロキシ作成
     */
    private createGameProxy(): any {
        return {
            renderer: this.serviceLocator.get(ServiceNames.RENDERER),
            inputSystem: this.serviceLocator.get(ServiceNames.INPUT),
            physicsSystem: this.serviceLocator.get(ServiceNames.PHYSICS),
            assetLoader: this.serviceLocator.get(ServiceNames.ASSET_LOADER),
            musicSystem: this.serviceLocator.get(ServiceNames.AUDIO),
            stateManager: this.serviceLocator.get(ServiceNames.GAME_STATE_MANAGER)
        };
    }
    
    /**
     * ゲームの開始
     */
    start(): void {
        console.log('Starting game...');
        
        const systemManager = this.serviceLocator.get<SystemManager>(ServiceNames.SYSTEM_MANAGER);
        
        // ゲームループの開始
        this.gameLoop.start((deltaTime) => {
            // システムの更新
            systemManager.updateSystems(deltaTime);
            
            // レンダリング
            const renderer = this.serviceLocator.get<PixelRenderer>(ServiceNames.RENDERER);
            systemManager.renderSystems(renderer);
        });
    }
    
    /**
     * ゲームの停止
     */
    stop(): void {
        console.log('Stopping game...');
        this.gameLoop.stop();
    }
}
