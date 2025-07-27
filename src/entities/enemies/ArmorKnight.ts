import { Enemy } from '../Enemy';
import { Player } from '../Player';
import { PixelRenderer } from '../../rendering/PixelRenderer';
import { ResourceLoader } from '../../config/ResourceLoader';
import { Logger } from '../../utils/Logger';
import { EntityInitializer } from '../../interfaces/EntityInitializer';
import { EntityManager } from '../../managers/EntityManager';
import type { AnimationDefinition, EntityPaletteDefinition } from '../../types/animationTypes';

/**
 * Heavily armored enemy that cannot be defeated by jumping
 */
export class ArmorKnight extends Enemy implements EntityInitializer {
    private static readonly CHARGE_SPEED_MULTIPLIER = 6;
    private static readonly DEFAULT_STOMP_BOUNCE_VELOCITY = -16;
    
    public spriteKey: string;
    private chargeSpeed: number;
    private normalSpeed: number;
    private isCharging: boolean;
    private playerInRange: Player | null;
    private detectRangeWidth: number;
    private detectRangeHeight: number;

    /**
     * Factory method to create an ArmorKnight instance
     */
    static create(x: number, y: number): ArmorKnight {
        const armorKnight = new ArmorKnight(x, y);
        armorKnight.direction = -1;
        return armorKnight;
    }

    constructor(x: number, y: number) {
        const resourceLoader = ResourceLoader.getInstance();
        const config = resourceLoader.getCharacterConfig('enemies', 'armor_knight');
        
        if (!config) {
            throw new Error('Failed to load armor_knight configuration');
        }
        
        const width = config.physics.width;
        const height = config.physics.height;
        
        super(x, y, width, height);
        
        this.maxHealth = config.stats.maxHealth;
        this.health = this.maxHealth;
        this.damage = config.stats.damage;
        this.normalSpeed = config.physics.moveSpeed;
        this.moveSpeed = this.normalSpeed;
        this.chargeSpeed = this.normalSpeed * ArmorKnight.CHARGE_SPEED_MULTIPLIER;
        
        this.spriteKey = 'enemies/armor_knight';
        this.animState = 'idle';
        
        this.isCharging = false;
        this.playerInRange = null;
        
        this.stompBounceVelocity = ArmorKnight.DEFAULT_STOMP_BOUNCE_VELOCITY;
        
        this.detectRange = config.ai.detectRange;
        this.detectRangeWidth = config.ai.detectRangeWidth;
        this.detectRangeHeight = config.ai.detectRangeHeight;
        this.attackRange = config.ai.attackRange;
        
        this.setAnimation('idle');
    }
    
    protected updateAI(_deltaTime: number): void {
        if (this.state === 'dead') {
            this.isCharging = false;
            this.moveSpeed = this.normalSpeed;
            return;
        }
        
        if (this.state === 'hurt') {
            this.isCharging = false;
            this.moveSpeed = this.normalSpeed;
            this.vx = 0;
            if (this.stateTimer <= 0) {
                Logger.log('ArmorKnight', 'Recovering from hurt state');
                this.state = 'idle';
                this.animState = 'move';
                if (this.entityAnimationManager) {
                    this.entityAnimationManager.setState(this.animState);
                }
                
                if (this.eventBus) {
                    this.eventBus.emit('enemy:state-changed', {
                        enemy: this,
                        previousState: 'hurt',
                        newState: 'idle'
                    });
                }
            }
            return;
        }

        const player = this.findPlayer();
        
        if (player && this.isPlayerInRange(player)) {
            this.playerInRange = player;
            this.isCharging = true;
            this.moveSpeed = this.chargeSpeed;
            this.animState = 'charge';
            if (this.entityAnimationManager) {
                this.entityAnimationManager.setState('charge');
            }
            
            const playerDir = this.playerInRange.x > this.x ? 1 : -1;
            if (playerDir !== this.direction) {
                this.direction = playerDir;
                this.facingRight = this.direction === 1;
            }
        } else {
            this.isCharging = false;
            this.moveSpeed = this.normalSpeed;
            this.animState = 'move';
            if (this.entityAnimationManager) {
                this.entityAnimationManager.setState('move');
            }
            this.playerInRange = null;
        }

        if (this.grounded) {
            this.vx = this.moveSpeed * this.direction;
        }
    }

    /**
     * Check if a player is within detection range (rectangular)
     */
    private isPlayerInRange(player: Player): boolean {
        const dx = Math.abs(player.x - this.x);
        const dy = Math.abs(player.y - this.y);
        
        return dx <= this.detectRangeWidth && dy <= this.detectRangeHeight;
    }
    
    /**
     * Find the player using the event bus
     */
    private findPlayer(): Player | null {
        if (!this.eventBus) {
            Logger.log('ArmorKnight', 'No eventBus available');
            return null;
        }
        
        try {
            const results = this.eventBus.emit('entity:findPlayer');
            if (results && Array.isArray(results) && results.length > 0) {
                const player = results[0];
                if (player && typeof player === 'object' && 'x' in player && 'y' in player) {
                    return player as Player;
                }
            }
            return null;
        } catch (error) {
            Logger.warn('ArmorKnight', 'Failed to find player:', error);
            return null;
        }
    }

    /**
     * Override collision with player - cannot be defeated by jumping
     */
    onCollisionWithPlayer(player: Player): void {
        if (this.state === 'dead' || player.invulnerable) return;
        
        super.onCollisionWithPlayer(player);
    }

    /**
     * ArmorKnight cannot be defeated by stomping
     */
    canBeStomped(): boolean {
        return false;
    }

    /**
     * Override take damage - only vulnerable to special attacks
     */
    takeDamage(amount: number, source?: string): void {
        if (source === 'projectile' || source === 'powerup') {
            super.takeDamage(amount);
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
     * Initialize this armor knight in the EntityManager
     */
    initializeInManager(manager: EntityManager): void {
        this.setEventBus(manager.getEventBus());
        manager.addEnemy(this);
        this.physicsLayer = manager.getPhysicsSystem().layers.ENEMY;
    }
    
    /**
     * Get animation definitions for armor knight
     */
    protected getAnimationDefinitions(): AnimationDefinition[] {
        return [
            {
                id: 'idle',
                sprites: ['enemies/armor_knight_idle.json'],
                frameDuration: 0,
                loop: false
            },
            {
                id: 'move',
                sprites: ['enemies/armor_knight_move.json'],
                frameDuration: 0,
                loop: false
            },
            {
                id: 'charge',
                sprites: ['enemies/armor_knight_move.json'],
                frameDuration: 0,
                loop: false
            }
        ];
    }
    
    /**
     * Get palette definition for armor knight
     */
    protected getPaletteDefinition(): EntityPaletteDefinition {
        return {
            default: {
                colors: [
                    null,
                    0x01,
                    0x42,
                    0x43
                ]
            }
        };
    }
}