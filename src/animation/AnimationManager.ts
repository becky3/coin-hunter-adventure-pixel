import { PixelArtSprite, PixelArtAnimation } from '../utils/pixelArt';
import { Logger } from '../utils/Logger';

interface AnimationDefinition {
    frames: string[];
    duration: number;
    loop: boolean;
}

interface AnimationConfig {
    [animationName: string]: AnimationDefinition;
}

/**
 * Manages animations and static sprites in a unified way
 */
export class AnimationManager {
    private static instance: AnimationManager | null = null;
    private animations: Map<string, AnimationDefinition>;
    private spriteCache: Map<string, PixelArtSprite | PixelArtAnimation>;
    private pixelArtRenderer: { sprites: Map<string, PixelArtSprite>; animations: Map<string, PixelArtAnimation> } | null;

    private constructor() {
        this.animations = new Map();
        this.spriteCache = new Map();
        this.pixelArtRenderer = null;
    }

    static getInstance(): AnimationManager {
        if (!AnimationManager.instance) {
            AnimationManager.instance = new AnimationManager();
        }
        return AnimationManager.instance;
    }

    setPixelArtRenderer(renderer: { sprites: Map<string, PixelArtSprite>; animations: Map<string, PixelArtAnimation> }): void {
        this.pixelArtRenderer = renderer;
    }

    registerAnimation(key: string, definition: AnimationDefinition): void {
        this.animations.set(key, definition);
        Logger.log(`[AnimationManager] Registered animation: ${key}`);
    }

    registerAnimations(config: AnimationConfig): void {
        Object.entries(config).forEach(([key, definition]) => {
            this.registerAnimation(key, definition);
        });
    }

    getAnimation(key: string): PixelArtSprite | PixelArtAnimation | null {
        if (this.spriteCache.has(key)) {
            return this.spriteCache.get(key) || null;
        }

        const definition = this.animations.get(key);
        if (!definition) {
            Logger.warn(`[AnimationManager] Animation not found: ${key}`);
            return null;
        }

        if (!this.pixelArtRenderer) {
            Logger.error('[AnimationManager] PixelArtRenderer not set');
            return null;
        }

        let result: PixelArtSprite | PixelArtAnimation | null = null;

        if (definition.duration === 0 || definition.frames.length === 1) {
            const sprite = this.pixelArtRenderer.sprites.get(definition.frames[0]);
            if (sprite) {
                result = sprite;
            }
        } else {
            const animation = this.pixelArtRenderer.animations.get(key);
            if (animation) {
                result = animation;
            } else {
                const frameKeys = definition.frames;
                const allFramesExist = frameKeys.every(frameKey => 
                    this.pixelArtRenderer.sprites.has(frameKey) || 
                    this.pixelArtRenderer.animations.has(frameKey)
                );

                if (allFramesExist) {
                    Logger.log(`[AnimationManager] Creating animation ${key} from frames: ${frameKeys.join(', ')}`);
                } else {
                    Logger.warn(`[AnimationManager] Not all frames exist for animation ${key}`);
                }
            }
        }

        if (result) {
            this.spriteCache.set(key, result);
        }

        return result;
    }

    clearCache(): void {
        this.spriteCache.clear();
    }

    preloadAnimation(key: string): void {
        this.getAnimation(key);
    }

    preloadAllAnimations(): void {
        this.animations.forEach((_, key) => {
            this.preloadAnimation(key);
        });
    }
}