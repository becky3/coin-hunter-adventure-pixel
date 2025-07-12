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
        
        for (let x = 0; x < 6000; x += 150) {
            const cloudType = (x / 150) % 2 === 0 ? 'environment/cloud1' : 'environment/cloud2';
            const yOffset = Math.sin(x / 200) * 20;
            clouds.push({
                type: 'cloud',
                x: x,
                y: 50 + yOffset,
                spriteKey: cloudType
            });
        }
        
        const groundY = 160;
        for (let x = 50; x < 6000; x += 200) {
            trees.push({
                type: 'tree',
                x: x,
                y: groundY,
                spriteKey: 'environment/tree1'
            });
        }
        
        this.layers.push({ elements: clouds });
        
        this.layers.push({ elements: trees });
    }
    
    render(renderer: PixelRenderer): void {
        const camera = renderer.getCameraPosition();
        
        for (const layer of this.layers) {
            for (const element of layer.elements) {
                
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