import { EntityManager } from '../managers/EntityManager';
import { CameraController } from './CameraController';
import { LevelManager } from '../managers/LevelManager';
import { HUDManager } from '../ui/HUDManager';
import { EventBus } from '../services/EventBus';
import { TILE_SIZE } from '../constants/gameConstants';

export interface GameServices {
    physicsSystem: any;
    renderer: any;
    inputSystem: any;
    eventBus: EventBus;
}

export interface GameControllerConfig {
    services: GameServices;
    entityManager: EntityManager;
    cameraController: CameraController;
    levelManager: LevelManager;
    hudManager: HUDManager;
}

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
        this.eventBus.on('player:score-changed', (data: any) => {
            this.hudManager.updateScore(data.score);
        });
        
        this.eventBus.on('player:health-changed', (data: any) => {
            this.hudManager.updateHealth(data.health, data.maxHealth);
        });
        
        this.eventBus.on('player:coins-changed', (data: any) => {
            this.hudManager.updateCoins(data.coins);
        });
    }
    
    async initializeLevel(levelName: string): Promise<any> {
        // Clear physics system
        this.services.physicsSystem.clearEntities();
        
        // Initialize level manager
        await this.levelManager.initialize();
        
        // Load level
        await this.levelManager.loadLevel(levelName);
        
        // Initialize entities based on level data
        const levelData = this.levelManager.getLevelData();
        if (levelData) {
            // Create player
            const spawn = this.levelManager.getPlayerSpawn();
            this.entityManager.createPlayer(spawn.x * TILE_SIZE, spawn.y * TILE_SIZE);
            
            // Create entities from level data
            const entities = this.levelManager.getEntities();
            if (entities.length > 0) {
                this.entityManager.createEntitiesFromConfig(entities);
            } else {
                // Create test entities if no level entities
                this.entityManager.createTestEntities();
            }
            
            // Create goal if defined in level data
            const levelLoader = this.levelManager.getLevelLoader();
            if (levelLoader) {
                const goalPosition = levelLoader.getGoalPosition(levelData);
                if (goalPosition) {
                    this.entityManager.createEntityFromConfig({
                        type: 'goal',
                        x: goalPosition.x,
                        y: goalPosition.y
                    });
                }
            }
        }
        
        // Setup camera
        const player = this.entityManager.getPlayer();
        if (player) {
            this.cameraController.setTarget(player);
        }
        
        // Initialize HUD
        this.hudManager.initialize();
        this.hudManager.updateScore(player?.score || 0);
        this.hudManager.updateHealth(player?.health || 0, player?.maxHealth || 0);
        this.hudManager.updateCoins(player?.coins || 0);
        this.hudManager.updateTimer(this.gameTime);
        
        // Return the loaded level data
        return levelData;
    }
    
    update(deltaTime: number): void {
        // Handle pause toggle
        if (this.services.inputSystem.isActionJustPressed('pause')) {
            const currentTime = Date.now();
            if (currentTime - this.lastPauseToggleTime > 300) {
                this.isPaused = !this.isPaused;
                this.lastPauseToggleTime = currentTime;
                console.log('Game paused:', this.isPaused);
                
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
        
        // Update game time
        this.gameTime += deltaTime;
        this.hudManager.updateTimer(this.gameTime);
        
        // Update game systems
        this.entityManager.updateAll(deltaTime);
        this.cameraController.update(deltaTime);
        this.hudManager.update(deltaTime);
        
        // Update physics
        this.services.physicsSystem.update(deltaTime);
    }
    
    render(): void {
        const renderer = this.services.renderer;
        
        // Render level
        this.levelManager.renderTileMap(renderer);
        
        // Render entities
        this.entityManager.renderAll(renderer);
        
        // Render HUD (always on top)
        this.hudManager.render(renderer);
    }
    
    cleanup(): void {
        this.hudManager.cleanup();
        this.entityManager.clear();
        this.services.physicsSystem.clearEntities();
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