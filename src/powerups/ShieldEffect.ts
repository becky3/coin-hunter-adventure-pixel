import { PowerUpEffect, PowerUpType } from '../types/PowerUpTypes';
import { Player } from '../entities/Player';
import { Logger } from '../utils/Logger';

/**
 * Shield effect that blocks one instance of damage
 */
export class ShieldEffect implements PowerUpEffect<Player> {
    private originalTakeDamage: (() => boolean) | null = null;
    private shieldActive: boolean = false;

    onApply(target: Player): void {
        Logger.log('[ShieldEffect] Applying shield to player');
        
        this.shieldActive = true;
        this.originalTakeDamage = target.takeDamage.bind(target);
        
        target.takeDamage = (): boolean => {
            if (this.shieldActive) {
                Logger.log('[ShieldEffect] Shield absorbed damage!');
                this.shieldActive = false;
                
                // Make player temporarily invulnerable to prevent double damage
                (target as any)._invulnerable = true;
                (target as any).invulnerabilityTime = 1000; // 1 second of invulnerability
                
                target.getPowerUpManager().removePowerUp(PowerUpType.SHIELD_STONE);
                
                // TODO: Play shield break sound effect
                // TODO: Visual effect for shield breaking
                
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
        
        this.shieldActive = false;
    }
}