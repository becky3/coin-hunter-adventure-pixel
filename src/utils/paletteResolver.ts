/**
 * Shared utility for resolving palette names based on category and sprite name
 */
export function getPaletteForCategory(category: string, spriteName?: string, stageType?: string): string {
    if (category === 'enemies' && spriteName && spriteName.includes('spider')) {
        return 'enemySpider';
    }
    if (category === 'environment' && spriteName) {
        if (spriteName.includes('cloud')) {
            return 'sky';
        }
        if (spriteName.includes('tree') || spriteName.includes('grass')) {
            return 'nature';
        }
        return 'nature';
    }
    
    if (category === 'tiles' || category === 'terrain') {
        return stageType || 'grassland';
    }
    
    if (category === 'player') {
        return 'character';
    }
    
    if (category === 'enemies') {
        return 'enemy';
    }
    
    if (category === 'enemies/spider') {
        return 'enemySpider';
    }
    
    if (category === 'items' || category === 'objects') {
        return 'items';
    }
    
    if (category === 'ui') {
        return 'ui';
    }
    
    if (category === 'powerups') {
        return 'itemsPowerUp';
    }
    
    if (category === 'projectiles' || category === 'effects') {
        return 'effect';
    }
    
    return stageType || 'grassland';
}