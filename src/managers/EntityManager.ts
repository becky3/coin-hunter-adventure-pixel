import { Entity } from '../entities/Entity';
import { Enemy } from '../entities/Enemy';
import { Player } from '../entities/Player';
import { Coin } from '../entities/Coin';
import { Spring } from '../entities/Spring';
import { GoalFlag } from '../entities/GoalFlag';
import { Slime } from '../entities/enemies/Slime';
import { TILE_SIZE } from '../constants/gameConstants';
import { EventBus } from '../services/EventBus';
import { PixelRenderer } from '../rendering/PixelRenderer';
import { PhysicsSystem } from '../physics/PhysicsSystem';
import { MusicSystem } from '../audio/MusicSystem';
import { AssetLoader } from '../assets/AssetLoader';
import { InputSystem } from '../core/InputSystem';
import { Logger } from '../utils/Logger';

export interface EntityConfig {
    type: string;
    x: number;
    y: number;
}

interface GameServices {
    eventBus?: EventBus;
    physicsSystem: PhysicsSystem;
    musicSystem?: MusicSystem;
    assetLoader?: AssetLoader;
    inputSystem: InputSystem;
}

/**
 * Manages entity functionality
 */
export class EntityManager {
    private player: Player | null = null;
    private enemies: Enemy[] = [];
    private items: Entity[] = [];
    private platforms: Entity[] = [];
    private eventBus: EventBus;
    private physicsSystem: PhysicsSystem;
    private musicSystem: MusicSystem | undefined;
    private assetLoader: AssetLoader | undefined;
    private inputSystem: InputSystem;

    constructor(game: GameServices) {
        this.eventBus = game.eventBus || new EventBus();
        this.physicsSystem = game.physicsSystem;
        this.musicSystem = game.musicSystem;
        this.assetLoader = game.assetLoader;
        this.inputSystem = game.inputSystem;
        
        this.setupEventListeners();
    }
    
    private setupEventListeners(): void {
        this.eventBus.on('enemy:defeated', (_data: unknown) => {
            if (this.musicSystem?.isInitialized) {
                this.musicSystem.playSEFromPattern('enemyDefeat');
            }
        });
    }

    getPlayer(): Player | null {
        return this.player;
    }

    getEnemies(): Enemy[] {
        return this.enemies;
    }

    getItems(): Entity[] {
        return this.items;
    }

    getPlatforms(): Entity[] {
        return this.platforms;
    }

    createPlayer(spawnX: number, spawnY: number): Player {
        Logger.log(`[EntityManager] Creating player at (${spawnX}, ${spawnY})`);
        
        this.player = new Player(spawnX, spawnY);
        this.player.setInputManager(this.inputSystem);
        this.player.setMusicSystem(this.musicSystem);
        this.player.setAssetLoader(this.assetLoader);
        this.player.setEventBus(this.eventBus);
        
        this.physicsSystem.addEntity(this.player, this.physicsSystem.layers.PLAYER);
        
        this.eventBus.emit('player:created', { player: this.player });
        
        Logger.log(`[EntityManager] Player created: ${this.player ? 'success' : 'failed'}`);
        
        return this.player;
    }

    createEntitiesFromConfig(entities: EntityConfig[]): void {
        entities.forEach(config => {
            this.createEntity(config);
        });
    }

    createEntity(config: EntityConfig): Entity | null {
        let entity: Entity | null = null;
        
        const tileMap = this.physicsSystem.tileMap;
        if (tileMap && tileMap[config.y] && tileMap[config.y][config.x] === 1) {
            Logger.warn(`[EntityManager] 警告: エンティティ(${config.type})のスポーン位置(${config.x}, ${config.y})が地面の中です！`);
        }
        
        switch (config.type) {
        case 'coin':
            entity = new Coin(
                config.x * TILE_SIZE,
                config.y * TILE_SIZE
            );
            this.items.push(entity);
            break;
                
        case 'spring': {
            const spring = new Spring(
                config.x * TILE_SIZE,
                config.y * TILE_SIZE
            );
            spring.physicsSystem = this.physicsSystem;
            this.items.push(spring);
            this.physicsSystem.addEntity(spring, this.physicsSystem.layers.ITEM);
            entity = spring;
            break;
        }
                
        case 'goal':
            entity = new GoalFlag(
                config.x * TILE_SIZE,
                config.y * TILE_SIZE
            );
            this.items.push(entity);
            this.physicsSystem.addEntity(entity, this.physicsSystem.layers.ITEM);
            break;
                
        case 'slime': {
            const slime = new Slime(
                config.x * TILE_SIZE,
                config.y * TILE_SIZE
            );
            slime.direction = -1;
            slime.setEventBus(this.eventBus);
            this.enemies.push(slime);
            
            Logger.log(`[EntityManager] Creating slime at (${config.x * TILE_SIZE}, ${config.y * TILE_SIZE})`);
            Logger.log(`[EntityManager] Physics system has tilemap: ${this.physicsSystem.tileMap !== null}`);
            
            this.physicsSystem.addEntity(slime, this.physicsSystem.layers.ENEMY);
            entity = slime;
            break;
        }
        }
        
        if (entity) {
            this.eventBus.emit('entity:created', { entity, type: config.type });
        }
        
        return entity;
    }

    createTestEntities(): void {
        const slime1 = new Slime(150, 180);
        slime1.direction = -1;
        slime1.setEventBus(this.eventBus);
        this.enemies.push(slime1);
        this.physicsSystem.addEntity(slime1, this.physicsSystem.layers.ENEMY);
        
        const slime2 = new Slime(200, 100);
        slime2.direction = -1;
        slime2.setEventBus(this.eventBus);
        this.enemies.push(slime2);
        this.physicsSystem.addEntity(slime2, this.physicsSystem.layers.ENEMY);
        
        const spring = new Spring(5 * TILE_SIZE, 10 * TILE_SIZE);
        this.items.push(spring);
        this.physicsSystem.addEntity(spring, this.physicsSystem.layers.ITEM);
        
        const goal = new GoalFlag(17 * TILE_SIZE, 12 * TILE_SIZE);
        this.items.push(goal);
        this.physicsSystem.addEntity(goal, this.physicsSystem.layers.ITEM);
    }

    updateAll(deltaTime: number): void {
        try {
            if (this.player) {
                this.player.update(deltaTime);
            }
            
            this.enemies.forEach(enemy => {
                if (enemy.update) {
                    enemy.update(deltaTime);
                }
            });
            
            this.items.forEach(item => {
                if (item.update) {
                    item.update(deltaTime);
                }
            });
        } catch (error) {
            Logger.error('Error during entity update:', error);
            this.eventBus.emit('entity:update-error', { error });
        }
    }

    checkItemCollisions(): void {
        if (!this.player) {
            Logger.warn('[EntityManager] checkItemCollisions called but player is not set');
            return;
        }
        
        this.items.forEach((item) => {
            if (!this.player) {
                Logger.warn('[EntityManager] player became null during item collision check');
                return;
            }
            
            if (item.constructor.name === 'Coin' && !(item as Coin).isCollected()) {
                if (item.collidesWith(this.player)) {
                    const scoreGained = (item as Coin).collect();
                    
                    this.eventBus.emit('coin:collected', {
                        score: scoreGained,
                        position: { x: item.x, y: item.y }
                    });
                    
                    if (this.musicSystem && this.musicSystem.isInitialized) {
                        this.musicSystem.playSEFromPattern('coin');
                    }
                }
            }
            else if (item.constructor.name === 'GoalFlag' && !(item as GoalFlag).isCleared()) {
                if (item.collidesWith(this.player)) {
                    (item as GoalFlag).clear();
                    
                    this.eventBus.emit('goal:reached', {
                        position: { x: item.x, y: item.y }
                    });
                    
                }
            }
        });
        
        this.items = this.items.filter(item => {
            if (item.constructor.name === 'Coin') {
                return !(item as Coin).isCollected();
            }
            return true;
        });
    }

    renderAll(renderer: PixelRenderer): void {
        this.items.forEach(item => {
            if (item.render) {
                item.render(renderer);
            }
        });
        
        this.enemies.forEach(enemy => {
            if (enemy.render) {
                enemy.render(renderer);
            }
        });
        
        if (this.player && this.player.render) {
            this.player.render(renderer);
        }
    }

    clear(): void {
        this.player = null;
        this.enemies = [];
        this.items = [];
        this.platforms = [];
        
        this.eventBus.emit('entities:cleared');
    }
    
    /**
     * Dynamically spawn an enemy at the specified tile coordinates
     */
    spawnEnemy(enemyType: string, tileX: number, tileY: number): void {
        try {
            const pixelX = tileX * TILE_SIZE;
            const pixelY = tileY * TILE_SIZE;
            
            Logger.log('EntityManager', `Spawning ${enemyType} at tile (${tileX}, ${tileY}) -> pixel (${pixelX}, ${pixelY})`);
            
            let enemy: Enemy | null = null;
            
            switch (enemyType.toLowerCase()) {
            case 'slime':
                enemy = new Slime(pixelX, pixelY);
                break;
            case 'bat':
            case 'spider':
            case 'armorknight':
            case 'flyingwizard':
            case 'fireslime':
            case 'lavabubble':
                Logger.warn('EntityManager', `Enemy type '${enemyType}' not yet implemented`);
                return;
            default:
                Logger.error('EntityManager', `Unknown enemy type: ${enemyType}`);
                return;
            }
            
            if (enemy) {
                this.enemies.push(enemy);
                this.physicsSystem.addEntity(enemy, this.physicsSystem.layers.ENEMY);
                
                this.eventBus.emit('enemy:spawned', {
                    type: enemyType,
                    position: { x: pixelX, y: pixelY }
                });
                
                Logger.log('EntityManager', `Successfully spawned ${enemyType}`);
            }
        } catch (error) {
            Logger.error('EntityManager', `Failed to spawn enemy: ${error}`);
        }
    }
}