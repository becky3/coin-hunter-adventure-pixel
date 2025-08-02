/**
 * Animation and palette type definitions for entity-based system
 */

/**
 * Master palette index (0x00-0x91)
 */
export type MasterPaletteIndex = number;

/**
 * 4-color palette definition (transparent + 3 colors)
 * Index 0 is always transparent (null)
 * Indices 1-3 are master palette indices
 */
export interface FourColorPalette {
    colors: [null, MasterPaletteIndex, MasterPaletteIndex, MasterPaletteIndex];
}


/**
 * Animation definition for a single animation
 */
export interface AnimationDefinition {
    id: string;
    sprites: string[];
    frameDuration: number;
    loop: boolean;
}

/**
 * Processed animation with loaded sprite data
 */
export interface ProcessedAnimation {
    id: string;
    frames: SpriteData[];
    frameDuration: number;
    loop: boolean;
    currentFrame: number;
    elapsedTime: number;
}

/**
 * Sprite data structure
 */
export interface SpriteData {
    width: number;
    height: number;
    data: number[][];
}