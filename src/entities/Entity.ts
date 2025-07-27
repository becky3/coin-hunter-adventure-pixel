import type { PixelRenderer } from '../rendering/PixelRenderer';
import type { AnimationDefinition, EntityPaletteDefinition, SpriteData } from '../types/animationTypes';
import { EntityAnimationManager } from '../animation/EntityAnimationManager';
import { EventBus } from '../services/EventBus';
import { PhysicsLayer, stringToPhysicsLayer } from '../physics/PhysicsSystem';
import type { BaseEntityConfig } from '../config/ResourceConfig';

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
export abstract class Entity {
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
    public physicsLayer: PhysicsLayer;
    
    public active: boolean;
    public visible: boolean;
    public grounded: boolean;
    
    public solid: boolean;
    public collidable: boolean;
    public isProjectileTarget: boolean;
    public notifyTileCollision: boolean;
    public ignoreTileCollisions: boolean;
    
    public currentAnimation: string | null;
    public animationTime: number;
    public flipX: boolean;
    
    public sprite: string | SpriteData | HTMLCanvasElement | ImageData | null;
    public spriteScale: number;
    
    protected entityAnimationManager?: EntityAnimationManager;
    private animationInitialized: boolean = false;
    private animationInitializing: boolean = false;
    
    protected eventBus: EventBus | null = null;

    constructor(x: number, y: number, config: BaseEntityConfig) {
        this.id = ++entityIdCounter;
        
        this.x = x;
        this.y = y;
        
        this.width = config.physics.width;
        this.height = config.physics.height;
        
        this.physicsLayer = stringToPhysicsLayer(config.physics.physicsLayer);
        
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
        this.isProjectileTarget = false;
        this.notifyTileCollision = false;
        this.ignoreTileCollisions = false;
        
        this.currentAnimation = null;
        this.animationTime = 0;
        this.flipX = false;
        
        this.sprite = null;
        this.spriteScale = 1;
        
        this.animationInitialized = false;
        this.animationInitializing = false;
        
        this.initializeAnimations();
    }
    
    /**
     * Initialize entity-specific animations
     * Called during construction
     */
    protected initializeAnimations(): void {
        try {
            const palette = this.getPaletteDefinition();
            this.entityAnimationManager = new EntityAnimationManager(palette);
            
            const animations = this.getAnimationDefinitions();
            if (animations.length > 0) {
                this.entityAnimationManager.initialize(animations).catch(error => {
                    console.error(`[Entity] Failed to initialize animations for ${this.constructor.name}:`, error);
                });
            }
        } catch (error) {
            console.error(`[Entity] Failed to create EntityAnimationManager for ${this.constructor.name}:`, error);
            this.entityAnimationManager = undefined;
        }
    }
    
    /**
     * Get animation definitions for this entity
     * Override in derived classes
     */
    protected abstract getAnimationDefinitions(): AnimationDefinition[];
    
    /**
     * Get palette definition for this entity
     * Override in derived classes
     */
    protected abstract getPaletteDefinition(): EntityPaletteDefinition;

    update(deltaTime: number): void {
        if (!this.active) return;
        
        this.updateAnimation(deltaTime);
        this.onUpdate(deltaTime);
    }


    updateAnimation(deltaTime: number): void {
        if (this.currentAnimation) {
            this.animationTime += deltaTime;
        }
        
        if (this.entityAnimationManager) {
            this.entityAnimationManager.update(deltaTime);
        }
    }

    render(renderer: PixelRenderer): void {
        if (!this.visible) return;
        
        if (this.entityAnimationManager) {
            this.entityAnimationManager.render(renderer, this.x, this.y, this.flipX);
        } else if (this.sprite) {
            renderer.drawSprite(
                this.sprite,
                this.x,
                this.y,
                this.flipX,
                this.getSpritePaletteIndex()
            );
        } else {
            throw new Error(`[Entity] ${this.constructor.name} has no way to render - neither entityAnimationManager nor sprite is available. Ensure that getAnimationDefinitions() and getPaletteDefinition() methods are implemented if required.`);
        }
        
        if (renderer.debug) {
            this.renderDebug(renderer);
        }
    }
    
    /**
     * Returns the sprite palette index for this entity
     * Override in subclasses to use different palettes
     */
    protected getSpritePaletteIndex(): number {
        return 0;
    }


    renderDebug(renderer: PixelRenderer): void {
        renderer.drawRect(
            this.x,
            this.y,
            this.width,
            this.height,
            0x62,
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
            
            if (this.entityAnimationManager) {
                this.entityAnimationManager.setState(animationName);
            }
        }
    }
    
    /**
     * Set the palette variant (e.g., 'powerGlove')
     */
    setPaletteVariant(variant: string): void {
        if (this.entityAnimationManager) {
            this.entityAnimationManager.setPaletteVariant(variant);
        }
    }
    
    setEventBus(eventBus: EventBus): void {
        this.eventBus = eventBus;
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