import { PowerUpEffect, PowerUpType } from '../types/PowerUpTypes';
import { Player } from '../entities/Player';
import { Logger } from '../utils/Logger';
import { EnergyBullet } from '../entities/projectiles/EnergyBullet';
import { EntityManager } from '../managers/EntityManager';
import { InputSystem } from '../core/InputSystem';

/**
 * Power Glove effect that grants ranged attack ability and makes player large
 */
export class PowerGloveEffect implements PowerUpEffect<Player> {
    private originalTakeDamage: (() => boolean) | null = null;
    private lastFireTime: number = 0;
    private fireRate: number = 500;
    private bulletSpeed: number = 5;
    private entityManager: EntityManager;

    constructor(entityManager: EntityManager) {
        this.entityManager = entityManager;
    }

    onApply(target: Player): void {
        Logger.log('[PowerGloveEffect] Applying power glove to player');
        
        const playerWithSize = target as Player & { 
            isSmall: boolean;
            width: number;
            height: number;
            y: number;
        };
        
        if (playerWithSize.isSmall) {
            playerWithSize.isSmall = false;
            playerWithSize.width = 16;
            playerWithSize.height = 32;
            playerWithSize.y -= 16;
        }
        
        this.originalTakeDamage = target.takeDamage.bind(target);
        
        target.takeDamage = (): boolean => {
            if (this.originalTakeDamage) {
                const result = this.originalTakeDamage();
                
                if (result && playerWithSize.isSmall) {
                    Logger.log('[PowerGloveEffect] Player damaged, removing power glove');
                    target.getPowerUpManager().removePowerUp(PowerUpType.POWER_GLOVE);
                }
                
                return result;
            }
            return false;
        };
    }

    onUpdate(target: Player, _deltaTime: number): void {
        const inputManager = target.getInputManager();
        if (!inputManager) {
            return;
        }
        
        // Simple check like jump
        if (inputManager.isActionPressed('attack')) {
            const currentTime = Date.now();
            
            if (currentTime - this.lastFireTime >= this.fireRate) {
                this.lastFireTime = currentTime;
                this.fireBullet(target);
                Logger.log('[PowerGloveEffect] Fired bullet');
            }
        }
    }

    onRemove(target: Player): void {
        Logger.log('[PowerGloveEffect] Removing power glove from player');
        
        if (this.originalTakeDamage) {
            target.takeDamage = this.originalTakeDamage.bind(target);
            this.originalTakeDamage = null;
        }
    }

    private fireBullet(player: Player): void {
        
        const direction = player.facing === 'right' ? 1 : -1;
        
        const bulletX = player.x + (direction > 0 ? player.width : 0);
        const bulletY = player.y + player.height / 2 - 4;
        
        const bullet = new EnergyBullet(bulletX, bulletY, direction, this.bulletSpeed);
        bullet.initializeInManager(this.entityManager);
        
        Logger.log('[PowerGloveEffect] Fired bullet at', bulletX, bulletY);
    }
}