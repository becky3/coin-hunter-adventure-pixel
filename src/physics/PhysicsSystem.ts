import { Entity, Bounds, CollisionInfo } from '../entities/Entity';
import { GAME_CONSTANTS } from '../config/GameConstants';
import { Logger } from '../utils/Logger';
import { ResourceLoader } from '../config/ResourceLoader';

export enum PhysicsLayer {
    TILE = 'tile',
    PLAYER = 'player',
    ENEMY = 'enemy',
    ITEM = 'item',
    PLATFORM = 'platform',
    PROJECTILE = 'projectile'
}

/**
 * Convert string to PhysicsLayer enum value
 * @param value - String value from JSON
 * @returns PhysicsLayer enum value
 * @throws Error if conversion fails
 */
export function stringToPhysicsLayer(value: string): PhysicsLayer {
    const enumValues = Object.values(PhysicsLayer);
    if (enumValues.includes(value as PhysicsLayer)) {
        return value as PhysicsLayer;
    }
    throw new Error(`Invalid PhysicsLayer value: ${value}`);
}

export interface PhysicsLayers {
    TILE: PhysicsLayer;
    PLAYER: PhysicsLayer;
    ENEMY: PhysicsLayer;
    ITEM: PhysicsLayer;
    PLATFORM: PhysicsLayer;
    PROJECTILE: PhysicsLayer;
}

export interface RaycastResult {
    x: number;
    y: number;
    tile: boolean;
}

type CollisionMatrix = {
    [key in PhysicsLayer]?: PhysicsLayer[];
};

interface PhysicsEntity extends Entity {
    physicsLayer?: PhysicsLayer;
    airResistance?: number;
    gravityScale?: number;
    maxFallSpeed?: number;
}

interface IRenderer {
    drawRect(x: number, y: number, width: number, height: number, color: string, fill?: boolean): void;
}

/**
 * System for managing physics operations
 */
export class PhysicsSystem {
    private _gravity: number;
    private _maxFallSpeed: number;
    private _friction: number;
    public readonly layers: PhysicsLayers;
    private collisionMatrix: CollisionMatrix;
    private tileMap: number[][] | null;
    private tileSize: number;
    private collisionPairs: Map<string, boolean>;
    private platformCollisionPairs: Map<string, boolean>;

    constructor() {
        const resourceLoader = ResourceLoader.getInstance();
        const physicsConfig = resourceLoader.getPhysicsConfig();
        
        this._gravity = physicsConfig.gravity;
        this._maxFallSpeed = physicsConfig.maxFallSpeed;
        this._friction = physicsConfig.friction;
        
        Logger.log('[PhysicsSystem] Initialized with:');
        Logger.log('  - Gravity:', this._gravity);
        Logger.log('  - Max fall speed:', this._maxFallSpeed);
        Logger.log('  - Friction:', this._friction);
        this.layers = {
            TILE: PhysicsLayer.TILE,
            PLAYER: PhysicsLayer.PLAYER,
            ENEMY: PhysicsLayer.ENEMY,
            ITEM: PhysicsLayer.ITEM,
            PLATFORM: PhysicsLayer.PLATFORM,
            PROJECTILE: PhysicsLayer.PROJECTILE
        };
        this.collisionMatrix = {
            [this.layers.PLAYER]: [this.layers.TILE, this.layers.ENEMY, this.layers.ITEM, this.layers.PLATFORM],
            [this.layers.ENEMY]: [this.layers.TILE, this.layers.PLAYER, this.layers.PLATFORM],
            [this.layers.ITEM]: [this.layers.PLAYER],
            [this.layers.PLATFORM]: [this.layers.PLAYER, this.layers.ENEMY],
            [this.layers.PROJECTILE]: [this.layers.TILE]
        };
        this.tileMap = null;
        this.tileSize = 16;
        this.collisionPairs = new Map();
        this.platformCollisionPairs = new Map();
    }
    
    get gravity(): number { return this._gravity; }
    get maxFallSpeed(): number { return this._maxFallSpeed; }
    get friction(): number { return this._friction; }
    
    setGravity(value: number): void {
        if (value >= 0) {
            this._gravity = value;
        }
    }
    
    setMaxFallSpeed(value: number): void {
        if (value > 0) {
            this._maxFallSpeed = value;
        }
    }
    
    setFriction(value: number): void {
        if (value >= 0 && value <= 1) {
            this._friction = value;
        }
    }
    
    clearCollisionPairs(): void {
        this.collisionPairs.clear();
        this.platformCollisionPairs.clear();
        this.frameCount = 0;
    }
    
    setTileMap(tileMap: number[][], tileSize = 16): void {
        this.tileMap = tileMap;
        this.tileSize = tileSize;
    }
    
    
    private frameCount: number = 0;
    
    update(deltaTime: number, entities: PhysicsEntity[]): void {
        this.frameCount++;
        
        
        const clampedDeltaTime = Math.min(deltaTime, 0.033);
        
        for (const entity of entities) {
            if (entity.active) {
                if (!('ignoreTileCollisions' in entity) || !entity.ignoreTileCollisions) {
                    this.updateGroundedState(entity);
                }
            }
        }
        for (const entity of entities) {
            if (!entity.active) continue;
            
            if ('physicsEnabled' in entity && entity.physicsEnabled === false) {
                continue;
            }
            
            this.applyGravity(entity, clampedDeltaTime);

            entity.x += entity.vx * clampedDeltaTime * 60 * GAME_CONSTANTS.GLOBAL_SPEED_MULTIPLIER;
            this.checkCollisionsForEntity(entity, 'horizontal');
            
            if (entity.physicsLayer === this.layers.PLAYER) {
                this.checkPlatformCollisions(entity, entities, 'horizontal');
            }
            entity.y += entity.vy * clampedDeltaTime * 60 * GAME_CONSTANTS.GLOBAL_SPEED_MULTIPLIER;
            this.checkCollisionsForEntity(entity, 'vertical');
            
            if (entity.physicsLayer === this.layers.PLAYER) {
                this.checkPlatformCollisions(entity, entities, 'vertical');
            }
            
            this.applyFriction(entity, clampedDeltaTime);
        }
        this.checkEntityCollisions(entities);
    }
    
    applyGravity(entity: PhysicsEntity, deltaTime: number): void {
        if (!entity.gravity || entity.grounded) return;
        
        
        const effectiveGravity = this.gravity * (entity.gravityScale || 1.0);
        entity.vy += effectiveGravity * deltaTime * 60 * GAME_CONSTANTS.GLOBAL_SPEED_MULTIPLIER;
        
        if (entity.airResistance && entity.airResistance > 0) {
            entity.vy *= (1 - entity.airResistance);
        }
        
        
        const maxFall = entity.maxFallSpeed !== undefined ? entity.maxFallSpeed : this.maxFallSpeed;
        
        if (entity.vy > 0 && entity.vy > maxFall) {
            entity.vy = maxFall;
        }
    }
    
    applyFriction(entity: PhysicsEntity, deltaTime: number): void {
        if (!entity.grounded) return;
        
        const frictionFactor = Math.pow(entity.friction || this.friction, deltaTime * 60);
        entity.vx *= frictionFactor;
        if (Math.abs(entity.vx) < 0.1) {
            entity.vx = 0;
        }
    }
    
    checkCollisionsForEntity(entity: PhysicsEntity, axis: 'horizontal' | 'vertical'): void {
        if (!entity.collidable) return;
        if (this.tileMap && entity.physicsLayer !== this.layers.TILE) {
            if (!('ignoreTileCollisions' in entity) || !entity.ignoreTileCollisions) {
                this.checkTileCollisions(entity, axis);
            }
        }
    }
    
    checkPlatformCollisions(player: PhysicsEntity, entities: PhysicsEntity[], axis: 'horizontal' | 'vertical'): void {
        const playerBounds = player.getBounds();
        const currentCollisions = new Set<string>();
        
        for (const platform of entities) {
            if (!platform.active || !platform.collidable || !platform.solid) continue;
            if (platform.physicsLayer !== this.layers.PLATFORM) continue;
            
            const platformBounds = platform.getBounds();
            
            if (this.checkAABB(playerBounds, platformBounds)) {
                const pairKey = `${player.id}-${platform.id}`;
                currentCollisions.add(pairKey);
                
                if (axis === 'vertical') {
                    if (player.vy > 0) {
                        const playerPrevY = player.y - player.vy * 0.016 * 60;
                        const playerPrevBottom = playerPrevY + player.height;
                        
                        if (playerPrevBottom <= platformBounds.top + 2) {
                            player.y = platformBounds.top - player.height;
                            player.vy = 0;
                            player.grounded = true;
                            
                            if (!this.platformCollisionPairs.has(pairKey)) {
                                this.platformCollisionPairs.set(pairKey, true);
                                if ('state' in platform && 'shakeOffset' in platform) {
                                    Logger.log('[PhysicsSystem] FallingFloor collision detected, calling onCollision');
                                }
                                if (platform.onCollision) {
                                    platform.onCollision({
                                        other: player,
                                        side: 'top'
                                    });
                                }
                            }
                        }
                    } else if (player.vy < 0) {
                        player.y = platformBounds.bottom;
                        player.vy = 0;
                    }
                } else if (axis === 'horizontal') {
                    if (player.vx > 0) {
                        player.x = platformBounds.left - player.width;
                    } else if (player.vx < 0) {
                        player.x = platformBounds.right;
                    }
                    player.vx = 0;
                }
            }
        }
        
        if (axis === 'vertical') {
            for (const [pairKey] of this.platformCollisionPairs) {
                if (pairKey.startsWith(`${player.id}-`) && !currentCollisions.has(pairKey)) {
                    this.platformCollisionPairs.delete(pairKey);
                }
            }
        }
    }
    
    checkTileCollisions(entity: PhysicsEntity, axis: 'horizontal' | 'vertical'): void {
        if (!this.tileMap) return;
        
        const bounds = entity.getBounds();
        let startCol, endCol;
        
        if (axis === 'vertical' && entity.vy >= 0 && entity.type === 'player') {
            const centerX = entity.x + entity.width / 2;
            startCol = endCol = Math.floor(centerX / this.tileSize);
        } else {
            startCol = Math.floor(bounds.left / this.tileSize);
            endCol = Math.floor(bounds.right / this.tileSize);
        }
        
        const startRow = Math.floor(bounds.top / this.tileSize);
        const endRow = Math.floor(bounds.bottom / this.tileSize);
        const clampedStartCol = Math.max(0, startCol);
        const clampedEndCol = Math.min(this.tileMap[0].length - 1, endCol);
        const clampedStartRow = Math.max(0, startRow);
        const clampedEndRow = Math.min(this.tileMap.length - 1, endRow);
        
        
        for (let row = clampedStartRow; row <= clampedEndRow; row++) {
            for (let col = clampedStartCol; col <= clampedEndCol; col++) {
                if (this.tileMap[row][col] === 1) {
                    const tileBounds: Bounds = {
                        left: col * this.tileSize,
                        top: row * this.tileSize,
                        right: (col + 1) * this.tileSize,
                        bottom: (row + 1) * this.tileSize,
                        width: this.tileSize,
                        height: this.tileSize
                    };
                    
                    
                    if (this.checkAABB(bounds, tileBounds)) {
                        this.resolveTileCollision(entity, tileBounds, axis);
                    }
                }
            }
        }
    }
    
    resolveTileCollision(entity: PhysicsEntity, tileBounds: Bounds, axis: 'horizontal' | 'vertical'): void {
        if (entity.notifyTileCollision && entity.onCollision) {
            entity.onCollision({ other: null });
            return;
        }
        
        if (axis === 'horizontal') {
            if (entity.vx > 0) {
                entity.x = tileBounds.left - entity.width;
                entity.vx = 0;
            } else if (entity.vx < 0) {
                if (entity.constructor.name === 'EnergyBullet') {
                    Logger.log('[PhysicsSystem] Bullet collision: moving from', entity.x, 'to', tileBounds.right);
                }
                entity.x = tileBounds.right;
                entity.vx = 0;
            }
        } else if (axis === 'vertical') {
            if (entity.vy > 0) {
                entity.y = tileBounds.top - entity.height;
                entity.vy = 0;
                if (entity.type !== 'player') {
                    entity.grounded = true;
                }
            } else if (entity.vy < 0) {
                entity.y = tileBounds.bottom;
                entity.vy = 0;
            }
        }
    }
    
    checkEntityCollisions(entities: PhysicsEntity[]): void {
        const currentPairs = new Set<string>();
        
        for (let i = 0; i < entities.length; i++) {
            const entityA = entities[i];
            if (!entityA.active || !entityA.collidable) continue;
            const collisionLayers = entityA.physicsLayer ? this.collisionMatrix[entityA.physicsLayer] || [] : [];
            
            for (let j = i + 1; j < entities.length; j++) {
                const entityB = entities[j];
                if (!entityB.active || !entityB.collidable) continue;
                
                
                if (entityB.physicsLayer && entityA.physicsLayer && 
                    (collisionLayers.includes(entityB.physicsLayer) ||
                     (this.collisionMatrix[entityB.physicsLayer] || []).includes(entityA.physicsLayer))) {
                    const pairKey = entityA.id < entityB.id ? 
                        `${entityA.id}-${entityB.id}` : 
                        `${entityB.id}-${entityA.id}`;
                    
                    if (this.checkAABB(entityA.getBounds(), entityB.getBounds())) {
                        currentPairs.add(pairKey);
                        
                        if (entityA.solid && entityB.solid) {
                            const aIsPlatform = entityA.physicsLayer === this.layers.PLATFORM;
                            const bIsPlatform = entityB.physicsLayer === this.layers.PLATFORM;
                            if (aIsPlatform || bIsPlatform) {
                                this.resolveSolidCollision(entityA, entityB);
                            }
                        }
                        
                        if (!this.collisionPairs.has(pairKey)) {
                            this.collisionPairs.set(pairKey, true);
                            this.notifyCollision(entityA, entityB);
                        }
                    }
                }
            }
        }
        for (const [pairKey] of this.collisionPairs) {
            if (!currentPairs.has(pairKey)) {
                this.collisionPairs.delete(pairKey);
            }
        }
    }
    
    checkAABB(a: Bounds, b: Bounds): boolean {
        return a.left < b.right &&
               a.right > b.left &&
               a.top < b.bottom &&
               a.bottom > b.top;
    }
    
    notifyCollision(entityA: PhysicsEntity, entityB: PhysicsEntity): void {
        const collisionInfoA: CollisionInfo = {
            other: entityB,
            side: this.getCollisionSide(entityA, entityB)
        };
        
        const collisionInfoB: CollisionInfo = {
            other: entityA,
            side: this.getCollisionSide(entityB, entityA)
        };
        
        const isPlayerEnemyCollision = 
            (entityA.physicsLayer === PhysicsLayer.PLAYER && entityB.physicsLayer === PhysicsLayer.ENEMY) ||
            (entityA.physicsLayer === PhysicsLayer.ENEMY && entityB.physicsLayer === PhysicsLayer.PLAYER);
            
        if (isPlayerEnemyCollision) {
            Logger.log('[PhysicsSystem] Player-Enemy collision detected!');
            Logger.log(`  - EntityA: ${entityA.constructor.name} (${entityA.physicsLayer})`);
            Logger.log(`  - EntityB: ${entityB.constructor.name} (${entityB.physicsLayer})`);
        }
        
        if (entityA.onCollision) {
            entityA.onCollision(collisionInfoA);
        }
        
        if (entityB.onCollision) {
            entityB.onCollision(collisionInfoB);
        }
    }
    
    getCollisionSide(entity: PhysicsEntity, other: PhysicsEntity): string {
        const dx = (entity.x + entity.width / 2) - (other.x + other.width / 2);
        const dy = (entity.y + entity.height / 2) - (other.y + other.height / 2);
        const width = (entity.width + other.width) / 2;
        const height = (entity.height + other.height) / 2;
        const crossWidth = width * dy;
        const crossHeight = height * dx;
        
        if (Math.abs(dx) <= width && Math.abs(dy) <= height) {
            if (crossWidth > crossHeight) {
                return (crossWidth > -crossHeight) ? 'bottom' : 'left';
            } else {
                return (crossWidth > -crossHeight) ? 'right' : 'top';
            }
        }
        
        return 'none';
    }
    
    resolveSolidCollision(entityA: PhysicsEntity, entityB: PhysicsEntity): void {
        const aIsPlayer = entityA.physicsLayer === this.layers.PLAYER;
        const bIsPlayer = entityB.physicsLayer === this.layers.PLAYER;
        const aIsPlatform = entityA.physicsLayer === this.layers.PLATFORM;
        const bIsPlatform = entityB.physicsLayer === this.layers.PLATFORM;
        
        if ((aIsPlayer && bIsPlatform) || (bIsPlayer && aIsPlatform)) {
            const player = aIsPlayer ? entityA : entityB;
            const platform = aIsPlayer ? entityB : entityA;
            
            const side = this.getCollisionSide(player, platform);
            
            if (side === 'bottom' && player.vy >= 0) {
                const newY = platform.y - player.height;
                const adjustment = player.y - newY;
                if (adjustment > 0.1) {
                    player.y = newY;
                    player.vy = 0;
                }
                player.grounded = true;
            } else if (side === 'top' && player.vy < 0) {
                player.y = platform.y + platform.height;
                player.vy = 0;
            } else if (side === 'left' && player.vx > 0) {
                player.x = platform.x - player.width;
                player.vx = 0;
            } else if (side === 'right' && player.vx < 0) {
                player.x = platform.x + platform.width;
                player.vx = 0;
            }
            return;
        }
        
        const aStatic = !entityA.physicsEnabled || !entityA.gravity;
        const bStatic = !entityB.physicsEnabled || !entityB.gravity;
        
        if (aStatic && bStatic) return;
        if (!aStatic && !bStatic) return;
        
        const movingEntity = aStatic ? entityB : entityA;
        const staticEntity = aStatic ? entityA : entityB;
        
        const side = this.getCollisionSide(movingEntity, staticEntity);
        
        if (side === 'bottom') {
            movingEntity.y = staticEntity.y - movingEntity.height;
            movingEntity.vy = 0;
            movingEntity.grounded = true;
        } else if (side === 'top') {
            movingEntity.y = staticEntity.y + staticEntity.height;
            movingEntity.vy = 0;
        } else if (side === 'left') {
            movingEntity.x = staticEntity.x + staticEntity.width;
            movingEntity.vx = 0;
        } else if (side === 'right') {
            movingEntity.x = staticEntity.x - movingEntity.width;
            movingEntity.vx = 0;
        }
    }
    
    updateGroundedState(entity: PhysicsEntity): void {
        entity.grounded = false;
        
        const centerX = entity.x + entity.width / 2;
        const testY = entity.y + entity.height + 1;
        
        if (this.tileMap) {
            const row = Math.floor(testY / this.tileSize);
            const col = Math.floor(centerX / this.tileSize);
            
            if (row >= 0 && row < this.tileMap.length && 
                col >= 0 && col < this.tileMap[row].length && 
                this.tileMap[row][col] === 1) {
                entity.grounded = true;
            }
        }
    }
    
    isPointInTile(x: number, y: number): boolean {
        if (!this.tileMap) {
            Logger.warn('[PhysicsSystem] isPointInTile called but tileMap is not set');
            return false;
        }
        
        const col = Math.floor(x / this.tileSize);
        const row = Math.floor(y / this.tileSize);
        
        if (row >= 0 && row < this.tileMap.length &&
            col >= 0 && col < this.tileMap[row].length) {
            return this.tileMap[row][col] === 1;
        }
        
        return false;
    }
    
    raycast(x1: number, y1: number, x2: number, y2: number): RaycastResult | null {
        const dx = Math.abs(x2 - x1);
        const dy = Math.abs(y2 - y1);
        const sx = x1 < x2 ? 1 : -1;
        const sy = y1 < y2 ? 1 : -1;
        let err = dx - dy;
        
        let x = x1;
        let y = y1;
        
        while (x !== x2 || y !== y2) {
            if (this.isPointInTile(x, y)) {
                return { x, y, tile: true };
            }
            
            const e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                x += sx;
            }
            if (e2 < dx) {
                err += dx;
                y += sy;
            }
        }
        
        return null;
    }
    
    renderDebug(renderer: IRenderer, entities: PhysicsEntity[]): void {
        for (const entity of entities) {
            if (!entity.active) continue;
            
            const bounds = entity.getBounds();
            const color = entity.grounded ? '#00FF00' : '#FF0000';
            
            renderer.drawRect(
                bounds.left,
                bounds.top,
                bounds.width,
                bounds.height,
                color,
                false
            );
        }
    }
}