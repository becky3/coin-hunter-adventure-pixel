import { Enemy } from '../Enemy';
import { PixelRenderer } from '../../rendering/PixelRenderer';
import { ResourceLoader } from '../../config/ResourceLoader';
import { EntityInitializer } from '../../interfaces/EntityInitializer';
import { EntityManager } from '../../managers/EntityManager';
import type { AnimationDefinition, EntityPaletteDefinition } from '../../types/animationTypes';
import { SpritePaletteIndex } from '../../utils/pixelArtPalette';

/**
 * Slime enemy that moves horizontally
 */
export class Slime extends Enemy implements EntityInitializer {
    public spriteKey: string;
    private bounceHeight: number;
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
        const slimeConfig = resourceLoader.getCharacterConfig('enemies', 'slime');
        
        if (!slimeConfig) {
            throw new Error('Failed to load slime configuration');
        }
        
        const width = slimeConfig.physics.width;
        const height = slimeConfig.physics.height;
        
        super(x, y, width, height);
        
        this.maxHealth = slimeConfig.stats.maxHealth;
        this.health = this.maxHealth;
        this.damage = slimeConfig.stats.damage;
        this.moveSpeed = slimeConfig.physics.moveSpeed;
        
        
        this.spriteKey = 'enemies/slime';
        this.animState = 'idle';
        
        this.bounceHeight = 0.3;
        this.friction = 0.8;
        
        this.detectRange = slimeConfig.ai.detectRange;
        this.attackRange = slimeConfig.ai.attackRange;
        
        this.setAnimation('idle');
    }
    
    protected updateAI(_deltaTime: number): void {
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


    render(renderer: PixelRenderer): void {
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
        this.physicsLayer = manager.getPhysicsSystem().layers.ENEMY;
    }
    
    /**
     * Get animation definitions for slime
     */
    protected getAnimationDefinitions(): AnimationDefinition[] {
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
    
    /**
     * Get palette definition for slime
     */
    protected getPaletteDefinition(): EntityPaletteDefinition {
        return {
            default: {
                colors: [
                    null,
                    0x60,
                    0x62,
                    0x00
                ]
            }
        };
    }
    
    protected getSpritePaletteIndex(): number {
        return SpritePaletteIndex.ENEMY_BASIC;
    }
}