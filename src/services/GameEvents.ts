

export const GameEvents = {

    GAME_START: 'game:start',
    GAME_PAUSE: 'game:pause',
    GAME_RESUME: 'game:resume',
    GAME_OVER: 'game:over',

    STATE_CHANGE: 'state:change',
    STATE_ENTER: 'state:enter',
    STATE_EXIT: 'state:exit',

    LEVEL_START: 'level:start',
    LEVEL_COMPLETE: 'level:complete',
    LEVEL_FAILED: 'level:failed',

    PLAYER_SPAWN: 'player:spawn',
    PLAYER_DEATH: 'player:death',
    PLAYER_DAMAGE: 'player:damage',
    PLAYER_JUMP: 'player:jump',

    COIN_COLLECT: 'item:coin:collect',
    POWERUP_COLLECT: 'item:powerup:collect',

    ENEMY_SPAWN: 'enemy:spawn',
    ENEMY_DEATH: 'enemy:death',

    UI_BUTTON_CLICK: 'ui:button:click',
    UI_MENU_OPEN: 'ui:menu:open',
    UI_MENU_CLOSE: 'ui:menu:close'
} as const;

export type GameEvent = typeof GameEvents[keyof typeof GameEvents];

export interface StateChangeData {
    from: string;
    to: string;
}

export interface CoinCollectData {
    value: number;
    position: { x: number; y: number };
}

export interface PlayerDamageData {
    damage: number;
    source: string;
}
