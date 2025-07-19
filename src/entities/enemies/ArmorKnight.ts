import { Enemy } from '../Enemy';
import { Player } from '../Player';
import { PixelRenderer } from '../../rendering/PixelRenderer';
import { ResourceLoader } from '../../config/ResourceLoader';
import { Logger } from '../../utils/Logger';
import { EntityInitializer } from '../../interfaces/EntityInitializer';
import { EntityManager } from '../../managers/EntityManager';

/**
 * Heavily armored enemy that cannot be defeated by jumping
 */
export class ArmorKnight extends Enemy implements EntityInitializer {
    public spriteKey: string;
    private chargeSpeed: number;
    private normalSpeed: number;
    private isCharging: boolean;
    private playerInRange: Player | null;

    /**
     * Factory method to create an ArmorKnight instance
     */
    static create(x: number, y: number): ArmorKnight {
        const armorKnight = new ArmorKnight(x, y);
        armorKnight.direction = -1;
        return armorKnight;
    }

    constructor(x: number, y: number) {
        let config = null;
        try {
            const resourceLoader = ResourceLoader.getInstance();
            config = resourceLoader.getCharacterConfig('enemies', 'armor_knight');
        } catch (error) {
            Logger.warn('Failed to load armor_knight config:', error);
        }
        
        const width = config?.physics.width || 16;
        const height = config?.physics.height || 16;
        
        super(x, y, width, height);
        
        this.maxHealth = config?.stats.maxHealth || 3;
        this.health = this.maxHealth;
        this.damage = config?.stats.damage || 2;
        this.normalSpeed = config?.physics.moveSpeed || 0.15;
        this.moveSpeed = this.normalSpeed;
        this.chargeSpeed = this.normalSpeed * 2;
        
        this.spriteKey = 'enemies/armor_knight';
        this.animState = 'idle';
        
        this.isCharging = false;
        this.playerInRange = null;
        
        if (config?.ai) {
            this.aiType = (config.ai.type as 'patrol' | 'chase' | 'idle') || 'patrol';
            this.detectRange = config.ai.detectRange || 60;
            this.attackRange = config.ai.attackRange || 20;
        }
    }
    
    protected updateAI(_deltaTime: number): void {
        if (this.state === 'dead' || this.state === 'hurt') {
            this.isCharging = false;
            this.moveSpeed = this.normalSpeed;
            return;
        }

        if (this.playerInRange && this.isPlayerStillInRange(this.playerInRange)) {
            this.isCharging = true;
            this.moveSpeed = this.chargeSpeed;
            this.animState = 'charge';
            
            const playerDir = this.playerInRange.x > this.x ? 1 : -1;
            if (playerDir !== this.direction) {
                this.direction = playerDir;
                this.facingRight = this.direction === 1;
            }
        } else {
            this.isCharging = false;
            this.moveSpeed = this.normalSpeed;
            this.animState = 'move';
            this.playerInRange = null;
        }

        if (this.grounded) {
            this.vx = this.moveSpeed * this.direction;
        }
    }

    /**
     * Check if a player is still within detection range
     */
    private isPlayerStillInRange(player: Player): boolean {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance <= this.detectRange;
    }

    /**
     * Set the player that's in range for charging
     */
    public setPlayerInRange(player: Player | null): void {
        this.playerInRange = player;
    }

    /**
     * Override collision with player - cannot be defeated by jumping
     */
    onCollisionWithPlayer(player: Player): void {
        if (this.state === 'dead' || player.invulnerable) return;
        
        if (player.takeDamage) {
            player.takeDamage();
        }
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
        
        const screenPos = renderer.worldToScreen(this.x, this.y);
        const color = this.isCharging ? '#8B0000' : '#696969';
        renderer.drawRect(screenPos.x, screenPos.y, this.width, this.height, color);
    }
    
    /**
     * Initialize this armor knight in the EntityManager
     */
    initializeInManager(manager: EntityManager): void {
        this.setEventBus(manager.getEventBus());
        manager.addEnemy(this);
        manager.getPhysicsSystem().addEntity(this, manager.getPhysicsSystem().layers.ENEMY);
    }
}