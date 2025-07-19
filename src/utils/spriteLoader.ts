import { spriteDataMap } from '../assets/sprites/spriteData';
import { Logger } from './Logger';

interface SpriteData {
    name?: string;
    width: number;
    height: number;
    rows?: number;
    data: number[][];
    frames?: {
        [key: string]: {
            width: number;
            height: number;
            data: any;
        };
    };
    palette?: any;
}

interface SpriteConfig {
    category: string;
    name: string;
}

interface LoadedSprite {
    key: string;
    data: SpriteData;
}

/**
 * SpriteLoader implementation
 */
class SpriteLoader {
    private cache: Map<string, SpriteData>;
    private basePath: string;
    private useBundledData: boolean = true;

    constructor() {
        this.cache = new Map();
        this.basePath = '/src/assets/sprites/';
    }

    async loadSprite(category: string, name: string): Promise<SpriteData> {
        const key = `${category}/${name}`;
        
        const cachedSprite = this.cache.get(key);
        if (cachedSprite) {
            return cachedSprite;
        }

        if (this.useBundledData && spriteDataMap[key]) {
            Logger.log(`[SpriteLoader] Using bundled data for: ${key}`);
            const data = spriteDataMap[key] as SpriteData;
            
            // Check for multi-frame format (like armor_knight.json)
            if (data && data.frames && !data.data) {
                Logger.log(`[SpriteLoader] Detected multi-frame format for ${key}`);
                // Multi-frame format: use the idle frame as default
                const defaultFrame = data.frames.idle || Object.values(data.frames)[0];
                if (defaultFrame && defaultFrame.data) {
                    Logger.log(`[SpriteLoader] Using frame: ${data.frames.idle ? 'idle' : 'first available'}`);
                    
                    // Convert string array to number array if needed
                    let pixelData: number[][];
                    if (typeof defaultFrame.data[0] === 'string') {
                        Logger.log(`[SpriteLoader] Converting string pixel data to number array`);
                        pixelData = (defaultFrame.data as string[]).map(row => 
                            row.split('').map(char => parseInt(char, 10))
                        );
                    } else {
                        pixelData = defaultFrame.data as number[][];
                    }
                    
                    const convertedData: SpriteData = {
                        name: data.name,
                        width: defaultFrame.width,
                        height: defaultFrame.height,
                        data: pixelData,
                        palette: data.palette
                    };
                    Logger.log(`[SpriteLoader] Converted multi-frame sprite ${key} to single frame`);
                    this.cache.set(key, convertedData);
                    return convertedData;
                } else {
                    const error = new Error(`[SpriteLoader] Critical: No valid frame data found in multi-frame sprite ${key}`);
                    Logger.error(error.message);
                    throw error;
                }
            }
            
            if (!data || !data.data) {
                Logger.error(`[SpriteLoader] Bundled data for ${key} is invalid:`, data);
                throw new Error(`Invalid sprite data for ${key}`);
            }
            this.cache.set(key, data);
            return data;
        }

        const url = `${this.basePath}${category}/${name}.json`;
        Logger.log(`[SpriteLoader] Fetching: ${url}`);
        const startTime = performance.now();

        try {
            const response = await fetch(url);
            const fetchTime = performance.now() - startTime;
            Logger.log(`[SpriteLoader] Fetch completed in ${fetchTime.toFixed(2)}ms - Status: ${response.status}`);
            
            if (!response.ok) {
                throw new Error(`Failed to load sprite: ${key} (${response.status})`);
            }
            
            const data: SpriteData = await response.json();
            this.cache.set(key, data);
            return data;
        } catch (error) {
            Logger.error(`Error loading sprite ${key}:`, error);
            throw error;
        }
    }

    async loadMultipleSprites(sprites: SpriteConfig[]): Promise<Map<string, SpriteData>> {
        const promises = sprites.map(({ category, name }) => 
            this.loadSprite(category, name)
                .then(data => ({ key: `${category}/${name}`, data }))
        );

        const results = await Promise.all(promises);
        const spriteMap = new Map<string, SpriteData>();
        
        results.forEach(({ key, data }) => {
            spriteMap.set(key, data);
        });

        return spriteMap;
    }

    async loadCategory(category: string, names: string[]): Promise<Map<string, SpriteData>> {
        const sprites: SpriteConfig[] = names.map(name => ({ category, name }));
        return this.loadMultipleSprites(sprites);
    }

    clearCache(): void {
        this.cache.clear();
    }
}

const SPRITE_DEFINITIONS = {
    player: ['idle', 'jump', 'walk1'],
    enemies: ['slime_idle1', 'slime_idle2', 'bird_fly1', 'bird_fly2', 'bat_hang', 'bat_fly1', 'bat_fly2'],
    items: ['coin_spin1', 'coin_spin2', 'coin_spin3', 'coin_spin4'],
    terrain: ['ground_tile', 'cloud_small', 'cloud_large', 'spring', 'goal_flag'],
    ui: ['heart', 'heart_empty'],
    effects: ['shield_left', 'shield_right']
} as const;

export { SpriteLoader, SPRITE_DEFINITIONS };
export type { SpriteData, SpriteConfig, LoadedSprite };