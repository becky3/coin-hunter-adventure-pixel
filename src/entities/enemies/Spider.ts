import { Enemy } from '../Enemy';
import { PixelRenderer } from '../../rendering/PixelRenderer';
import { ResourceLoader } from '../../config/ResourceLoader';
import { Logger } from '../../utils/Logger';
import { Entity } from '../Entity';
import { EntityInitializer } from '../../interfaces/EntityInitializer';
import { EntityManager } from '../../managers/EntityManager';
import { PhysicsSystem } from '../../physics/PhysicsSystem';
import type { AnimationDefinition, EntityPaletteDefinition } from '../../types/animationTypes';
import { SpritePaletteIndex } from '../../utils/pixelArtPalette';

type SpiderState = 'crawling' | 'descending' | 'ascending' | 'waiting';
type SpiderSurface = 'ceiling' | 'wall_left' | 'wall_right' | 'floor';

/**
 * Spider enemy that crawls on walls and ceiling, and can descend on thread
 */
export class Spider extends Enemy implements EntityInitializer {
    public spriteKey: string;
    private _spiderState: SpiderState;
    private currentSurface: SpiderSurface;
    private detectionRange: number;
    private threadLength: number;
    private threadSpeed: number;
    private crawlSpeed: number;
    private initialX: number;
    private initialY: number;
    private threadY: number;
    private waitTime: number;
    private stateTimer: number;
    private patrolRange: number;
    private lastPlayerCheck: number;
    private detectionCooldown: number;
    private lastAscentTime: number;
    private physicsSystem: PhysicsSystem | null = null;
    declare friction: number;

    /**
     * Factory method to create a Spider instance
     */
    static create(x: number, y: number): Spider {
        const spider = new Spider(x, y);
        spider.direction = -1;
        spider.facingRight = false;
        return spider;
    }

    constructor(x: number, y: number) {
        const resourceLoader = ResourceLoader.getInstance();
        const spiderConfig = resourceLoader.getEntityConfigSync('enemies', 'spider');
        
        if (!spiderConfig) {
            throw new Error('Failed to load spider configuration');
        }
        
        const width = spiderConfig.physics.width;
        const height = spiderConfig.physics.height;
        
        super(x, y, width, height);
        
        this.maxHealth = spiderConfig.stats.maxHealth;
        this.health = this.maxHealth;
        this.damage = spiderConfig.stats.damage;
        this.moveSpeed = spiderConfig.physics.moveSpeed;
        
        this.spriteKey = 'enemies/spider';
        this.animState = 'idle';
        this._spiderState = 'crawling';
        this.currentSurface = 'ceiling';
        
        this.detectionRange = spiderConfig.ai.detectRange;
        this.threadLength = 80;
        this.threadSpeed = 3.0;
        this.crawlSpeed = this.moveSpeed * 240;
        this.initialX = x;
        this.initialY = y;
        this.threadY = y;
        this.waitTime = 1000;
        this.stateTimer = 0;
        this.patrolRange = 90;
        this.lastPlayerCheck = 0;
        this.detectionCooldown = 3000;
        this.lastAscentTime = 0;
        
        this.friction = 1.0;
        this.gravityScale = 0;
        this.gravity = false;
        this.physicsEnabled = false;
        
        this.attackRange = spiderConfig.ai.attackRange;
        
        this.setAnimation('idle');
    }
    
    protected updateAI(deltaTime: number): void {
        if (this.state === 'dead' || this.state === 'hurt') {
            return;
        }
        
        const now = Date.now();
        if (now - this.lastPlayerCheck > 100) {
            this.lastPlayerCheck = now;
            this.checkPlayerProximity();
        }
        
        switch (this._spiderState) {
        case 'crawling':
            this.updateCrawling(deltaTime);
            break;
        case 'descending':
            this.updateDescending(deltaTime);
            break;
        case 'ascending':
            this.updateAscending(deltaTime);
            break;
        case 'waiting':
            this.updateWaiting(deltaTime);
            break;
        }
        
        this.animState = this._spiderState === 'waiting' ? 'idle' : 'walk';
        
        if (this._spiderState === 'descending' || this._spiderState === 'ascending') {
            if (this.entityAnimationManager) {
                this.entityAnimationManager.setState('thread');
            }
        } else if (this._spiderState === 'waiting') {
            if (this.entityAnimationManager) {
                this.entityAnimationManager.setState('idle');
            }
        } else {
            if (this.entityAnimationManager) {
                this.entityAnimationManager.setState('walk');
            }
        }
    }
    
    private updateCrawling(deltaTime: number): void {
        const moveAmount = this.crawlSpeed * deltaTime;
        
        switch (this.currentSurface) {
        case 'ceiling':
            this.x += moveAmount * this.direction;
            this.y = this.initialY;
            
            if (this.direction === -1 && this.x <= this.initialX - this.patrolRange) {
                this.direction = 1;
                this.facingRight = true;
            } else if (this.direction === 1 && this.x >= this.initialX + this.patrolRange) {
                this.direction = -1;
                this.facingRight = false;
            }
            break;
            
        case 'wall_left':
            this.y += moveAmount * this.direction;
            break;
            
        case 'wall_right':
            this.y += moveAmount * this.direction;
            break;
            
        case 'floor':
            this.x += moveAmount * this.direction;
            break;
        }
        
        this.vx = 0;
        this.vy = 0;
    }
    
    private updateDescending(deltaTime: number): void {
        const moveAmount = this.threadSpeed * deltaTime * 60;
        const nextY = this.threadY + moveAmount;
        
        const groundY = this.findGroundBelow();
        const maxDescendY = groundY !== null ? groundY - this.height - 16 : this.initialY + this.threadLength;
        
        if (nextY >= maxDescendY) {
            this.threadY = maxDescendY;
            this._spiderState = 'waiting';
            this.stateTimer = 0;
        } else {
            this.threadY = nextY;
        }
        
        this.y = this.threadY;
        this.vx = 0;
        this.vy = 0;
    }
    
    private updateAscending(deltaTime: number): void {
        const moveAmount = this.threadSpeed * deltaTime * 60;
        this.threadY -= moveAmount;
        
        if (this.threadY <= this.initialY) {
            this.threadY = this.initialY;
            this._spiderState = 'crawling';
            this.lastAscentTime = Date.now();
        }
        
        this.y = this.threadY;
        this.vx = 0;
        this.vy = 0;
    }
    
    private updateWaiting(deltaTime: number): void {
        this.stateTimer += deltaTime * 1000;
        
        if (this.stateTimer >= this.waitTime) {
            this._spiderState = 'ascending';
            this.stateTimer = 0;
        }
        
        this.vx = 0;
        this.vy = 0;
    }
    
    private checkPlayerProximity(): void {
        if (this._spiderState !== 'crawling' || this.currentSurface !== 'ceiling') {
            return;
        }
        
        const now = Date.now();
        if (this.lastAscentTime > 0 && now - this.lastAscentTime < this.detectionCooldown) {
            return;
        }
        
        const player = this.findPlayer();
        if (!player) return;
        
        const xDistance = Math.abs(player.x + player.width / 2 - (this.x + this.width / 2));
        
        if (xDistance < this.detectionRange && player.y > this.y) {
            this._spiderState = 'descending';
            this.threadY = this.y;
            Logger.log(`[Spider] Player detected at X distance ${xDistance}, descending immediately`);
        }
    }
    
    private findPlayer(): Entity | null {
        if (!this.eventBus) {
            return null;
        }
        
        const result = this.eventBus.emit('entity:findPlayer', {});
        if (result && Array.isArray(result) && result.length > 0) {
            return result[0] as Entity;
        }
        return null;
    }
    
    private findGroundBelow(): number | null {
        const checkInterval = 8;
        const maxCheckDistance = 240;
        
        const testX = this.x + this.width / 2;
        const startY = this.y + this.height;
        
        for (let checkY = startY; checkY < startY + maxCheckDistance; checkY += checkInterval) {
            const tileX = Math.floor(testX / 16);
            const tileY = Math.floor(checkY / 16);
            
            if (this.checkTileAt(tileX, tileY)) {
                return tileY * 16;
            }
        }
        
        return null;
    }
    
    private checkTileAt(tileX: number, tileY: number): boolean {
        if (!this.physicsSystem) {
            return false;
        }
        
        return this.physicsSystem.isPointInTile(tileX * 16, tileY * 16);
    }
    
    onCollisionWithWall(): void {
        if (this._spiderState === 'crawling') {
            this.direction *= -1;
            this.facingRight = !this.facingRight;
        }
    }
    
    update(deltaTime: number): void {
        if (!this.active) return;
        
        if (this.invincibleTime > 0) {
            this.invincibleTime -= deltaTime * 1000;
        }
        
        if (this.stateTimer > 0 && this._spiderState !== 'waiting') {
            this.stateTimer -= deltaTime * 1000;
        }
        
        this.updateAI(deltaTime);
        this.updateAnimation(deltaTime);
        this.onUpdate(deltaTime);
    }
    
    render(renderer: PixelRenderer): void {
        if (!this.active) return;
        
        if (this.invincibleTime > 0 && Math.floor(this.invincibleTime / 100) % 2 === 0) {
            return;
        }
        
        this.flipX = this.direction === -1;
        
        super.render(renderer);
    }
    
    /**
     * Check if spider is on ceiling
     */
    get onCeiling(): boolean {
        return this.currentSurface === 'ceiling';
    }

    /**
     * Get web Y position
     */
    get webY(): number {
        return this.threadY;
    }

    /**
     * Get current spider state
     */
    get spiderState(): SpiderState {
        return this._spiderState;
    }

    /**
     * Initialize this spider in the EntityManager
     */
    initializeInManager(manager: EntityManager): void {
        this.setEventBus(manager.getEventBus());
        manager.addEnemy(this);
        this.physicsSystem = manager.getPhysicsSystem();
        this.physicsLayer = this.physicsSystem.layers.ENEMY;
    }
    
    /**
     * Get animation definitions for spider
     */
    protected getAnimationDefinitions(): AnimationDefinition[] {
        return [
            {
                id: 'idle',
                sprites: ['enemies/spider/spider_idle.json'],
                frameDuration: 0,
                loop: false
            },
            {
                id: 'walk',
                sprites: ['enemies/spider/spider_walk1.json', 'enemies/spider/spider_walk2.json'],
                frameDuration: 150,
                loop: true
            },
            {
                id: 'thread',
                sprites: ['enemies/spider/spider_thread.json'],
                frameDuration: 0,
                loop: false
            }
        ];
    }
    
    /**
     * Get palette definition for spider
     */
    protected getPaletteDefinition(): EntityPaletteDefinition {
        return {
            default: {
                colors: [
                    null,
                    0x01,
                    0x31,
                    0x50
                ]
            }
        };
    }
    
    protected getSpritePaletteIndex(): number {
        return SpritePaletteIndex.ENEMY_SPECIAL;
    }
}