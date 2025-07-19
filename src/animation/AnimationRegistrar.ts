import { PixelArtRenderer } from '../utils/pixelArt';
import { AnimationResolver } from './AnimationResolver';
import { ANIMATION_PATTERNS } from '../config/animationDefinitions';
import { SpriteLoader } from '../utils/spriteLoader';
import { getColorPalette } from '../utils/pixelArtPalette';
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
                    
                    const paletteName = this.getPaletteForCategory(category, name);
                    const colors = getColorPalette(paletteName);
                    
                    renderer.addAnimation(key, frames, colors, resolved.duration);
                    Logger.log(`[AnimationRegistrar] Registered animation: ${key}`);
                } catch (error) {
                    Logger.error(`[AnimationRegistrar] Failed to register animation ${key}:`, error);
                }
            }
        }
        
        const endTime = performance.now();
        Logger.log(`[AnimationRegistrar] All animations registered in ${(endTime - startTime).toFixed(2)}ms`);
    }

    private getPaletteForCategory(category: string, spriteName?: string): string {
        if (category === 'environment' && spriteName) {
            if (spriteName.includes('cloud')) {
                return 'sky';
            }
            if (spriteName.includes('tree') || spriteName.includes('grass')) {
                return 'nature';
            }
            return 'stage';
        }
        
        if (category === 'tiles') {
            return 'terrain';
        }
        
        if (category === 'terrain') {
            return 'terrain';
        }
        
        if (category === 'player') {
            return 'player';
        }
        
        if (category === 'enemies') {
            return 'enemy';
        }
        
        if (category === 'items' || category === 'objects') {
            return 'item';
        }
        
        if (category === 'ui') {
            return 'ui';
        }
        
        if (category === 'powerups') {
            return 'item';
        }
        
        if (category === 'projectiles' || category === 'effects') {
            return 'effect';
        }
        
        return 'stage';
    }
}