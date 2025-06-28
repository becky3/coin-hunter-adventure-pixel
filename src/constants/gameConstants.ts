export const GAME_RESOLUTION = {
    WIDTH: 256,
    HEIGHT: 240
} as const;

export const DISPLAY = {
    SCALE: 3,
    
    OUTER_FRAME: {
        ENABLED: true,
        BACKGROUND_COLOR: '#1a1a1a',
        BORDER_COLOR: '#333333',
        BORDER_WIDTH: 2
    }
} as const;

export const CANVAS_SIZE = {
    WIDTH: GAME_RESOLUTION.WIDTH * DISPLAY.SCALE,
    HEIGHT: GAME_RESOLUTION.HEIGHT * DISPLAY.SCALE
} as const;

export const FPS = {
    TARGET: 60,
    FRAME_TIME: 1000 / 60
} as const;

export const FONT = {
    SIZE: 8,
    FAMILY: '\'Press Start 2P\', monospace',
    GRID: 8
} as const;

export const TILE_SIZE = 16 as const;

// Type exports for better type inference
export type GameResolution = typeof GAME_RESOLUTION;
export type Display = typeof DISPLAY;
export type CanvasSize = typeof CANVAS_SIZE;
export type Fps = typeof FPS;
export type Font = typeof FONT;
export type TileSize = typeof TILE_SIZE;