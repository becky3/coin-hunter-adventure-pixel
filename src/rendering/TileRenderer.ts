import { PixelRenderer } from './PixelRenderer';
import { SpritePaletteIndex } from '../utils/pixelArtPalette';

/**
 * Tile ID enum for tilemap data
 */
export enum TileID {
    EMPTY = 0,
    GROUND = 1
}

/**
 * Handles rendering of tile elements
 */
export class TileRenderer {
    private tilePatterns: Map<number, TilePattern>;
    
    constructor() {
        this.tilePatterns = new Map();
        this.initializeTilePatterns();
    }
    
    private initializeTilePatterns(): void {
        this.tilePatterns.set(TileID.GROUND, {
            spriteKey: 'tiles/grass_ground',
            paletteIndex: SpritePaletteIndex.TILES_GROUND
        });
    }
    
    renderTile(renderer: PixelRenderer, tileType: number, x: number, y: number): void {
        const pattern = this.tilePatterns.get(tileType);
        
        if (!pattern) {
            throw new Error(`Unknown tile type: ${tileType}`);
        }
        
        renderer.drawSprite(pattern.spriteKey, x, y, false, pattern.paletteIndex || 0);
    }
}

interface TilePattern {
    spriteKey: string;
    paletteIndex?: number;
}