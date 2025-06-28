interface SpriteData {
    width: number;
    height: number;
    rows: number;
    data: number[][];
}

interface SpriteConfig {
    category: string;
    name: string;
}

interface LoadedSprite {
    key: string;
    data: SpriteData;
}

class SpriteLoader {
    private cache: Map<string, SpriteData>;
    private basePath: string;

    constructor() {
        this.cache = new Map();
        this.basePath = '/src/assets/sprites/';
    }

    async loadSprite(category: string, name: string): Promise<SpriteData> {
        const key = `${category}/${name}`;
        
        if (this.cache.has(key)) {
            return this.cache.get(key)!;
        }

        try {
            const response = await fetch(`${this.basePath}${category}/${name}.json`);
            if (!response.ok) {
                throw new Error(`Failed to load sprite: ${key}`);
            }
            
            const data: SpriteData = await response.json();
            this.cache.set(key, data);
            return data;
        } catch (error) {
            console.error(`Error loading sprite ${key}:`, error);
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
    enemies: ['slime_idle1', 'slime_idle2', 'bird_fly1', 'bird_fly2'],
    items: ['coin_spin1', 'coin_spin2', 'coin_spin3', 'coin_spin4'],
    terrain: ['ground_tile', 'cloud_small', 'cloud_large', 'spring', 'goal_flag'],
    ui: ['heart', 'heart_empty']
} as const;

export { SpriteLoader, SPRITE_DEFINITIONS };
export type { SpriteData, SpriteConfig, LoadedSprite };