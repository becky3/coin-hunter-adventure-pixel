import { Enemy } from '../Enemy';
import { PixelRenderer } from '../../rendering/PixelRenderer';
import { ResourceLoader } from '../../config/ResourceLoader';

/**
 * Slime enemy that moves horizontally
 */
export class Slime extends Enemy {
    public spriteKey: string;
    private bounceHeight: number;
    declare friction: number;

    constructor(x: number, y: number) {
        let slimeConfig = null;
        try {
            const resourceLoader = ResourceLoader.getInstance();
            slimeConfig = resourceLoader.getCharacterConfig('enemies', 'slime');
        } catch {
            // Error handled silently
        }
        
        const width = slimeConfig?.physics.width || 16;
        const height = slimeConfig?.physics.height || 16;
        
        super(x, y, width, height);
        
        this.maxHealth = slimeConfig?.stats.maxHealth || 1;
        this.health = this.maxHealth;
        this.damage = slimeConfig?.stats.damage || 1;
        this.moveSpeed = slimeConfig?.physics.moveSpeed || 0.25;
        
        
        this.spriteKey = 'enemies/slime';
        this.animState = 'idle';
        
        this.bounceHeight = 0.3;
        this.friction = 0.8;
        
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
        
        if (renderer.pixelArtRenderer) {
            const screenPos = renderer.worldToScreen(this.x, this.y);
            const animation = renderer.pixelArtRenderer.animations.get('enemies/slime_idle');
            
            if (animation) {
                animation.update(Date.now());
                animation.draw(
                    renderer.ctx,
                    screenPos.x,
                    screenPos.y,
                    this.direction === -1,
                    renderer.scale
                );
                return;
            }
        }
        
        super.render(renderer);
    }
}