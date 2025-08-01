import { EntityPaletteDefinition } from '../types/animationTypes';

/**
 * Common palette definitions for debug and UI elements
 * These palettes use 4-color format (transparent + 3 colors)
 */

/**
 * Debug overlay palette
 * Used for debug information display
 */
export const DEBUG_PALETTE: EntityPaletteDefinition = {
    default: {
        colors: [
            null,
            0x00,
            0x62,
            0x31
        ]
    }
};

/**
 * Performance monitor palette
 * Used for performance statistics display
 */
export const PERFORMANCE_PALETTE: EntityPaletteDefinition = {
    default: {
        colors: [
            null,
            0x00,
            0x62,
            0x31
        ]
    }
};

/**
 * Enemy health bar palette
 * Used for enemy HP display
 */
export const ENEMY_HP_PALETTE: EntityPaletteDefinition = {
    default: {
        colors: [
            null,
            0x00,
            0x31,
            0x03
        ]
    }
};

/**
 * Test/Debug tile palette
 * Used for test stages and debug visualizations
 */
export const TEST_TILE_PALETTE: EntityPaletteDefinition = {
    default: {
        colors: [
            null,
            0x61,
            0x21,
            0x11
        ]
    }
};

/**
 * Get palette index for common elements
 * Maps master palette indices to local palette indices (0-3)
 */
export function getCommonPaletteIndex(palette: EntityPaletteDefinition, masterIndex: number): number {
    const colors = palette.default.colors;
    for (let i = 1; i < colors.length; i++) {
        if (colors[i] === masterIndex) {
            return i;
        }
    }
    return 1;
}