import { SpriteLoader, SPRITE_DEFINITIONS } from './spriteLoader';
import { MasterPalette } from '../rendering/MasterPalette';

/**
 * Sprite palette indices enum for better readability
 */
export enum SpritePaletteIndex {
    CHARACTER = 0,
    ENEMY_BASIC = 1,
    ENEMY_SPECIAL = 2,
    ITEMS = 3,
    TILES_GROUND = 4,
    TILES_HAZARD = 5,
    TERRAIN_OBJECTS = 6,
    ENVIRONMENT_NATURE = 7,
    ENVIRONMENT_SKY = 8,
    UI_ELEMENTS = 9,
    EFFECTS = 10,
    POWERUPS = 11,
    CHARACTER_POWERGLOVE = 12
}

/**
 * Background palette indices enum
 */
export enum BackgroundPaletteIndex {
    SKY = 0,
    GROUND = 1,
    DECORATIONS = 2,
    SPECIAL = 3
}

type ColorIndex = number;
type ColorHex = string | null;
type Palette = ColorHex[];
type PaletteConfig = {
    background: ColorIndex[][];
    sprite: ColorIndex[][];
};

type StagePalette = {
    background: Palette[];
    sprite: Palette[];
};

interface ColorPalette {
    [key: number]: ColorHex;
}

interface SpriteData {
    width: number;
    height: number;
    data: number[][];
}

/**
 * System for managing palette operations
 */
class PaletteSystem {
    private currentStagePalette: StagePalette | null;
    private spriteLoader: SpriteLoader;

    constructor() {
        
        this.currentStagePalette = null;
        
        this.spriteLoader = new SpriteLoader();
    }

    createStagePalette(config: PaletteConfig): StagePalette {
        return {
            background: config.background.map(palette => 
                palette.map(colorIndex => MasterPalette.getColor(colorIndex))
            ),
            sprite: config.sprite.map(palette => 
                palette.map(colorIndex => {
                    if (colorIndex === 0) return null;
                    return MasterPalette.getColor(colorIndex);
                })
            )
        };
    }

    setStagePalette(stagePalette: StagePalette): void {
        this.currentStagePalette = stagePalette;
    }

    getColor(type: 'background' | 'sprite', paletteIndex: number, colorIndex: number): ColorHex {
        if (!this.currentStagePalette) {
            throw new Error('Stage palette not set');
        }
        
        const palette = this.currentStagePalette[type];
        if (!palette) {
            throw new Error(`Invalid palette type: ${type}`);
        }
        
        const paletteColors = palette[paletteIndex];
        if (paletteColors === undefined) {
            throw new Error(`Invalid palette index: ${paletteIndex}`);
        }
        const color = paletteColors[colorIndex];
        if (color === undefined) {
            throw new Error(`Invalid color index: ${colorIndex} in palette ${paletteIndex}`);
        }
        return color;
    }

    async loadSpriteData(category: string, name: string): Promise<number[][]> {
        const sprite = await this.spriteLoader.loadSprite(category, name);
        return sprite.data;
    }

    async loadAllSprites(): Promise<Record<string, number[][]>> {
        const allSprites: Record<string, number[][]> = {};
        
        for (const [category, names] of Object.entries(SPRITE_DEFINITIONS)) {
            const categorySprites = await this.spriteLoader.loadCategory(category, [...names]);
            
            categorySprites.forEach((sprite, key) => {
                const spriteName = key.split('/')[1];
                if (spriteName === undefined) {
                    throw new Error(`Invalid sprite key format: ${key}`);
                }
                allSprites[spriteName] = sprite.data;
            });
        }
        
        return allSprites;
    }
}

const STAGE_PALETTES: Record<string, PaletteConfig> = {
    grassland: {
        background: [
            [0x12, 0x03, 0x02, 0x01],
            [0x12, 0x62, 0x61, 0x60],
            [0x12, 0x53, 0x52, 0x51],
            [0x12, 0x32, 0x31, 0x30]
        ],
        sprite: [
            [0, 0x11, 0x33, 0x50],
            [0, 0x61, 0x62, 0x60],
            [0, 0x01, 0x02, 0x03],
            [0, 0x52, 0x53, 0x51],
            [0, 0x62, 0x61, 0x60],
            [0, 0x41, 0x42, 0x43],
            [0, 0x50, 0x51, 0x52],
            [0, 0x50, 0x51, 0x61],
            [0, 0x12, 0x13, 0x03],
            [0, 0x41, 0x03, 0x00],
            [0, 0x11, 0x12, 0x13],
            [0, 0x11, 0x12, 0x13],
            [0, 0x62, 0x61, 0x13]
        ]
    },
    
    cave: {
        background: [
            [0x00, 0x01, 0x02, 0x10],
            [0x00, 0x50, 0x70, 0x01],
            [0x00, 0x10, 0x11, 0x80],
            [0x00, 0x30, 0x31, 0x20]
        ],
        sprite: [
            [0, 0x11, 0x33, 0x50],
            [0, 0x90, 0x91, 0x20],
            [0, 0x70, 0x71, 0x01],
            [0, 0x52, 0x53, 0x51],
            [0, 0x20, 0x70, 0x01],
            [0, 0x30, 0x31, 0x32],
            [0, 0x01, 0x02, 0x10],
            [0, 0x60, 0x70, 0x71],
            [0, 0x01, 0x02, 0x00],
            [0, 0x41, 0x03, 0x00],
            [0, 0x80, 0x81, 0x90],
            [0, 0x80, 0x81, 0x91],
            [0, 0x62, 0x61, 0x13]
        ]
    }
} as const;

const paletteSystem = new PaletteSystem();


const UI_PALETTE_INDICES = {
    background: 0x00,
    primaryText: 0x03,
    highlight: 0x52,
    danger: 0x41,
    warning: 0x32,
    secondaryText: 0x02,
    mutedText: 0x01,
    accentText: 0x12,
    criticalDanger: 0x40,
    success: 0x61,
    info: 0x12
} as const;

export { PaletteSystem, STAGE_PALETTES, SPRITE_DEFINITIONS, paletteSystem, UI_PALETTE_INDICES };
export type { ColorHex, Palette, PaletteConfig, StagePalette, ColorPalette, SpriteData };