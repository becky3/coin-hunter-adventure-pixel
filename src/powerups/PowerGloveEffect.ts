import { PowerUpEffect } from '../types/PowerUpTypes';
import { Player } from '../entities/Player';
import { Logger } from '../utils/Logger';
import { EnergyBullet } from '../entities/projectiles/EnergyBullet';
import { EntityManager } from '../managers/EntityManager';
import { PowerGloveConfig } from '../config/PowerGloveConfig';

/**
 * Power Glove effect that grants ranged attack ability and makes player large
 */
export class PowerGloveEffect implements PowerUpEffect<Player> {
    private lastFireTime: number = 0;
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
    }

    onUpdate(target: Player, _deltaTime: number): void {
        const inputManager = target.getInputManager();
        if (!inputManager) {
            Logger.log('[PowerGloveEffect] No input manager');
            return;
        }
        
        const attackPressed = inputManager.isActionPressed('attack');
        
        if (attackPressed) {
            const currentTime = Date.now();
            
            const currentBullets = this.countPlayerBullets();
            if (currentBullets >= PowerGloveConfig.maxBulletsOnScreen) {
                Logger.log('[PowerGloveEffect] Max bullets on screen:', currentBullets, '/', PowerGloveConfig.maxBulletsOnScreen);
                return;
            }
            
            if (currentTime - this.lastFireTime >= PowerGloveConfig.fireRate) {
                this.lastFireTime = currentTime;
                this.fireBullet(target);
                Logger.log('[PowerGloveEffect] Fired bullet. Bullets on screen:', currentBullets + 1);
            } else {
                Logger.log('[PowerGloveEffect] Fire rate cooldown:', currentTime - this.lastFireTime, 'ms remaining');
            }
        }
    }

    onRemove(_target: Player): void {
        Logger.log('[PowerGloveEffect] Removing power glove from player');
    }

    private countPlayerBullets(): number {
        const projectiles = this.entityManager.getProjectiles();
        const energyBullets = projectiles.filter(p => p.constructor.name === 'EnergyBullet');
        return energyBullets.length;
    }

    private fireBullet(player: Player): void {
        
        const direction = player.facing === 'right' ? 1 : -1;
        
        const bulletX = player.x + (direction > 0 ? player.width + 2 : -10);
        const bulletY = player.y + player.height / 2 - 4;
        
        const bullet = new EnergyBullet(bulletX, bulletY, direction, PowerGloveConfig.bulletSpeed);
        bullet.initializeInManager(this.entityManager);
        
        const musicSystem = this.entityManager.getMusicSystem();
        if (musicSystem) {
            musicSystem.playSEFromPattern('shoot');
        }
        
        Logger.log('[PowerGloveEffect] Fired bullet at', bulletX, bulletY);
    }
}