/**
 * アセットローダー
 * スプライトデータの読み込みとキャッシュ管理を行う
 */
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
    
    /**
     * PixelArtRendererを設定
     * @param {PixelArtRenderer} renderer 
     */
    setRenderer(renderer) {
        this.renderer = renderer;
    }
    
    /**
     * 単一スプライトを読み込み
     * @param {string} category - スプライトカテゴリ
     * @param {string} name - スプライト名
     * @param {number} scale - 描画スケール
     * @returns {Promise<Object>} スプライトデータ
     */
    async loadSprite(category, name, scale = 4) {
        const key = `${category}/${name}`;
        
        // 既に読み込み済み
        if (this.loadedAssets.has(key)) {
            return this.loadedAssets.get(key);
        }
        
        // 読み込み中
        if (this.loadingPromises.has(key)) {
            return this.loadingPromises.get(key);
        }
        
        // 新規読み込み
        const loadPromise = this._loadSpriteInternal(category, name, scale);
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
    
    /**
     * アニメーションを読み込み
     * @param {string} category - カテゴリ
     * @param {string} baseName - ベース名（例: "player_walk"）
     * @param {number} frameCount - フレーム数
     * @param {number} scale - 描画スケール
     * @param {number} frameDuration - フレーム持続時間（ms）
     * @returns {Promise<Object>} アニメーションデータ
     */
    async loadAnimation(category, baseName, frameCount, scale = 4, frameDuration = 100) {
        const key = `${category}/${baseName}_anim`;
        
        if (this.loadedAssets.has(key)) {
            return this.loadedAssets.get(key);
        }
        
        if (this.loadingPromises.has(key)) {
            return this.loadingPromises.get(key);
        }
        
        const loadPromise = this._loadAnimationInternal(category, baseName, frameCount, scale, frameDuration);
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
    
    /**
     * ゲーム開始時に必要なアセットを一括読み込み
     * @param {Function} progressCallback - 進捗コールバック(loaded, total)
     * @returns {Promise<void>}
     */
    async preloadGameAssets(progressCallback) {
        const assetsToLoad = [
            // プレイヤー
            { type: 'sprite', category: 'player', name: 'idle' },
            { type: 'animation', category: 'player', baseName: 'walk', frameCount: 4 },
            { type: 'animation', category: 'player', baseName: 'jump', frameCount: 2 },
            
            // 敵
            { type: 'animation', category: 'enemies', baseName: 'slime', frameCount: 2 },
            
            // アイテム
            { type: 'animation', category: 'items', baseName: 'coin', frameCount: 4 },
            { type: 'sprite', category: 'items', name: 'spring' },
            
            // 地形
            { type: 'sprite', category: 'terrain', name: 'grass_block' },
            { type: 'sprite', category: 'terrain', name: 'dirt_block' },
            { type: 'sprite', category: 'terrain', name: 'stone_block' },
            
            // UI
            { type: 'sprite', category: 'ui', name: 'heart_full' },
            { type: 'sprite', category: 'ui', name: 'heart_empty' }
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
                    asset.scale || 4,
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
    
    /**
     * 内部的なスプライト読み込み処理
     */
    async _loadSpriteInternal(category, name, scale) {
        const spriteData = await this.spriteLoader.loadSprite(category, name);
        
        if (this.renderer) {
            // RendererにもスプライトをSpriteとして登録
            const paletteName = this._getPaletteForCategory(category);
            const colors = getColorPalette(paletteName);
            this.renderer.addSprite(
                `${category}/${name}`,
                spriteData.data,
                colors,
                scale
            );
        }
        
        return {
            ...spriteData,
            scale,
            key: `${category}/${name}`
        };
    }
    
    /**
     * 内部的なアニメーション読み込み処理
     */
    async _loadAnimationInternal(category, baseName, frameCount, scale, frameDuration) {
        const frames = [];
        
        for (let i = 1; i <= frameCount; i++) {
            const frameName = `${baseName}${i}`;
            const spriteData = await this.spriteLoader.loadSprite(category, frameName);
            frames.push(spriteData.data);
        }
        
        if (this.renderer) {
            // Rendererにアニメーションを登録
            const paletteName = this._getPaletteForCategory(category);
            const colors = getColorPalette(paletteName);
            this.renderer.addAnimation(
                `${category}/${baseName}`,
                frames,
                colors,
                scale,
                frameDuration
            );
        }
        
        return {
            baseName,
            frames,
            frameCount,
            frameDuration,
            scale,
            key: `${category}/${baseName}_anim`
        };
    }
    
    /**
     * カテゴリに応じたパレットを取得
     */
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
    
    /**
     * 読み込み進捗を取得
     * @returns {Object} { loaded, total, percentage }
     */
    getLoadingProgress() {
        return {
            loaded: this.loadedCount,
            total: this.totalAssets,
            percentage: this.totalAssets > 0 ? (this.loadedCount / this.totalAssets) * 100 : 0
        };
    }
    
    /**
     * 特定のアセットが読み込み済みか確認
     * @param {string} key - アセットキー
     * @returns {boolean}
     */
    isLoaded(key) {
        return this.loadedAssets.has(key);
    }
    
    /**
     * すべてのアセットをクリア
     */
    clear() {
        this.loadedAssets.clear();
        this.loadingPromises.clear();
        this.loadedCount = 0;
        this.totalAssets = 0;
    }
}