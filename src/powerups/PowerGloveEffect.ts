import { PowerUpEffect } from '../types/PowerUpTypes';
import { Player } from '../entities/Player';
import { Logger } from '../utils/Logger';
import { EnergyBullet } from '../entities/projectiles/EnergyBullet';
import { EntityManager } from '../managers/EntityManager';
import { PowerGloveConfig } from '../config/PowerGloveConfig';
import { getColorPalette } from '../utils/pixelArtPalette';
import { ServiceLocator } from '../services/ServiceLocator';

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
        
        target.setHasPowerGlove(true);
        
        this.updatePlayerPalettes('characterPowerGlove');
    }

    onUpdate(target: Player, _deltaTime: number): void {
        const inputManager = target.getInputManager();
        if (!inputManager) {
            return;
        }
        
        const attackPressed = inputManager.isActionPressed('attack');
        
        if (attackPressed) {
            const currentTime = Date.now();
            
            const currentBullets = this.countPlayerBullets();
            if (currentBullets >= PowerGloveConfig.maxBulletsOnScreen) {
                return;
            }
            
            if (currentTime - this.lastFireTime >= PowerGloveConfig.fireRate) {
                this.lastFireTime = currentTime;
                this.fireBullet(target);
            }
        }
    }

    onRemove(target: Player): void {
        Logger.log('[PowerGloveEffect] Removing power glove from player');
        
        target.setHasPowerGlove(false);
        
        this.updatePlayerPalettes('character');
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
            musicSystem.playSEFromPattern('projectile');
        }
        
    }
    
    private updatePlayerPalettes(paletteName: string): void {
        const serviceLocator = ServiceLocator.getInstance();
        const renderer = serviceLocator.get('renderer');
        
        if (!renderer || !renderer.pixelArtRenderer) {
            Logger.warn('[PowerGloveEffect] Could not access renderer from ServiceLocator');
            return;
        }
        
        const pixelArtRenderer = renderer.pixelArtRenderer;
        const newColors = getColorPalette(paletteName);
        
        const playerSpriteNames = [
            'player/idle', 'player/idle_small',
            'player/walk1', 'player/walk2', 'player/walk3', 'player/walk4',
            'player/walk_small1', 'player/walk_small2', 'player/walk_small3', 'player/walk_small4',
            'player/jump1', 'player/jump2',
            'player/jump_small1', 'player/jump_small2'
        ];
        
        playerSpriteNames.forEach(spriteName => {
            const sprite = pixelArtRenderer.sprites.get(spriteName);
            if (sprite && sprite.updatePalette) {
                sprite.updatePalette(newColors);
                Logger.log(`[PowerGloveEffect] Updated palette for ${spriteName} to ${paletteName}`);
            }
        });
        
        const playerAnimations = [
            'player/walk', 'player/walk_small',
            'player/jump', 'player/jump_small'
        ];
        
        playerAnimations.forEach(animName => {
            const animation = pixelArtRenderer.animations.get(animName);
            if (animation && animation.frames) {
                animation.frames.forEach((frame: { updatePalette?: (colors: number[]) => void }) => {
                    if (frame.updatePalette) {
                        frame.updatePalette(newColors);
                    }
                });
                Logger.log(`[PowerGloveEffect] Updated palette for animation ${animName} to ${paletteName}`);
            }
        });
    }
}