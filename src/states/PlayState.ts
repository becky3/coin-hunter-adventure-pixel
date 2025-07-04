import { GameState } from './GameStateManager';
import { PixelRenderer } from '../rendering/PixelRenderer';
import { InputEvent } from '../core/InputSystem';
import { EntityManager } from '../managers/EntityManager';
import { LevelManager } from '../managers/LevelManager';
import { CameraController } from '../controllers/CameraController';
import { HUDManager } from '../ui/HUDManager';
import { EventBus } from '../services/EventBus';
import { GameController } from '../controllers/GameController';
import { EventCoordinator } from '../controllers/EventCoordinator';
import { TILE_SIZE } from '../constants/gameConstants';

interface Game {
    renderer?: PixelRenderer;
    inputSystem: any;
    musicSystem?: any;
    stateManager: any;
    physicsSystem: any;
    assetLoader?: any;
    frameCount?: number;
    eventBus?: EventBus;
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
    
    // Controllers
    private gameController: GameController;
    private eventCoordinator: EventCoordinator;

    // Game state
    private gameState: 'playing' | 'paused' | 'cleared' | 'gameover' = 'playing';
    private lastTimeUpdate: number = 0;
    private inputListeners: Array<() => void> = [];
    private stageClearTimer: number | null = null;
    private lives: number = 3; // 残機はPlayStateで管理

    // Public getters for testing
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

    constructor(game: Game) {
        this.game = game;
        
        // Create shared EventBus instance
        this.eventBus = new EventBus();
        
        // Create extended game object with eventBus
        const extendedGame: any = {
            ...game,
            eventBus: this.eventBus
        };
        
        // Initialize managers with extended game services
        this.entityManager = new EntityManager(extendedGame);
        this.levelManager = new LevelManager(extendedGame);
        this.cameraController = new CameraController(extendedGame);
        this.hudManager = new HUDManager(extendedGame);
        
        // Initialize controllers
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

        // Setup debug warp function
        if (typeof window !== 'undefined') {
            window.debugWarp = (x: number, y: number, tileCoords?: boolean) => 
                this.debugWarp(x, y, tileCoords);
        }
    }

    private setupEventListeners(): void {
        // Event handling is now managed by EventCoordinator
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
        console.log('[PlayState] enter() called with params:', params);
        console.log('[PlayState] Starting initialization...');

        // Preload sprites
        await this.preloadSprites();

        // Initialize level with GameController
        const levelName = params.level || 'stage1-1';
        const levelData = await this.gameController.initializeLevel(levelName);
        
        // Setup level bounds for camera
        const dimensions = this.levelManager.getLevelDimensions();
        this.cameraController.setLevelBounds(dimensions.width, dimensions.height);

        // Initialize HUD with level data
        this.hudManager.updateTime(this.levelManager.getTimeLimit());
        this.hudManager.updateLives(this.lives); // 残機を表示
        
        // Set stage name in HUD
        console.log('[PlayState] levelData:', levelData);
        console.log('[PlayState] levelData.name:', levelData?.name);
        if (levelData && levelData.name) {
            this.hudManager.updateStageName(levelData.name);
            console.log('[PlayState] Stage name set to:', levelData.name);
        } else {
            // Fallback to using the level ID
            const stageName = levelName.toUpperCase().replace('-', ' ');
            this.hudManager.updateStageName(stageName);
            console.log('[PlayState] Stage name set to fallback:', stageName);
        }

        // Setup input listeners
        this.setupInputListeners();

        // Initialize timer
        this.lastTimeUpdate = Date.now();

        // Play BGM
        console.log('[PlayState] MusicSystem status:', {
            exists: !!this.game.musicSystem,
            isInitialized: this.game.musicSystem?.isInitialized
        });
        if (this.game.musicSystem && this.game.musicSystem.isInitialized) {
            console.log('[PlayState] Playing game BGM...');
            this.game.musicSystem.playBGMFromPattern('game');
        }
        
        console.log('[PlayState] enter() completed');
    }

    update(deltaTime: number): void {
        // Always update HUD (even when paused or cleared, for messages)
        this.hudManager.update(deltaTime);
        
        // Only update game logic when playing
        if (this.gameState !== 'playing') return;

        // Update timer
        this.updateTimer();

        // Update physics
        this.game.physicsSystem.update(deltaTime);

        // Update entities
        this.entityManager.updateAll(deltaTime);

        // Update player-specific logic
        const player = this.entityManager.getPlayer();
        if (player) {
            // Boundary checks
            const dimensions = this.levelManager.getLevelDimensions();
            if (player.x < 0) player.x = 0;
            if (player.x + player.width > dimensions.width) {
                player.x = dimensions.width - player.width;
            }

            // Death by falling - instant death, lose a life
            if (player.y > dimensions.height) {
                console.log(`[PlayState] Player fell into pit! Lives before: ${this.lives}`);
                this.handlePlayerDeath();
            }
            
            // Check if player died from damage
            if (player.isDead) {
                console.log(`[PlayState] Player died from damage! Lives before: ${this.lives}`);
                this.handlePlayerDeath();
            }
        }

        // Check item collisions
        this.entityManager.checkItemCollisions();

        // Update camera
        this.cameraController.update(deltaTime);

        // Check game over conditions
        const hudData = this.hudManager.getHUDData();
        if (hudData.time <= 0 || this.lives <= 0) {
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
        // Reset game state
        this.gameState = 'playing';

        // Clear stage clear timer if exists
        if (this.stageClearTimer) {
            clearTimeout(this.stageClearTimer);
            this.stageClearTimer = null;
        }

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
            // TileMap not loaded yet, this is normal during initialization
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
        // Don't toggle pause during cleared or gameover states
    }

    private gameOver(): void {
        if (this.gameState === 'gameover') return;
        
        console.log('Game Over!');
        this.gameState = 'gameover';
        
        // Stop the BGM
        if (this.game.musicSystem) {
            this.game.musicSystem.stopBGM();
        }
        
        // Show game over message
        this.hudManager.showMessage('GAME OVER', 999999);
        
        // Transition to menu after 2 seconds
        setTimeout(() => {
            this.game.stateManager.setState('menu');
        }, 2000);
    }

    private stageClear(): void {
        // 既にクリア済みならスキップ
        if (this.stageClearTimer !== null) {
            return;
        }
        
        this.gameState = 'cleared';
        
        // Stop the timer (but don't show pause menu)
        // this.hudManager.setPaused(true);
        
        // Play clear sound
        this.game.musicSystem?.playBGMFromPattern('victory');
        
        // Show clear message (until state changes)
        this.hudManager.showMessage('STAGE CLEAR!', 999999);
        
        // Transition to menu after 3 seconds
        this.stageClearTimer = window.setTimeout(() => {
            this.stageClearTimer = null;
            this.game.stateManager.setState('menu');
        }, 3000);
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
    
    private handlePlayerDeath(): void {
        const player = this.entityManager.getPlayer();
        if (!player) return;
        
        // Lose a life
        this.lives--;
        this.hudManager.updateLives(this.lives);
        console.log(`[PlayState] Lives remaining: ${this.lives}`);
        
        // Check game over
        if (this.lives <= 0) {
            this.gameOver();
        } else {
            // Respawn with full health
            const spawn = this.levelManager.getPlayerSpawn();
            player.respawn(spawn.x * TILE_SIZE, spawn.y * TILE_SIZE);
            console.log(`[PlayState] Player respawned with full health: ${player.health}`);
        }
    }
}