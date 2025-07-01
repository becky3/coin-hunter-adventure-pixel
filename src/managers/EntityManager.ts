import { Entity } from '../entities/Entity';
import { Enemy } from '../entities/Enemy';
import { Player } from '../entities/Player';
import { Coin } from '../entities/Coin';
import { Spring } from '../entities/Spring';
import { GoalFlag } from '../entities/GoalFlag';
import { Slime } from '../entities/enemies/Slime';
import { TILE_SIZE } from '../constants/gameConstants';
import { ServiceLocator } from '../services/ServiceLocator';
import { EventBus } from '../core/EventBus';
import { PixelRenderer } from '../rendering/PixelRenderer';

export interface EntityConfig {
    type: string;
    x: number;
    y: number;
}

export class EntityManager {
    private player: Player | null = null;
    private enemies: Enemy[] = [];
    private items: Entity[] = [];
    private platforms: Entity[] = [];
    private eventBus: EventBus;
    private physicsSystem: any; // TODO: Define proper type
    private musicSystem: any; // TODO: Define proper type
    private assetLoader: any; // TODO: Define proper type
    private inputSystem: any; // TODO: Define proper type

    constructor() {
        this.eventBus = ServiceLocator.get('EventBus');
        this.physicsSystem = ServiceLocator.get('PhysicsSystem');
        this.musicSystem = ServiceLocator.get('MusicSystem');
        this.assetLoader = ServiceLocator.get('AssetLoader');
        this.inputSystem = ServiceLocator.get('InputSystem');
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
        this.player = new Player(spawnX, spawnY);
        this.player.setInputManager(this.inputSystem);
        this.player.setMusicSystem(this.musicSystem);
        this.player.setAssetLoader(this.assetLoader);
        
        this.physicsSystem.addEntity(this.player, this.physicsSystem.layers.PLAYER);
        
        this.eventBus.emit('player:created', { player: this.player });
        
        return this.player;
    }

    createEntitiesFromConfig(entities: EntityConfig[]): void {
        entities.forEach(config => {
            this.createEntity(config);
        });
    }

    createEntity(config: EntityConfig): Entity | null {
        let entity: Entity | null = null;
        
        switch (config.type) {
        case 'coin':
            entity = new Coin(
                config.x * TILE_SIZE,
                config.y * TILE_SIZE
            );
            this.items.push(entity);
            break;
                
        case 'spring':
            entity = new Spring(
                config.x * TILE_SIZE,
                config.y * TILE_SIZE
            );
            this.items.push(entity);
            this.physicsSystem.addEntity(entity, this.physicsSystem.layers.ITEM);
            break;
                
        case 'goal':
            entity = new GoalFlag(
                config.x * TILE_SIZE,
                config.y * TILE_SIZE
            );
            this.items.push(entity);
            break;
                
        case 'slime':
            const slime = new Slime(
                config.x * TILE_SIZE,
                config.y * TILE_SIZE
            );
            slime.direction = -1;
            this.enemies.push(slime);
            this.physicsSystem.addEntity(slime, this.physicsSystem.layers.ENEMY);
            entity = slime;
            break;
        }
        
        if (entity) {
            this.eventBus.emit('entity:created', { entity, type: config.type });
        }
        
        return entity;
    }

    createTestEntities(): void {
        // Test slimes
        const slime1 = new Slime(150, 180);
        slime1.direction = -1;
        this.enemies.push(slime1);
        this.physicsSystem.addEntity(slime1, this.physicsSystem.layers.ENEMY);
        
        const slime2 = new Slime(200, 100);
        slime2.direction = -1;
        this.enemies.push(slime2);
        this.physicsSystem.addEntity(slime2, this.physicsSystem.layers.ENEMY);
        
        // Test items
        const spring = new Spring(5 * TILE_SIZE, 10 * TILE_SIZE);
        this.items.push(spring);
        this.physicsSystem.addEntity(spring, this.physicsSystem.layers.ITEM);
        
        const goal = new GoalFlag(17 * TILE_SIZE, 12 * TILE_SIZE);
        this.items.push(goal);
    }

    updateAll(deltaTime: number): void {
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
    }

    checkItemCollisions(): void {
        if (!this.player) return;
        
        this.items.forEach((item) => {
            if (item.constructor.name === 'Coin' && !(item as Coin).isCollected()) {
                if (item.collidesWith(this.player!)) {
                    const scoreGained = (item as Coin).collect();
                    
                    this.eventBus.emit('coin:collected', {
                        score: scoreGained,
                        position: { x: item.x, y: item.y }
                    });
                    
                    if (this.musicSystem && this.musicSystem.isInitialized) {
                        this.musicSystem.playCoinSound();
                    }
                }
            }
            else if (item.constructor.name === 'GoalFlag' && !(item as GoalFlag).isCleared()) {
                if (item.collidesWith(this.player!)) {
                    (item as GoalFlag).clear();
                    
                    this.eventBus.emit('goal:reached', {
                        position: { x: item.x, y: item.y }
                    });
                    
                    if (this.musicSystem && this.musicSystem.isInitialized) {
                        this.musicSystem.playGoalSound();
                    }
                }
            }
        });
        
        // Remove collected items
        this.items = this.items.filter(item => {
            if (item.constructor.name === 'Coin') {
                return !(item as Coin).isCollected();
            }
            return true;
        });
    }

    renderAll(renderer: PixelRenderer): void {
        // Render items first (behind player)
        this.items.forEach(item => {
            if (item.render) {
                item.render(renderer);
            }
        });
        
        // Render enemies
        this.enemies.forEach(enemy => {
            if (enemy.render) {
                enemy.render(renderer);
            }
        });
        
        // Render player last (on top)
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
}