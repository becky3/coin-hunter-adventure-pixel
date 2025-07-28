import { PixelRenderer } from '../rendering/PixelRenderer';

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

    constructor(entityType: string, _states: AnimationStateConfig) {
        throw new Error(`[AnimatedSprite] Legacy fallback is not allowed. Entity '${entityType}' must implement getAnimationDefinitions() and getPaletteDefinition() methods. Fallback has been disabled per project requirements.`);
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
        renderer.drawRect(screenPos.x, screenPos.y, 16, 16, 0x21);
        
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