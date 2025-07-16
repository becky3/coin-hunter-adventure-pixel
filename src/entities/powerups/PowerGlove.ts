import { PowerUpItem } from './PowerUpItem';
import { PowerUpType, PowerUpConfig } from '../../types/PowerUpTypes';
import { Logger } from '../../utils/Logger';

/**
 * Power Glove power-up that grants ranged attack ability
 */
export class PowerGlove extends PowerUpItem {
    /**
     * Factory method to create a PowerGlove instance
     */
    static create(x: number, y: number): PowerGlove {
        return new PowerGlove(x, y);
    }

    constructor(x: number, y: number) {
        super(x, y, 16, 16, PowerUpType.POWER_GLOVE);
        
        Logger.log('[PowerGlove] Created at', x, y);
    }

    protected createPowerUpConfig(): PowerUpConfig {
        return {
            type: PowerUpType.POWER_GLOVE,
            permanent: true,
            stackable: false,
            effectProperties: {
                bulletSpeed: 5,
                fireRate: 500
            }
        };
    }

    protected getSpriteName(): string {
        return 'powerups/power_glove';
    }
}