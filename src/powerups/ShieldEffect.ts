import { PowerUpEffect, PowerUpType } from '../types/PowerUpTypes';
import { Player } from '../entities/Player';
import { Logger } from '../utils/Logger';
import { EntityManager } from '../managers/EntityManager';
import { ShieldEffectVisual, ShieldBreakEffect } from '../effects/ShieldEffectVisual';

/**
 * Shield effect that blocks one instance of damage
 */
export class ShieldEffect implements PowerUpEffect<Player> {
    private originalTakeDamage: (() => boolean) | null = null;
    private shieldActive: boolean = false;
    private entityManager: EntityManager;
    private shieldVisual: ShieldEffectVisual | null = null;

    constructor(entityManager: EntityManager) {
        this.entityManager = entityManager;
    }

    onApply(target: Player): void {
        Logger.log('[ShieldEffect] Applying shield to player');
        
        this.shieldActive = true;
        this.originalTakeDamage = target.takeDamage.bind(target);
        this.shieldVisual = new ShieldEffectVisual(target);
        
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
                }
                
                if (this.shieldVisual) {
                    const breakParticles = this.shieldVisual.createBreakEffect();
                    const breakEffect = new ShieldBreakEffect(breakParticles);
                    target.setShieldBreakEffect(breakEffect);
                    target.setShieldVisual(null);
                }
                
                target.getPowerUpManager().removePowerUp(PowerUpType.SHIELD_STONE);
                
                return false;
            }
            
            if (this.originalTakeDamage) {
                return this.originalTakeDamage();
            }
            return false;
        };
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