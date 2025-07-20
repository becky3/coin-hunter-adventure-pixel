import type { PixelRenderer } from '../rendering/PixelRenderer';
import type { 
    AnimationDefinition, 
    EntityPaletteDefinition, 
    ProcessedAnimation, 
    SpriteData,
    FourColorPalette
} from '../types/animationTypes';
import { MasterPalette } from '../rendering/MasterPalette';
import { AssetLoader } from '../core/AssetLoader';

/**
 * Manages animations and palettes for individual entities
 */
export class EntityAnimationManager {
    private animations: Map<string, ProcessedAnimation> = new Map();
    private palette: EntityPaletteDefinition;
    private currentState: string = 'idle';
    private currentVariant: string = 'default';
    private lastUpdateTime: number = 0;

    constructor(
        definitions: AnimationDefinition[], 
        palette: EntityPaletteDefinition
    ) {
        this.palette = palette;
        this.loadAnimations(definitions);
    }

    /**
     * Load and process animation definitions
     */
    private async loadAnimations(definitions: AnimationDefinition[]): Promise<void> {
        for (const def of definitions) {
            const frames: SpriteData[] = [];
            
            for (const spritePath of def.sprites) {
                const spriteData = await this.loadSprite(spritePath);
                if (spriteData) {
                    frames.push(spriteData);
                }
            }

            this.animations.set(def.id, {
                id: def.id,
                frames,
                frameDuration: def.frameDuration,
                loop: def.loop,
                currentFrame: 0,
                elapsedTime: 0
            });
        }
    }

    /**
     * Load a sprite from file
     */
    private async loadSprite(path: string): Promise<SpriteData | null> {
        try {
            const assetLoader = AssetLoader.getInstance();
            const sprite = await assetLoader.loadSprite(path);
            
            return {
                width: sprite.width,
                height: sprite.height,
                data: sprite.data
            };
        } catch (error) {
            console.error(`Failed to load sprite: ${path}`, error);
            return null;
        }
    }

    /**
     * Set the current animation state
     */
    setState(state: string): void {
        if (this.animations.has(state) && this.currentState !== state) {
            this.currentState = state;
            const animation = this.animations.get(state);
            if (animation) {
                animation.currentFrame = 0;
                animation.elapsedTime = 0;
            }
        }
    }

    /**
     * Set the palette variant (e.g., 'powerGlove')
     */
    setPaletteVariant(variant: string): void {
        if (variant === 'default' || (this.palette.variants && variant in this.palette.variants)) {
            this.currentVariant = variant;
        }
    }

    /**
     * Update animation frame based on time
     */
    update(deltaTime: number): void {
        const animation = this.animations.get(this.currentState);
        if (!animation) return;

        animation.elapsedTime += deltaTime;

        if (animation.frameDuration > 0 && animation.frames.length > 1) {
            const frameTime = animation.elapsedTime % (animation.frameDuration * animation.frames.length);
            animation.currentFrame = Math.floor(frameTime / animation.frameDuration);

            if (!animation.loop && animation.currentFrame >= animation.frames.length - 1) {
                animation.currentFrame = animation.frames.length - 1;
            }
        }
    }

    /**
     * Render the current animation frame with palette
     */
    render(renderer: PixelRenderer, x: number, y: number, flipX: boolean = false): void {
        const animation = this.animations.get(this.currentState);
        if (!animation || animation.frames.length === 0) return;

        const frame = animation.frames[animation.currentFrame];
        if (!frame) return;

        const activePalette = this.getActivePalette();
        this.renderSpriteWithPalette(renderer, frame, x, y, activePalette, flipX);
    }

    /**
     * Get the currently active palette
     */
    private getActivePalette(): FourColorPalette {
        if (this.currentVariant === 'default') {
            return this.palette.default;
        }
        return this.palette.variants?.[this.currentVariant] || this.palette.default;
    }

    /**
     * Render a sprite with the given palette
     */
    private renderSpriteWithPalette(
        renderer: PixelRenderer, 
        sprite: SpriteData, 
        x: number, 
        y: number, 
        palette: FourColorPalette,
        flipX: boolean
    ): void {
        for (let py = 0; py < sprite.height; py++) {
            for (let px = 0; px < sprite.width; px++) {
                const colorIndex = sprite.data[py][px];
                
                if (colorIndex === 0) continue;
                
                const masterIndex = palette.colors[colorIndex];
                if (masterIndex === null) continue;
                
                const color = MasterPalette.getColor(masterIndex);
                
                const drawX = flipX ? x + sprite.width - px - 1 : x + px;
                renderer.drawPixel(drawX, y + py, color);
            }
        }
    }

    /**
     * Get current animation state
     */
    getCurrentState(): string {
        return this.currentState;
    }

    /**
     * Check if an animation state exists
     */
    hasState(state: string): boolean {
        return this.animations.has(state);
    }
}