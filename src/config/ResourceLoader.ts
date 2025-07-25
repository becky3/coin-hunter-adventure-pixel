import {
    ResourceIndexConfig,
    SpritesConfig,
    CharacterConfig,
    AudioConfig,
    ObjectConfig
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
        
        this.resourceIndex = await this.loadJSON('/src/config/resources/index.json');
  
        if (!this.resourceIndex) {
            throw new Error('Failed to load resource index');
        }
  
        Logger.log('[Performance] Starting parallel resource loading:', performance.now().toFixed(2) + 'ms');
        await Promise.all([
            this.loadSprites(),
            this.loadCharacters(),
            this.loadAudio(),
            this.loadObjects(),
            this.loadMusicPatterns(),
            this.loadPhysics()
        ]);
        
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
}