import { PixelRenderer } from './PixelRenderer';
import { GAME_RESOLUTION } from '../constants/gameConstants';

export interface BackgroundLayer {
    elements: BackgroundElement[];
}

export interface BackgroundElement {
    type: 'cloud' | 'tree' | 'mountain';
    x: number;
    y: number;
    spriteKey: string;
}

/**
 * Handles rendering of background elements
 */

export class BackgroundRenderer {
    private layers: BackgroundLayer[] = [];
    
    constructor() {
        this.initializeLayers();
    }
    
    private initializeLayers(): void {
        const clouds: BackgroundElement[] = [];
        const trees: BackgroundElement[] = [];
        
        // Simple cloud placement every 150 pixels
        for (let x = 0; x < 6000; x += 150) {
            const cloudType = (x / 150) % 2 === 0 ? 'environment/cloud1' : 'environment/cloud2';
            // Slight wave pattern
            const yOffset = Math.sin(x / 200) * 20;
            clouds.push({
                type: 'cloud',
                x: x,
                y: 50 + yOffset,
                spriteKey: cloudType
            });
        }
        
        // Simple tree placement every 200 pixels
        // Ground level for trees
        const groundY = 160;
        for (let x = 50; x < 6000; x += 200) {
            trees.push({
                type: 'tree',
                x: x,
                y: groundY,
                spriteKey: 'environment/tree1'
            });
        }
        
        // Far background layer (clouds)
        this.layers.push({ elements: clouds });
        
        // Middle background layer (trees)
        this.layers.push({ elements: trees });
    }
    
    render(renderer: PixelRenderer): void {
        // Get camera position
        const camera = renderer.getCameraPosition();
        
        // Render each layer
        for (const layer of this.layers) {
            for (const element of layer.elements) {
                // Pass world coordinates directly to drawSprite
                // drawSprite will handle the camera transformation
                
                // Only render if roughly on screen (check with world coordinates)
                if (element.x > camera.x - 100 && element.x < camera.x + GAME_RESOLUTION.WIDTH + 100) {
                    renderer.drawSprite(element.spriteKey, element.x, element.y);
                }
            }
        }
    }
    
    addElement(layer: number, element: BackgroundElement): void {
        if (layer >= 0 && layer < this.layers.length) {
            this.layers[layer].elements.push(element);
        }
    }
    
    clearLayer(layer: number): void {
        if (layer >= 0 && layer < this.layers.length) {
            this.layers[layer].elements = [];
        }
    }
}