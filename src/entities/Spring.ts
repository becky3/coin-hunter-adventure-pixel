import { Entity, CollisionInfo } from './Entity';
import { Player } from './Player';
import { PixelRenderer } from '../rendering/PixelRenderer';
import { PhysicsSystem } from '../physics/PhysicsSystem';
import { ResourceLoader } from '../config/ResourceLoader';
import { Logger } from '../utils/Logger';
import { InputSystem } from '../core/InputSystem';

/**
 * Spring platform that bounces the player
 */

export class Spring extends Entity {
    private baseBounceMultiplier: number;
    private compression: number;
    public triggered: boolean;
    private animationSpeed: number;
    declare animationTime: number;
    public physicsSystem: PhysicsSystem | null;
    private cooldownFrames: number;
    // 20フレーム = 約0.33秒（60FPS想定）
    private readonly COOLDOWN_DURATION = 20;

    constructor(x: number, y: number) {
        // Load config from ResourceLoader if available
        let springConfig = null;
        try {
            const resourceLoader = ResourceLoader.getInstance();
            springConfig = resourceLoader.getObjectConfig('items', 'spring');
        } catch {
            // ResourceLoader not initialized yet, use defaults
        }
        
        const width = springConfig?.physics.width || 16;
        const height = springConfig?.physics.height || 16;
        
        super(x, y, width, height);
        
        this.gravity = false;
        this.physicsEnabled = false;
        this.solid = springConfig?.physics.solid ?? true;
        
        // ジャンプ力の2.5倍
        this.baseBounceMultiplier = 2.5;
        this.compression = 0;
        this.triggered = false;
        this.animationSpeed = springConfig?.properties.expansionSpeed || 0.2;
        
        this.animationTime = 0;
        this.physicsSystem = null;
        this.cooldownFrames = 0;
    }

    onUpdate(deltaTime: number): void {
        // Update cooldown
        if (this.cooldownFrames > 0) {
            this.cooldownFrames--;
        }
        
        // Update compression animation
        if (this.compression > 0) {
            this.compression *= 0.9;
            if (this.compression < 0.01) {
                this.compression = 0;
            }
        }
        
        // Reset triggered state when spring is not compressed
        if (this.triggered && this.compression <= 0.01) {
            this.triggered = false;
        }
        
        this.animationTime += deltaTime;
    }

    private applyBounce(player: Player): void {
        
        // Position player on top of spring
        player.y = this.y - player.height;
        
        // Calculate bounce velocity
        const playerJumpPower = player.jumpPower || 10;
        const bounceVelocity = -(playerJumpPower * this.baseBounceMultiplier);
        
        // Check if jump button is pressed
        const inputManager = (window as Window & { game?: { inputManager?: InputSystem } }).game?.inputManager;
        const isJumpPressed = inputManager ? inputManager.isActionPressed('jump') : false;
        
        Logger.log(`[Spring] Bounce triggered - velocity: ${bounceVelocity}, jump pressed: ${isJumpPressed}`);
        
        // Apply spring bounce
        if ('applySpringBounce' in player && typeof player.applySpringBounce === 'function') {
            (player as Player).applySpringBounce(bounceVelocity, isJumpPressed);
        } else {
            // Fallback for compatibility
            player.vy = bounceVelocity;
            player.grounded = false;
        }
        
        // Update spring state
        this.compression = 1;
        this.triggered = true;
        this.cooldownFrames = this.COOLDOWN_DURATION;
        
        // TODO: Play sound effect
    }

    render(renderer: PixelRenderer): void {
        if (!this.visible) return;
        
        if (renderer.assetLoader && renderer.assetLoader.hasSprite('terrain/spring')) {
            const compression = this.compression * 0.3;
            const offsetY = this.height * compression;
            
            renderer.drawSprite('terrain/spring', this.x, this.y + offsetY);
        } else {
            const compression = this.compression * 0.3;
            const height = this.height * (1 - compression);
            const offsetY = this.height - height;
            const color = this.compression > 0 ? '#00AA00' : '#00FF00';
            
            renderer.drawRect(
                this.x,
                this.y + offsetY,
                this.width,
                height,
                color
            );
        }
        
        if (renderer.debug) {
            this.renderDebug(renderer);
        }
    }

    onCollision(collisionInfo?: CollisionInfo): boolean {
        if (!collisionInfo) return false;
        
        const other = collisionInfo.other;
        
        // Check if colliding with player
        if (other && other.constructor.name === 'Player') {
            const player = other as unknown as Player;
            
            // Check if player is landing on top of spring
            const fromTop = collisionInfo.side === 'top' || 
                          (player.y + player.height <= this.y + 8 && player.vy > 0);
            
            if (fromTop && player.vy > 0) {
                // Only bounce if cooldown is complete
                if (this.cooldownFrames <= 0) {
                    this.applyBounce(player);
                }
                return true;
            }
        }
        
        return false;
    }

    reset(x: number, y: number): void {
        super.reset(x, y);
        this.compression = 0;
        this.triggered = false;
        this.animationTime = 0;
        this.cooldownFrames = 0;
    }
}