import { SpriteLoader } from '../utils/spriteLoader.js';
import { getColorPalette } from '../utils/pixelArtPalette.js';

export class AssetLoader {
    constructor() {
        this.spriteLoader = new SpriteLoader();
        this.loadedAssets = new Map();
        this.loadingPromises = new Map();
        this.totalAssets = 0;
        this.loadedCount = 0;
    }
    
    setRenderer(renderer) {
        this.renderer = renderer;
    }
    
    async loadSprite(category, name) {
        const key = `${category}/${name}`;
        
        if (this.loadedAssets.has(key)) {
            return this.loadedAssets.get(key);
        }
        
        if (this.loadingPromises.has(key)) {
            return this.loadingPromises.get(key);
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
    
    async loadAnimation(category, baseName, frameCount, frameDuration = 100) {
        const key = `${category}/${baseName}_anim`;
        
        if (this.loadedAssets.has(key)) {
            return this.loadedAssets.get(key);
        }
        
        if (this.loadingPromises.has(key)) {
            return this.loadingPromises.get(key);
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
    
    async preloadGameAssets(progressCallback) {
        const assetsToLoad = [
            { type: 'sprite', category: 'player', name: 'idle' },
            { type: 'animation', category: 'player', baseName: 'walk', frameCount: 4 },
            { type: 'animation', category: 'player', baseName: 'jump', frameCount: 2 },
            
            { type: 'animation', category: 'items', baseName: 'coin_spin', frameCount: 4, frameDuration: 200 },
            
            { type: 'sprite', category: 'terrain', name: 'spring' },
            { type: 'sprite', category: 'terrain', name: 'goal_flag' },
            
            // { type: 'animation', category: 'enemies', baseName: 'slime', frameCount: 2 },
            // { type: 'sprite', category: 'terrain', name: 'grass_block' },
            // { type: 'sprite', category: 'terrain', name: 'dirt_block' },
            // { type: 'sprite', category: 'terrain', name: 'stone_block' },
            // { type: 'sprite', category: 'ui', name: 'heart_full' },
            // { type: 'sprite', category: 'ui', name: 'heart_empty' }
        ];
        
        this.totalAssets = assetsToLoad.length;
        this.loadedCount = 0;
        
        const loadPromises = assetsToLoad.map(asset => {
            if (asset.type === 'sprite') {
                return this.loadSprite(asset.category, asset.name).then(() => {
                    if (progressCallback) {
                        progressCallback(this.loadedCount, this.totalAssets);
                    }
                });
            } else if (asset.type === 'animation') {
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
        });
        
        await Promise.all(loadPromises);
    }
    
    async _loadSpriteInternal(category, name) {
        const spriteData = await this.spriteLoader.loadSprite(category, name);
        
        if (this.renderer) {
            const paletteName = this._getPaletteForCategory(category);
            const colors = getColorPalette(paletteName);
            this.renderer.addSprite(
                `${category}/${name}`,
                spriteData.data,
                colors
            );
        }
        
        return {
            ...spriteData,
            key: `${category}/${name}`
        };
    }
    
    async _loadAnimationInternal(category, baseName, frameCount, frameDuration) {
        const frames = [];
        
        for (let i = 1; i <= frameCount; i++) {
            const frameName = `${baseName}${i}`;
            const spriteData = await this.spriteLoader.loadSprite(category, frameName);
            frames.push(spriteData.data);
        }
        
        if (this.renderer) {
            const paletteName = this._getPaletteForCategory(category);
            const colors = getColorPalette(paletteName);
            this.renderer.addAnimation(
                `${category}/${baseName}`,
                frames,
                colors,
                frameDuration
            );
        }
        
        return {
            baseName,
            frames,
            frameCount,
            frameDuration,
            key: `${category}/${baseName}_anim`
        };
    }
    
    _getPaletteForCategory(category) {
        const paletteMap = {
            'player': 'character',
            'enemies': 'enemy',
            'items': 'items',
            'terrain': 'grassland',
            'ui': 'ui'
        };
        
        return paletteMap[category] || 'grassland';
    }
    
    getLoadingProgress() {
        return {
            loaded: this.loadedCount,
            total: this.totalAssets,
            percentage: this.totalAssets > 0 ? (this.loadedCount / this.totalAssets) * 100 : 0
        };
    }
    
    isLoaded(key) {
        return this.loadedAssets.has(key);
    }
    
    hasSprite(key) {
        return this.loadedAssets.has(key);
    }
    
    clear() {
        this.loadedAssets.clear();
        this.loadingPromises.clear();
        this.loadedCount = 0;
        this.totalAssets = 0;
    }
}