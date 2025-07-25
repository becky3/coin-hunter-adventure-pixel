

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

import { InputSystemAdapter } from '../systems/adapters/InputSystemAdapter';
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
        const initStartTime = performance.now();
        Logger.log('[Performance] GameCore.init() started:', initStartTime.toFixed(2) + 'ms');
        Logger.log('GameCore: init() started');
        
        Logger.log('GameCore: Initializing ResourceLoader...');
        const resourceLoaderStartTime = performance.now();
        Logger.log('[Performance] Before ResourceLoader.initialize():', resourceLoaderStartTime.toFixed(2) + 'ms');
        const resourceLoader = ResourceLoader.getInstance();
        await resourceLoader.initialize();
        const resourceLoaderEndTime = performance.now();
        Logger.log('[Performance] After ResourceLoader.initialize():', resourceLoaderEndTime.toFixed(2) + 'ms', '(took', (resourceLoaderEndTime - resourceLoaderStartTime).toFixed(2) + 'ms)');

        Logger.log('GameCore: Registering core services...');
        const coreServicesStartTime = performance.now();
        Logger.log('[Performance] Before registerCoreServices():', coreServicesStartTime.toFixed(2) + 'ms');
        this.registerCoreServices();
        Logger.log('[Performance] After registerCoreServices():', performance.now().toFixed(2) + 'ms', '(took', (performance.now() - coreServicesStartTime).toFixed(2) + 'ms)');

        Logger.log('GameCore: Registering systems...');
        const systemsStartTime = performance.now();
        Logger.log('[Performance] Before registerSystems():', systemsStartTime.toFixed(2) + 'ms');
        await this.registerSystems();
        Logger.log('[Performance] After registerSystems():', performance.now().toFixed(2) + 'ms', '(took', (performance.now() - systemsStartTime).toFixed(2) + 'ms)');

        Logger.log('GameCore: Registering states...');
        const statesStartTime = performance.now();
        Logger.log('[Performance] Before registerStates():', statesStartTime.toFixed(2) + 'ms');
        this.registerStates();
        Logger.log('[Performance] After registerStates():', performance.now().toFixed(2) + 'ms', '(took', (performance.now() - statesStartTime).toFixed(2) + 'ms)');

        Logger.log('GameCore: Initializing debug overlay...');
        const renderer = this._serviceLocator.get<PixelRenderer>(ServiceNames.RENDERER);
        const performanceMonitor = PerformanceMonitor.getInstance();
        performanceMonitor.initialize(renderer);
        
        (window as Window & { PerformanceMonitor?: typeof PerformanceMonitor }).PerformanceMonitor = PerformanceMonitor;
        
        this.debugOverlay = new DebugOverlay(this._serviceLocator);
        await this.debugOverlay.init();

        Logger.log('GameCore: Hiding loading screen...');
        const hideLoadingTime = performance.now();
        Logger.log('[Performance] Hiding loading screen at:', hideLoadingTime.toFixed(2) + 'ms');
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
        
        const initEndTime = performance.now();
        Logger.log('[Performance] GameCore.init() completed:', initEndTime.toFixed(2) + 'ms', '(total init took', (initEndTime - initStartTime).toFixed(2) + 'ms)');
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
        const stateManager = this._serviceLocator.get<GameStateManager>(ServiceNames.GAME_STATE_MANAGER);

        systemManager.registerSystem(new InputSystemAdapter(inputSystem));
        systemManager.registerSystem(new StateSystemAdapter(stateManager));
        systemManager.registerSystem(new RenderSystemAdapter(stateManager));
        
        if (this.debugOverlay) {
            systemManager.registerSystem(new DebugSystemAdapter(this.debugOverlay));
        }

        const initSystemsStartTime = performance.now();
        Logger.log('[Performance] Before systemManager.initSystems():', initSystemsStartTime.toFixed(2) + 'ms');
        await systemManager.initSystems();
        Logger.log('[Performance] After systemManager.initSystems():', performance.now().toFixed(2) + 'ms', '(took', (performance.now() - initSystemsStartTime).toFixed(2) + 'ms)');

        const musicSystem = this._serviceLocator.get<MusicSystem>(ServiceNames.AUDIO);
        try {
            const musicInitStartTime = performance.now();
            Logger.log('[Performance] Before MusicSystem.init():', musicInitStartTime.toFixed(2) + 'ms');
            Logger.log('GameCore: Initializing MusicSystem...');
            const urlParams = new URLParams();
            const isTestMode = urlParams.isTestMode();
            
            const initPromise = musicSystem.init({ skipAudioContext: isTestMode });
            const timeoutPromise = new Promise<boolean>((_, reject) => 
                setTimeout(() => reject(new Error('MusicSystem init timeout')), 5000)
            );
            
            await Promise.race([initPromise, timeoutPromise]);
            Logger.log('[Performance] After MusicSystem.init():', performance.now().toFixed(2) + 'ms', '(took', (performance.now() - musicInitStartTime).toFixed(2) + 'ms)');
            Logger.log('GameCore: MusicSystem initialized');
        } catch (error) {
            Logger.log('[Performance] MusicSystem init error:', error.message, 'at', performance.now().toFixed(2) + 'ms');
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
            Logger.log('[Performance] Setting initial state to menu:', performance.now().toFixed(2) + 'ms');
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
