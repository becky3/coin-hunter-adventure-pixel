

import { ServiceLocator } from '../services/ServiceLocator';
import { ServiceNames } from '../services/ServiceNames';
import { EventBus } from '../services/EventBus';
import { SystemManager } from '../services/SystemManager';
import { GameLoop } from './GameLoop';
import { DebugOverlay } from '../debug/DebugOverlay';
import { InputSystem as InputSystemImpl } from './InputSystem';
import { PhysicsSystem } from '../physics/PhysicsSystem';
import { PixelRenderer } from '../rendering/PixelRenderer';
import { PixelArtRenderer } from '../utils/pixelArt';
import { AssetLoader } from '../assets/AssetLoader';
import { MusicSystem } from '../audio/MusicSystem';
import { GameStateManager } from '../states/GameStateManager';
import { MenuState } from '../states/MenuState';
import { PlayState } from '../states/PlayState';
import { SoundTestState } from '../states/SoundTestState';
import { Logger } from '../utils/Logger';
import { ResourceLoader } from '../config/ResourceLoader';
import { URLParams } from '../utils/urlParams';
import { AnimationManager } from '../animation/AnimationManager';
import { registerAllAnimations } from '../config/animationDefinitions';
import { AnimationRegistrar } from '../animation/AnimationRegistrar';

import { InputSystemAdapter } from '../systems/adapters/InputSystemAdapter';
import { PhysicsSystemAdapter } from '../systems/adapters/PhysicsSystemAdapter';
import { StateSystemAdapter } from '../systems/adapters/StateSystemAdapter';
import { RenderSystemAdapter } from '../systems/adapters/RenderSystemAdapter';
import { DebugSystemAdapter } from '../systems/adapters/DebugSystemAdapter';
import { PerformanceMonitor } from '../performance/PerformanceMonitor';

/**
 * GameCore implementation
 */
export class GameCore {
    private _serviceLocator: ServiceLocator;
    private gameLoop: GameLoop;
    private debugOverlay?: DebugOverlay;
    
    constructor() {
        this._serviceLocator = ServiceLocator.getInstance();
        this.gameLoop = new GameLoop();
    }

    async init(): Promise<void> {
        Logger.log('GameCore: init() started');
        
        Logger.log('GameCore: Initializing ResourceLoader...');
        const resourceLoader = ResourceLoader.getInstance();
        await resourceLoader.initialize();

        Logger.log('GameCore: Registering core services...');
        this.registerCoreServices();

        Logger.log('GameCore: Registering systems...');
        await this.registerSystems();

        Logger.log('GameCore: Registering states...');
        this.registerStates();

        Logger.log('GameCore: Initializing debug overlay...');
        const renderer = this._serviceLocator.get<PixelRenderer>(ServiceNames.RENDERER);
        const performanceMonitor = PerformanceMonitor.getInstance();
        performanceMonitor.initialize(renderer);
        
        (window as Window & { PerformanceMonitor?: typeof PerformanceMonitor }).PerformanceMonitor = PerformanceMonitor;
        
        this.debugOverlay = new DebugOverlay(this._serviceLocator);
        await this.debugOverlay.init();

        Logger.log('GameCore: Hiding loading screen...');
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
        
        Logger.log('GameCore: init() completed');
    }

    private registerCoreServices(): void {

        const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
        if (!canvas) {
            throw new Error('Canvas element not found');
        }

        this._serviceLocator.register(ServiceNames.EVENT_BUS, new EventBus());

        this._serviceLocator.register(ServiceNames.SYSTEM_MANAGER, new SystemManager());

        const renderer = new PixelRenderer(canvas);
        this._serviceLocator.register(ServiceNames.RENDERER, renderer);

        const pixelArtRenderer = new PixelArtRenderer(canvas);
        renderer.pixelArtRenderer = pixelArtRenderer;

        const animationManager = AnimationManager.getInstance();
        animationManager.setPixelArtRenderer(pixelArtRenderer);
        registerAllAnimations();
        
        const animationRegistrar = new AnimationRegistrar();
        animationRegistrar.registerAllAnimations(pixelArtRenderer).catch(error => {
            Logger.error('Failed to register animations:', error);
        });
        
        (window as Window & { AnimationManager?: typeof AnimationManager }).AnimationManager = AnimationManager;

        const assetLoader = new AssetLoader();
        assetLoader.setRenderer(pixelArtRenderer);
        renderer.assetLoader = assetLoader;
        this._serviceLocator.register(ServiceNames.ASSET_LOADER, assetLoader);

        const inputSystem = new InputSystemImpl();
        this._serviceLocator.register(ServiceNames.INPUT, inputSystem);

        const physicsSystem = new PhysicsSystem();
        this._serviceLocator.register(ServiceNames.PHYSICS, physicsSystem);

        const musicSystem = new MusicSystem();
        this._serviceLocator.register(ServiceNames.AUDIO, musicSystem);

        const stateManager = new GameStateManager();
        this._serviceLocator.register(ServiceNames.GAME_STATE_MANAGER, stateManager);
    }

    private async registerSystems(): Promise<void> {
        const systemManager = this._serviceLocator.get<SystemManager>(ServiceNames.SYSTEM_MANAGER);

        const inputSystem = this._serviceLocator.get<InputSystemImpl>(ServiceNames.INPUT);
        const physicsSystem = this._serviceLocator.get<PhysicsSystem>(ServiceNames.PHYSICS);
        const stateManager = this._serviceLocator.get<GameStateManager>(ServiceNames.GAME_STATE_MANAGER);

        systemManager.registerSystem(new InputSystemAdapter(inputSystem));
        systemManager.registerSystem(new PhysicsSystemAdapter(physicsSystem));
        systemManager.registerSystem(new StateSystemAdapter(stateManager));
        systemManager.registerSystem(new RenderSystemAdapter(stateManager));
        
        if (this.debugOverlay) {
            systemManager.registerSystem(new DebugSystemAdapter(this.debugOverlay));
        }

        await systemManager.initSystems();

        const musicSystem = this._serviceLocator.get<MusicSystem>(ServiceNames.AUDIO);
        try {
            Logger.log('GameCore: Initializing MusicSystem...');
            const initPromise = musicSystem.init();
            const timeoutPromise = new Promise<boolean>((_, reject) => 
                setTimeout(() => reject(new Error('MusicSystem init timeout')), 5000)
            );
            
            await Promise.race([initPromise, timeoutPromise]);
            Logger.log('GameCore: MusicSystem initialized');
        } catch (error) {
            Logger.warn('GameCore: MusicSystem initialization failed, continuing without audio:', error);
        }
    }

    private registerStates(): void {
        const stateManager = this._serviceLocator.get<GameStateManager>(ServiceNames.GAME_STATE_MANAGER);

        const gameProxy = this.createGameProxy();

        stateManager.registerState(new MenuState(gameProxy));
        stateManager.registerState(new PlayState(gameProxy));
        stateManager.registerState(new SoundTestState(gameProxy));
    }

    private createGameProxy(): {
        renderer: PixelRenderer;
        inputSystem: InputSystemImpl;
        physicsSystem: PhysicsSystem;
        assetLoader: AssetLoader;
        musicSystem: MusicSystem;
        stateManager: GameStateManager;
        } {
        return {
            renderer: this._serviceLocator.get(ServiceNames.RENDERER),
            inputSystem: this._serviceLocator.get(ServiceNames.INPUT),
            physicsSystem: this._serviceLocator.get(ServiceNames.PHYSICS),
            assetLoader: this._serviceLocator.get(ServiceNames.ASSET_LOADER),
            musicSystem: this._serviceLocator.get(ServiceNames.AUDIO),
            stateManager: this._serviceLocator.get(ServiceNames.GAME_STATE_MANAGER)
        };
    }

    start(): void {
        Logger.log('GameCore: Starting game loop...');
        
        const systemManager = this._serviceLocator.get<SystemManager>(ServiceNames.SYSTEM_MANAGER);
        const stateManager = this._serviceLocator.get<GameStateManager>(ServiceNames.GAME_STATE_MANAGER);

        const performanceMonitor = PerformanceMonitor.getInstance();
        
        this.gameLoop.start((deltaTime) => {
            performanceMonitor.beginFrame();

            systemManager.updateSystems(deltaTime);
            
            if (this.debugOverlay) {
                this.debugOverlay.update(deltaTime);
            }

            const renderer = this._serviceLocator.get<PixelRenderer>(ServiceNames.RENDERER);
            systemManager.renderSystems(renderer);
            
            performanceMonitor.endFrame();
        });
        
        Logger.log('GameCore: Game loop started, running:', this.gameLoop.isRunning());
        
        const urlParams = new URLParams();
        if (urlParams.shouldSkipTitle()) {
            const stageId = urlParams.getStageId();
            if (!stageId) {
                throw new Error('No stage ID specified in URL parameters (use ?s=stage-name)');
            }
            Logger.log('GameCore: Skipping title, starting directly with stage:', stageId);
            stateManager.setState('play', { level: stageId });
        } else {
            stateManager.setState('menu');
            Logger.log('GameCore: Initial state set to menu');
        }
    }

    stop(): void {
        this.gameLoop.stop();
    }

    get serviceLocator(): ServiceLocator {
        return this._serviceLocator;
    }

    get stateManager(): GameStateManager {
        return this._serviceLocator.get<GameStateManager>(ServiceNames.GAME_STATE_MANAGER);
    }
}
