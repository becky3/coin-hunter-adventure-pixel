import { EntityManager } from '../managers/EntityManager';
import { CameraController } from './CameraController';
import { LevelManager, LevelData } from '../managers/LevelManager';
import { HUDManager } from '../ui/HUDManager';
import { EventBus } from '../services/EventBus';
import { TILE_SIZE } from '../constants/gameConstants';
import { Logger } from '../utils/Logger';
import { PhysicsSystem } from '../physics/PhysicsSystem';
import { PixelRenderer } from '../rendering/PixelRenderer';
import { InputSystem } from '../core/InputSystem';

export interface GameServices {
    physicsSystem: PhysicsSystem;
    renderer: PixelRenderer;
    inputSystem: InputSystem;
    eventBus: EventBus;
}

export interface GameControllerConfig {
    services: GameServices;
    entityManager: EntityManager;
    cameraController: CameraController;
    levelManager: LevelManager;
    hudManager: HUDManager;
}

/**
 * Controls game behavior
 */
export class GameController {
    private services: GameServices;
    private entityManager: EntityManager;
    private cameraController: CameraController;
    private levelManager: LevelManager;
    private hudManager: HUDManager;
    private eventBus: EventBus;
    
    private gameTime: number = 0;
    private pauseTimeAccumulator: number = 0;
    private lastPauseToggleTime: number = 0;
    private isPaused: boolean = false;
    
    constructor(config: GameControllerConfig) {
        this.services = config.services;
        this.entityManager = config.entityManager;
        this.cameraController = config.cameraController;
        this.levelManager = config.levelManager;
        this.hudManager = config.hudManager;
        this.eventBus = config.services.eventBus;
        
        this.setupEventListeners();
    }
    
    private setupEventListeners(): void {
        this.eventBus.on<{score: number}>('player:score-changed', (data) => {
            this.hudManager.updateScore(data.score);
        });
        
        
        this.eventBus.on<{coins: number}>('player:coins-changed', (data) => {
            this.hudManager.updateCoins(data.coins);
        });
    }
    
    async initializeLevel(levelName: string): Promise<LevelData | null> {
        this.entityManager.clear();
        
        await this.levelManager.initialize();
        
        await this.levelManager.loadLevel(levelName);
        
        const levelData = this.levelManager.getLevelData();
        if (levelData) {
            const spawn = this.levelManager.getPlayerSpawn();
            
            const tileMap = this.levelManager.getTileMap();
            if (tileMap && tileMap[spawn.y] && tileMap[spawn.y][spawn.x] === 1) {
                Logger.error(`[GameController] エラー: プレイヤーのスポーン位置(${spawn.x}, ${spawn.y})が地面の中です！`);
                Logger.error(`[GameController] ステージ: ${levelName}`);
                Logger.error('[GameController] 注意: スポーン座標はプレイヤーの左下（足元）の位置です');
                throw new Error(`Invalid player spawn position: (${spawn.x}, ${spawn.y}) is inside solid tile`);
            }
            
            const belowY = spawn.y + 1;
            if (tileMap && belowY < tileMap.length && tileMap[belowY] && tileMap[belowY][spawn.x] !== 1) {
                Logger.warn(`[GameController] 警告: プレイヤーのスポーン位置(${spawn.x}, ${spawn.y})の下に地面がありません`);
            }
            
            this.entityManager.createPlayer(spawn.x * TILE_SIZE, spawn.y * TILE_SIZE);
            
            const entities = this.levelManager.getEntities();
            if (entities.length > 0) {
                this.entityManager.createEntitiesFromConfig(entities);
            } else {
                this.entityManager.createTestEntities();
            }
            
            const levelLoader = this.levelManager.getLevelLoader();
            if (levelLoader) {
                const goalPosition = levelLoader.getGoalPosition(levelData);
                if (goalPosition) {
                    this.entityManager.createEntity({
                        type: 'goal',
                        x: goalPosition.x,
                        y: goalPosition.y
                    });
                }
            }
        }
        
        const player = this.entityManager.getPlayer();
        if (player) {
            this.cameraController.setTarget(player);
        }
        
        this.hudManager.initialize();
        this.hudManager.updateScore(player?.score || 0);
        this.hudManager.updateCoins(player?.coins || 0);
        this.hudManager.updateTimer(this.gameTime);
        
        return levelData;
    }
    
    update(deltaTime: number): void {
        if (this.services.inputSystem.isActionJustPressed('pause')) {
            const currentTime = Date.now();
            if (currentTime - this.lastPauseToggleTime > 300) {
                this.isPaused = !this.isPaused;
                this.lastPauseToggleTime = currentTime;
                Logger.log('Game paused:', this.isPaused);
                
                if (this.isPaused) {
                    this.hudManager.showPauseOverlay();
                } else {
                    this.hudManager.hidePauseOverlay();
                }
            }
        }
        
        if (this.isPaused) {
            this.pauseTimeAccumulator += deltaTime;
            return;
        }
        
        this.gameTime += deltaTime;
        this.hudManager.updateTimer(this.gameTime);
        
        this.entityManager.updateAll(deltaTime);
        this.cameraController.update(deltaTime);
        this.hudManager.update(deltaTime);
    }
    
    render(): void {
        const renderer = this.services.renderer;
        
        this.levelManager.renderTileMap(renderer);
        
        this.entityManager.renderAll(renderer);
        
        this.hudManager.render(renderer);
    }
    
    cleanup(): void {
        this.hudManager.cleanup();
        this.entityManager.clear();
    }
    
    getGameTime(): number {
        return this.gameTime;
    }
    
    isPausedState(): boolean {
        return this.isPaused;
    }
    
    setPaused(paused: boolean): void {
        this.isPaused = paused;
        if (paused) {
            this.hudManager.showPauseOverlay();
        } else {
            this.hudManager.hidePauseOverlay();
        }
    }
}