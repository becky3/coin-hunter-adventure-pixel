import { Enemy } from '../Enemy';
import { PixelRenderer } from '../../rendering/PixelRenderer';
import { ResourceLoader } from '../../config/ResourceLoader';
import { Logger } from '../../utils/Logger';
import { Entity } from '../Entity';
import { EntityInitializer } from '../../interfaces/EntityInitializer';
import { EntityManager } from '../../managers/EntityManager';

type SpiderState = 'crawling' | 'descending' | 'ascending' | 'waiting';
type SpiderSurface = 'ceiling' | 'wall_left' | 'wall_right' | 'floor';

/**
 * Spider enemy that crawls on walls and ceiling, and can descend on thread
 */
export class Spider extends Enemy implements EntityInitializer {
    public spriteKey: string;
    private spiderState: SpiderState;
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
        let spiderConfig = null;
        try {
            const resourceLoader = ResourceLoader.getInstance();
            spiderConfig = resourceLoader.getCharacterConfig('enemies', 'spider');
        } catch (error) {
            Logger.warn('Failed to load spider config, using defaults:', error);
        }
        
        const width = spiderConfig?.physics.width || 16;
        const height = spiderConfig?.physics.height || 16;
        
        super(x, y, width, height);
        
        this.maxHealth = spiderConfig?.stats.maxHealth || 1;
        this.health = this.maxHealth;
        this.damage = spiderConfig?.stats.damage || 1;
        this.moveSpeed = spiderConfig?.physics.moveSpeed || 0.3;
        
        this.spriteKey = 'enemies/spider';
        this.animState = 'idle';
        this.spiderState = 'crawling';
        this.currentSurface = 'ceiling';
        
        this.detectionRange = spiderConfig?.ai?.detectRange || 100;
        this.threadLength = 80;
        this.threadSpeed = 1.0;
        this.crawlSpeed = this.moveSpeed * 120;
        this.initialX = x;
        this.initialY = y;
        this.threadY = y;
        this.waitTime = 2000;
        this.stateTimer = 0;
        this.patrolRange = 60;
        this.lastPlayerCheck = 0;
        
        this.friction = 1.0;
        this.gravityScale = 0;
        this.gravity = false;
        this.physicsEnabled = false;
        
        if (spiderConfig?.ai) {
            this.aiType = (spiderConfig.ai.type as 'patrol' | 'chase' | 'idle') || 'patrol';
            this.attackRange = spiderConfig.ai.attackRange || 20;
        }
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
        
        switch (this.spiderState) {
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
        
        this.animState = this.spiderState === 'waiting' ? 'idle' : 'walk';
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
            this.spiderState = 'waiting';
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
            this.spiderState = 'crawling';
        }
        
        this.y = this.threadY;
        this.vx = 0;
        this.vy = 0;
    }
    
    private updateWaiting(deltaTime: number): void {
        this.stateTimer += deltaTime * 1000;
        
        if (this.stateTimer >= this.waitTime) {
            this.spiderState = 'ascending';
            this.stateTimer = 0;
        }
        
        this.vx = 0;
        this.vy = 0;
    }
    
    private checkPlayerProximity(): void {
        if (this.spiderState !== 'crawling' || this.currentSurface !== 'ceiling') {
            return;
        }
        
        const player = this.findPlayer();
        if (!player) return;
        
        const xDistance = Math.abs(player.x + player.width / 2 - (this.x + this.width / 2));
        
        if (xDistance < this.detectionRange && player.y > this.y) {
            this.spiderState = 'descending';
            this.threadY = this.y;
            Logger.log(`[Spider] Player detected at X distance ${xDistance}, starting descent`);
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
        const checkInterval = 16;
        const maxCheckDistance = 200;
        
        const testY = this.y + this.height;
        const stageFloorY = 13 * 16;
        
        for (let checkY = testY; checkY < testY + maxCheckDistance; checkY += checkInterval) {
            if (checkY >= stageFloorY - 16) {
                return stageFloorY;
            }
        }
        
        return null;
    }
    
    onCollisionWithWall(): void {
        if (this.spiderState === 'crawling') {
            this.direction *= -1;
            this.facingRight = !this.facingRight;
        }
    }
    
    update(deltaTime: number): void {
        if (!this.active) return;
        
        if (this.invincibleTime > 0) {
            this.invincibleTime -= deltaTime * 1000;
        }
        
        if (this.stateTimer > 0 && this.spiderState !== 'waiting') {
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
        
        if (renderer.pixelArtRenderer) {
            const screenPos = renderer.worldToScreen(this.x, this.y);
            
            let spriteKey = 'enemies/spider_idle';
            if (this.animState === 'walk') {
                const frameIndex = Math.floor(Date.now() / 150) % 2;
                spriteKey = `enemies/spider_walk${frameIndex + 1}`;
            } else if (this.spiderState === 'descending' || this.spiderState === 'ascending') {
                spriteKey = 'enemies/spider_thread';
            }
            
            const sprite = renderer.pixelArtRenderer.sprites.get(spriteKey);
            if (sprite) {
                sprite.draw(
                    renderer.ctx,
                    screenPos.x,
                    screenPos.y,
                    this.direction === -1,
                    renderer.scale
                );
                return;
            }
        }
        
        super.render(renderer);
    }
    
    /**
     * Initialize this spider in the EntityManager
     */
    initializeInManager(manager: EntityManager): void {
        this.setEventBus(manager.getEventBus());
        manager.addEnemy(this);
        manager.getPhysicsSystem().addEntity(this, manager.getPhysicsSystem().layers.ENEMY);
    }
}