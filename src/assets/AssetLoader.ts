import { SpriteLoader } from '../utils/spriteLoader';
import { paletteSystem, STAGE_PALETTES } from '../utils/pixelArtPalette';
import { PixelArtRenderer } from '../utils/pixelArt';
import { ResourceLoader } from '../config/ResourceLoader';
import { Logger } from '../utils/Logger';
import { PixelRenderer } from '../rendering/PixelRenderer';

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

export type StageType = 'grassland' | 'cave' | 'snow';

/**
 * AssetLoader implementation
 */
export class AssetLoader {
    private spriteLoader: SpriteLoader;
    public loadedAssets: Map<string, LoadedAsset>;
    private loadingPromises: Map<string, Promise<LoadedAsset>>;
    private totalAssets: number;
    private loadedCount: number;
    public renderer?: PixelArtRenderer;
    private pixelRenderer?: PixelRenderer;
    private currentStageType: StageType = 'grassland';

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
    
    setPixelRenderer(pixelRenderer: PixelRenderer): void {
        this.pixelRenderer = pixelRenderer;
    }
    
    setStageType(stageType: StageType): void {
        this.currentStageType = stageType;
        paletteSystem.setStagePalette(paletteSystem.createStagePalette(STAGE_PALETTES[stageType]));
        Logger.log(`[AssetLoader] Stage type set to: ${stageType}`);
        
        if (this.pixelRenderer && this.pixelRenderer.setStageType) {
            this.pixelRenderer.setStageType(stageType);
        }
    }
    
    async loadSprite(category: string, name: string): Promise<LoadedAsset> {
        const key = `${category}/${name}`;
        
        const loadedAsset = this.loadedAssets.get(key);
        if (loadedAsset) {
            return loadedAsset;
        }
        
        const loadingPromise = this.loadingPromises.get(key);
        if (loadingPromise) {
            return loadingPromise;
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
        
        const loadedAsset = this.loadedAssets.get(key);
        if (loadedAsset) {
            return loadedAsset;
        }
        
        const loadingPromise = this.loadingPromises.get(key);
        if (loadingPromise) {
            return loadingPromise;
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
        const startTime = performance.now();
        Logger.log('[Performance] AssetLoader.preloadGameAssets() started:', startTime.toFixed(2) + 'ms');
        
        const resourceLoader = ResourceLoader.getInstance();
        await resourceLoader.initialize();
        
        const assetsToLoad = resourceLoader.getAllSpriteAssets();
        
        this.totalAssets = assetsToLoad.length;
        this.loadedCount = 0;
        Logger.log('[Performance] Total assets to preload:', this.totalAssets);
        
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
        
        const endTime = performance.now();
        Logger.log('[Performance] AssetLoader.preloadGameAssets() completed:', endTime.toFixed(2) + 'ms', '(took', (endTime - startTime).toFixed(2) + 'ms');
    }
    
    private async _loadSpriteInternal(category: string, name: string): Promise<LoadedAsset> {
        const startTime = performance.now();
        const spriteData = await this.spriteLoader.loadSprite(category, name);
        
        if (!spriteData || !spriteData.data) {
            throw new Error(`Failed to load sprite data for ${category}/${name}`);
        }
        
        const spriteKey = `${category}/${name}`;
        
        if (this.renderer) {
            this.renderer.addStageDependentSprite(spriteKey, spriteData.data);
            Logger.log(`[AssetLoader] Loaded sprite ${spriteKey} as stage-dependent for stage type: ${this.currentStageType}`);
            
            const endTime = performance.now();
            Logger.log(`[AssetLoader] Loaded sprite ${spriteKey} in ${(endTime - startTime).toFixed(2)}ms`);
        } else {
            Logger.warn(`[AssetLoader] Renderer not available when loading sprite ${spriteKey}`);
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
        
        const animKey = `${category}/${baseName}`;
        
        if (this.renderer) {
            this.renderer.addStageDependentAnimation(animKey, frames, frameDuration);
            Logger.log(`[AssetLoader] Loaded animation ${animKey} as stage-dependent for stage type: ${this.currentStageType}`);
            
            const endTime = performance.now();
            Logger.log(`[AssetLoader] Loaded animation ${animKey} (${frameCount} frames) in ${(endTime - startTime).toFixed(2)}ms`);
        } else {
            Logger.warn(`[AssetLoader] Renderer not available when loading animation ${animKey}`);
        }
        
        return {
            baseName,
            frames,
            frameCount,
            frameDuration,
            key: `${category}/${baseName}_anim`
        };
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