import { PowerUpType, ActivePowerUp, PowerUpConfig, PowerUpEffect } from '../types/PowerUpTypes';
import { Logger } from '../utils/Logger';

/**
 * Manages power-up states and effects for an entity
 */
export class PowerUpManager<T = unknown> {
    private activePowerUps: Map<PowerUpType, ActivePowerUp>;
    private effectHandlers: Map<PowerUpType, PowerUpEffect<T>>;
    private target: T;

    constructor(target: T) {
        this.target = target;
        this.activePowerUps = new Map();
        this.effectHandlers = new Map();
    }

    /**
     * Register a power-up effect handler
     */
    registerEffect(type: PowerUpType, effect: PowerUpEffect<T>): void {
        this.effectHandlers.set(type, effect);
    }

    /**
     * Apply a power-up to the target
     */
    applyPowerUp(config: PowerUpConfig): boolean {
        const { type, stackable = false, maxStacks = 1 } = config;
        
        const existingPowerUp = this.activePowerUps.get(type);
        const effect = this.effectHandlers.get(type);

        if (!effect) {
            Logger.warn(`No effect handler registered for power-up type: ${type}`);
            return false;
        }

        if (existingPowerUp) {
            if (!stackable) {
                Logger.log(`Power-up ${type} is already active and not stackable`);
                return false;
            }

            const currentStacks = existingPowerUp.stacks || 1;
            if (currentStacks >= maxStacks) {
                Logger.log(`Power-up ${type} has reached max stacks (${maxStacks})`);
                return false;
            }

            existingPowerUp.stacks = currentStacks + 1;
            if (effect.onStack) {
                effect.onStack(this.target, existingPowerUp.stacks);
            }
            
            if (config.duration && existingPowerUp.remainingTime !== undefined) {
                existingPowerUp.remainingTime = config.duration;
            }

            Logger.log(`Power-up ${type} stacked to ${existingPowerUp.stacks}`);
            return true;
        }

        const activePowerUp: ActivePowerUp = {
            type,
            config,
            stacks: 1,
            remainingTime: config.duration
        };

        this.activePowerUps.set(type, activePowerUp);
        effect.onApply(this.target);

        Logger.log(`Power-up ${type} applied`);
        return true;
    }

    /**
     * Remove a power-up
     */
    removePowerUp(type: PowerUpType): void {
        const powerUp = this.activePowerUps.get(type);
        if (!powerUp) return;

        const effect = this.effectHandlers.get(type);
        if (effect) {
            effect.onRemove(this.target);
        }

        this.activePowerUps.delete(type);
        Logger.log(`Power-up ${type} removed`);
    }

    /**
     * Update all active power-ups
     */
    update(deltaTime: number): void {
        const toRemove: PowerUpType[] = [];

        this.activePowerUps.forEach((powerUp, type) => {
            const effect = this.effectHandlers.get(type);
            
            if (powerUp.remainingTime !== undefined && !powerUp.config.permanent) {
                powerUp.remainingTime -= deltaTime * 1000;

                if (powerUp.remainingTime <= 0) {
                    toRemove.push(type);
                    return;
                }
            }
            
            if (effect?.onUpdate) {
                effect.onUpdate(this.target, deltaTime);
            }
        });

        toRemove.forEach(type => this.removePowerUp(type));
    }

    /**
     * Check if a power-up is active
     */
    hasPowerUp(type: PowerUpType): boolean {
        return this.activePowerUps.has(type);
    }

    /**
     * Get active power-up info
     */
    getPowerUp(type: PowerUpType): ActivePowerUp | undefined {
        return this.activePowerUps.get(type);
    }

    /**
     * Get all active power-ups
     */
    getActivePowerUps(): PowerUpType[] {
        return Array.from(this.activePowerUps.keys());
    }

    /**
     * Clear all power-ups
     */
    clearAll(): void {
        this.activePowerUps.forEach((_, type) => {
            const effect = this.effectHandlers.get(type);
            if (effect) {
                effect.onRemove(this.target);
            }
        });
        this.activePowerUps.clear();
    }

    /**
     * Get remaining time for a power-up
     */
    getRemainingTime(type: PowerUpType): number | undefined {
        const powerUp = this.activePowerUps.get(type);
        return powerUp?.remainingTime;
    }

    /**
     * Get stack count for a power-up
     */
    getStacks(type: PowerUpType): number {
        const powerUp = this.activePowerUps.get(type);
        return powerUp?.stacks || 0;
    }
}