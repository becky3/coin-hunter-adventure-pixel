import { PixelArtSprite, PixelArtAnimation } from '../utils/pixelArt';
import { Logger } from '../utils/Logger';
import { AnimationResolver, AnimationPattern } from './AnimationResolver';

interface AnimationDefinition {
    frames: string[];
    duration: number;
    loop: boolean;
}

/**
 * Manages animations and static sprites in a unified way
 */
export class AnimationManager {
    private static instance: AnimationManager | null = null;
    private animations: Map<string, AnimationDefinition>;
    private animationPatterns: Map<string, AnimationPattern>;
    private spriteCache: Map<string, PixelArtSprite | PixelArtAnimation>;
    private pixelArtRenderer: { sprites: Map<string, PixelArtSprite>; animations: Map<string, PixelArtAnimation> } | null;
    private resolver: AnimationResolver;

    private constructor() {
        this.animations = new Map();
        this.animationPatterns = new Map();
        this.spriteCache = new Map();
        this.pixelArtRenderer = null;
        this.resolver = new AnimationResolver();
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

    registerAnimationPattern(key: string, pattern: AnimationPattern): void {
        this.animationPatterns.set(key, pattern);
        const resolved = this.resolver.resolvePattern(pattern);
        this.registerAnimation(key, resolved);
        Logger.log(`[AnimationManager] Registered animation pattern: ${key}`);
    }

    getAnimation(key: string): PixelArtSprite | PixelArtAnimation | null {
        if (this.spriteCache.has(key)) {
            return this.spriteCache.get(key) || null;
        }

        const definition = this.animations.get(key);
        if (!definition) {
            const error = new Error(`[AnimationManager] Animation not found: ${key}`);
            Logger.error(error.message);
            throw error;
        }

        if (!this.pixelArtRenderer) {
            Logger.error('[AnimationManager] PixelArtRenderer not set');
            return null;
        }

        let result: PixelArtSprite | PixelArtAnimation | null = null;
        const pattern = this.animationPatterns.get(key);

        if (pattern && this.resolver.isStaticSprite(pattern)) {
            const sprite = this.pixelArtRenderer.sprites.get(definition.frames[0]);
            if (sprite) {
                result = sprite;
            } else {
                const error = new Error(`[AnimationManager] Critical: Sprite not found: ${definition.frames[0]}`);
                Logger.error(error.message);
                throw error;
            }
        } else {
            const animation = this.pixelArtRenderer.animations.get(key);
            if (animation) {
                result = animation;
            } else {
                const frameKeys = definition.frames;
                const missingFrames = frameKeys.filter(frameKey => 
                    !this.pixelArtRenderer.sprites.has(frameKey)
                );
                
                if (missingFrames.length > 0) {
                    const error = new Error(`[AnimationManager] Critical: Missing frames for animation ${key}: ${missingFrames.join(', ')}`);
                    Logger.error(error.message);
                    throw error;
                }
                
                const error = new Error(`[AnimationManager] Critical: Animation not found in renderer: ${key}`);
                Logger.error(error.message);
                throw error;
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
        const pattern = this.animationPatterns.get(key);
        if (pattern && pattern.customFrames) {
            Logger.log(`[AnimationManager] Skipping preload for ${key} (uses customFrames)`);
            return;
        }
        this.getAnimation(key);
    }

    preloadAllAnimations(): void {
        this.animations.forEach((_, key) => {
            this.preloadAnimation(key);
        });
    }
}