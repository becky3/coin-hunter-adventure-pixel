import type { PixelRenderer } from '../rendering/PixelRenderer';
import type { SpriteData } from '../types/assetTypes';

export interface Bounds {
    left: number;
    top: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
}

export interface Vector2D {
    x: number;
    y: number;
}

export interface CollisionInfo {
    other: Entity;
    side: string;
}

let entityIdCounter = 0;

/**
 * Base entity class for all game objects
 */
export class Entity {
    public id: number;
    
    public x: number;
    public y: number;
    
    public width: number;
    public height: number;
    
    public vx: number;
    public vy: number;
    
    public ax: number;
    public ay: number;
    
    public gravity: boolean;
    public airResistance: number;
    public gravityScale: number;
    public maxFallSpeed: number;
    public friction: number;
    public physicsEnabled: boolean;
    
    public active: boolean;
    public visible: boolean;
    public grounded: boolean;
    
    public solid: boolean;
    public collidable: boolean;
    public notifyTileCollision: boolean;
    
    public currentAnimation: string | null;
    public animationTime: number;
    public flipX: boolean;
    
    public sprite: string | SpriteData | HTMLCanvasElement | ImageData | null;
    public spriteScale: number;

    constructor(x = 0, y = 0, width = 16, height = 16) {
        this.id = ++entityIdCounter;
        
        this.x = x;
        this.y = y;
        
        this.width = width;
        this.height = height;
        
        this.vx = 0;
        this.vy = 0;
        
        this.ax = 0;
        this.ay = 0;
        
        this.gravity = true;
        this.airResistance = 0.0;
        this.gravityScale = 1.0;
        this.maxFallSpeed = 10;
        this.friction = 0.8;
        this.physicsEnabled = true;
        
        this.active = true;
        this.visible = true;
        this.grounded = false;
        
        this.solid = true;
        this.collidable = true;
        this.notifyTileCollision = false;
        
        this.currentAnimation = null;
        this.animationTime = 0;
        this.flipX = false;
        
        this.sprite = null;
        this.spriteScale = 1;
    }

    update(deltaTime: number): void {
        if (!this.active) return;
        
        this.updateAnimation(deltaTime);
        this.onUpdate(deltaTime);
    }


    updateAnimation(deltaTime: number): void {
        if (this.currentAnimation) {
            this.animationTime += deltaTime;
        }
    }

    render(renderer: PixelRenderer): void {
        if (!this.visible) return;
        
        if (this.sprite) {
            renderer.drawSprite(
                this.sprite,
                this.x,
                this.y,
                this.flipX
            );
        } else {
            this.renderDefault(renderer);
        }
        
        if (renderer.debug) {
            this.renderDebug(renderer);
        }
    }

    renderDefault(renderer: PixelRenderer): void {
        renderer.drawRect(
            this.x,
            this.y,
            this.width,
            this.height,
            '#FF00FF'
        );
        
        renderer.drawRect(
            this.x - 2,
            this.y - 2,
            this.width + 4,
            this.height + 4,
            '#FF00FF',
            false
        );
    }

    renderDebug(renderer: PixelRenderer): void {
        renderer.drawRect(
            this.x,
            this.y,
            this.width,
            this.height,
            '#00FF00',
            false
        );
        
        if (this.vx !== 0 || this.vy !== 0) {
            renderer.drawLine(
                this.x + this.width / 2,
                this.y + this.height / 2,
                this.x + this.width / 2 + this.vx * 5,
                this.y + this.height / 2 + this.vy * 5,
                '#FFFF00',
                2
            );
        }
        
        const screenPos = renderer.worldToScreen(this.x, this.y - 10);
        renderer.ctx.fillStyle = '#FFFFFF';
        renderer.ctx.font = '10px monospace';
        renderer.ctx.fillText(
            `${this.constructor.name} ${this.grounded ? 'G' : 'A'}`,
            screenPos.x,
            screenPos.y
        );
    }

    getBounds(): Bounds {
        return {
            left: this.x,
            top: this.y,
            right: this.x + this.width,
            bottom: this.y + this.height,
            width: this.width,
            height: this.height
        };
    }

    collidesWith(other: Entity): boolean {
        if (!this.collidable || !other.collidable) return false;
        
        const a = this.getBounds();
        const b = other.getBounds();
        
        return a.left < b.right &&
               a.right > b.left &&
               a.top < b.bottom &&
               a.bottom > b.top;
    }

    collidesWithRect(rect: Bounds): boolean {
        const bounds = this.getBounds();
        
        return bounds.left < rect.right &&
               bounds.right > rect.left &&
               bounds.top < rect.bottom &&
               bounds.bottom > rect.top;
    }

    distanceTo(other: Entity): number {
        const dx = (this.x + this.width / 2) - (other.x + other.width / 2);
        const dy = (this.y + this.height / 2) - (other.y + other.height / 2);
        return Math.sqrt(dx * dx + dy * dy);
    }

    directionTo(other: Entity): Vector2D {
        const dx = (other.x + other.width / 2) - (this.x + this.width / 2);
        const dy = (other.y + other.height / 2) - (this.y + this.height / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance === 0) {
            return { x: 0, y: 0 };
        }
        
        return {
            x: dx / distance,
            y: dy / distance
        };
    }

    setSprite(sprite: string | SpriteData | HTMLCanvasElement | ImageData | null, scale = 1): void {
        this.sprite = sprite;
        this.spriteScale = scale;
    }

    setAnimation(animationName: string): void {
        if (this.currentAnimation !== animationName) {
            this.currentAnimation = animationName;
            this.animationTime = 0;
        }
    }

    reset(x: number, y: number): void {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.ax = 0;
        this.ay = 0;
        this.grounded = false;
        this.active = true;
        this.visible = true;
        this.animationTime = 0;
    }

    destroy(): void {
        this.active = false;
        this.visible = false;
        this.onDestroy();
    }

    onUpdate(_deltaTime: number): void {

    }

    onDestroy(): void {

    }

    onCollision(_collisionInfo?: CollisionInfo): void {

    }
}