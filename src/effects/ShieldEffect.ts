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
        if (!this.showShield || !renderer.pixelArtRenderer) return;
        
        const leftSprite = renderer.pixelArtRenderer.sprites.get('effects/shield_left');
        const rightSprite = renderer.pixelArtRenderer.sprites.get('effects/shield_right');
        
        if (!leftSprite || !rightSprite) return;
        
        const leftX = this.player.x - 10;
        const rightX = this.player.x + this.player.width + 2;
        const shieldY = this.player.y + this.player.height - 32;
        
        const leftScreenPos = renderer.worldToScreen(leftX, shieldY);
        leftSprite.draw(
            renderer.ctx,
            leftScreenPos.x,
            leftScreenPos.y,
            false,
            renderer.scale
        );
        
        const rightScreenPos = renderer.worldToScreen(rightX, shieldY);
        rightSprite.draw(
            renderer.ctx,
            rightScreenPos.x,
            rightScreenPos.y,
            false,
            renderer.scale
        );
    }
}