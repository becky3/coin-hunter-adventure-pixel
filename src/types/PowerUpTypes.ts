/**
 * Types and enums for the PowerUp system
 */

/**
 * Enum of all available power-up types
 */
export enum PowerUpType {
    SHIELD_STONE = 'SHIELD_STONE',
    WING_BOOTS = 'WING_BOOTS', 
    HEAVY_BOOTS = 'HEAVY_BOOTS',
    POWER_GLOVE = 'POWER_GLOVE',
    RAINBOW_STAR = 'RAINBOW_STAR'
}

/**
 * Configuration for a power-up effect
 */
export interface PowerUpConfig {
    type: PowerUpType;
    duration: number;
    stackable?: boolean;
    maxStacks?: number;
    effectProperties?: Record<string, unknown>;
}

/**
 * Active power-up state
 */
export interface ActivePowerUp {
    type: PowerUpType;
    remainingTime: number;
    stacks: number;
    config: PowerUpConfig;
}

/**
 * Power-up effect interface
 */
export interface PowerUpEffect<T = unknown> {
    onApply(target: T): void;
    onUpdate?(target: T, deltaTime: number): void;
    onRemove(target: T): void;
    onStack?(target: T, currentStacks: number): void;
}