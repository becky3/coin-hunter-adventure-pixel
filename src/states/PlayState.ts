import { GameState, GameStateManager } from './GameStateManager';
import { PixelRenderer } from '../rendering/PixelRenderer';
import { InputSystem } from '../core/InputSystem';
import { EntityManager } from '../managers/EntityManager';
import { LevelManager } from '../managers/LevelManager';
import { CameraController } from '../controllers/CameraController';
import { HUDManager } from '../ui/HUDManager';
import { EventBus } from '../services/EventBus';
import { GameController } from '../controllers/GameController';
import { EventCoordinator } from '../controllers/EventCoordinator';
import { TILE_SIZE } from '../constants/gameConstants';
import { Logger } from '../utils/Logger';
import { MusicSystem } from '../audio/MusicSystem';
import { PhysicsSystem } from '../physics/PhysicsSystem';
import { AssetLoader, StageType } from '../assets/AssetLoader';
import { BackgroundRenderer } from '../rendering/BackgroundRenderer';
import { TileRenderer } from '../rendering/TileRenderer';
import { PerformanceMonitor } from '../performance/PerformanceMonitor';

interface Game {
    renderer?: PixelRenderer;
    inputSystem: InputSystem;
    musicSystem?: MusicSystem;
    stateManager: GameStateManager;
    physicsSystem: PhysicsSystem;
    assetLoader?: AssetLoader;
    frameCount?: number;
    eventBus?: EventBus;
}

declare global {
    interface Window {
        debugWarp?: (x: number, y: number, tileCoords?: boolean) => void;
        debugSetLives?: (lives: number) => void;
    }
}

/**
 * Game state for play mode
 */
export class PlayState implements GameState {
    public name = 'play';
    private game: Game;
    private eventBus: EventBus;

    private entityManager: EntityManager;
    private levelManager: LevelManager;
    private cameraController: CameraController;
    private hudManager: HUDManager;
    
    private gameController: GameController;
    private eventCoordinator: EventCoordinator;
    
    private backgroundRenderer: BackgroundRenderer;
    private tileRenderer: TileRenderer;

    private gameState: 'playing' | 'paused' | 'cleared' | 'gameover' = 'playing';
    private lastTimeUpdate: number = 0;
    private inputListeners: Array<() => void> = [];
    private stageClearTimer: number | null = null;
    private lives: number = 3;
    private isHandlingDeath: boolean = false;

    public get player() {
        return this.entityManager.getPlayer();
    }
    
    public getEntityManager() {
        return this.entityManager;
    }
    
    public getLevelManager() {
        return this.levelManager;
    }
    
    public getHudManager() {
        return this.hudManager;
    }
    
    public getBackgroundDebugInfo(): { activeClouds: number; offscreenChunks: number } | null {
        return this.backgroundRenderer.getDebugInfo();
    }

    constructor(game: Game) {
        this.game = game;
        
        this.eventBus = new EventBus();
        
        const extendedGame: Game & { eventBus: EventBus } = {
            ...game,
            eventBus: this.eventBus
        };
        
        this.entityManager = new EntityManager(extendedGame);
        this.levelManager = new LevelManager(extendedGame);
        this.cameraController = new CameraController(extendedGame);
        this.hudManager = new HUDManager(extendedGame);
        
        this.gameController = new GameController({
            services: extendedGame,
            entityManager: this.entityManager,
            cameraController: this.cameraController,
            levelManager: this.levelManager,
            hudManager: this.hudManager
        });
        
        this.eventCoordinator = new EventCoordinator({
            eventBus: this.eventBus,
            entityManager: this.entityManager,
            levelManager: this.levelManager,
            onStageClear: () => this.stageClear(),
            onGameOver: () => this.gameOver()
        });
        
        this.backgroundRenderer = new BackgroundRenderer();
        Logger.log('[PlayState] Using optimized background renderer');
        this.tileRenderer = new TileRenderer();

        if (typeof window !== 'undefined') {
            window.debugWarp = (x: number, y: number, tileCoords?: boolean) => 
                this.debugWarp(x, y, tileCoords);
        }
    }

    private resetGameState(): void {
        this.gameState = 'playing';
        this.lives = 3;
        this.isHandlingDeath = false;
    }

    private setupEventListeners(): void {
    }

    private async preloadSprites(): Promise<void> {
        if (!this.game.assetLoader) {
            Logger.warn('[PlayState] AssetLoader not available, skipping sprite preload');
            return;
        }
        
        const startTime = performance.now();
        
        try {
            Logger.log('[PlayState] Checking/loading sprites...');
            
            const loadPromises = [
                this.game.assetLoader.loadSprite('player', 'idle'),
                this.game.assetLoader.loadAnimation('player', 'walk', 4, 100),
                this.game.assetLoader.loadAnimation('player', 'jump', 2, 100),
                
                this.game.assetLoader.loadSprite('player', 'idle_small'),
                this.game.assetLoader.loadAnimation('player', 'walk_small', 4, 100),
                this.game.assetLoader.loadAnimation('player', 'jump_small', 2, 100),

                this.game.assetLoader.loadSprite('terrain', 'spring'),
                this.game.assetLoader.loadSprite('terrain', 'goal_flag'),

                this.game.assetLoader.loadAnimation('items', 'coin_spin', 4, 100),

                this.game.assetLoader.loadAnimation('enemies', 'slime_idle', 2, 500),
                this.game.assetLoader.loadAnimation('enemies', 'bird_fly', 2, 200),
                
                this.game.assetLoader.loadSprite('environment', 'cloud1'),
                this.game.assetLoader.loadSprite('environment', 'cloud2'),
                this.game.assetLoader.loadSprite('environment', 'tree1'),
                
                this.game.assetLoader.loadSprite('tiles', 'ground'),
                this.game.assetLoader.loadSprite('tiles', 'grass_ground')
            ];
            
            await Promise.all(loadPromises);
            
            const endTime = performance.now();
            Logger.log(`[PlayState] Sprites loaded successfully in ${(endTime - startTime).toFixed(2)}ms`);
        } catch (error) {
            Logger.error('Failed to load sprites:', error);
        }
    }

    async enter(params: { level?: string; enableProgression?: boolean } = {}): Promise<void> {
        const enterStartTime = performance.now();
        Logger.log('[PlayState] enter() called with params:', params);
        Logger.log('[PlayState] Starting initialization...');

        this.resetGameState();

        await this.preloadSprites();

        const levelName = params.level || 'stage1-1';
        
        const stageType = this.determineStageType(levelName);
        if (this.game.assetLoader) {
            this.game.assetLoader.setStageType(stageType);
        }
        
        const levelData = await this.gameController.initializeLevel(levelName);
        
        const dimensions = this.levelManager.getLevelDimensions();
        this.cameraController.setLevelBounds(dimensions.width, dimensions.height);
        

        this.hudManager.updateTime(this.levelManager.getTimeLimit());
        this.hudManager.updateLives(this.lives);
        
        this.eventBus.on('player:died', () => {
            if (!this.isHandlingDeath) {
                this.handlePlayerDeath();
            }
        });
        
        Logger.log('[PlayState] levelData:', levelData);
        Logger.log('[PlayState] levelData.name:', levelData?.name);
        if (levelData && levelData.name) {
            this.hudManager.updateStageName(levelData.name);
            Logger.log('[PlayState] Stage name set to:', levelData.name);
        } else {
            const stageName = levelName.toUpperCase().replace('-', ' ');
            this.hudManager.updateStageName(stageName);
            Logger.log('[PlayState] Stage name set to fallback:', stageName);
        }

        this.setupInputListeners();

        this.lastTimeUpdate = Date.now();

        Logger.log('[PlayState] MusicSystem status:', {
            exists: !!this.game.musicSystem,
            isInitialized: this.game.musicSystem?.isInitialized
        });
        if (this.game.musicSystem && this.game.musicSystem.isInitialized) {
            Logger.log('[PlayState] Playing game BGM...');
            this.game.musicSystem.playBGMFromPattern('game');
        }
        
        const player = this.entityManager.getPlayer();
        if (player) {
            Logger.log('[PlayState] Player created successfully');
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('playstate:ready', { 
                    detail: { player: true } 
                }));
            }
        } else {
            Logger.error('[PlayState] Player creation failed!');
        }
        
        const enterEndTime = performance.now();
        Logger.log(`[PlayState] enter() completed in ${(enterEndTime - enterStartTime).toFixed(2)}ms`);
        
        if (typeof window !== 'undefined') {
            window.debugSetLives = (lives: number) => {
                this.lives = lives;
                this.hudManager.updateLives(lives);
                Logger.log('[PlayState] Lives set to:', lives);
            };
        }
    }

    update(deltaTime: number): void {
        this.hudManager.update(deltaTime);
        
        if (this.gameState !== 'playing') return;

        this.updateTimer();

        this.game.physicsSystem.update(deltaTime);

        this.entityManager.updateAll(deltaTime);

        const player = this.entityManager.getPlayer();
        if (player) {
            const dimensions = this.levelManager.getLevelDimensions();
            if (player.x < 0) player.x = 0;
            if (player.x + player.width > dimensions.width) {
                player.x = dimensions.width - player.width;
            }

            if (player.y > dimensions.height && !this.isHandlingDeath) {
                Logger.log('[PlayState] Player fell! Instant death.');
                this.handlePlayerDeath();
            }
        }

        this.entityManager.checkItemCollisions();

        this.cameraController.update(deltaTime);

        const hudData = this.hudManager.getHUDData();
        if (hudData.time <= 0 || this.lives <= 0) {
            this.gameOver();
        }
    }

    render(renderer: PixelRenderer): void {
        const performanceMonitor = PerformanceMonitor.getInstance();
        
        const backgroundColor = this.levelManager.getBackgroundColor();
        renderer.clear(backgroundColor);

        const camera = this.cameraController.getCamera();
        renderer.setCamera(camera.x, camera.y);
        
        performanceMonitor.startLayer('background');
        this.backgroundRenderer.render(renderer);
        performanceMonitor.endLayer();

        performanceMonitor.startLayer('tilemap');
        this.renderTileMap(renderer);
        performanceMonitor.endLayer();

        performanceMonitor.startLayer('entities');
        this.entityManager.renderAll(renderer);
        performanceMonitor.endLayer();

        renderer.setCamera(0, 0);

        performanceMonitor.startLayer('hud');
        this.hudManager.render(renderer);
        performanceMonitor.endLayer();
    }

    exit(): void {
        this.resetGameState();

        if (this.stageClearTimer) {
            clearTimeout(this.stageClearTimer);
            this.stageClearTimer = null;
        }

        this.removeInputListeners();

        if (this.game.musicSystem) {
            this.game.musicSystem.stopBGM();
        }

        if (this.game.physicsSystem) {
            this.game.physicsSystem.entities.clear();
            this.game.physicsSystem.tileMap = null;
        }

        this.entityManager.clear();
        this.levelManager.reset();
        this.cameraController.reset();
        this.hudManager.reset();
    }

    private setupInputListeners(): void {
        this.inputListeners.push(
            this.game.inputSystem.on('keyPress', (event: InputEvent) => {
                if (event.action === 'escape') {
                    this.togglePause();
                }
            })
        );

        this.inputListeners.push(
            this.game.inputSystem.on('keyPress', (event: InputEvent) => {
                if (this.gameState === 'paused' && event.key === 'KeyQ') {
                    this.gameOver();
                }
            })
        );
    }

    private removeInputListeners(): void {
        this.inputListeners.forEach(removeListener => removeListener());
        this.inputListeners = [];
    }

    private updateTimer(): void {
        const now = Date.now();
        const elapsed = (now - this.lastTimeUpdate) / 1000;
        
        if (elapsed >= 1) {
            const hudData = this.hudManager.getHUDData();
            const newTime = hudData.time - 1;
            this.hudManager.updateTime(newTime);
            this.lastTimeUpdate = now;
            
            this.eventBus.emit('game:time-updated', { time: newTime });
        }
    }

    private renderTileMap(renderer: PixelRenderer): void {
        const tileMap = this.levelManager.getTileMap();
        if (!tileMap || tileMap.length === 0) {
            return;
        }
        
        const camera = this.cameraController.getCamera();
        const startCol = Math.floor(camera.x / TILE_SIZE);
        const endCol = Math.ceil((camera.x + camera.width) / TILE_SIZE);
        const startRow = Math.floor(camera.y / TILE_SIZE);
        const endRow = Math.ceil((camera.y + camera.height) / TILE_SIZE);
        
        for (let row = startRow; row < endRow && row < tileMap.length; row++) {
            for (let col = startCol; col < endCol && col < tileMap[row].length; col++) {
                const tile = tileMap[row][col];
                
                if (tile > 0) {
                    this.tileRenderer.renderTile(
                        renderer,
                        tile,
                        col * TILE_SIZE,
                        row * TILE_SIZE
                    );
                }
            }
        }
    }

    private togglePause(): void {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            this.hudManager.setPaused(true);
            this.eventBus.emit('game:paused');
            if (this.game.musicSystem) {
                this.game.musicSystem.pauseBGM();
            }
        } else if (this.gameState === 'paused') {
            this.gameState = 'playing';
            this.hudManager.setPaused(false);
            this.eventBus.emit('game:resumed');
            if (this.game.musicSystem && this.game.musicSystem.isInitialized) {
                this.game.musicSystem.resumeBGM();
            }
        }
    }

    private gameOver(): void {
        if (this.gameState === 'gameover') return;
        
        Logger.log('Game Over!');
        this.gameState = 'gameover';
        
        if (this.game.musicSystem) {
            this.game.musicSystem.stopBGM();
        }
        
        this.hudManager.showMessage('GAME OVER', 999999);
        
        setTimeout(() => {
            this.game.stateManager.setState('menu');
        }, 2000);
    }

    private stageClear(): void {
        if (this.stageClearTimer !== null) {
            return;
        }
        
        this.gameState = 'cleared';
        
        
        this.game.musicSystem?.playBGMFromPattern('victory');
        
        this.hudManager.showMessage('STAGE CLEAR!', 999999);
        
        const nextLevel = this.levelManager.getNextLevel();
        
        this.stageClearTimer = window.setTimeout(() => {
            this.stageClearTimer = null;
            
            if (nextLevel) {
                this.game.stateManager.setState('play', { level: nextLevel });
            } else {
                this.showEnding();
            }
        }, 3000);
    }
    
    
    private showEnding(): void {
        this.game.musicSystem?.stopBGM();
        
        this.game.musicSystem?.playBGMFromPattern('victory');
        
        this.hudManager.showMessage('CONGRATULATIONS!\nGAME COMPLETE!', 999999);
        
        setTimeout(() => {
            this.game.stateManager.setState('menu');
        }, 5000);
    }

    private handlePlayerDeath(): void {
        if (this.isHandlingDeath) return;
        
        const player = this.entityManager.getPlayer();
        if (!player) return;
        
        this.isHandlingDeath = true;
        
        this.eventBus.emit('player:died');
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('player:died'));
        }
        
        this.lives--;
        this.hudManager.updateLives(this.lives);
        Logger.log(`[PlayState] handlePlayerDeath: lives after decrement: ${this.lives}`);
        
        if (this.lives <= 0) {
            Logger.log('[PlayState] No lives left, triggering game over');
            this.gameOver();
        } else {
            const spawn = this.levelManager.getPlayerSpawn();
            Logger.log(`[PlayState] Respawning player at: ${spawn.x}, ${spawn.y}`);
            player.respawn(spawn.x * TILE_SIZE, spawn.y * TILE_SIZE);
            
            setTimeout(() => {
                this.isHandlingDeath = false;
            }, 100);
        }
    }

    private debugWarp(x: number, y: number, tileCoords: boolean = false): void {
        const player = this.entityManager.getPlayer();
        if (!player) {
            Logger.warn('Player not found');
            return;
        }

        const pixelX = tileCoords ? x * TILE_SIZE : x;
        const pixelY = tileCoords ? y * TILE_SIZE : y;

        player.x = pixelX;
        player.y = pixelY;
        player.vx = 0;
        player.vy = 0;
        player.grounded = false;

        this.cameraController.update(0);
        
        Logger.log(`Player warped to (${pixelX}, ${pixelY})`);
    }
    
    private determineStageType(levelName: string): StageType {
        if (levelName.startsWith('stage1')) {
            return 'grassland';
        } else if (levelName.startsWith('stage2')) {
            return 'cave';
        } else if (levelName.startsWith('stage3')) {
            return 'snow';
        }
        return 'grassland';
    }
}