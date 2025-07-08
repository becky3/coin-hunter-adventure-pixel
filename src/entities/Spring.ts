
import { Entity, CollisionInfo } from './Entity';
import { Player } from './Player';
import { PixelRenderer } from '../rendering/PixelRenderer';
import { PhysicsSystem } from '../physics/PhysicsSystem';
import { ResourceLoader } from '../config/ResourceLoader';
import { Logger } from '../utils/Logger';

export class Spring extends Entity {
    private baseBounceMultiplier: number;
    private compression: number;
    public triggered: boolean;
    private animationSpeed: number;
    declare animationTime: number;
    public physicsSystem: PhysicsSystem | null;
    private _debugCount?: number;
    private lastBounceTime: number;

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
        
        this.baseBounceMultiplier = 2.5; // ジャンプ力の2.5倍
        this.compression = 0;
        this.triggered = false;
        this.animationSpeed = springConfig?.properties.expansionSpeed || 0.2;
        
        this.animationTime = 0;
        this.physicsSystem = null;
        this.lastBounceTime = 0;
    }

    onUpdate(deltaTime: number): void {
        if (this.compression > 0) {
            this.compression *= 0.9;
            if (this.compression < 0.01) {
                this.compression = 0;
                this.triggered = false;
            }
        }
        
        this.animationTime += deltaTime;
        
        this.checkPlayerContact();
        
        if (this.triggered && this.physicsSystem) {
            const entities = Array.from(this.physicsSystem.getEntities());
            const player = entities.find(e => e.constructor.name === 'Player') as unknown as Player | undefined;
            if (player) {
                const playerBottom = player.y + player.height;
                const playerLeft = player.x;
                const playerRight = player.x + player.width;
                const springLeft = this.x;
                const springRight = this.x + this.width;
                
                // Check if player is not touching the spring (vertically and horizontally)
                const notTouchingVertically = playerBottom < this.y - 5 || player.y > this.y + this.height;
                const notTouchingHorizontally = playerRight < springLeft || playerLeft > springRight;
                
                if (notTouchingVertically || notTouchingHorizontally) {
                    Logger.log(`[Spring] Resetting trigger - Player no longer touching`);
                    this.triggered = false;
                }
            }
        }
    }

    checkPlayerContact(): void {
        
        if (!this.physicsSystem) return;
        
        const entities = Array.from(this.physicsSystem.getEntities());
        const player = entities.find(e => e.constructor.name === 'Player') as Player | undefined;
        if (!player) return;
        
        const playerBounds = player.getBounds();
        const springBounds = this.getBounds();
        
        const isColliding = playerBounds.left < springBounds.right &&
            playerBounds.right > springBounds.left &&
            playerBounds.top < springBounds.bottom &&
            playerBounds.bottom > springBounds.top;
            
        if (isColliding) {
            const playerBottom = player.y + player.height;
            const onTopOfSpring = Math.abs(playerBottom - this.y) <= 2;
            
            if (!this._debugCount) this._debugCount = 0;
            if (this._debugCount < 10 && player.grounded) {
                this._debugCount++;
            }
            
            if (onTopOfSpring && player.grounded && player.vy >= -0.1) {
                // Check cooldown
                const currentTime = Date.now();
                const cooldownTime = 1000; // 1 second cooldown
                
                if (this.triggered && (currentTime - this.lastBounceTime) < cooldownTime) {
                    return;
                }
                
                player.y = this.y - player.height;
                
                const playerJumpPower = player.jumpPower || 10;
                const bounceVelocity = -(playerJumpPower * this.baseBounceMultiplier);
                
                Logger.log(`[Spring] Bounce triggered from checkPlayerContact - bounceVelocity: ${bounceVelocity}`);
                
                // Apply spring bounce using the dedicated method
                if ('applySpringBounce' in player && typeof player.applySpringBounce === 'function') {
                    (player as Player).applySpringBounce(bounceVelocity);
                } else {
                    // Fallback to old method if applySpringBounce doesn't exist
                    player.vy = bounceVelocity;
                    player.grounded = false;
                    player.setJumpingState(true);
                    player.enableVariableJump();
                }
                
                this.compression = 1;
                this.triggered = true;
                this.lastBounceTime = currentTime;

                if (this.physicsSystem) {
                    // TODO: Implement sound effect playback
                }
            } else if (!onTopOfSpring && playerBottom > this.y && player.y < this.y + this.height) {
                if (player.grounded && !this.triggered) {
                    player.y = this.y - player.height;
                    const playerJumpPower = player.jumpPower || 10;
                    const bounceVelocity = -(playerJumpPower * this.baseBounceMultiplier);
                    player.vy = bounceVelocity;
                    player.grounded = false;
                    
                    // 可変ジャンプを有効化
                    // Spring-specific properties that need to be set
                    player.setJumpingState(true);
                    player.enableVariableJump();
                    
                    this.compression = 1;
                    this.triggered = true;
                }
            }
        }
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
        
        if (other && other.constructor.name === 'Player') {
            const player = other as unknown as Player;
            const fromTop = collisionInfo.side === 'top' || 
                          (player.y + player.height <= this.y + 8 && player.vy > 0);
            
            if (fromTop && player.vy > 0) {
                // Check cooldown to prevent rapid re-triggers
                const currentTime = Date.now();
                const cooldownTime = 1000; // 1 second cooldown
                
                if (this.triggered && (currentTime - this.lastBounceTime) < cooldownTime) {
                    return false;
                }
                
                player.y = this.y - player.height;
                
                const playerJumpPower = player.jumpPower || 10;
                const bounceVelocity = -(playerJumpPower * this.baseBounceMultiplier);
                
                Logger.log(`[Spring] Bounce triggered from onCollision - bounceVelocity: ${bounceVelocity}`);
                
                // Apply spring bounce using the dedicated method
                if ('applySpringBounce' in player && typeof player.applySpringBounce === 'function') {
                    (player as Player).applySpringBounce(bounceVelocity);
                } else {
                    // Fallback to old method if applySpringBounce doesn't exist
                    player.vy = bounceVelocity;
                    player.grounded = false;
                    player.setJumpingState(true);
                    player.enableVariableJump();
                }
                
                this.compression = 1;
                this.triggered = true;
                this.lastBounceTime = currentTime;

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
    }
}