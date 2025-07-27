import {
    ResourceIndexConfig,
    SpritesConfig,
    CharacterConfig,
    AudioConfig,
    ObjectConfig,
    EntityConfig,
    PlayerConfig,
    EnemyConfig,
    ItemConfig
} from './ResourceConfig';
import { MusicPatternConfig, MusicConfig } from './MusicPatternConfig';
import { bundledResourceData, bundledMusicData } from '../data/bundledData';
import { Logger } from '../utils/Logger';

/**
 * ResourceLoader implementation
 */
export class ResourceLoader {
    private static instance: ResourceLoader;
    private resourceIndex: ResourceIndexConfig | null = null;
    private sprites: SpritesConfig | null = null;
    private characters: { [key: string]: { [key: string]: CharacterConfig } } | null = null;
    private audio: { [key: string]: { [key: string]: AudioConfig } } | null = null;
    private objects: { [key: string]: { [key: string]: ObjectConfig } } | null = null;
    private musicPatterns: MusicPatternConfig | null = null;
    private physics: { [key: string]: unknown } | null = null;
    private entityConfigCache: Map<string, EntityConfig> = new Map();
  
    private constructor() {}
  
    static getInstance(): ResourceLoader {
        if (!ResourceLoader.instance) {
            ResourceLoader.instance = new ResourceLoader();
        }
        return ResourceLoader.instance;
    }
  
    async initialize(): Promise<void> {
        const startTime = performance.now();
        Logger.log('[Performance] ResourceLoader.initialize() started:', startTime.toFixed(2) + 'ms');
        
        const recordPhase = (name: string, start: number, end: number): void => {
            const duration = end - start;
            if ((window as unknown as { performanceMetrics?: { phases: Array<{ name: string; start: number; end: number; duration: number }> } }).performanceMetrics) {
                (window as unknown as { performanceMetrics: { phases: Array<{ name: string; start: number; end: number; duration: number }> } }).performanceMetrics.phases.push({ 
                    name: `ResourceLoader.${name}`, 
                    start, 
                    end, 
                    duration 
                });
            }
            Logger.log(`[Performance] ResourceLoader.${name}: ${duration.toFixed(2)}ms`);
        };
        
        const indexStartTime = performance.now();
        this.resourceIndex = await this.loadJSON('/src/config/resources/index.json');
        const indexEndTime = performance.now();
        recordPhase('loadIndex', indexStartTime, indexEndTime);
  
        if (!this.resourceIndex) {
            throw new Error('Failed to load resource index');
        }
  
        Logger.log('[Performance] Starting parallel resource loading:', performance.now().toFixed(2) + 'ms');
        const parallelStartTime = performance.now();
        
        const loadingPromises = [
            (() => {
                const startTime = performance.now();
                return this.loadSprites().then(() => {
                    const endTime = performance.now();
                    recordPhase('loadSprites', startTime, endTime);
                });
            })(),
            (() => {
                const startTime = performance.now();
                return this.loadCharacters().then(() => {
                    const endTime = performance.now();
                    recordPhase('loadCharacters', startTime, endTime);
                });
            })(),
            (() => {
                const startTime = performance.now();
                return this.loadAudio().then(() => {
                    const endTime = performance.now();
                    recordPhase('loadAudio', startTime, endTime);
                });
            })(),
            (() => {
                const startTime = performance.now();
                return this.loadObjects().then(() => {
                    const endTime = performance.now();
                    recordPhase('loadObjects', startTime, endTime);
                });
            })(),
            (() => {
                const startTime = performance.now();
                return this.loadMusicPatterns().then(() => {
                    const endTime = performance.now();
                    recordPhase('loadMusicPatterns', startTime, endTime);
                });
            })(),
            (() => {
                const startTime = performance.now();
                return this.loadPhysics().then(() => {
                    const endTime = performance.now();
                    recordPhase('loadPhysics', startTime, endTime);
                });
            })()
        ];
        
        await Promise.all(loadingPromises);
        const parallelEndTime = performance.now();
        recordPhase('parallelLoading', parallelStartTime, parallelEndTime);
        
        const preloadStartTime = performance.now();
        await this.preloadEntityConfigs();
        const preloadEndTime = performance.now();
        recordPhase('preloadEntityConfigs', preloadStartTime, preloadEndTime);
        
        const endTime = performance.now();
        Logger.log('[Performance] ResourceLoader.initialize() completed:', endTime.toFixed(2) + 'ms', '(took', (endTime - startTime).toFixed(2) + 'ms)');
  
    }
  
    private async loadJSON<T = unknown>(path: string): Promise<T | null> {
        const allBundled = { ...bundledResourceData, ...bundledMusicData };
        if (allBundled[path]) {
            Logger.log(`[ResourceLoader] Using bundled data for: ${path}`);
            return allBundled[path];
        }
        
        try {
            const startTime = performance.now();
            const response = await fetch(path);
            const fetchTime = performance.now() - startTime;
            Logger.log(`[ResourceLoader] Fetched ${path} in ${fetchTime.toFixed(2)}ms`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json() as T;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            Logger.error(`Failed to load resource: ${path}`, errorMessage);
            return null;
        }
    }
  
    private async loadSprites(): Promise<void> {
        if (!this.resourceIndex) return;
    
        const spritesPath = '/src/config/resources/sprites.json';
        const startTime = performance.now();
        this.sprites = await this.loadJSON(spritesPath);
        Logger.log('[Performance] loadSprites completed in', (performance.now() - startTime).toFixed(2) + 'ms');
    }
  
    private async loadCharacters(): Promise<void> {
        if (!this.resourceIndex) return;
    
        const charactersPath = '/src/config/resources/characters.json';
        this.characters = await this.loadJSON(charactersPath);
    }
  
    private async loadAudio(): Promise<void> {
        if (!this.resourceIndex) return;
    
        const audioPath = '/src/config/resources/audio.json';
        this.audio = await this.loadJSON(audioPath);
    }
  
    private async loadObjects(): Promise<void> {
        if (!this.resourceIndex) return;
    
        const objectsPath = '/src/config/resources/objects.json';
        this.objects = await this.loadJSON(objectsPath);
    }
    
    private async loadMusicPatterns(): Promise<void> {
        if (!this.resourceIndex) return;
        
        const bgmFiles = ['title', 'game', 'victory', 'gameover'];
        const seFiles = ['coin', 'jump', 'damage', 'button', 'powerup', 'gameStart', 'goal', 'enemyDefeat', 'projectile'];
        
        this.musicPatterns = {
            bgm: {},
            se: {}
        };
        
        for (const file of bgmFiles) {
            const bgmPath = `/src/config/resources/bgm/${file}.json`;
            const bgmData = await this.loadJSON(bgmPath);
            if (bgmData) {
                this.musicPatterns.bgm[file] = bgmData;
            }
        }
        
        for (const file of seFiles) {
            const sePath = `/src/config/resources/se/${file}.json`;
            const seData = await this.loadJSON(sePath);
            if (seData) {
                this.musicPatterns.se[file] = seData;
            }
        }
    }
    
    private async loadPhysics(): Promise<void> {
        if (!this.resourceIndex) return;
        
        const physicsPath = '/src/config/resources/physics.json';
        this.physics = await this.loadJSON(physicsPath);
    }
  
    getSpritesConfig(): SpritesConfig | null {
        return this.sprites;
    }
  
    getCharacterConfig(type: string, name: string): CharacterConfig | null {
        if (!this.characters) {
            return null;
        }
        
        if (type === 'player' && name === 'main') {
            return (this.characters as Record<string, CharacterConfig>).player || null;
        }
        if (!this.characters[type]) {
            return null;
        }
        return this.characters[type][name] || null;
    }
  
    getAudioConfig(type: string, name: string): AudioConfig | null {
        if (!this.audio || !this.audio[type]) {
            return null;
        }
        return this.audio[type][name] || null;
    }
  
    getObjectConfig(type: string, name: string): ObjectConfig | null {
        if (!this.objects || !this.objects[type]) {
            return null;
        }
        return this.objects[type][name] || null;
    }
  
    getResourcePaths(): { sprites: string; levels: string; fonts: string } | null {
        return this.resourceIndex?.paths || null;
    }
  
    getSettings(): { defaultPalette: string; pixelSize: number; tileSize: number } | null {
        return this.resourceIndex?.settings || null;
    }
  
    getAllSpriteAssets(): Array<{ type: string; category: string; name?: string; baseName?: string; frameCount?: number; frameDuration?: number }> {
        if (!this.sprites) return [];
    
        type AssetType = { type: string; category: string; name?: string; baseName?: string; frameCount?: number; frameDuration?: number };
        const assets: Array<AssetType> = [];
    
        for (const [category, config] of Object.entries(this.sprites.categories)) {
            for (const sprite of config.sprites) {
                assets.push({
                    type: 'sprite',
                    category,
                    name: sprite.name
                });
            }
      
            for (const animation of config.animations) {
                assets.push({
                    type: 'animation',
                    category,
                    baseName: animation.name,
                    frameCount: animation.frameCount,
                    frameDuration: animation.frameDuration
                });
            }
        }
    
        return assets;
    }
    
    getMusicPattern(type: 'bgm' | 'se', name: string): MusicConfig | null {
        if (!this.musicPatterns || !this.musicPatterns[type]) {
            return null;
        }
        return this.musicPatterns[type][name] || null;
    }
    
    getAllMusicPatterns(): MusicPatternConfig | null {
        return this.musicPatterns;
    }
    
    getPhysicsConfig(category?: string): unknown {
        if (!this.physics) return null;
        if (category) {
            return this.physics[category] || null;
        }
        return this.physics;
    }
    
    async getEntityConfig(type: string, name?: string): Promise<EntityConfig> {
        const cacheKey = name ? `${type}/${name}` : type;
        
        if (this.entityConfigCache.has(cacheKey)) {
            const config = this.entityConfigCache.get(cacheKey);
            if (!config) {
                throw new Error(`Entity config not found in cache: ${cacheKey}`);
            }
            return config;
        }
        
        const path = name 
            ? `/src/config/entities/${type}/${name}.json`
            : `/src/config/entities/${type}.json`;
            
        const config = await this.loadJSON<EntityConfig>(path);
        
        if (!config) {
            throw new Error(`Failed to load entity config: ${path}`);
        }
        
        this.entityConfigCache.set(cacheKey, config);
        return config;
    }
    
    getEntityConfigSync(type: 'player'): PlayerConfig;
    getEntityConfigSync(type: 'enemies', name: string): EnemyConfig;
    getEntityConfigSync(type: 'items' | 'terrain' | 'powerups', name: string): ItemConfig;
    getEntityConfigSync(type: string, name?: string): EntityConfig {
        const cacheKey = name ? `${type}/${name}` : type;
        
        if (!this.entityConfigCache.has(cacheKey)) {
            throw new Error(`Entity config not loaded yet: ${cacheKey}. Call preloadEntityConfigs() first.`);
        }
        
        const config = this.entityConfigCache.get(cacheKey);
        if (!config) {
            throw new Error(`Entity config not found: ${cacheKey}`);
        }
        
        return config;
    }
    
    async preloadEntityConfigs(): Promise<void> {
        const entities = [
            { type: 'player' },
            { type: 'enemies', name: 'slime' },
            { type: 'enemies', name: 'bat' },
            { type: 'enemies', name: 'spider' },
            { type: 'enemies', name: 'armor_knight' },
            { type: 'items', name: 'coin' },
            { type: 'terrain', name: 'spring' },
            { type: 'terrain', name: 'goal_flag' },
            { type: 'terrain', name: 'falling_floor' },
            { type: 'powerups', name: 'power_glove' },
            { type: 'powerups', name: 'shield_stone' }
        ];
        
        await Promise.all(
            entities.map(({ type, name }) => this.getEntityConfig(type, name))
        );
    }
}