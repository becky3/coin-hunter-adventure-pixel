
import { Entity, CollisionInfo } from './Entity';
import { Player } from './Player';
import { PixelRenderer } from '../rendering/PixelRenderer';
import { PhysicsSystem } from '../physics/PhysicsSystem';
import { ResourceLoader } from '../config/ResourceLoader';

export class Spring extends Entity {
    private baseBounceMultiplier: number;
    private compression: number;
    public triggered: boolean;
    private animationSpeed: number;
    declare animationTime: number;
    public physicsSystem: PhysicsSystem | null;
    private _debugCount?: number;

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
        
        this.baseBounceMultiplier = 1.5; // ジャンプ力の1.5倍
        this.compression = 0;
        this.triggered = false;
        this.animationSpeed = springConfig?.properties.expansionSpeed || 0.2;
        
        this.animationTime = 0;
        this.physicsSystem = null;
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
                const notTouching = playerBottom < this.y - 5 || player.y > this.y + this.height;
                if (notTouching) {
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
            
            if (onTopOfSpring && player.grounded && player.vy >= -0.1 && !this.triggered) {
                player.y = this.y - player.height;
                
                const playerJumpPower = player.jumpPower || 10;
                player.vy = -(playerJumpPower * this.baseBounceMultiplier);
                player.grounded = false;
                
                // 可変ジャンプを有効化
                // Spring-specific properties that need to be set
                player.setJumpingState(true);
                player.enableVariableJump();
                
                this.compression = 1;
                this.triggered = true;

                if (this.physicsSystem) {
                    // TODO: Implement sound effect playback
                }
            } else if (!onTopOfSpring && playerBottom > this.y && player.y < this.y + this.height) {
                if (player.grounded && !this.triggered) {
                    player.y = this.y - player.height;
                    const playerJumpPower = player.jumpPower || 10;
                    player.vy = -(playerJumpPower * this.baseBounceMultiplier);
                    player.grounded = false;
                    
                    // 可変ジャンプを有効化
                    player.isJumping = true;
                    player.canVariableJump = true;
                    player.jumpButtonPressed = true;
                    player.jumpButtonReleaseTime = 0;
                    
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
                player.y = this.y - player.height;
                
                const playerJumpPower = player.jumpPower || 10;
                player.vy = -(playerJumpPower * this.baseBounceMultiplier);
                player.grounded = false;
                
                // 可変ジャンプを有効化
                // Spring-specific properties that need to be set
                player.setJumpingState(true);
                player.enableVariableJump();
                
                this.compression = 1;
                this.triggered = true;

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