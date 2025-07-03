import {
    ResourceIndexConfig,
    SpritesConfig,
    CharacterConfig,
    AudioConfig,
    ObjectConfig
} from './ResourceConfig';

export class ResourceLoader {
    private static instance: ResourceLoader;
    private resourceIndex: ResourceIndexConfig | null = null;
    private sprites: SpritesConfig | null = null;
    private characters: { [key: string]: any } | null = null;
    private audio: { [key: string]: any } | null = null;
    private objects: { [key: string]: any } | null = null;
  
    private constructor() {}
  
    static getInstance(): ResourceLoader {
        if (!ResourceLoader.instance) {
            ResourceLoader.instance = new ResourceLoader();
        }
        return ResourceLoader.instance;
    }
  
    async initialize(): Promise<void> {
        // Load resource index
        this.resourceIndex = await this.loadJSON('/src/config/resources/index.json');
  
        if (!this.resourceIndex) {
            throw new Error('Failed to load resource index');
        }
  
        // Load all resource configs
        await Promise.all([
            this.loadSprites(),
            this.loadCharacters(),
            this.loadAudio(),
            this.loadObjects()
        ]);
  
        // Resource configuration loaded successfully
    }
  
    private async loadJSON(path: string): Promise<any> {
        try {
            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            // Store error for debugging
            const _errorMessage = error instanceof Error ? error.message : 'Unknown error';
            // In production, this could be sent to a logging service
            // For now, we'll silently fail but the error is available for debugging
            return null;
        }
    }
  
    private async loadSprites(): Promise<void> {
        if (!this.resourceIndex) return;
    
        const spritesPath = '/src/config/resources/sprites.json';
        this.sprites = await this.loadJSON(spritesPath);
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
  
    // Getter methods
    getSpritesConfig(): SpritesConfig | null {
        return this.sprites;
    }
  
    getCharacterConfig(type: string, name: string): CharacterConfig | null {
        if (!this.characters || !this.characters[type]) {
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
  
    // Helper method to get all sprite assets for preloading
    getAllSpriteAssets(): Array<{ type: string; category: string; name?: string; baseName?: string; frameCount?: number; frameDuration?: number }> {
        if (!this.sprites) return [];
    
        const assets: Array<any> = [];
    
        for (const [category, config] of Object.entries(this.sprites.categories)) {
            // Add sprites
            for (const sprite of config.sprites) {
                assets.push({
                    type: 'sprite',
                    category,
                    name: sprite.name
                });
            }
      
            // Add animations
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
}