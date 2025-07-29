import { PixelRenderer } from '../rendering/PixelRenderer';
import { Player } from '../entities/Player';

/**
 * Simple retro-style shield visual effect with left/right barriers
 */
export class ShieldEffectVisual {
    private player: Player;
    private blinkTimer: number = 0;
    private showShield: boolean = true;
    private blinkSpeed: number = 0.2;

    constructor(player: Player) {
        this.player = player;
    }

    setBreaking(breaking: boolean): void {
        this.blinkSpeed = breaking ? 0.1 : 0.2;
    }

    update(deltaTime: number): void {
        this.blinkTimer += deltaTime;
        if (this.blinkTimer > this.blinkSpeed) {
            this.showShield = !this.showShield;
            this.blinkTimer = 0;
        }
    }

    render(renderer: PixelRenderer): void {
        if (!this.showShield) return;
        
        if (!renderer.pixelArtRenderer) {
            throw new Error('[ShieldEffect] pixelArtRenderer is not available. Ensure that the renderer is properly initialized and that pixelArtRenderer is defined.');
        }
        
        const leftX = this.player.x - 10;
        const rightX = this.player.x + this.player.width + 2;
        const shieldY = this.player.y + this.player.height - 32;
        
        try {
            renderer.drawSprite(
                'effects/shield_left',
                leftX,
                shieldY,
                false,
                0
            );
            
            renderer.drawSprite(
                'effects/shield_right',
                rightX,
                shieldY,
                false,
                0
            );
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`[ShieldEffect] Failed to draw shield sprites: ${errorMessage}`);
        }
    }
}