import { Enemy } from '../Enemy';
import { PixelRenderer } from '../../rendering/PixelRenderer';
import { ResourceLoader } from '../../config/ResourceLoader';
import { EntityInitializer } from '../../interfaces/EntityInitializer';
import { EntityManager } from '../../managers/EntityManager';
import type { AnimationDefinition } from '../../types/animationTypes';
import { SpritePaletteIndex } from '../../utils/pixelArtPalette';

/**
 * Slime enemy that moves horizontally
 */
export class Slime extends Enemy implements EntityInitializer {
    public spriteKey: string;
    declare friction: number;

    /**
     * Factory method to create a Slime instance
     */
    static create(x: number, y: number): Slime {
        const slime = new Slime(x, y);
        slime.direction = -1;
        return slime;
    }

    constructor(x: number, y: number) {
        const resourceLoader = ResourceLoader.getInstance();
        const slimeConfig = resourceLoader.getEntityConfigSync('enemies', 'slime');
        
        if (!slimeConfig) {
            throw new Error('Failed to load slime configuration');
        }
        
        super(x, y, slimeConfig);
        
        this.maxHealth = slimeConfig.stats.maxHealth;
        this.health = this.maxHealth;
        this.damage = slimeConfig.stats.damage;
        this.moveSpeed = slimeConfig.physics.moveSpeed;
        
        
        this.spriteKey = 'enemies/slime';
        this.animState = 'idle';
        
        this.friction = 0.8;
        
        this.detectRange = slimeConfig.ai.detectRange;
        this.attackRange = slimeConfig.ai.attackRange;
        
        this.setAnimation('idle');
    }
    
    protected override updateAI(_deltaTime: number): void {
        if (this.state === 'dead' || this.state === 'hurt') {
            return;
        }

        if (this.grounded) {
            this.vx = this.moveSpeed * this.direction;
            this.animState = 'move';
            if (this.entityAnimationManager) {
                this.entityAnimationManager.setState('move');
            }
        } else {
            this.animState = 'jump';
            if (this.entityAnimationManager) {
                this.entityAnimationManager.setState('jump');
            }
        }

    }


    override render(renderer: PixelRenderer): void {
        if (!this.active) return;
        
        if (this.invincibleTime > 0 && Math.floor(this.invincibleTime / 100) % 2 === 0) {
            return;
        }
        
        this.flipX = this.direction === -1;
        
        super.render(renderer);
    }
    
    /**
     * Initialize this slime in the EntityManager
     */
    initializeInManager(manager: EntityManager): void {
        this.setEventBus(manager.getEventBus());
        manager.addEnemy(this);
    }
    
    /**
     * Get animation definitions for slime
     */
    protected override getAnimationDefinitions(): AnimationDefinition[] {
        return [
            {
                id: 'idle',
                sprites: ['enemies/slime_idle1.json'],
                frameDuration: 0,
                loop: false
            },
            {
                id: 'move',
                sprites: ['enemies/slime_idle1.json', 'enemies/slime_idle2.json'],
                frameDuration: 300,
                loop: true
            },
            {
                id: 'jump',
                sprites: ['enemies/slime_idle1.json'],
                frameDuration: 0,
                loop: false
            }
        ];
    }
    
    
    protected override getSpritePaletteIndex(): number {
        return SpritePaletteIndex.ENEMY_BASIC;
    }
}