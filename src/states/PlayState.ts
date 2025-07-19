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
import { ShieldEffect } from '../powerups/ShieldEffect';
import { PowerGloveEffect } from '../powerups/PowerGloveEffect';
import { PowerUpType, PowerUpConfig } from '../types/PowerUpTypes';

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
    
    private initializePowerUpEffects(): void {
        const player = this.entityManager.getPlayer();
        if (!player) return;
        
        const powerUpManager = player.getPowerUpManager();
        powerUpManager.registerEffect(PowerUpType.SHIELD_STONE, new ShieldEffect(this.entityManager));
        powerUpManager.registerEffect(PowerUpType.POWER_GLOVE, new PowerGloveEffect(this.entityManager));
        
        Logger.log('[PlayState] Power-up effects initialized');
    }

    private setupEventListeners(): void {
    }

    private async preloadSprites(): Promise<void> {
        if (!this.game.assetLoader) {
            Logger.warn('[PlayState] AssetLoader not available, skipping sprite preload');
            return;
        }
        
        const startTime = performance.now();
        const failedSprites: string[] = [];
        
        try {
            Logger.log('[PlayState] Checking/loading sprites...');
            
            const spriteList = [
                { category: 'player', name: 'idle' },
                { category: 'player', name: 'idle_small' },
                { category: 'terrain', name: 'spring' },
                { category: 'terrain', name: 'goal_flag' },
                { category: 'enemies', name: 'bat_hang' },
                { category: 'enemies', name: 'bat_fly1' },
                { category: 'enemies', name: 'bat_fly2' },
                { category: 'enemies', name: 'spider_idle' },
                { category: 'enemies', name: 'spider_walk1' },
                { category: 'enemies', name: 'spider_walk2' },
                { category: 'enemies', name: 'spider_thread' },
                { category: 'enemies', name: 'armor_knight' },
                { category: 'environment', name: 'cloud1' },
                { category: 'environment', name: 'cloud2' },
                { category: 'environment', name: 'tree1' },
                { category: 'tiles', name: 'ground' },
                { category: 'tiles', name: 'grass_ground' },
                { category: 'powerups', name: 'shield_stone' },
                { category: 'powerups', name: 'power_glove' },
                { category: 'projectiles', name: 'energy_bullet' },
                { category: 'effects', name: 'shield_left' },
                { category: 'effects', name: 'shield_right' }
            ];
            
            const animationList = [
                { category: 'player', baseName: 'walk', frameCount: 4, frameDuration: 100 },
                { category: 'player', baseName: 'jump', frameCount: 2, frameDuration: 100 },
                { category: 'player', baseName: 'walk_small', frameCount: 4, frameDuration: 100 },
                { category: 'player', baseName: 'jump_small', frameCount: 2, frameDuration: 100 },
                { category: 'items', baseName: 'coin_spin', frameCount: 4, frameDuration: 100 },
                { category: 'enemies', baseName: 'slime_idle', frameCount: 2, frameDuration: 500 },
                { category: 'enemies', baseName: 'bird_fly', frameCount: 2, frameDuration: 200 }
            ];
            
            const loadPromises = [
                ...spriteList.map(sprite => {
                    if (!this.game.assetLoader) {
                        throw new Error('AssetLoader not available');
                    }
                    return this.game.assetLoader.loadSprite(sprite.category, sprite.name)
                        .catch(error => {
                            failedSprites.push(`${sprite.category}/${sprite.name}`);
                            Logger.error(`[PlayState] Failed to load sprite ${sprite.category}/${sprite.name}:`, error);
                            throw error;
                        });
                }),
                ...animationList.map(anim => {
                    if (!this.game.assetLoader) {
                        throw new Error('AssetLoader not available');
                    }
                    return this.game.assetLoader.loadAnimation(anim.category, anim.baseName, anim.frameCount, anim.frameDuration)
                        .catch(error => {
                            failedSprites.push(`${anim.category}/${anim.baseName} (animation)`);
                            throw error;
                        });
                })
            ];
            
            await Promise.all(loadPromises);
            
            const endTime = performance.now();
            Logger.log(`[PlayState] Sprites loaded successfully in ${(endTime - startTime).toFixed(2)}ms`);
        } catch (error) {
            Logger.error('Failed to load sprites:', error);
            if (failedSprites.length > 0) {
                Logger.error('Failed sprites:', failedSprites);
            }
            const errorMessage = failedSprites.length > 0 
                ? `Critical error: Failed to load game sprites: ${failedSprites.join(', ')}`
                : `Critical error: Failed to load game sprites. ${error instanceof Error ? error.message : 'Unknown error'}`;
            throw new Error(errorMessage);
        }
    }

    async enter(params: { level?: string; enableProgression?: boolean; playerState?: { score?: number; lives?: number; powerUps?: string[]; isSmall?: boolean } } = {}): Promise<void> {
        const enterStartTime = performance.now();
        Logger.log('[PlayState] enter() called with params:', params);
        Logger.log('[PlayState] Starting initialization...');

        this.resetGameState();

        await this.preloadSprites();

        const levelName = params.level;
        if (!levelName) {
            throw new Error('No level specified in PlayState parameters');
        }
        
        const stageType = this.determineStageType(levelName);
        if (this.game.assetLoader) {
            this.game.assetLoader.setStageType(stageType);
        }
        
        const levelData = await this.gameController.initializeLevel(levelName);
        
        const dimensions = this.levelManager.getLevelDimensions();
        this.cameraController.setLevelBounds(dimensions.width, dimensions.height);
        

        this.hudManager.updateTime(this.levelManager.getTimeLimit());
        
        if (params.playerState) {
            const { score, lives } = params.playerState;
            
            if (score !== undefined) {
                this.hudManager.updateScore(score);
            }
            if (lives !== undefined) {
                this.lives = lives;
                this.hudManager.updateLives(lives);
            }
        }
        this.hudManager.updateLives(this.lives);
        
        this.eventBus.on('player:died', () => {
            if (!this.isHandlingDeath) {
                this.handlePlayerDeath();
            }
        });
        
        this.initializePowerUpEffects();
        
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
        Logger.log(`[PlayState] After initializeLevel, player = ${player ? 'exists' : 'null'}`);
        if (player) {
            Logger.log('[PlayState] Player created successfully');
            Logger.log(`[PlayState] Player position: (${player.x}, ${player.y})`);
            
            if (params.playerState && params.playerState.powerUps) {
                const powerUpManager = player.getPowerUpManager();
                params.playerState.powerUps.forEach((powerUpType: string) => {
                    Logger.log(`[PlayState] Restoring power-up: ${powerUpType}`);
                    const config = this.getPowerUpRestoreConfig(powerUpType);
                    if (config) {
                        powerUpManager.applyPowerUp(config);
                    } else {
                        Logger.warn(`[PlayState] Unknown power-up type: ${powerUpType}`);
                    }
                });
            }
            
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('playstate:ready', { 
                    detail: { player: true } 
                }));
            }
        } else {
            Logger.error('[PlayState] Player creation failed!');
            Logger.error('[PlayState] Checking EntityManager state...');
            const entities = this.entityManager.getItems();
            Logger.error(`[PlayState] Items count: ${entities.length}`);
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
        this.entityManager.checkProjectileCollisions();

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
                const player = this.entityManager.getPlayer();
                const playerState = player ? {
                    score: this.hudManager.getHUDData().score,
                    lives: this.lives,
                    powerUps: player.getPowerUpManager().getActivePowerUps(),
                    isSmall: (player as Player & { isSmall: boolean }).isSmall
                } : null;
                
                this.game.stateManager.setState('play', { 
                    level: nextLevel,
                    playerState 
                });
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

    private getPowerUpRestoreConfig(powerUpType: string): PowerUpConfig | null {
        switch (powerUpType) {
        case 'POWER_GLOVE':
            return {
                type: PowerUpType.POWER_GLOVE,
                permanent: true,
                stackable: false,
                effectProperties: {
                    bulletSpeed: 5,
                    fireRate: 500
                }
            };
                
        case 'SHIELD_STONE':
            return {
                type: PowerUpType.SHIELD_STONE,
                permanent: true,
                stackable: false,
                effectProperties: {
                    charges: 1
                }
            };
                
        case 'WING_BOOTS':
            return {
                type: PowerUpType.WING_BOOTS,
                permanent: true,
                stackable: false
            };
                
        case 'HEAVY_BOOTS':
            return {
                type: PowerUpType.HEAVY_BOOTS,
                permanent: true,
                stackable: false
            };
                
        case 'RAINBOW_STAR':
            return {
                type: PowerUpType.RAINBOW_STAR,
                duration: 10000,
                stackable: false
            };
                
        default:
            return null;
        }
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