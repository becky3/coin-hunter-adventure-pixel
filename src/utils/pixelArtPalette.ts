import { SpriteLoader, SPRITE_DEFINITIONS } from './spriteLoader';

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
    public readonly masterPalette: Record<number, string>;
    private currentStagePalette: StagePalette | null;
    private spriteLoader: SpriteLoader;

    constructor() {
        this.masterPalette = {
            0x00: '#000000',
            0x01: '#757575',
            0x02: '#BCBCBC',
            0x03: '#FFFFFF',
            
            0x10: '#0000AB',
            0x11: '#233BEF',
            0x12: '#5F73FF',
            0x13: '#C7D7FF',
            
            0x20: '#8F0077',
            0x21: '#BF00BF',
            0x22: '#F77BFF',
            0x23: '#FFC7FF',
            
            0x30: '#AB0013',
            0x31: '#E7005B',
            0x32: '#FF77B7',
            0x33: '#FFC7DB',
            
            0x40: '#A70000',
            0x41: '#DB2B00',
            0x42: '#FF7763',
            0x43: '#FFBFB3',
            
            0x50: '#432F00',
            0x51: '#8B7300',
            0x52: '#F3BF3F',
            0x53: '#FFE7A3',
            
            0x60: '#004700',
            0x61: '#009700',
            0x62: '#83D313',
            0x63: '#E3FFA3',
            
            0x70: '#7B7B00',
            0x71: '#90DB6A',
            0x80: '#1C0092',
            0x81: '#3C37FF',
            0x90: '#3D1C7D',
            0x91: '#8B55FC',
        };
        
        this.currentStagePalette = null;
        
        this.spriteLoader = new SpriteLoader();
    }

    createStagePalette(config: PaletteConfig): StagePalette {
        return {
            background: config.background.map(palette => 
                palette.map(colorIndex => {
                    const color = this.masterPalette[colorIndex];
                    if (color === undefined) {
                        throw new Error(`Invalid color index in palette config: ${colorIndex}`);
                    }
                    return color;
                })
            ),
            sprite: config.sprite.map(palette => 
                palette.map(colorIndex => {
                    if (colorIndex === 0) return null;
                    const color = this.masterPalette[colorIndex];
                    if (color === undefined) {
                        throw new Error(`Invalid color index in sprite palette config: ${colorIndex}`);
                    }
                    return color;
                })
            )
        };
    }

    setStagePalette(stagePalette: StagePalette): void {
        this.currentStagePalette = stagePalette;
    }

    getColor(type: 'background' | 'sprite', paletteIndex: number, colorIndex: number): ColorHex {
        if (!this.currentStagePalette) return '#000000';
        
        const palette = this.currentStagePalette[type];
        if (!palette || palette[paletteIndex] === undefined) return '#000000';
        
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
                if (!spriteName) {
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
            [0, 0x11, 0x80, 0x50],
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
            [0, 0x91, 0x90, 0x81]
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