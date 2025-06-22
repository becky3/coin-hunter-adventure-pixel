/**
 * スプライトローダー
 * JSONファイルからスプライトデータを動的に読み込む
 */

class SpriteLoader {
    constructor() {
        this.cache = new Map();
        this.basePath = '/src/assets/sprites/';
    }

    /**
     * スプライトデータを読み込む
     * @param {string} category - カテゴリ（player, enemies, items, terrain, ui）
     * @param {string} name - スプライト名
     * @returns {Promise<Object>} スプライトデータ
     */
    async loadSprite(category, name) {
        const key = `${category}/${name}`;
        
        // キャッシュチェック
        if (this.cache.has(key)) {
            return this.cache.get(key);
        }

        try {
            const response = await fetch(`${this.basePath}${category}/${name}.json`);
            if (!response.ok) {
                throw new Error(`Failed to load sprite: ${key}`);
            }
            
            const data = await response.json();
            this.cache.set(key, data);
            return data;
        } catch (error) {
            console.error(`Error loading sprite ${key}:`, error);
            throw error;
        }
    }

    /**
     * 複数のスプライトを一括読み込み
     * @param {Array<{category: string, name: string}>} sprites - スプライトリスト
     * @returns {Promise<Map>} スプライトデータのMap
     */
    async loadMultipleSprites(sprites) {
        const promises = sprites.map(({ category, name }) => 
            this.loadSprite(category, name)
                .then(data => ({ key: `${category}/${name}`, data }))
        );

        const results = await Promise.all(promises);
        const spriteMap = new Map();
        
        results.forEach(({ key, data }) => {
            spriteMap.set(key, data);
        });

        return spriteMap;
    }

    /**
     * カテゴリ内の全スプライトを読み込み
     * @param {string} category - カテゴリ名
     * @param {Array<string>} names - スプライト名の配列
     * @returns {Promise<Map>} スプライトデータのMap
     */
    async loadCategory(category, names) {
        const sprites = names.map(name => ({ category, name }));
        return this.loadMultipleSprites(sprites);
    }

    /**
     * キャッシュをクリア
     */
    clearCache() {
        this.cache.clear();
    }
}

// スプライト定義（どのスプライトが存在するか）
const SPRITE_DEFINITIONS = {
    player: ['idle', 'jump', 'walk1'],
    enemies: ['slime_idle1', 'slime_idle2', 'bird_fly1', 'bird_fly2'],
    items: ['coin_spin1', 'coin_spin2', 'coin_spin3', 'coin_spin4'],
    terrain: ['ground_tile', 'cloud_small', 'cloud_large', 'spring', 'goal_flag'],
    ui: ['heart', 'heart_empty']
};

export { SpriteLoader, SPRITE_DEFINITIONS };