import { PowerUpEffect, PowerUpType } from '../types/PowerUpTypes';
import { Player } from '../entities/Player';
import { Logger } from '../utils/Logger';
import { EntityManager } from '../managers/EntityManager';
import { ShieldEffectVisual } from '../effects/ShieldEffect';

/**
 * Shield effect that blocks one instance of damage
 */
export class ShieldEffect implements PowerUpEffect<Player> {
    private originalTakeDamage: (() => boolean) | null = null;
    private shieldActive: boolean = false;
    private entityManager: EntityManager;
    private shieldVisual: ShieldEffectVisual | null = null;
    private breakingTime: number = 0;
    private isBreaking: boolean = false;

    constructor(entityManager: EntityManager) {
        this.entityManager = entityManager;
    }

    onApply(target: Player): void {
        Logger.log('[ShieldEffect] Applying shield to player');
        
        this.shieldActive = true;
        this.originalTakeDamage = target.takeDamage.bind(target);
        this.shieldVisual = new ShieldEffectVisual(target);
        
        Logger.log('[ShieldEffect] Created ShieldEffectVisual:', this.shieldVisual);
        target.setShieldVisual(this.shieldVisual);
        
        target.takeDamage = (): boolean => {
            if (this.shieldActive) {
                Logger.log('[ShieldEffect] Shield absorbed damage!');
                this.shieldActive = false;
                
                const playerWithInvulnerable = target as Player & { 
                    _invulnerable: boolean; 
                    invulnerabilityTime: number;
                    skipBlinkEffect?: boolean;
                };
                playerWithInvulnerable._invulnerable = true;
                playerWithInvulnerable.invulnerabilityTime = 1000;
                playerWithInvulnerable.skipBlinkEffect = true;
                
                const musicSystem = this.entityManager.getMusicSystem();
                if (musicSystem) {
                    musicSystem.playSEFromPattern('shieldBreak');
                    musicSystem.playSE('damage');
                }
                
                if (this.shieldVisual) {
                    this.shieldVisual.setBreaking(true);
                }
                
                this.isBreaking = true;
                this.breakingTime = 1.0;
                
                return false;
            }
            
            if (this.originalTakeDamage) {
                return this.originalTakeDamage();
            }
            return false;
        };
    }

    onUpdate(target: Player, deltaTime: number): void {
        if (this.shieldVisual) {
            this.shieldVisual.update(deltaTime);
        }
        
        if (this.isBreaking) {
            this.breakingTime -= deltaTime;
            Logger.log(`[ShieldEffect] Breaking countdown: ${this.breakingTime.toFixed(3)}s remaining (deltaTime: ${deltaTime})`);
            if (this.breakingTime <= 0) {
                this.isBreaking = false;
                target.getPowerUpManager().removePowerUp(PowerUpType.SHIELD_STONE);
            }
        }
    }

    onRemove(target: Player): void {
        Logger.log('[ShieldEffect] Removing shield from player');
        
        if (this.originalTakeDamage) {
            target.takeDamage = this.originalTakeDamage.bind(target);
            this.originalTakeDamage = null;
        }
        
        target.setShieldVisual(null);
        this.shieldVisual = null;
        this.shieldActive = false;
    }
}