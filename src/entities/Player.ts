import { Entity, CollisionInfo } from './Entity';
import { InputSystem } from '../core/InputSystem';
import { MusicSystem } from '../audio/MusicSystem.js';
import { AssetLoader } from '../assets/AssetLoader';
import { PixelRenderer } from '../rendering/PixelRenderer';
import { EventBus } from '../services/EventBus';
import { ResourceLoader } from '../config/ResourceLoader';
import { Logger } from '../utils/Logger';
import type { CharacterConfig, CharacterAnimationConfig } from '../config/ResourceConfig';


// Default config as fallback if ResourceLoader is not available
const DEFAULT_PLAYER_CONFIG = {
    width: 16,
    height: 32,
    smallWidth: 16,
    smallHeight: 16,
    speed: 1.17,
    jumpPower: 10,
    minJumpTime: 0,      // 最小時間なし - いつでもジャンプを中断可能
    maxJumpTime: 400,    // 400ms = 0.4秒（約24フレーム）
    maxHealth: 3,
    invulnerabilityTime: 2000,
    spawnX: 100,
    spawnY: 300
} as const;

const DEFAULT_ANIMATION_CONFIG = {
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

// Variable jump settings will be loaded from physics.json

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
    private playerConfig: CharacterConfig | null;
    private animationConfig: { [key: string]: CharacterAnimationConfig } | null;
    private speed: number;
    public jumpPower: number;  // Made public for testing
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
    private originalWidth: number;
    private originalHeight: number;
    private isSmall: boolean;
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
    public variableJumpBoost: number;  // For testing purposes
    private variableJumpBoostMultiplier: number;
    private frameCount: number;

    constructor(x?: number, y?: number) {
        // Load config from ResourceLoader if available
        let playerConfig = null;
        let physicsConfig = null;
        try {
            const resourceLoader = ResourceLoader.getInstance();
            playerConfig = resourceLoader.getCharacterConfig('player', 'main');
            physicsConfig = resourceLoader.getPhysicsConfig('player');
        } catch {
            // Fall back to default config for standalone tests
            Logger.warn('[Player] ResourceLoader not available, using default configuration');
            playerConfig = null;
            physicsConfig = null;
        }
        
        const config = playerConfig ? {
            ...DEFAULT_PLAYER_CONFIG,
            width: playerConfig.physics.width,
            height: playerConfig.physics.height,
            speed: playerConfig.physics.speed ?? DEFAULT_PLAYER_CONFIG.speed,
            jumpPower: playerConfig.physics.jumpPower ?? DEFAULT_PLAYER_CONFIG.jumpPower,
            minJumpTime: playerConfig.physics.minJumpTime ?? DEFAULT_PLAYER_CONFIG.minJumpTime,
            maxJumpTime: playerConfig.physics.maxJumpTime ?? DEFAULT_PLAYER_CONFIG.maxJumpTime,
            maxHealth: playerConfig.stats.maxHealth,
            invulnerabilityTime: playerConfig.stats.invulnerabilityTime ?? DEFAULT_PLAYER_CONFIG.invulnerabilityTime,
            spawnX: playerConfig.spawn?.x ?? DEFAULT_PLAYER_CONFIG.spawnX,
            spawnY: playerConfig.spawn?.y ?? DEFAULT_PLAYER_CONFIG.spawnY
        } : DEFAULT_PLAYER_CONFIG;
        
        // yはすでにピクセル座標（左下基準）で渡されているので、高さを引いて左上座標に変換
        super(x ?? config.spawnX, (y ?? config.spawnY) - config.height, config.width, config.height);
        
        this.speed = config.speed;
        this.jumpPower = config.jumpPower;
        
        // Apply new physics properties from config
        if (playerConfig?.physics?.airResistance !== undefined) {
            this.airResistance = playerConfig.physics.airResistance;
        }
        if (playerConfig?.physics?.gravityScale !== undefined) {
            this.gravityScale = playerConfig.physics.gravityScale;
        }
        if (playerConfig?.physics?.maxFallSpeed !== undefined) {
            this.maxFallSpeed = playerConfig.physics.maxFallSpeed;
        }
        
        // Store configs for later use
        this.playerConfig = config;
        
        // Debug logging for jump configuration
        Logger.log('[Player] Jump Configuration Debug:');
        Logger.log('  - Config source:', 'physics.json');
        Logger.log('  - jumpPower:', this.jumpPower);
        Logger.log('  - variableJumpBoost:', this.variableJumpBoost);
        Logger.log('  - variableJumpBoostMultiplier:', this.variableJumpBoostMultiplier);
        Logger.log('  - minJumpTime:', this.playerConfig.minJumpTime);
        Logger.log('  - maxJumpTime:', this.playerConfig.maxJumpTime);
        Logger.log('  - airResistance:', this.airResistance);
        Logger.log('  - gravityScale:', this.gravityScale);
        Logger.log('  - maxFallSpeed:', this.maxFallSpeed);
        
        this.spriteKey = null;
        
        this._health = config.maxHealth;
        this._maxHealth = config.maxHealth;
        this._isDead = false;
        this._invulnerable = false;
        this.invulnerabilityTime = 0;
        
        this._facing = 'right';
        
        this._animState = 'idle';
        this.animFrame = 0;
        this.animTimer = 0;
        
        // Size management
        this.originalWidth = config.width;
        this.originalHeight = config.height;
        this.isSmall = false;
        
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
        
        // Merge animation config with defaults
        this.animationConfig = playerConfig?.animations ? {
            speed: { ...DEFAULT_ANIMATION_CONFIG.speed, ...playerConfig.animations.speed },
            frameCount: { ...DEFAULT_ANIMATION_CONFIG.frameCount, ...playerConfig.animations.frameCount }
        } : DEFAULT_ANIMATION_CONFIG;
        
        // Load physics settings from physics.json
        if (physicsConfig) {
            this.jumpPower = physicsConfig.jumpPower;
            this.variableJumpBoost = physicsConfig.variableJumpBoost;
            this.variableJumpBoostMultiplier = physicsConfig.variableJumpBoostMultiplier;
        } else {
            // Use default values if physics config not available
            this.jumpPower = config.jumpPower;
            this.variableJumpBoost = 0.5;  // Default variable jump boost
            this.variableJumpBoostMultiplier = 0.4;  // Default multiplier
        }
        
        // Override minJumpTime/maxJumpTime from physics.json if available
        if (physicsConfig) {
            if (physicsConfig.minJumpTime !== undefined) {
                this.playerConfig.minJumpTime = physicsConfig.minJumpTime;
            }
            if (physicsConfig.maxJumpTime !== undefined) {
                this.playerConfig.maxJumpTime = physicsConfig.maxJumpTime;
            }
            
            // Apply physics properties
            if (physicsConfig.airResistance !== undefined) {
                this.airResistance = physicsConfig.airResistance;
            }
            if (physicsConfig.gravityScale !== undefined) {
                this.gravityScale = physicsConfig.gravityScale;
            }
            if (physicsConfig.defaultMaxFallSpeed !== undefined) {
                this.maxFallSpeed = physicsConfig.defaultMaxFallSpeed;
            }
        }
        
        // Gravity strength adjustment removed - now handled by PhysicsSystem
        this.gravityStrength = 1.0;
        this.frameCount = 0;
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
    
    setEventBus(eventBus: EventBus): void {
        this.eventBus = eventBus;
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
        
        this.frameCount++;
        
        // Debug: Allow dynamic jumpPower adjustment with number keys
        if ((window as Window & { debugMode?: boolean }).debugMode) {
            for (let i = 1; i <= 9; i++) {
                if (this.inputManager.isActionPressed(`${i}`)) {
                    const newJumpPower = i * 2; // 2, 4, 6, 8, 10, 12, 14, 16, 18
                    if (this.jumpPower !== newJumpPower) {
                        this.jumpPower = newJumpPower;
                        Logger.log(`[Player] Jump power changed to: ${this.jumpPower}`);
                    }
                }
            }
        }
        
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
            
            // Debug logging for jump initiation
            Logger.log('[Player] Jump initiated:');
            Logger.log('  - Initial Y position:', this.y);
            Logger.log('  - Jump power applied:', this.jumpPower);
            Logger.log('  - Initial velocity (vy):', this.vy);
            Logger.log('  - Air resistance:', this.airResistance);
            Logger.log('  - Gravity scale:', this.gravityScale);
            
            if (this.musicSystem) {
                this.musicSystem.playSEFromPattern('jump');
            }
        }
        
        if (this._isJumping) {
            this.jumpTime += deltaTime * 1000;
            
            
            // Check if button was released
            if (!input.jump && this.canVariableJump) {
                // Immediately reduce upward velocity if still going up
                if (this.vy < 0) {
                    this.vy *= 0.5;
                    Logger.log('[Player] Jump button released at time:', this.jumpTime, 'ms, velocity reduced from', this.vy * 2, 'to', this.vy);
                }
                this.canVariableJump = false;
            }
            // If button is still held and we can still boost
            else if (input.jump && this.canVariableJump) {
                if (this.jumpTime < (this.playerConfig.maxJumpTime || DEFAULT_PLAYER_CONFIG.maxJumpTime)) {
                    // Apply additional upward force for variable jump
                    // This counteracts gravity to maintain upward movement
                    const boost = this.variableJumpBoostMultiplier * this.variableJumpBoost * deltaTime * 60;
                    this.vy -= boost;
                    
                } else {
                    // Max jump time reached
                    this.canVariableJump = false;
                    Logger.log('[Player] Variable jump ended: max time reached at', this.jumpTime, 'ms');
                }
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
        
        // Only check for landing after a minimum jump time to avoid immediate grounding
        if (this.grounded && this._isJumping && this.jumpTime > 50) {
            Logger.log('[Player] Jump completed:');
            Logger.log('  - Final max height reached:', this.jumpMaxHeight, 'pixels');
            Logger.log('  - Jump duration:', this.jumpTime, 'ms');
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
        
        const speed = (this.animationConfig.speed && this.animationConfig.speed[this._animState]) || DEFAULT_ANIMATION_CONFIG.speed[this._animState] || 200;
        
        if (this.animTimer >= speed) {
            this.animTimer = 0;
            
            const frames = (this.animationConfig.frameCount && this.animationConfig.frameCount[this._animState]) || DEFAULT_ANIMATION_CONFIG.frameCount[this._animState] || 1;
            this.animFrame = (this.animFrame + 1) % frames;
        }
    }
    
    
    heal(amount: number = 1): void {
        this._health = Math.min(this._health + amount, this._maxHealth);
    }
    
    
    respawn(x: number, y: number): void {
        // Reset to large size first
        this.isSmall = false;
        this.width = DEFAULT_PLAYER_CONFIG.width;
        this.height = DEFAULT_PLAYER_CONFIG.height;
        
        // yはすでにピクセル座標（左下基準）で渡されているので、高さを引いて左上座標に変換
        this.x = x;
        this.y = y - this.height;
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
        
        this.updateSprite();
    }
    
    takeDamage(): boolean {
        if (this._invulnerable || this._isDead) {
            return false;
        }
        
        // 小さい状態で攻撃を受けたら死亡
        if (this.isSmall) {
            this._health = 0;
            this._isDead = true;
            if (this.eventBus) {
                this.eventBus.emit('player:died');
            }
            return true; // Player died
        }
        
        // 大きい状態で攻撃を受けたら小さくなる
        this.isSmall = true;
        this.width = DEFAULT_PLAYER_CONFIG.smallWidth;
        this.height = DEFAULT_PLAYER_CONFIG.smallHeight;
        // Adjust Y position to keep feet at same level
        this.y += DEFAULT_PLAYER_CONFIG.height - DEFAULT_PLAYER_CONFIG.smallHeight;
        this.updateSprite();
        
        
        // Make invulnerable after taking damage
        this._invulnerable = true;
        this.invulnerabilityTime = DEFAULT_PLAYER_CONFIG.invulnerabilityTime;
        
        // Play damage sound
        if (this.musicSystem) {
            this.musicSystem.playSE('damage');
        }
        
        
        return false; // Player survived
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
        const sizePrefix = this.isSmall ? '_small' : '';
        
        if (this._animState === 'idle') {
            this.spriteKey = `player/idle${sizePrefix}`;
        } else if (this._animState === 'walk') {
            this.spriteKey = `player/walk${sizePrefix}`;
        } else if (this._animState === 'jump' || this._animState === 'fall') {
            this.spriteKey = `player/jump${sizePrefix}`;
        }
    }
    
    render(renderer: PixelRenderer): void {
        this.flipX = this._facing === 'left';
        
        // Draw jump height debug marker when jumping
        if (this._isJumping && renderer.debug) {
            const screenPos = renderer.worldToScreen(this.x, this.jumpStartY);
            const currentScreenPos = renderer.worldToScreen(this.x, this.y);
            
            // Draw vertical line showing jump trajectory
            renderer.ctx.strokeStyle = '#00FF00';
            renderer.ctx.lineWidth = 2;
            renderer.ctx.beginPath();
            renderer.ctx.moveTo(screenPos.x + this.width / 2, screenPos.y);
            renderer.ctx.lineTo(currentScreenPos.x + this.width / 2, currentScreenPos.y);
            renderer.ctx.stroke();
            
            // Draw max height marker
            const maxHeightY = this.jumpStartY - this.jumpMaxHeight;
            const maxHeightScreenPos = renderer.worldToScreen(this.x, maxHeightY);
            renderer.ctx.fillStyle = '#FFFF00';
            renderer.ctx.fillRect(maxHeightScreenPos.x - 2, maxHeightScreenPos.y - 2, this.width + 4, 4);
            
            // Draw height text
            renderer.ctx.fillStyle = '#FFFFFF';
            renderer.ctx.font = '12px monospace';
            renderer.ctx.fillText(
                `H: ${Math.round(this.jumpMaxHeight)}px`,
                maxHeightScreenPos.x + this.width + 5,
                maxHeightScreenPos.y + 4
            );
        }
        
        // 無敵時は点滅させる（100ms間隔で表示/非表示を切り替え）
        if (this._invulnerable && Math.floor(this.invulnerabilityTime / 100) % 2 === 1) {
            return;
        }
        
        if (renderer.pixelArtRenderer) {
            const screenPos = renderer.worldToScreen(this.x, this.y);
            
            if (this._animState === 'walk') {
                const sizePrefix = this.isSmall ? '_small' : '';
                const animation = renderer.pixelArtRenderer.animations.get(`player/walk${sizePrefix}`);
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
                const sizePrefix = this.isSmall ? '_small' : '';
                const animation = renderer.pixelArtRenderer.animations.get(`player/jump${sizePrefix}`);
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
            } else if ((window as Window & { game?: { debug?: boolean } }).game?.debug) {
                Logger.warn('Sprite not found:', this.spriteKey);
            }
        }
        
        // フォールバック: スプライトが見つからない場合は基本的な矩形を描画
        if (!renderer.pixelArtRenderer || !renderer.pixelArtRenderer.sprites.has(this.spriteKey || 'player/idle')) {
            Logger.warn('Player sprite not found, falling back to rectangle. spriteKey:', this.spriteKey);
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
            
            // Show current jump power
            renderer.ctx.fillText(
                `JP:${this.jumpPower.toFixed(1)} VY:${this.vy.toFixed(1)}`,
                screenPos.x,
                screenPos.y + 12
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
                type EntityWithPlayerCollision = { onCollisionWithPlayer: (player: Player) => void };
                (collisionInfo.other as unknown as EntityWithPlayerCollision).onCollisionWithPlayer(this);
            }
        }
    }
}