/**
 * プレイヤーエンティティ
 * プレイヤーキャラクターの動作を管理
 */
import { Entity } from './Entity';

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
};

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
};

export class Player extends Entity {
    constructor(x = PLAYER_CONFIG.spawnX, y = PLAYER_CONFIG.spawnY) {
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
    
    /**
     * 入力マネージャーを設定
     * @param {InputManager} inputManager 
     */
    setInputManager(inputManager) {
        this.inputManager = inputManager;
    }
    
    /**
     * 音楽システムを設定
     * @param {MusicSystem} musicSystem 
     */
    setMusicSystem(musicSystem) {
        this.musicSystem = musicSystem;
    }
    
    /**
     * アセットローダーを設定
     * @param {AssetLoader} assetLoader 
     */
    setAssetLoader(assetLoader) {
        this.assetLoader = assetLoader;
    }
    
    /**
     * 更新処理
     * @param {number} deltaTime - 経過時間
     */
    onUpdate(deltaTime) {
        if (this.isDead) return;
        
        const input = {
            left: this.inputManager ? this.inputManager.isActionPressed('left') : false,
            right: this.inputManager ? this.inputManager.isActionPressed('right') : false,
            jump: this.inputManager ? this.inputManager.isActionPressed('jump') : false,
            jumpJustPressed: this.inputManager ? this.inputManager.isActionJustPressed('jump') : false
        };
        
        this.handleMovement(input);
        
        this.handleJump(input);
        
        this.updateAnimationState();
        
        this.updateAnimationFrame(deltaTime);
        
        if (this.invulnerable) {
            this.invulnerabilityTime -= deltaTime;
            if (this.invulnerabilityTime <= 0) {
                this.invulnerable = false;
                this.invulnerabilityTime = 0;
            }
        }
        
        if (this.y > 1000) {
            this.takeDamage(this.maxHealth);
        }
    }
    
    /**
     * 移動処理
     * @param {Object} input - 入力状態
     */
    handleMovement(input) {
        if (input.left) {
            this.vx = -this.speed;
            this.facing = 'left';
            this.flipX = true;
        } else if (input.right) {
            this.vx = this.speed;
            this.facing = 'right';
            this.flipX = false;
        } else {
            this.vx *= 0.8;
            if (Math.abs(this.vx) < 0.1) {
                this.vx = 0;
            }
        }
    }
    
    /**
     * ジャンプ処理
     * @param {Object} input - 入力状態
     */
    handleJump(input) {
        if (input.jump && window.game?.debug) {
            console.log('Jump button pressed!', {
                jumpButtonPressed: this.jumpButtonPressed,
                grounded: this.grounded,
                y: this.y,
                vy: this.vy
            });
        }
        
        if (input.jumpJustPressed && this.grounded) {
            if (window.game?.debug) {
                console.log('JUMP! vy before:', this.vy, 'jumpPower:', this.jumpPower);
            }
            this.vy = -this.jumpPower;
            this.grounded = false;
            this.isJumping = true;
            this.jumpButtonPressed = true;
            this.jumpTime = 0;
            this.canVariableJump = true;
            this.jumpButtonHoldTime = 0;
            this.jumpMaxHeight = 0;
            this.jumpStartY = this.y;
            if (window.game?.debug) {
                console.log('JUMP! vy after:', this.vy, 'y:', this.y);
            }
            
            if (this.musicSystem) {
                this.musicSystem.playJumpSound();
            }
        }
        
        if (this.isJumping && !this.grounded) {
            this.jumpTime++;
        }
        
        if (this.canVariableJump && this.isJumping && !this.grounded) {
            if (input.jump) {
                this.jumpButtonHoldTime++;
                
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
    
    /**
     * アニメーション状態の更新
     */
    updateAnimationState() {
        let prevState = this.animState;
        
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
    
    /**
     * アニメーションフレームの更新
     * @param {number} deltaTime - 経過時間
     */
    updateAnimationFrame(deltaTime) {
        this.animTimer += deltaTime;
        
        const speed = ANIMATION_CONFIG.speed[this.animState] || 200;
        
        if (this.animTimer >= speed) {
            this.animTimer = 0;
            
            const frames = ANIMATION_CONFIG.frameCount[this.animState] || 1;
            this.animFrame = (this.animFrame + 1) % frames;
        }
    }
    
    /**
     * ダメージを受ける
     * @param {number} damage - ダメージ量
     */
    takeDamage(damage = 1) {
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
    
    /**
     * 回復
     * @param {number} amount - 回復量
     */
    heal(amount = 1) {
        this.health = Math.min(this.health + amount, this.maxHealth);
    }
    
    /**
     * コインを取得
     * @param {number} value - コインの価値
     */
    collectCoin(value = 1) {
        this.coins += value;
        this.score += value * 100;
        
        if (this.musicSystem) {
            this.musicSystem.playCoinSound();
        }
    }
    
    /**
     * 死亡処理
     */
    die() {
        this.isDead = true;
        this.active = false;
        
        if (this.musicSystem) {
            this.musicSystem.playGameOverJingle();
        }
        
        if (this.onDeath) {
            this.onDeath();
        }
    }
    
    /**
     * リスポーン
     * @param {number} x - X座標
     * @param {number} y - Y座標
     */
    respawn(x = PLAYER_CONFIG.spawnX, y = PLAYER_CONFIG.spawnY) {
        this.reset(x, y);
        this.health = this.maxHealth;
        this.isDead = false;
        this.invulnerable = true;
        this.invulnerabilityTime = 1000;
        this.animState = 'idle';
        this.animFrame = 0;
        this.facing = 'right';
        this.flipX = false;
    }
    
    /**
     * スプライトを更新
     */
    updateSprite() {
        if (!this.assetLoader) return;
        
        switch (this.animState) {
        case 'idle':
            this.spriteKey = 'player/idle';
            break;
        case 'walk':
            this.spriteKey = 'player/walk';
            break;
        case 'jump':
        case 'fall':
            this.spriteKey = 'player/jump';
            break;
        default:
            this.spriteKey = 'player/idle';
        }
    }
    
    /**
     * 描画処理のオーバーライド
     * @param {PixelRenderer} renderer 
     */
    render(renderer) {
        if (!this.visible) return;
        
        if (this.invulnerable && Math.floor(this.invulnerabilityTime / 100) % 2 === 0) {
            return;
        }
        
        if (!this.spriteKey) {
            this.updateSprite();
        }
        
        if (!this._firstRenderLogged) {
            console.log('Player render:', {
                spriteKey: this.spriteKey,
                pixelArtRenderer: !!renderer.pixelArtRenderer,
                x: this.x,
                y: this.y,
                animState: this.animState
            });
            this._firstRenderLogged = true;
        }
        
        if (this.spriteKey && renderer.pixelArtRenderer) {
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
            
            const sprite = renderer.pixelArtRenderer.sprites.get(this.spriteKey);
            if (sprite) {
                sprite.draw(
                    renderer.ctx,
                    screenPos.x,
                    screenPos.y,
                    this.flipX,
                    renderer.scale
                );
                return;
            } else if (window.game?.debug) {
                console.warn('Sprite not found:', this.spriteKey);
            }
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
    
    /**
     * プレイヤーの状態を取得
     * @returns {Object} プレイヤー状態
     */
    getState() {
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
    
    /**
     * 衝突ハンドラ（PhysicsSystemから呼ばれる）
     * @param {Object} collisionInfo - 衝突情報
     */
    onCollision(collisionInfo) {
        if (collisionInfo.other.constructor.name === 'Enemy' || 
            collisionInfo.other.constructor.name === 'Slime') {
            if (collisionInfo.other.onCollisionWithPlayer) {
                collisionInfo.other.onCollisionWithPlayer(this);
            }
        }
    }
}