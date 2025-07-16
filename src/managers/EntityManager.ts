import { Entity } from '../entities/Entity';
import { Enemy } from '../entities/Enemy';
import { Player } from '../entities/Player';
import { Coin } from '../entities/Coin';
import { GoalFlag } from '../entities/GoalFlag';
import { EntityFactory } from '../factories/EntityFactory';
import { hasEntityInitializer } from '../interfaces/EntityInitializer';
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
        
        this.eventBus.on('entity:findPlayer', () => {
            return this.player;
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
    
    getEventBus(): EventBus {
        return this.eventBus;
    }
    
    getPhysicsSystem(): PhysicsSystem {
        return this.physicsSystem;
    }
    
    addEnemy(enemy: Enemy): void {
        this.enemies.push(enemy);
    }
    
    addItem(item: Entity): void {
        this.items.push(item);
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
        Logger.log(`[EntityManager] Creating entity: type=${config.type}, tile=(${config.x}, ${config.y})`);
        
        const tileMap = this.physicsSystem.tileMap;
        if (tileMap && tileMap[config.y] && tileMap[config.y][config.x] === 1) {
            Logger.warn(`[EntityManager] 警告: エンティティ(${config.type})のスポーン位置(${config.x}, ${config.y})が地面の中です！`);
        }
        
        const pixelX = config.x * TILE_SIZE;
        const pixelY = config.y * TILE_SIZE;
        
        Logger.log(`[EntityManager] Entity pixel position: (${pixelX}, ${pixelY})`);
        
        const entity = EntityFactory.create(config.type, pixelX, pixelY);
        if (!entity) {
            Logger.error(`[EntityManager] Failed to create entity: ${config.type}`);
            return null;
        }
        
        Logger.log(`[EntityManager] Entity created successfully: ${config.type}`);
        this.postProcessEntity(entity, config.type);
        
        return entity;
    }
    
    private postProcessEntity(entity: Entity, type: string): void {
        if (hasEntityInitializer(entity)) {
            entity.initializeInManager(this);
        } else {
            Logger.warn(`[EntityManager] Entity type '${type}' does not implement EntityInitializer`);
        }
        
        this.eventBus.emit('entity:created', { entity, type });
    }

    createTestEntities(): void {
        const testEntities = [
            { type: 'slime', x: 150, y: 180 },
            { type: 'slime', x: 200, y: 100 },
            { type: 'spring', x: 5 * TILE_SIZE, y: 10 * TILE_SIZE },
            { type: 'goal', x: 17 * TILE_SIZE, y: 12 * TILE_SIZE }
        ];
        
        testEntities.forEach(config => {
            const entity = EntityFactory.create(config.type, config.x, config.y);
            if (entity) {
                this.postProcessEntity(entity, config.type);
            }
        });
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
            else if (item.collidesWith && item.collidesWith(this.player)) {
                if (item.onCollision) {
                    item.onCollision({
                        other: this.player,
                        normal: { x: 0, y: 0 },
                        depth: 0
                    });
                }
            }
        });
        
        this.items = this.items.filter(item => {
            if (item.constructor.name === 'Coin') {
                return !(item as Coin).isCollected();
            }
            if ('collected' in item) {
                return !(item as { collected: boolean }).collected;
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
            
            const entity = EntityFactory.create(enemyType.toLowerCase(), pixelX, pixelY);
            
            if (!entity) {
                if (!EntityFactory.hasFactory(enemyType.toLowerCase())) {
                    Logger.warn('EntityManager', `Enemy type '${enemyType}' not yet implemented`);
                } else {
                    Logger.error('EntityManager', `Failed to create enemy type: ${enemyType}`);
                }
                return;
            }
            
            if (entity instanceof Enemy) {
                if (hasEntityInitializer(entity)) {
                    entity.initializeInManager(this);
                } else {
                    entity.setEventBus(this.eventBus);
                    this.enemies.push(entity);
                    this.physicsSystem.addEntity(entity, this.physicsSystem.layers.ENEMY);
                }
                
                this.eventBus.emit('enemy:spawned', {
                    type: enemyType,
                    position: { x: pixelX, y: pixelY }
                });
                
                Logger.log('EntityManager', `Successfully spawned ${enemyType}`);
            } else {
                Logger.error('EntityManager', `Entity type '${enemyType}' is not an Enemy`);
            }
        } catch (error) {
            Logger.error('EntityManager', `Failed to spawn enemy: ${error}`);
        }
    }
}