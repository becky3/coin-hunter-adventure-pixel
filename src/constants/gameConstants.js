
export const GAME_RESOLUTION = {
    WIDTH: 256,
    HEIGHT: 240
};

export const DISPLAY = {
    SCALE: 3,
    
    OUTER_FRAME: {
        ENABLED: true,
        BACKGROUND_COLOR: '#1a1a1a',
        BORDER_COLOR: '#333333',
        BORDER_WIDTH: 2
    }
};

export const CANVAS_SIZE = {
    WIDTH: GAME_RESOLUTION.WIDTH * DISPLAY.SCALE,
    HEIGHT: GAME_RESOLUTION.HEIGHT * DISPLAY.SCALE
};

export const FPS = {
    TARGET: 60,
    FRAME_TIME: 1000 / 60
};

export const FONT = {
    SIZE: 8,
    FAMILY: '\'Press Start 2P\', monospace',
    GRID: 8
};

export const TILE_SIZE = 16;