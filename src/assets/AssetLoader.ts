import { SpriteLoader } from '../utils/spriteLoader';
import { getColorPalette } from '../utils/pixelArtPalette';
import { PixelArtRenderer } from '../utils/pixelArt';
import { ResourceLoader } from '../config/ResourceLoader';

export interface LoadedAsset {
    key: string;
    baseName?: string;
    frames?: number[][][];
    frameCount?: number;
    frameDuration?: number;
    data?: number[][];
    width?: number;
    height?: number;
    imageData?: ImageData;
    canvas?: HTMLCanvasElement;
}

export interface AssetToLoad {
    type: 'sprite' | 'animation';
    category: string;
    name?: string;
    baseName?: string;
    frameCount?: number;
    frameDuration?: number;
}

export type ProgressCallback = (loaded: number, total: number) => void;

export class AssetLoader {
    private spriteLoader: SpriteLoader;
    public loadedAssets: Map<string, LoadedAsset>;
    private loadingPromises: Map<string, Promise<LoadedAsset>>;
    private totalAssets: number;
    private loadedCount: number;
    public renderer?: PixelArtRenderer;

    constructor() {
        this.spriteLoader = new SpriteLoader();
        this.loadedAssets = new Map();
        this.loadingPromises = new Map();
        this.totalAssets = 0;
        this.loadedCount = 0;
    }
    
    setRenderer(renderer: PixelArtRenderer): void {
        this.renderer = renderer;
    }
    
    async loadSprite(category: string, name: string): Promise<LoadedAsset> {
        const key = `${category}/${name}`;
        
        if (this.loadedAssets.has(key)) {
            return this.loadedAssets.get(key)!;
        }
        
        if (this.loadingPromises.has(key)) {
            return this.loadingPromises.get(key)!;
        }
        
        const loadPromise = this._loadSpriteInternal(category, name);
        this.loadingPromises.set(key, loadPromise);
        
        try {
            const result = await loadPromise;
            this.loadedAssets.set(key, result);
            this.loadingPromises.delete(key);
            this.loadedCount++;
            return result;
        } catch (error) {
            this.loadingPromises.delete(key);
            throw error;
        }
    }
    
    async loadAnimation(category: string, baseName: string, frameCount: number, frameDuration: number = 100): Promise<LoadedAsset> {
        const key = `${category}/${baseName}_anim`;
        
        if (this.loadedAssets.has(key)) {
            return this.loadedAssets.get(key)!;
        }
        
        if (this.loadingPromises.has(key)) {
            return this.loadingPromises.get(key)!;
        }
        
        const loadPromise = this._loadAnimationInternal(category, baseName, frameCount, frameDuration);
        this.loadingPromises.set(key, loadPromise);
        
        try {
            const result = await loadPromise;
            this.loadedAssets.set(key, result);
            this.loadingPromises.delete(key);
            return result;
        } catch (error) {
            this.loadingPromises.delete(key);
            throw error;
        }
    }
    
    async preloadGameAssets(progressCallback?: ProgressCallback): Promise<void> {
        // Initialize ResourceLoader
        const resourceLoader = ResourceLoader.getInstance();
        await resourceLoader.initialize();
        
        // Get all sprite assets from configuration
        const assetsToLoad = resourceLoader.getAllSpriteAssets();
        
        this.totalAssets = assetsToLoad.length;
        this.loadedCount = 0;
        
        const loadPromises = assetsToLoad.map(asset => {
            if (asset.type === 'sprite' && asset.name) {
                return this.loadSprite(asset.category, asset.name).then(() => {
                    if (progressCallback) {
                        progressCallback(this.loadedCount, this.totalAssets);
                    }
                });
            } else if (asset.type === 'animation' && asset.baseName && asset.frameCount) {
                return this.loadAnimation(
                    asset.category, 
                    asset.baseName, 
                    asset.frameCount,
                    asset.frameDuration || 100
                ).then(() => {
                    if (progressCallback) {
                        progressCallback(this.loadedCount, this.totalAssets);
                    }
                });
            }
            return Promise.resolve();
        });
        
        await Promise.all(loadPromises);
    }
    
    private async _loadSpriteInternal(category: string, name: string): Promise<LoadedAsset> {
        const startTime = performance.now();
        const spriteData = await this.spriteLoader.loadSprite(category, name);
        
        if (this.renderer) {
            const paletteName = this._getPaletteForCategory(category);
            const colors = getColorPalette(paletteName);
            const spriteKey = `${category}/${name}`;
            this.renderer.addSprite(
                spriteKey,
                spriteData.data,
                colors
            );
            // Sprite loaded and added to renderer
            const endTime = performance.now();
            console.log(`[AssetLoader] Loaded sprite ${spriteKey} in ${(endTime - startTime).toFixed(2)}ms`);
        } else {
            // Renderer not set when loading sprite
        }
        
        return {
            ...spriteData,
            key: `${category}/${name}`
        };
    }
    
    private async _loadAnimationInternal(category: string, baseName: string, frameCount: number, frameDuration: number): Promise<LoadedAsset> {
        const startTime = performance.now();
        const frames: number[][][] = [];
        
        for (let i = 1; i <= frameCount; i++) {
            const frameName = `${baseName}${i}`;
            const spriteData = await this.spriteLoader.loadSprite(category, frameName);
            frames.push(spriteData.data);
        }
        
        if (this.renderer) {
            const paletteName = this._getPaletteForCategory(category);
            const colors = getColorPalette(paletteName);
            const animKey = `${category}/${baseName}`;
            this.renderer.addAnimation(
                animKey,
                frames,
                colors,
                frameDuration
            );
            // Animation loaded and added to renderer
            const endTime = performance.now();
            console.log(`[AssetLoader] Loaded animation ${animKey} (${frameCount} frames) in ${(endTime - startTime).toFixed(2)}ms`);
        } else {
            // Renderer not set when loading animation
        }
        
        return {
            baseName,
            frames,
            frameCount,
            frameDuration,
            key: `${category}/${baseName}_anim`
        };
    }
    
    private _getPaletteForCategory(category: string): string {
        const paletteMap: { [key: string]: string } = {
            'player': 'character',
            'enemies': 'enemy',
            'items': 'items',
            'terrain': 'grassland',
            'ui': 'ui'
        };
        
        return paletteMap[category] || 'grassland';
    }
    
    getLoadingProgress(): { loaded: number; total: number; percentage: number } {
        return {
            loaded: this.loadedCount,
            total: this.totalAssets,
            percentage: this.totalAssets > 0 ? (this.loadedCount / this.totalAssets) * 100 : 0
        };
    }
    
    isLoaded(key: string): boolean {
        return this.loadedAssets.has(key);
    }
    
    hasSprite(key: string): boolean {
        return this.loadedAssets.has(key);
    }
    
    clear(): void {
        this.loadedAssets.clear();
        this.loadingPromises.clear();
        this.loadedCount = 0;
        this.totalAssets = 0;
    }
}