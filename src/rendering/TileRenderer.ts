import { PixelRenderer } from './PixelRenderer';

export class TileRenderer {
    private tilePatterns: Map<number, TilePattern>;
    
    constructor() {
        this.tilePatterns = new Map();
        this.initializeTilePatterns();
    }
    
    private initializeTilePatterns(): void {
        // Ground tile pattern
        this.tilePatterns.set(1, {
            type: 'ground',
            spriteKey: 'tiles/grass_ground'
        });
        
        // Spike tile pattern
        this.tilePatterns.set(2, {
            type: 'spike',
            spriteKey: 'tiles/spike'
        });
    }
    
    renderTile(renderer: PixelRenderer, tileType: number, x: number, y: number): void {
        const pattern = this.tilePatterns.get(tileType);
        
        if (!pattern) {
            throw new Error(`Unknown tile type: ${tileType}`);
        }
        
        renderer.drawSprite(pattern.spriteKey, x, y);
    }
}

interface TilePattern {
    type: string;
    spriteKey: string;
}