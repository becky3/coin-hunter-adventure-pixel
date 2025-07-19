import { AnimationManager } from './AnimationManager';
import { PixelRenderer } from '../rendering/PixelRenderer';
import { Logger } from '../utils/Logger';

interface AnimationStateConfig {
    [stateName: string]: string;
}

/**
 * Manages sprite animations for entities
 */
export class AnimatedSprite {
    private animationManager: AnimationManager;
    private states: AnimationStateConfig;
    private currentState: string;
    private lastUpdateTime: number;
    private animationKey: string | null;
    private entityType: string;

    constructor(entityType: string, states: AnimationStateConfig) {
        this.animationManager = AnimationManager.getInstance();
        this.states = states;
        this.currentState = 'idle';
        this.lastUpdateTime = 0;
        this.animationKey = null;
        this.entityType = entityType;
        
        this.updateAnimationKey();
    }

    setState(state: string): void {
        if (this.currentState !== state && this.states[state]) {
            this.currentState = state;
            this.updateAnimationKey();
            Logger.log(`[AnimatedSprite] ${this.entityType} state changed to: ${state}`);
        }
    }

    getState(): string {
        return this.currentState;
    }

    private updateAnimationKey(): void {
        this.animationKey = this.states[this.currentState] || null;
    }

    render(renderer: PixelRenderer, x: number, y: number, flipX: boolean = false): void {
        if (!this.animationKey) {
            Logger.warn(`[AnimatedSprite] No animation key for state: ${this.currentState}`);
            return;
        }

        const animation = this.animationManager.getAnimation(this.animationKey);
        if (!animation) {
            Logger.warn(`[AnimatedSprite] Animation not found: ${this.animationKey}`);
            return;
        }

        const screenPos = renderer.worldToScreen(x, y);
        const currentTime = Date.now();

        if ('update' in animation) {
            animation.update(currentTime);
            animation.draw(
                renderer.ctx,
                screenPos.x,
                screenPos.y,
                flipX,
                renderer.scale
            );
        } else {
            animation.draw(
                renderer.ctx,
                screenPos.x,
                screenPos.y,
                flipX,
                renderer.scale
            );
        }

        this.lastUpdateTime = currentTime;
    }

    update(deltaTime: number): void {
        void deltaTime;
    }

    preload(): void {
        Object.values(this.states).forEach(animationKey => {
            this.animationManager.preloadAnimation(animationKey);
        });
    }

    hasState(state: string): boolean {
        return state in this.states;
    }

    getAnimationKey(): string | null {
        return this.animationKey;
    }
}