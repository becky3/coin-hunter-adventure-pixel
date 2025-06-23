/**
 * プレイヤーエンティティ
 * プレイヤーキャラクターの動作を管理
 */
import { Entity } from './Entity.js';

// プレイヤー設定
const PLAYER_CONFIG = {
    width: 32,  // デバッグ用に一時的に大きくする
    height: 32,
    speed: 3.5,
    jumpPower: 15,  // デバッグ用に強くする（12→15）
    minJumpTime: 8,
    maxJumpTime: 20,
    maxHealth: 3,
    invulnerabilityTime: 120,
    spawnX: 100,
    spawnY: 300,
    // ノックバック設定
    knockbackVertical: -5,
    knockbackHorizontal: 3
};

// アニメーション設定（定数化してメモリ効率を向上）
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
        
        // プレイヤー固有のプロパティ
        this.speed = PLAYER_CONFIG.speed;
        this.jumpPower = PLAYER_CONFIG.jumpPower;
        
        // 体力
        this.health = PLAYER_CONFIG.maxHealth;
        this.maxHealth = PLAYER_CONFIG.maxHealth;
        this.isDead = false;
        this.invulnerable = false;
        this.invulnerabilityTime = 0;
        
        // 向き
        this.facing = 'right';
        
        // アニメーション
        this.animState = 'idle'; // idle, walk, jump, fall
        this.animFrame = 0;
        this.animTimer = 0;
        
        // ジャンプ制御
        this.isJumping = false;
        this.jumpButtonPressed = false;
        this.jumpTime = 0;
        this.canVariableJump = false;
        this.jumpButtonHoldTime = 0;
        this.jumpMaxHeight = 0;
        this.jumpStartY = 0;
        
        // スコア
        this.score = 0;
        this.coins = 0;
        
        // 入力参照
        this.inputManager = null;
    }
    
    /**
     * 入力マネージャーを設定
     * @param {InputManager} inputManager 
     */
    setInputManager(inputManager) {
        this.inputManager = inputManager;
    }
    
    /**
     * 更新処理
     * @param {number} deltaTime - 経過時間
     */
    onUpdate(deltaTime) {
        if (this.isDead) return;
        
        // 入力を取得
        const input = this.inputManager ? this.inputManager.getInput() : {};
        
        // 移動処理
        this.handleMovement(input);
        
        // ジャンプ処理
        this.handleJump(input);
        
        // アニメーション状態の更新
        this.updateAnimationState();
        
        // アニメーションフレームの更新
        this.updateAnimationFrame(deltaTime);
        
        // 無敵時間の更新
        if (this.invulnerable) {
            this.invulnerabilityTime--;
            if (this.invulnerabilityTime <= 0) {
                this.invulnerable = false;
            }
        }
        
        // 画面外落下チェック
        if (this.y > 1000) {
            this.takeDamage(this.maxHealth);
        }
    }
    
    /**
     * 移動処理
     * @param {Object} input - 入力状態
     */
    handleMovement(input) {
        // 横移動
        if (input.left) {
            this.vx = -this.speed;
            this.facing = 'left';
            this.flipX = true;
        } else if (input.right) {
            this.vx = this.speed;
            this.facing = 'right';
            this.flipX = false;
        } else {
            // 入力がない場合は減速
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
        // デバッグログ（デバッグモード時のみ）
        if (input.jump && window.game?.debug) {
            console.log('Jump button pressed!', {
                jumpButtonPressed: this.jumpButtonPressed,
                grounded: this.grounded,
                y: this.y,
                vy: this.vy
            });
        }
        
        // ジャンプボタンが押された瞬間
        if (input.jump && !this.jumpButtonPressed && this.grounded) {
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
            
            // ジャンプ音（将来的に実装）
            // this.playSound('jump');
        }
        
        // ジャンプ時間をカウント
        if (this.isJumping && !this.grounded) {
            this.jumpTime++;
        }
        
        // 可変ジャンプ処理
        if (this.canVariableJump && this.isJumping && !this.grounded) {
            if (input.jump) {
                this.jumpButtonHoldTime++;
                
                // 最大保持時間内なら継続的な上昇力を付与
                if (this.jumpTime < PLAYER_CONFIG.maxJumpTime && this.vy < 0) {
                    // 重力を相殺して上昇を維持
                    this.vy -= this.gravityStrength * 1.8;
                } else if (this.jumpTime >= PLAYER_CONFIG.maxJumpTime && this.vy < 0) {
                    // 最大時間に達したら上昇を停止
                    this.vy = 0;
                    this.canVariableJump = false;
                }
            } else {
                // ボタンが離された時
                if (this.jumpTime >= PLAYER_CONFIG.minJumpTime && this.vy < 0) {
                    // 最小時間経過後なら上昇を即座に停止
                    this.vy = 0;
                }
                this.jumpButtonPressed = false;
                this.canVariableJump = false;
            }
        }
        
        // ジャンプ中の最高到達点を記録
        if (this.isJumping && !this.grounded) {
            const currentHeight = this.jumpStartY - this.y;
            if (currentHeight > this.jumpMaxHeight) {
                this.jumpMaxHeight = currentHeight;
            }
        }
        
        // ジャンプ状態のリセット
        if (!input.jump) {
            this.jumpButtonPressed = false;
        }
        
        // 着地処理
        if (this.grounded && this.isJumping) {
            this.isJumping = false;
            this.canVariableJump = false;
        }
    }
    
    /**
     * アニメーション状態の更新
     */
    updateAnimationState() {
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
    }
    
    /**
     * アニメーションフレームの更新
     * @param {number} deltaTime - 経過時間
     */
    updateAnimationFrame(deltaTime) {
        this.animTimer += deltaTime;
        
        // アニメーション速度を定数から取得
        const speed = ANIMATION_CONFIG.speed[this.animState] || 200;
        
        if (this.animTimer >= speed) {
            this.animTimer = 0;
            
            // フレーム数を定数から取得
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
            // 無敵時間を設定
            this.invulnerable = true;
            this.invulnerabilityTime = PLAYER_CONFIG.invulnerabilityTime;
            
            // ノックバック（設定値を使用）
            this.vy = PLAYER_CONFIG.knockbackVertical;
            this.vx = this.facing === 'right' ? -PLAYER_CONFIG.knockbackHorizontal : PLAYER_CONFIG.knockbackHorizontal;
            
            // ダメージ音（将来的に実装）
            // this.playSound('damage');
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
        
        // コイン音（将来的に実装）
        // this.playSound('coin');
    }
    
    /**
     * 死亡処理
     */
    die() {
        this.isDead = true;
        this.active = false;
        
        // 死亡エフェクト（将来的に実装）
        // this.playSound('death');
        
        // ゲームオーバー処理をトリガー
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
        this.invulnerabilityTime = 60; // 短い無敵時間
        this.animState = 'idle';
        this.animFrame = 0;
        this.facing = 'right';
        this.flipX = false;
    }
    
    /**
     * 描画処理のオーバーライド
     * @param {PixelRenderer} renderer 
     */
    render(renderer) {
        if (!this.visible) return;
        
        // 無敵時間中は点滅
        if (this.invulnerable && Math.floor(this.invulnerabilityTime / 4) % 2 === 0) {
            return;
        }
        
        // 基底クラスの描画を呼び出し
        super.render(renderer);
        
        // デバッグ情報の追加描画
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
}