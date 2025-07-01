import { GameState } from './GameStateManager';
import { PixelRenderer } from '../rendering/PixelRenderer';
import { InputEvent } from '../core/InputSystem';
import { EntityManager } from '../managers/EntityManager';
import { LevelManager } from '../managers/LevelManager';
import { CameraController } from '../controllers/CameraController';
import { HUDManager } from '../ui/HUDManager';
import { ServiceLocator } from '../core/ServiceLocator';
import { EventBus } from '../core/EventBus';
import { TILE_SIZE } from '../constants/gameConstants';

interface Game {
    renderer?: PixelRenderer;
    inputSystem: any;
    musicSystem?: any;
    stateManager: any;
    physicsSystem: any;
    assetLoader?: any;
    frameCount?: number;
}

declare global {
    interface Window {
        debugWarp?: (x: number, y: number, tileCoords?: boolean) => void;
    }
}

export class PlayState implements GameState {
    public name = 'play';
    private game: Game;
    private eventBus: EventBus;

    // Managers
    private entityManager: EntityManager;
    private levelManager: LevelManager;
    private cameraController: CameraController;
    private hudManager: HUDManager;

    // Game state
    private isPaused: boolean = false;
    private lastTimeUpdate: number = 0;
    private inputListeners: Array<() => void> = [];

    constructor(game: Game) {
        this.game = game;
        this.eventBus = ServiceLocator.get('EventBus');

        // Initialize managers
        this.entityManager = new EntityManager();
        this.levelManager = new LevelManager();
        this.cameraController = new CameraController();
        this.hudManager = new HUDManager();

        // Setup debug warp function
        if (typeof window !== 'undefined') {
            window.debugWarp = (x: number, y: number, tileCoords?: boolean) => 
                this.debugWarp(x, y, tileCoords);
        }

        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        // Listen for game events
        this.eventBus.on('coin:collected', (data: any) => {
            console.log(`Coin collected! Score: ${data.score}`);
        });

        this.eventBus.on('goal:reached', () => {
            console.log('Stage Clear!');
            this.stageClear();
        });

        this.eventBus.on('player:died', () => {
            const player = this.entityManager.getPlayer();
            if (player && player.health > 0) {
                const spawn = this.levelManager.getPlayerSpawn();
                player.respawn(spawn.x * TILE_SIZE, spawn.y * TILE_SIZE);
            } else {
                this.gameOver();
            }
        });
    }

    private async preloadSprites(): Promise<void> {
        try {
            // Player sprites
            await this.game.assetLoader.loadSprite('player', 'idle');
            await this.game.assetLoader.loadAnimation('player', 'walk', 4, 100);
            await this.game.assetLoader.loadAnimation('player', 'jump', 2, 100);

            // Terrain sprites
            await this.game.assetLoader.loadSprite('terrain', 'spring');
            await this.game.assetLoader.loadSprite('terrain', 'goal_flag');

            // Item sprites
            await this.game.assetLoader.loadAnimation('items', 'coin_spin', 4, 100);
            
        } catch (error) {
            console.error('Failed to preload sprites:', error);
        }
    }

    async enter(params: any = {}): Promise<void> {
        console.log('PlayState: enter() called with params:', params);

        // Preload sprites
        await this.preloadSprites();

        // Clear physics system
        this.game.physicsSystem.entities.clear();

        // Initialize level manager
        await this.levelManager.initialize();

        // Load level
        const levelName = params.level || 'tutorial';
        console.log('PlayState: Loading level:', levelName);
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
        }

        // Setup camera
        const player = this.entityManager.getPlayer();
        if (player) {
            this.cameraController.setTarget(player);
            const dimensions = this.levelManager.getLevelDimensions();
            this.cameraController.setLevelBounds(dimensions.width, dimensions.height);
        }

        // Initialize HUD with level data
        this.hudManager.updateTime(this.levelManager.getTimeLimit());
        if (player) {
            this.hudManager.updateLives(player.health);
        }

        // Setup input listeners
        this.setupInputListeners();

        // Initialize timer
        this.lastTimeUpdate = Date.now();

        // Play BGM
        console.log('PlayState: MusicSystem status:', {
            exists: !!this.game.musicSystem,
            isInitialized: this.game.musicSystem?.isInitialized
        });
        if (this.game.musicSystem && this.game.musicSystem.isInitialized) {
            console.log('PlayState: Playing game BGM...');
            this.game.musicSystem.playGameBGM();
        }
    }

    update(deltaTime: number): void {
        if (this.isPaused) return;

        // Update timer
        this.updateTimer();

        // Update physics
        this.game.physicsSystem.update(deltaTime);

        // Update entities
        this.entityManager.updateAll(deltaTime);

        // Update player-specific logic
        const player = this.entityManager.getPlayer();
        if (player) {
            // Update HUD lives
            this.hudManager.updateLives(player.health);

            // Boundary checks
            const dimensions = this.levelManager.getLevelDimensions();
            if (player.x < 0) player.x = 0;
            if (player.x + player.width > dimensions.width) {
                player.x = dimensions.width - player.width;
            }

            // Death by falling
            if (player.y > dimensions.height) {
                player.takeDamage(player.maxHealth);
                this.eventBus.emit('player:died');
            }
        }

        // Check item collisions
        this.entityManager.checkItemCollisions();

        // Update camera
        this.cameraController.update(deltaTime);

        // Check game over conditions
        const hudData = this.hudManager.getHUDData();
        if (hudData.time <= 0 || hudData.lives <= 0) {
            this.gameOver();
        }
    }

    render(renderer: PixelRenderer): void {
        // Clear screen with background color
        const backgroundColor = this.levelManager.getBackgroundColor();
        renderer.clear(backgroundColor);

        // Set camera for world rendering
        const camera = this.cameraController.getCamera();
        renderer.setCamera(camera.x, camera.y);

        // Render tile map
        this.renderTileMap(renderer);

        // Render entities
        this.entityManager.renderAll(renderer);

        // Reset camera for HUD rendering
        renderer.setCamera(0, 0);

        // Render HUD
        this.hudManager.render(renderer);
    }

    exit(): void {
        this.isPaused = false;

        // Remove input listeners
        this.removeInputListeners();

        // Stop music
        if (this.game.musicSystem) {
            this.game.musicSystem.stopBGM();
        }

        // Clear physics system
        if (this.game.physicsSystem) {
            this.game.physicsSystem.entities.clear();
            this.game.physicsSystem.tileMap = null;
        }

        // Reset managers
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
                if (this.isPaused && event.key === 'KeyQ') {
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
            console.warn('No tileMap available');
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
                
                if (tile === 1) {
                    renderer.drawRect(
                        col * TILE_SIZE,
                        row * TILE_SIZE,
                        TILE_SIZE,
                        TILE_SIZE,
                        '#228B22'
                    );
                }
            }
        }
    }

    private togglePause(): void {
        this.isPaused = !this.isPaused;
        this.hudManager.setPaused(this.isPaused);
        
        if (this.isPaused) {
            this.eventBus.emit('game:paused');
            if (this.game.musicSystem) {
                this.game.musicSystem.pauseBGM();
            }
        } else {
            this.eventBus.emit('game:resumed');
            if (this.game.musicSystem && this.game.musicSystem.isInitialized) {
                this.game.musicSystem.resumeBGM();
            }
        }
    }

    private gameOver(): void {
        console.log('Game Over!');
        this.game.stateManager.setState('menu');
    }

    private stageClear(): void {
        console.log('Stage Clear!');
        // TODO: Implement result screen transition
        this.game.stateManager.setState('menu');
    }

    private debugWarp(x: number, y: number, tileCoords: boolean = false): void {
        const player = this.entityManager.getPlayer();
        if (!player) {
            console.warn('Player not found');
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
        
        console.log(`Player warped to (${pixelX}, ${pixelY})`);
    }
}