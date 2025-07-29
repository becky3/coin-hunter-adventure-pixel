import { PowerUpItem } from './PowerUpItem';
import { PowerUpType, PowerUpConfig } from '../../types/PowerUpTypes';
import { Logger } from '../../utils/Logger';
import { ResourceLoader } from '../../config/ResourceLoader';
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
        const resourceLoader = ResourceLoader.getInstance();
        const config = resourceLoader.getEntityConfigSync('powerups', 'shield_stone');
        
        if (!config) {
            throw new Error('Failed to load shield stone configuration');
        }
        
        super(
            x, 
            y, 
            config,
            PowerUpType.SHIELD_STONE,
            config.properties.floatSpeed,
            config.properties.floatAmplitude
        );
        
        Logger.log('[ShieldStone] Created at', x, y);
        
        this.setAnimation('idle');
    }

    protected createPowerUpConfig(): PowerUpConfig {
        return {
            type: PowerUpType.SHIELD_STONE,
            duration: Infinity,
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