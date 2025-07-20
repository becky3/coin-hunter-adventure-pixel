import { PixelRenderer } from '../rendering/PixelRenderer';
import { Logger } from '../utils/Logger';

interface AnimationStateConfig {
    [stateName: string]: string;
}

/**
 * Legacy sprite animation class - kept for fallback compatibility
 * All new code should use EntityAnimationManager instead
 */
export class AnimatedSprite {
    private states: AnimationStateConfig;
    private currentState: string;
    private entityType: string;

    constructor(entityType: string, states: AnimationStateConfig) {
        this.states = states;
        this.currentState = 'idle';
        this.entityType = entityType;
        
        Logger.warn(`[AnimatedSprite] Legacy fallback used for ${entityType}. Entity should implement getAnimationDefinitions() and getPaletteDefinition()`);
    }

    setState(state: string): void {
        if (this.currentState !== state && this.states[state]) {
            this.currentState = state;
        }
    }

    getState(): string {
        return this.currentState;
    }

    render(renderer: PixelRenderer, x: number, y: number, flipX: boolean = false): void {
        const screenPos = renderer.worldToScreen(x, y);
        renderer.drawRect(screenPos.x, screenPos.y, 16, 16, '#FF00FF');
        
        if (!flipX) {
            void 0;
        }
    }

    update(deltaTime: number): void {
        void deltaTime;
    }

    preload(): void {
        void 0;
    }

    hasState(state: string): boolean {
        return state in this.states;
    }

    getAnimationKey(): string | null {
        return this.states[this.currentState] || null;
    }
}