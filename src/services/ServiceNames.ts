

export const ServiceNames = {
    RENDERER: 'renderer',
    INPUT: 'input',
    PHYSICS: 'physics',
    AUDIO: 'audio',
    ASSET_LOADER: 'assetLoader',
    EVENT_BUS: 'eventBus',
    SYSTEM_MANAGER: 'systemManager',
    GAME_STATE_MANAGER: 'gameStateManager'
} as const;

export type ServiceName = typeof ServiceNames[keyof typeof ServiceNames];
