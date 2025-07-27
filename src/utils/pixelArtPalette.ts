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
    POWERUPS = 11
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
                palette.map(colorIndex => this.masterPalette[colorIndex] || '#000000')
            ),
            sprite: config.sprite.map(palette => 
                palette.map(colorIndex => colorIndex === 0 ? null : this.masterPalette[colorIndex] || '#000000')
            )
        };
    }

    setStagePalette(stagePalette: StagePalette): void {
        this.currentStagePalette = stagePalette;
    }

    getColor(type: 'background' | 'sprite', paletteIndex: number, colorIndex: number): ColorHex {
        if (!this.currentStagePalette) return '#000000';
        
        const palette = this.currentStagePalette[type];
        if (!palette || !palette[paletteIndex]) return '#000000';
        
        return palette[paletteIndex][colorIndex];
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
                allSprites[spriteName] = sprite.data;
            });
        }
        
        return allSprites;
    }
}

/* eslint-disable no-inline-comments -- パレット定義は視覚的な色の対応を示すコメントが必要 */
const STAGE_PALETTES: Record<string, PaletteConfig> = {
    grassland: {
        background: [
            [0x12, 0x03, 0x02, 0x01],     // SKY
            [0x12, 0x62, 0x61, 0x60],     // GROUND
            [0x12, 0x53, 0x52, 0x51],     // DECORATIONS
            [0x12, 0x32, 0x31, 0x30]      // SPECIAL
        ],
        sprite: [
            [0, 0x11, 0x33, 0x50],        // CHARACTER
            [0, 0x61, 0x62, 0x60],        // ENEMY_BASIC
            [0, 0x01, 0x02, 0x03],        // ENEMY_SPECIAL (spider)
            [0, 0x52, 0x53, 0x51],        // ITEMS
            [0, 0x62, 0x61, 0x60],        // TILES_GROUND (green grass)
            [0, 0x41, 0x42, 0x43],        // TILES_HAZARD (red)
            [0, 0x50, 0x51, 0x52],        // TERRAIN_OBJECTS (brown/yellow)
            [0, 0x50, 0x51, 0x61],        // ENVIRONMENT_NATURE (nature colors)
            [0, 0x12, 0x13, 0x03],        // ENVIRONMENT_SKY (sky colors)
            [0, 0x41, 0x03, 0x00],        // UI_ELEMENTS
            [0, 0x11, 0x12, 0x13],        // EFFECTS
            [0, 0x11, 0x12, 0x13]         // POWERUPS
        ]
    },
    
    cave: {
        background: [
            [0x00, 0x01, 0x02, 0x10],     // SKY (dark)
            [0x00, 0x50, 0x70, 0x01],     // GROUND (dark brown)
            [0x00, 0x10, 0x11, 0x80],     // DECORATIONS (dark blue)
            [0x00, 0x30, 0x31, 0x20]      // SPECIAL
        ],
        sprite: [
            [0, 0x11, 0x80, 0x50],        // CHARACTER (keep similar)
            [0, 0x90, 0x91, 0x20],        // ENEMY_BASIC (purple)
            [0, 0x70, 0x71, 0x01],        // ENEMY_SPECIAL (dark green)
            [0, 0x52, 0x53, 0x51],        // ITEMS (keep gold)
            [0, 0x20, 0x70, 0x01],        // TILES_GROUND (dark stone)
            [0, 0x30, 0x31, 0x32],        // TILES_HAZARD (dark red)
            [0, 0x01, 0x02, 0x10],        // TERRAIN_OBJECTS (gray/blue)
            [0, 0x60, 0x70, 0x71],        // ENVIRONMENT_NATURE (dark green)
            [0, 0x01, 0x02, 0x00],        // ENVIRONMENT_SKY (very dark)
            [0, 0x41, 0x03, 0x00],        // UI_ELEMENTS
            [0, 0x80, 0x81, 0x90],        // EFFECTS (blue/purple)
            [0, 0x80, 0x81, 0x91]         // POWERUPS (blue/purple)
        ]
    }
/* eslint-enable */
} as const;

const paletteSystem = new PaletteSystem();

const PALETTE_NAME_TO_MASTER_PALETTE: Record<string, number[]> = {
    character: [0, 0x11, 0x33, 0x50],
    characterPowerGlove: [0, 0x41, 0x53, 0x50],
    enemy: [0, 0x61, 0x62, 0x60],
    enemySpider: [0, 0x01, 0x02, 0x03],
    items: [0, 0x52, 0x53, 0x51],
    itemsPowerUp: [0, 0x11, 0x12, 0x13],
    ui: [0, 0x41, 0x03, 0x00],
    sky: [0, 0x12, 0x13, 0x03],
    nature: [0, 0x50, 0x51, 0x61],
    shield: [0, 0x11, 0x12, 0x13],
    effect: [0, 0x11, 0x12, 0x13]
};

const UI_PALETTE_INDICES = {
    black: 0x00,
    white: 0x03,
    gold: 0x52,
    red: 0x41,
    lightRed: 0x32,
    gray: 0x02,
    darkGray: 0x01,
    cyan: 0x12,
    brightRed: 0x40,
    green: 0x61,
    skyBlue: 0x12
} as const;

/**
 * Returns color palette for the specified palette name
 */
function getColorPalette(paletteName: string): ColorPalette {
    const masterIndices = PALETTE_NAME_TO_MASTER_PALETTE[paletteName];
    if (!masterIndices) {
        throw new Error(`[getColorPalette] Palette not found: ${paletteName}`);
    }
    
    const palette: ColorPalette = {};
    
    for (let i = 0; i < masterIndices.length; i++) {
        const colorIndex = masterIndices[i];
        if (colorIndex === 0) {
            palette[i] = null;
        } else {
            const color = paletteSystem.masterPalette[colorIndex];
            if (!color) {
                throw new Error(`[getColorPalette] Color not found in master palette: 0x${colorIndex.toString(16).padStart(2, '0')} (palette: ${paletteName}, index: ${i})`);
            }
            palette[i] = color;
        }
    }
    
    return palette;
}

function getMasterColor(colorIndex: number): string {
    return paletteSystem.masterPalette[colorIndex] || '#000000';
}

export { PaletteSystem, STAGE_PALETTES, SPRITE_DEFINITIONS, getColorPalette, paletteSystem, UI_PALETTE_INDICES, getMasterColor };
export type { ColorHex, Palette, PaletteConfig, StagePalette, ColorPalette, SpriteData };