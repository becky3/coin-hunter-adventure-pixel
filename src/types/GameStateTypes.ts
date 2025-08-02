/**
 * Game state constants using const assertion for type safety
 */
export const GameStates = {
    MENU: 'menu',
    PLAY: 'play',
    SOUND_TEST: 'soundtest',
    TEST_PLAY: 'testplay'
} as const;

/**
 * Type representing valid game state keys
 */
export type GameStateKey = typeof GameStates[keyof typeof GameStates];

/**
 * Type guard to check if a string is a valid game state
 */
export function isValidGameState(state: string): state is GameStateKey {
    return Object.values(GameStates).includes(state as GameStateKey);
}