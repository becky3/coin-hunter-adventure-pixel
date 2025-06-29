import { Entity, CollisionInfo } from './Entity';
import { InputSystem } from '../core/InputSystem';
import { MusicSystem } from '../audio/MusicSystem.js';
import { AssetLoader } from '../assets/AssetLoader';
import { PixelRenderer } from '../rendering/PixelRenderer';

const PLAYER_CONFIG = {
    width: 16,
    height: 16,
    speed: 3.5,
    jumpPower: 10,
    minJumpTime: 8,
    maxJumpTime: 20,
    maxHealth: 3,
    invulnerabilityTime: 2000,
    spawnX: 100,
    spawnY: 300,
    knockbackVertical: -5,
    knockbackHorizontal: 3
} as const;

const ANIMATION_CONFIG = {
    speed: {
        idle: 500,
        walk: 100,
        jump: 200,
        fall: 200
    },
    frameCount: {
        idle: 2,
        walk: 4,
        jump: 1,
        fall: 1
    }
} as const;

type AnimationState = 'idle' | 'walk' | 'jump' | 'fall';
type Facing = 'left' | 'right';

interface PlayerState {
    x: number;
    y: number;
    vx: number;
    vy: number;
    health: number;
    maxHealth: number;
    isDead: boolean;
    invulnerable: boolean;
    facing: Facing;
    animState: AnimationState;
    animFrame: number;
    score: number;
    coins: number;
    grounded: boolean;
    isJumping: boolean;
}

export class Player extends Entity {
    public speed: number;
    public jumpPower: number;
    public spriteKey: string | null;
    public health: number;
    public maxHealth: number;
    public isDead: boolean;
    public invulnerable: boolean;
    public invulnerabilityTime: number;
    public facing: Facing;
    public animState: AnimationState;
    public animFrame: number;
    public animTimer: number;
    public isJumping: boolean;
    public jumpButtonPressed: boolean;
    public jumpTime: number;
    public canVariableJump: boolean;
    public jumpButtonHoldTime: number;
    public jumpMaxHeight: number;
    public jumpStartY: number;
    public score: number;
    public coins: number;
    private inputManager: InputSystem | null;
    private musicSystem: MusicSystem | null;
    private assetLoader: AssetLoader | null;

    constructor(x: number = PLAYER_CONFIG.spawnX, y: number = PLAYER_CONFIG.spawnY) {
        super(x, y, PLAYER_CONFIG.width, PLAYER_CONFIG.height);
        
        this.speed = PLAYER_CONFIG.speed;
        this.jumpPower = PLAYER_CONFIG.jumpPower;
        
        this.spriteKey = null;
        
        this.health = PLAYER_CONFIG.maxHealth;
        this.maxHealth = PLAYER_CONFIG.maxHealth;
        this.isDead = false;
        this.invulnerable = false;
        this.invulnerabilityTime = 0;
        
        this.facing = 'right';
        
        this.animState = 'idle';
        this.animFrame = 0;
        this.animTimer = 0;
        
        this.isJumping = false;
        this.jumpButtonPressed = false;
        this.jumpTime = 0;
        this.canVariableJump = false;
        this.jumpButtonHoldTime = 0;
        this.jumpMaxHeight = 0;
        this.jumpStartY = 0;
        
        this.score = 0;
        this.coins = 0;
        
        this.inputManager = null;
        
        this.musicSystem = null;
        
        this.assetLoader = null;
    }
    
    setInputManager(inputManager: InputSystem): void {
        this.inputManager = inputManager;
    }
    
    setMusicSystem(musicSystem: MusicSystem): void {
        this.musicSystem = musicSystem;
    }
    
    setAssetLoader(assetLoader: AssetLoader): void {
        this.assetLoader = assetLoader;
    }
    
    update(deltaTime: number): void {
        super.update(deltaTime);
        
        if (this.isDead) return;
        
        if (!this.inputManager) return;
        
        const input = {
            left: this.inputManager.isActionPressed('left'),
            right: this.inputManager.isActionPressed('right'),
            jump: this.inputManager.isActionPressed('jump'),
            action: this.inputManager.isActionPressed('action')
        };
        
        this.handleMovement(input);
        this.handleJump(input, deltaTime);
        
        this.updateAnimationState();
        this.updateAnimationFrame(deltaTime);
        
        if (this.invulnerable) {
            this.invulnerabilityTime -= deltaTime;
            if (this.invulnerabilityTime <= 0) {
                this.invulnerable = false;
                this.invulnerabilityTime = 0;
            }
        }
    }
    
    private handleMovement(input: { left: boolean; right: boolean; jump: boolean; action: boolean }): void {
        if (input.left) {
            this.vx = -this.speed;
            this.facing = 'left';
        } else if (input.right) {
            this.vx = this.speed;
            this.facing = 'right';
        } else {
            this.vx *= 0.8;
            if (Math.abs(this.vx) < 0.1) {
                this.vx = 0;
            }
        }
    }
    
    private handleJump(input: { left: boolean; right: boolean; jump: boolean; action: boolean }, deltaTime: number): void {
        if (input.jump && !this.jumpButtonPressed && this.grounded) {
            this.vy = -this.jumpPower;
            this.isJumping = true;
            this.jumpButtonPressed = true;
            this.jumpTime = 0;
            this.canVariableJump = true;
            this.jumpMaxHeight = 0;
            this.jumpStartY = this.y;
            
            if (this.musicSystem) {
                this.musicSystem.playJumpSound();
            }
        }
        
        if (this.isJumping) {
            this.jumpTime += deltaTime;
            
            if (input.jump && this.canVariableJump) {
                if (this.jumpTime < PLAYER_CONFIG.maxJumpTime && this.vy < 0) {
                    this.vy -= this.gravityStrength * 0.5;
                } else if (this.jumpTime >= PLAYER_CONFIG.maxJumpTime) {
                    this.canVariableJump = false;
                }
            } else {
                if (this.jumpTime >= PLAYER_CONFIG.minJumpTime && this.vy < 0) {
                    this.vy *= 0.5;
                }
                this.jumpButtonPressed = false;
                this.canVariableJump = false;
            }
        }
        
        if (this.isJumping && !this.grounded) {
            const currentHeight = this.jumpStartY - this.y;
            if (currentHeight > this.jumpMaxHeight) {
                this.jumpMaxHeight = currentHeight;
            }
        }
        
        if (!input.jump) {
            this.jumpButtonPressed = false;
        }
        
        if (this.grounded && this.isJumping) {
            this.isJumping = false;
            this.canVariableJump = false;
        }
    }
    
    private updateAnimationState(): void {
        const prevState = this.animState;
        
        if (!this.grounded) {
            if (this.vy < 0) {
                this.animState = 'jump';
            } else {
                this.animState = 'fall';
            }
        } else if (Math.abs(this.vx) > 0.1) {
            this.animState = 'walk';
        } else {
            this.animState = 'idle';
        }
        
        if (prevState !== this.animState) {
            this.updateSprite();
        }
    }
    
    private updateAnimationFrame(deltaTime: number): void {
        this.animTimer += deltaTime;
        
        const speed = ANIMATION_CONFIG.speed[this.animState] || 200;
        
        if (this.animTimer >= speed) {
            this.animTimer = 0;
            
            const frames = ANIMATION_CONFIG.frameCount[this.animState] || 1;
            this.animFrame = (this.animFrame + 1) % frames;
        }
    }
    
    takeDamage(damage: number = 1): void {
        if (this.invulnerable || this.isDead) return;
        
        this.health -= damage;
        
        if (this.health <= 0) {
            this.health = 0;
            this.die();
        } else {
            this.invulnerable = true;
            this.invulnerabilityTime = PLAYER_CONFIG.invulnerabilityTime;
            
            this.vy = PLAYER_CONFIG.knockbackVertical;
            this.vx = this.facing === 'right' ? -PLAYER_CONFIG.knockbackHorizontal : PLAYER_CONFIG.knockbackHorizontal;
            
            if (this.musicSystem) {
                this.musicSystem.playDamageSound();
            }
        }
    }
    
    heal(amount: number = 1): void {
        this.health = Math.min(this.health + amount, this.maxHealth);
    }
    
    private die(): void {
        this.isDead = true;
        this.vy = -8;
        
        if (this.musicSystem) {
            // TODO: Add playPlayerDeathSound to MusicSystem

        }
    }
    
    respawn(x: number, y: number): void {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.isDead = false;
        this.invulnerable = false;
        this.invulnerabilityTime = 0;
        this.animState = 'idle';
        this.animFrame = 0;
        this.animTimer = 0;
        this.isJumping = false;
        this.jumpButtonPressed = false;
        this.canVariableJump = false;
        this.grounded = false;
        this.health = this.maxHealth;
    }
    
    addScore(points: number): void {
        this.score += points;
    }
    
    collectCoin(amount: number = 1): void {
        this.coins += amount;
    }
    
    private updateSprite(): void {
        if (this.animState === 'idle') {
            this.spriteKey = 'player/idle';
        } else if (this.animState === 'walk') {
            this.spriteKey = 'player/walk';
        } else if (this.animState === 'jump' || this.animState === 'fall') {
            this.spriteKey = 'player/jump';
        }
    }
    
    render(renderer: PixelRenderer): void {
        this.flipX = this.facing === 'left';
        
        if (this.invulnerable && Math.floor(this.invulnerabilityTime / 100) % 2 === 0) {
            return;
        }
        
        if (renderer.pixelArtRenderer) {
            const screenPos = renderer.worldToScreen(this.x, this.y);
            
            if (this.animState === 'walk') {
                const animation = renderer.pixelArtRenderer.animations.get('player/walk');
                if (animation) {
                    animation.update(Date.now());
                    animation.draw(
                        renderer.ctx,
                        screenPos.x,
                        screenPos.y,
                        this.flipX,
                        renderer.scale
                    );
                    return;
                }
            }
            
            if (this.animState === 'jump' || this.animState === 'fall') {
                const animation = renderer.pixelArtRenderer.animations.get('player/jump');
                if (animation) {
                    animation.update(Date.now());
                    animation.draw(
                        renderer.ctx,
                        screenPos.x,
                        screenPos.y,
                        this.flipX,
                        renderer.scale
                    );
                    return;
                }
            }
            
            const sprite = renderer.pixelArtRenderer.sprites.get(this.spriteKey || 'player/idle');
            if (sprite) {
                sprite.draw(
                    renderer.ctx,
                    screenPos.x,
                    screenPos.y,
                    this.flipX,
                    renderer.scale
                );
                return;
            } else if ((window as any).game?.debug) {
                console.warn('Sprite not found:', this.spriteKey);
            }
        }
        
        // フォールバック: スプライトが見つからない場合は基本的な矩形を描画
        if (!renderer.pixelArtRenderer || !renderer.pixelArtRenderer.sprites.has(this.spriteKey || 'player/idle')) {
            console.warn('Player sprite not found, falling back to rectangle. spriteKey:', this.spriteKey);
            super.render(renderer);
        }
        
        if (renderer.debug) {
            const screenPos = renderer.worldToScreen(this.x, this.y - 20);
            renderer.ctx.fillStyle = '#FFFFFF';
            renderer.ctx.font = '10px monospace';
            renderer.ctx.fillText(
                `HP:${this.health}/${this.maxHealth} ${this.animState}`,
                screenPos.x,
                screenPos.y
            );
        }
    }
    
    getState(): PlayerState {
        return {
            x: this.x,
            y: this.y,
            vx: this.vx,
            vy: this.vy,
            health: this.health,
            maxHealth: this.maxHealth,
            isDead: this.isDead,
            invulnerable: this.invulnerable,
            facing: this.facing,
            animState: this.animState,
            animFrame: this.animFrame,
            score: this.score,
            coins: this.coins,
            grounded: this.grounded,
            isJumping: this.isJumping
        };
    }
    
    onCollision(collisionInfo?: CollisionInfo): void {
        if (!collisionInfo || !collisionInfo.other) return;
        
        if (collisionInfo.other.constructor.name === 'Enemy' || 
            collisionInfo.other.constructor.name === 'Slime') {
            if ('onCollisionWithPlayer' in collisionInfo.other) {
                (collisionInfo.other as any).onCollisionWithPlayer(this);
            }
        }
    }
}