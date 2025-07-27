/**
 * Shared utility for resolving palette names based on category and sprite name
 */
export function getPaletteForCategory(category: string, spriteName?: string): string {
    if (category === 'enemies' && spriteName && spriteName.includes('spider')) {
        return 'enemySpider';
    }
    if (category === 'tiles' || category === 'terrain' || category === 'environment') {
        throw new Error(`[getPaletteForCategory] Stage-dependent category '${category}' should not use fixed palettes. Use stage palette system instead.`);
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
    
    throw new Error(`[getPaletteForCategory] Unknown category: ${category}`);
}