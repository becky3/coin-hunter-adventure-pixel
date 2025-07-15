import { PowerUpItem } from './PowerUpItem';
import { PowerUpType, PowerUpConfig } from '../../types/PowerUpTypes';
import { Logger } from '../../utils/Logger';
import { PixelRenderer } from '../../rendering/PixelRenderer';

/**
 * Shield Stone power-up that grants damage immunity for one hit
 */
export class ShieldStone extends PowerUpItem {
    /**
     * Factory method to create a ShieldStone instance
     */
    static create(x: number, y: number): ShieldStone {
        return new ShieldStone(x, y);
    }

    constructor(x: number, y: number) {
        super(x, y, 16, 16, PowerUpType.SHIELD_STONE);
        
        Logger.log('[ShieldStone] Created at', x, y);
    }

    protected createPowerUpConfig(): PowerUpConfig {
        return {
            type: PowerUpType.SHIELD_STONE,
            permanent: true,
            stackable: false,
            effectProperties: {
                charges: 1
            }
        };
    }

    protected getSpriteName(): string {
        // TODO: Create and add actual shield stone sprite
        return 'powerups/shield_stone';
    }

    renderDefault(renderer: PixelRenderer): void {
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        const radius = Math.min(this.width, this.height) / 2.5;
        
        renderer.drawCircle(centerX, centerY, radius, '#4169E1');
        
        renderer.drawCircle(centerX, centerY, radius - 2, '#87CEEB');
        
        const shineX = centerX - radius / 3;
        const shineY = centerY - radius / 3;
        renderer.drawCircle(shineX, shineY, radius / 4, '#FFFFFF');
        
        renderer.drawCircle(centerX, centerY, radius + 2, '#4169E1', false);
    }
}