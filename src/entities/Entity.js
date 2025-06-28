/**
 * エンティティ基底クラス
 * すべてのゲームオブジェクトの基本機能を提供
 */
// エンティティの一意なIDを生成するためのカウンター
let entityIdCounter = 0;

export class Entity {
    constructor(x = 0, y = 0, width = 16, height = 16) {
        // 一意なID
        this.id = ++entityIdCounter;
        
        // 位置
        this.x = x;
        this.y = y;
        
        // サイズ
        this.width = width;
        this.height = height;
        
        // 速度
        this.vx = 0;
        this.vy = 0;
        
        // 加速度
        this.ax = 0;
        this.ay = 0;
        
        // 物理特性
        this.gravity = true;
        this.gravityStrength = 0.65;
        this.maxFallSpeed = 15;
        this.friction = 0.8;
        this.physicsEnabled = true; // PhysicsSystemで管理されているか
        
        // 状態
        this.active = true;
        this.visible = true;
        this.grounded = false;
        
        // 衝突判定
        this.solid = true;
        this.collidable = true;
        
        // アニメーション
        this.currentAnimation = null;
        this.animationTime = 0;
        this.flipX = false;
        
        // スプライト
        this.sprite = null;
        this.spriteScale = 1;
    }
    
    /**
     * エンティティを更新
     * @param {number} deltaTime - 前フレームからの経過時間（ms）
     */
    update(deltaTime) {
        if (!this.active) return;
        
        // 物理演算はPhysicsSystemに任せる
        
        // アニメーション更新
        this.updateAnimation(deltaTime);
        
        // 子クラスの更新処理
        this.onUpdate(deltaTime);
    }
    
    /**
     * 物理演算の更新
     * @param {number} deltaTime - 経過時間
     */
    updatePhysics(deltaTime) {
        // deltaTimeが適切でない場合のフェールセーフ
        if (!deltaTime || deltaTime <= 0 || deltaTime > 100) {
            deltaTime = 16.67; // 60FPSのデフォルト値
        }
        
        // 重力を適用（フレームレート非依存）
        if (this.gravity && !this.grounded) {
            this.vy += this.gravityStrength;
            
            // 最大落下速度を制限
            if (this.vy > this.maxFallSpeed) {
                this.vy = this.maxFallSpeed;
            }
        }
        
        // 摩擦を適用
        if (this.grounded) {
            this.vx *= this.friction;
            
            // 小さな速度は0にする
            if (Math.abs(this.vx) < 0.1) {
                this.vx = 0;
            }
        }
        
        // 位置更新はPhysicsSystemで行うため、ここでは行わない
        // PhysicsSystemを使用しない場合のみ位置を更新
        if (!this.physicsEnabled) {
            // 位置を更新（deltaTimeを考慮）
            // 60FPSを基準として、deltaTimeで調整
            const frameFactor = deltaTime / 16.67; // 16.67ms = 60FPS
            this.x += this.vx * frameFactor;
            this.y += this.vy * frameFactor;
        }
    }
    
    /**
     * アニメーションの更新
     * @param {number} deltaTime - 経過時間
     */
    updateAnimation(deltaTime) {
        if (this.currentAnimation) {
            this.animationTime += deltaTime;
        }
    }
    
    /**
     * エンティティを描画
     * @param {PixelRenderer} renderer - レンダラー
     */
    render(renderer) {
        if (!this.visible) return;
        
        // スプライトまたはアニメーションを描画
        if (this.sprite) {
            renderer.drawSprite(
                this.sprite,
                this.x,
                this.y,
                this.spriteScale,
                this.flipX
            );
        } else {
            // デフォルトの描画（デバッグ用）
            this.renderDefault(renderer);
        }
        
        // デバッグ描画
        if (renderer.debug) {
            this.renderDebug(renderer);
        }
    }
    
    /**
     * デフォルトの描画（スプライトがない場合）
     * @param {PixelRenderer} renderer 
     */
    renderDefault(renderer) {
        renderer.drawRect(
            this.x,
            this.y,
            this.width,
            this.height,
            '#FF00FF'
        );
        
        // デバッグ用に大きめの枠も描画
        renderer.drawRect(
            this.x - 2,
            this.y - 2,
            this.width + 4,
            this.height + 4,
            '#FF00FF',
            false
        );
    }
    
    /**
     * デバッグ情報の描画
     * @param {PixelRenderer} renderer 
     */
    renderDebug(renderer) {
        // 当たり判定ボックス
        renderer.drawRect(
            this.x,
            this.y,
            this.width,
            this.height,
            '#00FF00',
            false
        );
        
        // 速度ベクトル
        if (this.vx !== 0 || this.vy !== 0) {
            renderer.drawLine(
                this.x + this.width / 2,
                this.y + this.height / 2,
                this.x + this.width / 2 + this.vx * 5,
                this.y + this.height / 2 + this.vy * 5,
                '#FFFF00',
                2
            );
        }
        
        // 状態テキスト
        const screenPos = renderer.worldToScreen(this.x, this.y - 10);
        renderer.ctx.fillStyle = '#FFFFFF';
        renderer.ctx.font = '10px monospace';
        renderer.ctx.fillText(
            `${this.constructor.name} ${this.grounded ? 'G' : 'A'}`,
            screenPos.x,
            screenPos.y
        );
    }
    
    /**
     * 当たり判定用の境界ボックスを取得
     * @returns {Object} 境界ボックス
     */
    getBounds() {
        return {
            left: this.x,
            top: this.y,
            right: this.x + this.width,
            bottom: this.y + this.height,
            width: this.width,
            height: this.height
        };
    }
    
    /**
     * 他のエンティティとの衝突判定
     * @param {Entity} other - 判定対象
     * @returns {boolean} 衝突している場合true
     */
    collidesWith(other) {
        if (!this.collidable || !other.collidable) return false;
        
        const a = this.getBounds();
        const b = other.getBounds();
        
        return a.left < b.right &&
               a.right > b.left &&
               a.top < b.bottom &&
               a.bottom > b.top;
    }
    
    /**
     * 矩形との衝突判定
     * @param {Object} rect - 判定対象の矩形
     * @returns {boolean} 衝突している場合true
     */
    collidesWithRect(rect) {
        const bounds = this.getBounds();
        
        return bounds.left < rect.right &&
               bounds.right > rect.left &&
               bounds.top < rect.bottom &&
               bounds.bottom > rect.top;
    }
    
    /**
     * エンティティ間の距離を計算
     * @param {Entity} other - 対象エンティティ
     * @returns {number} 距離
     */
    distanceTo(other) {
        const dx = (this.x + this.width / 2) - (other.x + other.width / 2);
        const dy = (this.y + this.height / 2) - (other.y + other.height / 2);
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    /**
     * エンティティへの方向を計算
     * @param {Entity} other - 対象エンティティ
     * @returns {Object} 正規化された方向ベクトル
     */
    directionTo(other) {
        const dx = (other.x + other.width / 2) - (this.x + this.width / 2);
        const dy = (other.y + other.height / 2) - (this.y + this.height / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance === 0) {
            return { x: 0, y: 0 };
        }
        
        return {
            x: dx / distance,
            y: dy / distance
        };
    }
    
    /**
     * スプライトを設定
     * @param {Object} sprite - スプライトデータ
     * @param {number} scale - 描画スケール
     */
    setSprite(sprite, scale = 1) {
        this.sprite = sprite;
        this.spriteScale = scale;
    }
    
    /**
     * アニメーションを設定
     * @param {string} animationName - アニメーション名
     */
    setAnimation(animationName) {
        if (this.currentAnimation !== animationName) {
            this.currentAnimation = animationName;
            this.animationTime = 0;
        }
    }
    
    /**
     * エンティティをリセット
     * @param {number} x - X座標
     * @param {number} y - Y座標
     */
    reset(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.ax = 0;
        this.ay = 0;
        this.grounded = false;
        this.active = true;
        this.visible = true;
        this.animationTime = 0;
    }
    
    /**
     * エンティティを破棄
     */
    destroy() {
        this.active = false;
        this.visible = false;
        this.onDestroy();
    }
    
    // 子クラスでオーバーライドするメソッド
    
    /**
     * 更新処理（子クラスで実装）
     * @param {number} deltaTime - 経過時間
     */
    onUpdate() {
        // 子クラスで実装
        // deltaTimeが必要な場合は子クラスで引数を追加
    }
    
    /**
     * 破棄処理（子クラスで実装）
     */
    onDestroy() {
        // 子クラスで実装
    }
    
    /**
     * 衝突時の処理（子クラスで実装）
     * @param {Object} collisionInfo - 衝突情報 {other: Entity, side: string}
     */
    onCollision() {
        // 子クラスで実装
        // collisionInfoが必要な場合は子クラスで引数を追加
    }
}