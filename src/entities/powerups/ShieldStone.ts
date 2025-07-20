import { PowerUpItem } from './PowerUpItem';
import { PowerUpType, PowerUpConfig } from '../../types/PowerUpTypes';
import { Logger } from '../../utils/Logger';
import type { AnimationDefinition, EntityPaletteDefinition } from '../../types/animationTypes';

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
        return 'powerups/shield_stone';
    }
    
    /**
     * Get animation definitions for shield stone
     */
    protected getAnimationDefinitions(): AnimationDefinition[] {
        return [
            {
                id: 'idle',
                sprites: ['powerups/shield_stone.json'],
                frameDuration: 0,
                loop: false
            }
        ];
    }
    
    /**
     * Get palette definition for shield stone
     */
    protected getPaletteDefinition(): EntityPaletteDefinition {
        return {
            default: {
                colors: [
                    null,
                    0x01,
                    0x40,
                    0x41
                ]
            }
        };
    }
}