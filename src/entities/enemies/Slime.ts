import { Enemy } from '../Enemy';
import { PixelRenderer } from '../../rendering/PixelRenderer';

export class Slime extends Enemy {
    private jumpHeight: number;
    private jumpCooldown: number;
    private jumpInterval: number;
    public spriteKey: string;
    private bounceHeight: number;
    declare friction: number;

    constructor(x: number, y: number) {
        super(x, y, 16, 16);
        
        this.maxHealth = 1;
        this.health = this.maxHealth;
        this.damage = 1;
        this.moveSpeed = 0.25;
        
        this.jumpHeight = 5;
        this.jumpCooldown = 0;
        this.jumpInterval = 1000;
        
        this.spriteKey = 'slime';
        this.animState = 'idle';
        
        this.bounceHeight = 0.3;
        this.friction = 0.8;
    }
    
    protected updateAI(deltaTime: number): void {
        if (this.state === 'dead' || this.state === 'hurt') {
            return;
        }
        
        if (this.jumpCooldown > 0) {
            this.jumpCooldown -= deltaTime;
        }

        if (this.grounded) {

            this.vx = this.moveSpeed * this.direction;

            if (this.jumpCooldown <= 0) {
                this.jump();
                this.jumpCooldown = this.jumpInterval;
            }

            this.animState = 'move';
        } else {

            this.animState = 'jump';
        }

        // TODO: PhysicsSystemのレイキャスト実装後に有効化

    }

    private jump(): void {
        if (this.grounded) {
            this.vy = -this.jumpHeight;
            this.grounded = false;
        }
    }

    checkWallAhead(): boolean {
        // TODO: PhysicsSystemのレイキャストを使用

        return false;
    }

    checkCliffAhead(): boolean {
        // TODO: PhysicsSystemのレイキャストを使用

        return false;
    }

    onGroundCollision(): void {

        // TODO: PhysicsSystemでバウンス処理を実装
    }

    protected onDeath(): void {

        console.log('Slime defeated!');
        
        // TODO: 死亡エフェクトの生成
        // TODO: アイテムドロップ（コインなど）
    }

    render(renderer: PixelRenderer): void {
        if (!this.active) return;
        
        if (this.invincibleTime > 0 && Math.floor(this.invincibleTime / 100) % 2 === 0) {
            return;
        }
        
        // TODO: PixelArtRendererとの統合後にスプライト描画を実装
        
        renderer.drawRect(this.x, this.y, this.width, this.height, '#00FF00');
        
        renderer.drawRect(this.x + 4, this.y + 4, 2, 2, '#000000');
        renderer.drawRect(this.x + 10, this.y + 4, 2, 2, '#000000');
    }
}