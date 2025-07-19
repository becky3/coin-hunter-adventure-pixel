import { PixelArtRenderer } from '../utils/pixelArt';
import { AnimationResolver } from './AnimationResolver';
import { ANIMATION_PATTERNS } from '../config/animationDefinitions';
import { SpriteLoader } from '../utils/spriteLoader';
import { getColorPalette } from '../utils/pixelArtPalette';
import { getPaletteForCategory } from '../utils/paletteResolver';
import { Logger } from '../utils/Logger';

/**
 * Handles registration of animations in PixelArtRenderer based on AnimationManager definitions
 */
export class AnimationRegistrar {
    private spriteLoader: SpriteLoader;
    private resolver: AnimationResolver;

    constructor() {
        this.spriteLoader = new SpriteLoader();
        this.resolver = new AnimationResolver();
    }

    async registerAllAnimations(renderer: PixelArtRenderer): Promise<void> {
        const startTime = performance.now();
        const registeredAnimations: string[] = [];
        
        for (const [category, patterns] of Object.entries(ANIMATION_PATTERNS)) {
            for (const [name, pattern] of Object.entries(patterns)) {
                const key = `${category}/${name}`;
                
                try {
                    if (this.resolver.isStaticSprite(pattern)) {
                        continue;
                    }
                    
                    const resolved = this.resolver.resolvePattern(pattern);
                    const frames: number[][][] = [];
                    
                    for (const frameName of resolved.frames) {
                        const [frameCategory, ...nameParts] = frameName.split('/');
                        const frameSpriteName = nameParts.join('/');
                        const spriteData = await this.spriteLoader.loadSprite(frameCategory, frameSpriteName);
                        frames.push(spriteData.data);
                    }
                    
                    const paletteName = getPaletteForCategory(category, name);
                    const colors = getColorPalette(paletteName);
                    
                    renderer.addAnimation(key, frames, colors, resolved.duration);
                    registeredAnimations.push(key);
                } catch (error) {
                    Logger.error(`[AnimationRegistrar] Failed to register animation ${key}:`, error);
                }
            }
        }
        
        const endTime = performance.now();
        Logger.log(`[AnimationRegistrar] Registered ${registeredAnimations.length} animations in ${(endTime - startTime).toFixed(2)}ms`);
    }
}