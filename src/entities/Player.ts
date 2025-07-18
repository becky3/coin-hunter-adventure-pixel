import { Entity, CollisionInfo } from './Entity';
import { InputSystem } from '../core/InputSystem';
import { MusicSystem } from '../audio/MusicSystem.js';
import { AssetLoader } from '../assets/AssetLoader';
import { PixelRenderer } from '../rendering/PixelRenderer';
import { EventBus } from '../services/EventBus';
import { ResourceLoader } from '../config/ResourceLoader';
import { Logger } from '../utils/Logger';
import type { CharacterConfig, CharacterAnimationConfig } from '../config/ResourceConfig';
import { PowerUpManager } from '../managers/PowerUpManager';
import { PowerUpConfig, PowerUpType } from '../types/PowerUpTypes';
import { ShieldEffectVisual } from '../effects/ShieldEffect';
import { AnimatedSprite } from '../animation/AnimatedSprite';


const DEFAULT_PLAYER_CONFIG = {
    width: 16,
    height: 32,
    smallWidth: 16,
    smallHeight: 16,
    speed: 1.17,
    jumpPower: 10,
    minJumpTime: 0,
    maxJumpTime: 400,
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

/**
 * Player character entity with movement and interaction capabilities
 */
export class Player extends Entity {
    private playerConfig: CharacterConfig | null;
    private animationConfig: { [key: string]: CharacterAnimationConfig } | null;
    private speed: number;
    public jumpPower: number;
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
    private isSpringBounce: boolean;
    private inputManager: InputSystem | null;
    private musicSystem: MusicSystem | null;
    private assetLoader: AssetLoader | null;
    private eventBus: EventBus | null;
    public variableJumpBoost: number;
    private variableJumpBoostMultiplier: number;
    private animatedSprite: AnimatedSprite;
    private animatedSpriteSmall: AnimatedSprite;
    private frameCount: number;
    private powerUpManager: PowerUpManager;
    private shieldVisual: ShieldEffectVisual | null = null;
    private hasPowerGlove: boolean = false;
    private skipBlinkEffect?: boolean;

    constructor(x?: number, y?: number) {
        let playerConfig = null;
        let physicsConfig = null;
        try {
            const resourceLoader = ResourceLoader.getInstance();
            playerConfig = resourceLoader.getCharacterConfig('player', 'main');
            physicsConfig = resourceLoader.getPhysicsConfig('player');
        } catch {
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
        
        super(x ?? config.spawnX, (y ?? config.spawnY) - config.height, config.width, config.height);
        
        this.speed = config.speed;
        this.jumpPower = config.jumpPower;
        
        if (playerConfig?.physics?.airResistance !== undefined) {
            this.airResistance = playerConfig.physics.airResistance;
        }
        if (playerConfig?.physics?.gravityScale !== undefined) {
            this.gravityScale = playerConfig.physics.gravityScale;
        }
        if (playerConfig?.physics?.maxFallSpeed !== undefined) {
            this.maxFallSpeed = playerConfig.physics.maxFallSpeed;
        }
        
        this.playerConfig = config;
        
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
        this.isSpringBounce = false;
        
        this.inputManager = null;
        
        this.musicSystem = null;
        
        this.assetLoader = null;
        
        this.eventBus = null;
        
        this.animationConfig = playerConfig?.animations ? {
            speed: { ...DEFAULT_ANIMATION_CONFIG.speed, ...playerConfig.animations.speed },
            frameCount: { ...DEFAULT_ANIMATION_CONFIG.frameCount, ...playerConfig.animations.frameCount }
        } : DEFAULT_ANIMATION_CONFIG;
        
        if (physicsConfig) {
            this.jumpPower = physicsConfig.jumpPower;
            this.variableJumpBoost = physicsConfig.variableJumpBoost;
            this.variableJumpBoostMultiplier = physicsConfig.variableJumpBoostMultiplier;
        } else {
            this.jumpPower = config.jumpPower;
            this.variableJumpBoost = 0.5;
            this.variableJumpBoostMultiplier = 0.4;
        }
        
        if (physicsConfig) {
            if (physicsConfig.minJumpTime !== undefined) {
                this.playerConfig.minJumpTime = physicsConfig.minJumpTime;
            }
            if (physicsConfig.maxJumpTime !== undefined) {
                this.playerConfig.maxJumpTime = physicsConfig.maxJumpTime;
            }
            
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
        
        this.gravityStrength = 1.0;
        this.frameCount = 0;
        
        this.powerUpManager = new PowerUpManager(this);
        
        this.animatedSprite = new AnimatedSprite('player', {
            idle: 'player/idle',
            walk: 'player/walk',
            jump: 'player/jump',
            fall: 'player/fall'
        });
        
        this.animatedSpriteSmall = new AnimatedSprite('player_small', {
            idle: 'player/idle_small',
            walk: 'player/walk_small',
            jump: 'player/jump_small',
            fall: 'player/fall_small'
        });
    }
    
    setInputManager(inputManager: InputSystem): void {
        this.inputManager = inputManager;
    }
    
    getInputManager(): InputSystem | null {
        return this.inputManager;
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
    
    setJumpingState(jumping: boolean): void {
        this._isJumping = jumping;
    }
    
    enableVariableJump(): void {
        this.canVariableJump = true;
        this.jumpButtonPressed = true;
    }
    
    applySpringBounce(bounceVelocity: number, isJumpButtonPressed: boolean = false): void {
        this.vy = bounceVelocity;
        this.grounded = false;
        this._isJumping = true;
        this.canVariableJump = isJumpButtonPressed;
        this.jumpButtonPressed = isJumpButtonPressed;
        this.isSpringBounce = true;
        this.jumpTime = 0;
        this.jumpMaxHeight = 0;
        this.jumpStartY = this.y;
        
        Logger.log('[Player] Spring bounce applied:');
        Logger.log('  - Bounce velocity:', bounceVelocity);
        Logger.log('  - Jump button pressed:', isJumpButtonPressed);
        Logger.log('  - Variable jump enabled:', this.canVariableJump);
    }
    
    update(deltaTime: number): void {
        super.update(deltaTime);
        
        if (this._isDead) return;
        
        if (!this.inputManager) return;
        
        this.frameCount++;
        
        if ((window as Window & { debugMode?: boolean }).debugMode) {
            for (let i = 1; i <= 9; i++) {
                if (this.inputManager.isActionPressed(`${i}`)) {
                    const newJumpPower = i * 2;
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
                this.skipBlinkEffect = false;
            }
        }
        
        this.powerUpManager.update(deltaTime);
        
        if (this.shieldVisual) {
            this.shieldVisual.update(deltaTime);
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
            this.isSpringBounce = false;
            
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
            
            
            if (this.isSpringBounce && input.jump && !this.canVariableJump) {
                this.canVariableJump = true;
                this.jumpTime = 0;
                Logger.log('[Player] Variable jump enabled for spring bounce');
            }
            
            if (!input.jump && this.canVariableJump) {
                if (this.vy < 0) {
                    this.vy *= 0.5;
                    Logger.log('[Player] Jump button released at time:', this.jumpTime, 'ms, velocity reduced from', this.vy * 2, 'to', this.vy);
                }
                this.canVariableJump = false;
            }
            else if (input.jump && this.canVariableJump) {
                if (this.jumpTime < (this.playerConfig.maxJumpTime || DEFAULT_PLAYER_CONFIG.maxJumpTime)) {
                    const boost = this.variableJumpBoostMultiplier * this.variableJumpBoost * deltaTime * 60;
                    this.vy -= boost;
                } else {
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
        
        if (this.grounded && this._isJumping && this.jumpTime > 50) {
            if (this.isSpringBounce && this.jumpTime < 100) {
                return;
            }
            Logger.log('[Player] Jump completed:');
            Logger.log('  - Final max height reached:', this.jumpMaxHeight, 'pixels');
            Logger.log('  - Jump duration:', this.jumpTime, 'ms');
            this._isJumping = false;
            this.canVariableJump = false;
            this.isSpringBounce = false;
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
            const currentSprite = this.isSmall ? this.animatedSpriteSmall : this.animatedSprite;
            currentSprite.setState(this._animState);
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
        Logger.log(`[Player] respawn called at (${x}, ${y})`);
        
        this.isSmall = false;
        this.width = DEFAULT_PLAYER_CONFIG.width;
        this.height = DEFAULT_PLAYER_CONFIG.height;
        
        this.x = x;
        this.y = y - this.height;
        this.vx = 0;
        this.vy = 0;
        this._isDead = false;
        this._invulnerable = true;
        this.invulnerabilityTime = DEFAULT_PLAYER_CONFIG.invulnerabilityTime;
        this._animState = 'idle';
        this.animFrame = 0;
        this.animTimer = 0;
        this._isJumping = false;
        this.jumpButtonPressed = false;
        this.canVariableJump = false;
        this.grounded = false;
        this._health = this._maxHealth;
        
        this.powerUpManager.clearAll();
        Logger.log('[Player] All power-ups cleared on respawn');
        
        this.updateSprite();
        
        if (this.eventBus) {
            this.eventBus.emit('player:respawned', { x, y });
        }
        
        if (typeof window !== 'undefined') {
            Logger.log('[Player] Dispatching window player:respawned event');
            window.dispatchEvent(new CustomEvent('player:respawned', { 
                detail: { x, y } 
            }));
        }
    }
    
    takeDamage(): boolean {
        if (this._invulnerable || this._isDead) {
            return false;
        }
        
        if (this.isSmall) {
            this._health = 0;
            this._isDead = true;
            
            if (this.eventBus) {
                this.eventBus.emit('player:died');
            }
            return true;
        }
        
        this.isSmall = true;
        this.width = DEFAULT_PLAYER_CONFIG.smallWidth;
        this.height = DEFAULT_PLAYER_CONFIG.smallHeight;
        this.y += DEFAULT_PLAYER_CONFIG.height - DEFAULT_PLAYER_CONFIG.smallHeight;
        this.updateSprite();
        
        if (this.powerUpManager.hasPowerUp(PowerUpType.POWER_GLOVE)) {
            this.powerUpManager.removePowerUp(PowerUpType.POWER_GLOVE);
        }
        
        this._invulnerable = true;
        this.invulnerabilityTime = DEFAULT_PLAYER_CONFIG.invulnerabilityTime;
        
        if (this.musicSystem) {
            this.musicSystem.playSE('damage');
        }
        
        
        return false;
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
        
        if (this._isJumping && renderer.debug) {
            const screenPos = renderer.worldToScreen(this.x, this.jumpStartY);
            const currentScreenPos = renderer.worldToScreen(this.x, this.y);
            
            renderer.ctx.strokeStyle = '#00FF00';
            renderer.ctx.lineWidth = 2;
            renderer.ctx.beginPath();
            renderer.ctx.moveTo(screenPos.x + this.width / 2, screenPos.y);
            renderer.ctx.lineTo(currentScreenPos.x + this.width / 2, currentScreenPos.y);
            renderer.ctx.stroke();
            
            const maxHeightY = this.jumpStartY - this.jumpMaxHeight;
            const maxHeightScreenPos = renderer.worldToScreen(this.x, maxHeightY);
            renderer.ctx.fillStyle = '#FFFF00';
            renderer.ctx.fillRect(maxHeightScreenPos.x - 2, maxHeightScreenPos.y - 2, this.width + 4, 4);
            
            renderer.ctx.fillStyle = '#FFFFFF';
            renderer.ctx.font = '12px monospace';
            renderer.ctx.fillText(
                `H: ${Math.round(this.jumpMaxHeight)}px`,
                maxHeightScreenPos.x + this.width + 5,
                maxHeightScreenPos.y + 4
            );
        }
        
        if (this._invulnerable && !this.skipBlinkEffect && Math.floor(this.invulnerabilityTime / 100) % 2 === 1) {
            return;
        }
        
        const currentSprite = this.isSmall ? this.animatedSpriteSmall : this.animatedSprite;
        currentSprite.render(renderer, this.x, this.y, this.flipX);
        
        this.renderEffects(renderer);
        
        if (renderer.debug) {
            const screenPos = renderer.worldToScreen(this.x, this.y - 20);
            renderer.ctx.fillStyle = '#FFFFFF';
            renderer.ctx.font = '10px monospace';
            renderer.ctx.fillText(
                `HP:${this._health}/${this._maxHealth} ${this._animState}`,
                screenPos.x,
                screenPos.y
            );
            
            renderer.ctx.fillText(
                `JP:${this.jumpPower.toFixed(1)} VY:${this.vy.toFixed(1)}`,
                screenPos.x,
                screenPos.y + 12
            );
        }
    }
    
    renderEffects(renderer: PixelRenderer): void {
        if (this.shieldVisual) {
            this.shieldVisual.render(renderer);
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
        if (!collisionInfo || !collisionInfo.other) {
            Logger.warn('[Player] onCollision called with invalid collisionInfo:', collisionInfo);
            return;
        }
        
        if ('onCollisionWithPlayer' in collisionInfo.other && typeof collisionInfo.other.onCollisionWithPlayer === 'function') {
            type EntityWithPlayerCollision = { onCollisionWithPlayer: (player: Player) => void };
            (collisionInfo.other as unknown as EntityWithPlayerCollision).onCollisionWithPlayer(this);
        }
    }
    
    /**
     * Apply a power-up to the player
     */
    applyPowerUp(config: PowerUpConfig): boolean {
        return this.powerUpManager.applyPowerUp(config);
    }
    
    /**
     * Get the PowerUpManager instance
     */
    getPowerUpManager(): PowerUpManager {
        return this.powerUpManager;
    }
    
    setShieldVisual(visual: ShieldEffectVisual | null): void {
        Logger.log('[Player] setShieldVisual called with:', visual ? 'ShieldEffectVisual' : 'null');
        this.shieldVisual = visual;
    }
    
    setHasPowerGlove(hasGlove: boolean): void {
        Logger.log('[Player] setHasPowerGlove called with:', hasGlove);
        this.hasPowerGlove = hasGlove;
        this.updateAnimationState();
    }
    
    getHasPowerGlove(): boolean {
        return this.hasPowerGlove;
    }
    
}