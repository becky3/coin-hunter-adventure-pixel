import { Enemy } from '../Enemy';
import { PixelRenderer } from '../../rendering/PixelRenderer';
import { ResourceLoader } from '../../config/ResourceLoader';

export class Slime extends Enemy {
    public spriteKey: string;
    private bounceHeight: number;
    declare friction: number;

    constructor(x: number, y: number) {
        // Load config from ResourceLoader if available
        let slimeConfig = null;
        try {
            const resourceLoader = ResourceLoader.getInstance();
            slimeConfig = resourceLoader.getCharacterConfig('enemies', 'slime');
        } catch {
            // ResourceLoader not initialized yet, use defaults
        }
        
        const width = slimeConfig?.physics.width || 16;
        const height = slimeConfig?.physics.height || 16;
        
        super(x, y, width, height);
        
        // Apply configuration values
        this.maxHealth = slimeConfig?.stats.maxHealth || 1;
        this.health = this.maxHealth;
        this.damage = slimeConfig?.stats.damage || 1;
        this.moveSpeed = slimeConfig?.physics.moveSpeed || 0.25;
        
        
        this.spriteKey = 'slime';
        this.animState = 'idle';
        
        this.bounceHeight = 0.3;
        this.friction = 0.8;
        
        // Apply AI configuration if available
        if (slimeConfig?.ai) {
            this.aiType = (slimeConfig.ai.type as 'patrol' | 'chase' | 'idle') || 'patrol';
            this.detectRange = slimeConfig.ai.detectRange || 100;
            this.attackRange = slimeConfig.ai.attackRange || 20;
        }
    }
    
    protected updateAI(_deltaTime: number): void {
        if (this.state === 'dead' || this.state === 'hurt') {
            return;
        }

        if (this.grounded) {
            this.vx = this.moveSpeed * this.direction;
            this.animState = 'move';
        } else {
            this.animState = 'jump';
        }

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