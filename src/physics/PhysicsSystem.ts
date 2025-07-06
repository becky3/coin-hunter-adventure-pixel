import { Entity, Bounds, CollisionInfo } from '../entities/Entity';
import { GAME_CONSTANTS } from '../config/GameConstants';

export type PhysicsLayer = 'tile' | 'player' | 'enemy' | 'item' | 'platform';

export interface PhysicsLayers {
    TILE: PhysicsLayer;
    PLAYER: PhysicsLayer;
    ENEMY: PhysicsLayer;
    ITEM: PhysicsLayer;
    PLATFORM: PhysicsLayer;
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
    physicsSystem?: PhysicsSystem;
    airResistance?: number;
    gravityScale?: number;
    maxFallSpeed?: number;
}

interface IRenderer {
    drawRect(x: number, y: number, width: number, height: number, color: string, fill?: boolean): void;
}

export class PhysicsSystem {
    private _gravity: number;
    private _maxFallSpeed: number;
    private _friction: number;
    public readonly layers: PhysicsLayers;
    private collisionMatrix: CollisionMatrix;
    private entities: Set<PhysicsEntity>;
    private tileMap: number[][] | null;
    private tileSize: number;
    private collisionPairs: Map<string, boolean>;

    constructor() {
        this._gravity = 0.433; // Reduced from 0.65 to exactly 2/3 for 1.5x air time
        this._maxFallSpeed = 10; // Reduced to maintain feel
        this._friction = 0.8;
        
        console.log('[PhysicsSystem] Initialized with:');
        console.log('  - Gravity:', this._gravity);
        console.log('  - Max fall speed:', this._maxFallSpeed);
        console.log('  - Friction:', this._friction);
        this.layers = {
            TILE: 'tile',
            PLAYER: 'player',
            ENEMY: 'enemy',
            ITEM: 'item',
            PLATFORM: 'platform'
        };
        this.collisionMatrix = {
            [this.layers.PLAYER]: [this.layers.TILE, this.layers.ENEMY, this.layers.ITEM, this.layers.PLATFORM],
            [this.layers.ENEMY]: [this.layers.TILE, this.layers.PLAYER, this.layers.PLATFORM],
            [this.layers.ITEM]: [this.layers.PLAYER],
            [this.layers.PLATFORM]: [this.layers.PLAYER, this.layers.ENEMY]
        };
        this.entities = new Set();
        this.tileMap = null;
        this.tileSize = 16;
        this.collisionPairs = new Map();
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
    
    getEntityCount(): number {
        return this.entities.size;
    }
    
    getEntities(): Set<PhysicsEntity> {
        return new Set(this.entities);
    }
    
    clearEntities(): void {
        this.entities.clear();
        this.frameCount = 0; // Reset frame count
    }
    
    setTileMap(tileMap: number[][], tileSize = 16): void {
        this.tileMap = tileMap;
        this.tileSize = tileSize;
    }
    
    addEntity(entity: PhysicsEntity, layer: PhysicsLayer = this.layers.TILE): void {
        entity.physicsLayer = layer;
        this.entities.add(entity);
        entity.physicsSystem = this;
        if (entity.gravity) {
            entity.grounded = false;
        }
    }
    
    removeEntity(entity: PhysicsEntity): void {
        this.entities.delete(entity);
    }
    
    hasEntity(entity: PhysicsEntity): boolean {
        return this.entities.has(entity);
    }
    
    private frameCount: number = 0;
    
    update(deltaTime: number): void {
        this.frameCount++;
        
        // Debug: Log deltaTime for first few frames
        if (this.frameCount <= 3) {
            console.log(`[PhysicsSystem] Frame ${this.frameCount}, deltaTime=${deltaTime.toFixed(4)}, entities=${this.entities.size}`);
            for (const entity of this.entities) {
                if (entity.constructor.name === 'Slime') {
                    console.log(`[PhysicsSystem]   Slime at y=${entity.y.toFixed(2)}, vy=${entity.vy.toFixed(2)}, grounded=${entity.grounded}`);
                }
            }
        }
        
        // Clamp deltaTime to prevent huge jumps
        const clampedDeltaTime = Math.min(deltaTime, 0.033); // Max 33ms (30fps)
        
        for (const entity of this.entities) {
            if (entity.active) {
                this.updateGroundedState(entity);
            }
        }
        for (const entity of this.entities) {
            if (!entity.active) continue;
            this.applyGravity(entity, clampedDeltaTime);

            entity.x += entity.vx * clampedDeltaTime * 60 * GAME_CONSTANTS.GLOBAL_SPEED_MULTIPLIER;
            this.checkCollisionsForEntity(entity, 'horizontal');
            entity.y += entity.vy * clampedDeltaTime * 60 * GAME_CONSTANTS.GLOBAL_SPEED_MULTIPLIER;
            this.checkCollisionsForEntity(entity, 'vertical');
            this.applyFriction(entity, clampedDeltaTime);
        }
        this.checkEntityCollisions();
    }
    
    applyGravity(entity: PhysicsEntity, deltaTime: number): void {
        if (!entity.gravity || entity.grounded) return;
        
        const previousVy = entity.vy;
        // Apply effective gravity = base gravity * entity's gravity scale
        const effectiveGravity = this.gravity * (entity.gravityScale || 1.0);
        entity.vy += effectiveGravity * deltaTime * 60 * GAME_CONSTANTS.GLOBAL_SPEED_MULTIPLIER;
        
        // Apply air resistance only when falling (vy > 0)
        if (entity.airResistance && entity.airResistance > 0 && entity.vy > 0) {
            entity.vy *= (1 - entity.airResistance);
        }
        
        // Debug logging for Player entity - only log every 10th frame
        if (entity.constructor.name === 'Player' && (entity as any)._isJumping && this.frameCount % 10 === 0) {
            console.log('[PhysicsSystem] Gravity applied to Player:');
            console.log('  - Previous vy:', previousVy.toFixed(2));
            console.log('  - Base gravity:', this.gravity);
            console.log('  - Gravity scale:', entity.gravityScale || 1.0);
            console.log('  - Effective gravity:', effectiveGravity);
            console.log('  - Air resistance:', entity.airResistance || 0);
            console.log('  - New vy:', entity.vy.toFixed(2));
            console.log('  - Entity max fall speed:', entity.maxFallSpeed || this.maxFallSpeed);
            console.log('  - Frame:', this.frameCount);
        }
        
        // Use entity's maxFallSpeed if defined, otherwise use system's default
        const maxFall = entity.maxFallSpeed !== undefined ? entity.maxFallSpeed : this.maxFallSpeed;
        
        // Only clamp downward velocity (positive vy)
        if (entity.vy > 0 && entity.vy > maxFall) {
            if (entity.constructor.name === 'Player') {
                console.log('[PhysicsSystem] Max fall speed reached! Clamping vy from', entity.vy, 'to', maxFall);
            }
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
            this.checkTileCollisions(entity, axis);
        }
    }
    
    checkTileCollisions(entity: PhysicsEntity, axis: 'horizontal' | 'vertical'): void {
        if (!this.tileMap) return;
        
        const bounds = entity.getBounds();
        const startCol = Math.floor(bounds.left / this.tileSize);
        const endCol = Math.floor(bounds.right / this.tileSize);
        const startRow = Math.floor(bounds.top / this.tileSize);
        const endRow = Math.floor(bounds.bottom / this.tileSize);
        const clampedStartCol = Math.max(0, startCol);
        const clampedEndCol = Math.min(this.tileMap[0].length - 1, endCol);
        const clampedStartRow = Math.max(0, startRow);
        const clampedEndRow = Math.min(this.tileMap.length - 1, endRow);
        
        // Debug logging for enemy entities falling through ground
        if (entity.constructor.name === 'Slime' && axis === 'vertical' && entity.vy > 0) {
            // First few frames only
            if (entity.y < 220) {
                console.log(`[Physics] Slime collision check: y=${entity.y.toFixed(2)}, vy=${entity.vy.toFixed(2)}`);
                console.log(`[Physics]   bounds: top=${bounds.top.toFixed(2)}, bottom=${bounds.bottom.toFixed(2)}`);
                console.log(`[Physics]   rows: ${startRow}-${endRow} (clamped: ${clampedStartRow}-${clampedEndRow})`);
                
                // Check what tiles are at row 12 and 13
                if (this.tileMap[12]) {
                    console.log(`[Physics]   row 12: ${this.tileMap[12].slice(7, 10).join('')}`);
                }
                if (this.tileMap[13]) {
                    console.log(`[Physics]   row 13: ${this.tileMap[13].slice(7, 10).join('')}`);
                }
            }
            
            if (clampedStartRow > clampedEndRow) {
                return; // Skip collision check if out of bounds
            }
        }
        
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
                    
                    // Debug for Slime collision
                    if (entity.constructor.name === 'Slime' && axis === 'vertical' && row === 13) {
                        console.log(`[Physics] Slime collision with ground tile at col=${col}, tileBounds=${JSON.stringify(tileBounds)}`);
                        console.log(`[Physics]   Entity bounds=${JSON.stringify(entity.getBounds())}`);
                    }
                    
                    if (this.checkAABB(bounds, tileBounds)) {
                        this.resolveTileCollision(entity, tileBounds, axis);
                    }
                }
            }
        }
    }
    
    resolveTileCollision(entity: PhysicsEntity, tileBounds: Bounds, axis: 'horizontal' | 'vertical'): void {
        if (axis === 'horizontal') {
            if (entity.vx > 0) {
                entity.x = tileBounds.left - entity.width;
                entity.vx = 0;
            } else if (entity.vx < 0) {
                entity.x = tileBounds.right;
                entity.vx = 0;
            }
        } else if (axis === 'vertical') {
            if (entity.vy > 0) {
                entity.y = tileBounds.top - entity.height;
                entity.vy = 0;
                entity.grounded = true;
            } else if (entity.vy < 0) {
                entity.y = tileBounds.bottom;
                entity.vy = 0;
            }
        }
    }
    
    checkEntityCollisions(): void {
        const entitiesArray = Array.from(this.entities);
        const currentPairs = new Set<string>();
        
        for (let i = 0; i < entitiesArray.length; i++) {
            const entityA = entitiesArray[i];
            if (!entityA.active || !entityA.collidable) continue;
            const collisionLayers = this.collisionMatrix[entityA.physicsLayer!] || [];
            
            for (let j = i + 1; j < entitiesArray.length; j++) {
                const entityB = entitiesArray[j];
                if (!entityB.active || !entityB.collidable) continue;
                if (collisionLayers.includes(entityB.physicsLayer!) ||
                    (this.collisionMatrix[entityB.physicsLayer!] || []).includes(entityA.physicsLayer!)) {
                    const pairKey = entityA.id < entityB.id ? 
                        `${entityA.id}-${entityB.id}` : 
                        `${entityB.id}-${entityA.id}`;
                    
                    if (this.checkAABB(entityA.getBounds(), entityB.getBounds())) {
                        currentPairs.add(pairKey);
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
    
    updateGroundedState(entity: PhysicsEntity): void {
        entity.grounded = false;
        const testBounds: Bounds = {
            left: entity.x,
            top: entity.y + entity.height + 1,
            right: entity.x + entity.width,
            bottom: entity.y + entity.height + 2,
            width: entity.width,
            height: 1
        };
        if (this.tileMap) {
            const row = Math.floor(testBounds.top / this.tileSize);
            const startCol = Math.floor(testBounds.left / this.tileSize);
            const endCol = Math.floor(testBounds.right / this.tileSize);
            
            if (row >= 0 && row < this.tileMap.length) {
                for (let col = startCol; col <= endCol; col++) {
                    if (col >= 0 && col < this.tileMap[row].length && this.tileMap[row][col] === 1) {
                        entity.grounded = true;
                        break;
                    }
                }
            }
        }
    }
    
    isPointInTile(x: number, y: number): boolean {
        if (!this.tileMap) return false;
        
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
    
    renderDebug(renderer: IRenderer): void {
        for (const entity of this.entities) {
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