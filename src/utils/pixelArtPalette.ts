import { SpriteLoader, SPRITE_DEFINITIONS } from './spriteLoader';

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

const STAGE_PALETTES: Record<string, PaletteConfig> = {
    grassland: {
        background: [
            [0x12, 0x03, 0x02, 0x01],
            [0x12, 0x62, 0x61, 0x60],
            [0x12, 0x53, 0x52, 0x51],
            [0x12, 0x32, 0x31, 0x30]
        ],
        sprite: [
            [0, 0x11, 0x43, 0x50],
            [0, 0x61, 0x62, 0x60],
            [0, 0x21, 0x22, 0x03],
            [0, 0x52, 0x53, 0x51]
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
            [0, 0x11, 0x43, 0x50],
            [0, 0x90, 0x91, 0x20],
            [0, 0x30, 0x31, 0x32],
            [0, 0x52, 0x53, 0x51]
        ]
    },
    
    snow: {
        background: [
            [0x13, 0x03, 0x02, 0x12],
            [0x13, 0x03, 0x81, 0x11],
            [0x13, 0x60, 0x61, 0x71],
            [0x13, 0x10, 0x11, 0x12]
        ],
        sprite: [
            [0, 0x31, 0x43, 0x50],
            [0, 0x03, 0x02, 0x12],
            [0, 0x00, 0x03, 0x41],
            [0, 0x52, 0x53, 0x51]
        ]
    }
} as const;

const paletteSystem = new PaletteSystem();

const PALETTE_NAME_TO_MASTER_PALETTE: Record<string, number[]> = {
    character: [0, 0x11, 0x33, 0x50],
    characterPowerGlove: [0, 0x41, 0x53, 0x50],
    enemy: [0, 0x61, 0x62, 0x60],
    enemySpider: [0, 0x01, 0x02, 0x03],
    items: [0, 0x52, 0x53, 0x51],
    itemsPowerUp: [0, 0x11, 0x12, 0x13],
    grassland: [0, 0x50, 0x51, 0x61],
    cave: [0, 0x01, 0x02, 0x10],
    snow: [0, 0x03, 0x02, 0x12],
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