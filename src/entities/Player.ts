import { Entity, CollisionInfo } from './Entity';
import { InputSystem } from '../core/InputSystem';
import { MusicSystem } from '../audio/MusicSystem.js';
import { AssetLoader } from '../assets/AssetLoader';
import { PixelRenderer } from '../rendering/PixelRenderer';
import { EventBus } from '../services/EventBus';


const PLAYER_CONFIG = {
    width: 16,
    height: 16,
    speed: 1.17,
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
    private speed: number;
    private jumpPower: number;
    private spriteKey: string | null;
    private _health: number;
    private _maxHealth: number;
    private _isDead: boolean;
    private _invulnerable: boolean;
    private invulnerabilityTime: number;
    private _facing: Facing;
    private _animState: AnimationState;
    private animFrame: number;
    private animTimer: number;
    private _isJumping: boolean;
    private jumpButtonPressed: boolean;
    private jumpTime: number;
    private canVariableJump: boolean;
    private jumpButtonHoldTime: number;
    private jumpMaxHeight: number;
    private jumpStartY: number;
    private _score: number;
    private _coins: number;
    private inputManager: InputSystem | null;
    private musicSystem: MusicSystem | null;
    private assetLoader: AssetLoader | null;
    private eventBus: EventBus | null;

    constructor(x: number = PLAYER_CONFIG.spawnX, y: number = PLAYER_CONFIG.spawnY) {
        super(x, y, PLAYER_CONFIG.width, PLAYER_CONFIG.height);
        
        this.speed = PLAYER_CONFIG.speed;
        this.jumpPower = PLAYER_CONFIG.jumpPower;
        
        this.spriteKey = null;
        
        this._health = PLAYER_CONFIG.maxHealth;
        this._maxHealth = PLAYER_CONFIG.maxHealth;
        this._isDead = false;
        this._invulnerable = false;
        this.invulnerabilityTime = 0;
        
        this._facing = 'right';
        
        this._animState = 'idle';
        this.animFrame = 0;
        this.animTimer = 0;
        
        this._isJumping = false;
        this.jumpButtonPressed = false;
        this.jumpTime = 0;
        this.canVariableJump = false;
        this.jumpButtonHoldTime = 0;
        this.jumpMaxHeight = 0;
        this.jumpStartY = 0;
        
        this._score = 0;
        this._coins = 0;
        
        this.inputManager = null;
        
        this.musicSystem = null;
        
        this.assetLoader = null;
        
        this.eventBus = null;
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
    
    get health(): number { return this._health; }
    get maxHealth(): number { return this._maxHealth; }
    get isDead(): boolean { return this._isDead; }
    get invulnerable(): boolean { return this._invulnerable; }
    get facing(): Facing { return this._facing; }
    get animState(): AnimationState { return this._animState; }
    get isJumping(): boolean { return this._isJumping; }
    get score(): number { return this._score; }
    get coins(): number { return this._coins; }
    
    update(deltaTime: number): void {
        super.update(deltaTime);
        
        if (this._isDead) return;
        
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
        
        if (this._invulnerable) {
            this.invulnerabilityTime -= deltaTime * 1000;
            
            if (this.invulnerabilityTime <= 0) {
                this._invulnerable = false;
                this.invulnerabilityTime = 0;
            }
        }
    }
    
    private handleMovement(input: { left: boolean; right: boolean; jump: boolean; action: boolean }): void {
        if (input.left) {
            this.vx = -this.speed;
            this._facing = 'left';
        } else if (input.right) {
            this.vx = this.speed;
            this._facing = 'right';
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
            this._isJumping = true;
            this.jumpButtonPressed = true;
            this.jumpTime = 0;
            this.canVariableJump = true;
            this.jumpMaxHeight = 0;
            this.jumpStartY = this.y;
            
            if (this.musicSystem) {
                this.musicSystem.playJumpSound();
            }
        }
        
        if (this._isJumping) {
            this.jumpTime += deltaTime * 1000;
            
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
        
        if (this._isJumping && !this.grounded) {
            const currentHeight = this.jumpStartY - this.y;
            if (currentHeight > this.jumpMaxHeight) {
                this.jumpMaxHeight = currentHeight;
            }
        }
        
        if (!input.jump) {
            this.jumpButtonPressed = false;
        }
        
        if (this.grounded && this._isJumping) {
            this._isJumping = false;
            this.canVariableJump = false;
        }
    }
    
    private updateAnimationState(): void {
        const prevState = this._animState;
        
        if (!this.grounded) {
            if (this.vy < 0) {
                this._animState = 'jump';
            } else {
                this._animState = 'fall';
            }
        } else if (Math.abs(this.vx) > 0.1) {
            this._animState = 'walk';
        } else {
            this._animState = 'idle';
        }
        
        if (prevState !== this._animState) {
            this.updateSprite();
        }
    }
    
    private updateAnimationFrame(deltaTime: number): void {
        this.animTimer += deltaTime * 1000;
        
        const speed = ANIMATION_CONFIG.speed[this._animState] || 200;
        
        if (this.animTimer >= speed) {
            this.animTimer = 0;
            
            const frames = ANIMATION_CONFIG.frameCount[this._animState] || 1;
            this.animFrame = (this.animFrame + 1) % frames;
        }
    }
    
    takeDamage(damage: number = 1): void {
        if (this._invulnerable || this._isDead) return;
        
        this._health -= damage;
        
        if (this._health <= 0) {
            this._health = 0;
            this.die();
        } else {
            this._invulnerable = true;
            this.invulnerabilityTime = PLAYER_CONFIG.invulnerabilityTime;
            
            this.vy = PLAYER_CONFIG.knockbackVertical;
            this.vx = this._facing === 'right' ? -PLAYER_CONFIG.knockbackHorizontal : PLAYER_CONFIG.knockbackHorizontal;
            
            if (this.eventBus) {
                this.eventBus.emit('player:health-changed', { health: this._health, maxHealth: this._maxHealth });
            }
            
            if (this.musicSystem) {
                this.musicSystem.playDamageSound();
            }
        }
    }
    
    heal(amount: number = 1): void {
        this._health = Math.min(this._health + amount, this._maxHealth);
        
        if (this.eventBus) {
            this.eventBus.emit('player:health-changed', { health: this._health, maxHealth: this._maxHealth });
        }
    }
    
    private die(): void {
        this._isDead = true;
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
        this._isDead = false;
        this._invulnerable = false;
        this.invulnerabilityTime = 0;
        this._animState = 'idle';
        this.animFrame = 0;
        this.animTimer = 0;
        this._isJumping = false;
        this.jumpButtonPressed = false;
        this.canVariableJump = false;
        this.grounded = false;
        this._health = this._maxHealth;
        
        if (this.eventBus) {
            this.eventBus.emit('player:health-changed', { health: this._health, maxHealth: this._maxHealth });
        }
    }
    
    addScore(points: number): void {
        if (points > 0) {
            this._score += points;
            
            if (this.eventBus) {
                this.eventBus.emit('player:score-changed', { score: this._score });
            }
        }
    }
    
    collectCoin(amount: number = 1): void {
        if (amount > 0) {
            this._coins += amount;
            
            if (this.eventBus) {
                this.eventBus.emit('player:coins-changed', { coins: this._coins });
            }
        }
    }
    
    private updateSprite(): void {
        if (this._animState === 'idle') {
            this.spriteKey = 'player/idle';
        } else if (this._animState === 'walk') {
            this.spriteKey = 'player/walk';
        } else if (this._animState === 'jump' || this._animState === 'fall') {
            this.spriteKey = 'player/jump';
        }
    }
    
    render(renderer: PixelRenderer): void {
        this.flipX = this._facing === 'left';
        
        // 無敵時は点滅させる（100ms間隔で表示/非表示を切り替え）
        if (this._invulnerable && Math.floor(this.invulnerabilityTime / 100) % 2 === 1) {
            return;
        }
        
        if (renderer.pixelArtRenderer) {
            const screenPos = renderer.worldToScreen(this.x, this.y);
            
            if (this._animState === 'walk') {
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
            
            if (this._animState === 'jump' || this._animState === 'fall') {
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
                `HP:${this._health}/${this._maxHealth} ${this._animState}`,
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
            health: this._health,
            maxHealth: this._maxHealth,
            isDead: this._isDead,
            invulnerable: this._invulnerable,
            facing: this._facing,
            animState: this._animState,
            animFrame: this.animFrame,
            score: this._score,
            coins: this._coins,
            grounded: this.grounded,
            isJumping: this._isJumping
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