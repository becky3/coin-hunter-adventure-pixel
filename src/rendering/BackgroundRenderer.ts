import { PixelRenderer } from './PixelRenderer';

export interface BackgroundLayer {
    elements: BackgroundElement[];
}

export interface BackgroundElement {
    type: 'cloud' | 'tree' | 'mountain';
    x: number;
    y: number;
    spriteKey: string;
}

export class BackgroundRenderer {
    private layers: BackgroundLayer[] = [];
    
    constructor() {
        this.initializeLayers();
    }
    
    private initializeLayers(): void {
        // Far background layer (clouds)
        this.layers.push({
            elements: [
                { type: 'cloud', x: 100, y: 50, spriteKey: 'environment/cloud1' },
                { type: 'cloud', x: 300, y: 80, spriteKey: 'environment/cloud2' },
                { type: 'cloud', x: 500, y: 40, spriteKey: 'environment/cloud1' },
                { type: 'cloud', x: 700, y: 90, spriteKey: 'environment/cloud2' },
                { type: 'cloud', x: 900, y: 60, spriteKey: 'environment/cloud1' },
                { type: 'cloud', x: 1100, y: 70, spriteKey: 'environment/cloud2' },
                { type: 'cloud', x: 1300, y: 50, spriteKey: 'environment/cloud1' },
                { type: 'cloud', x: 1500, y: 85, spriteKey: 'environment/cloud2' }
            ],
        });
        
        // Middle background layer (distant trees)
        this.layers.push({
            elements: [
                { type: 'tree', x: 150, y: 280, spriteKey: 'environment/tree1' },
                { type: 'tree', x: 350, y: 280, spriteKey: 'environment/tree1' },
                { type: 'tree', x: 600, y: 280, spriteKey: 'environment/tree1' },
                { type: 'tree', x: 850, y: 280, spriteKey: 'environment/tree1' },
                { type: 'tree', x: 1050, y: 280, spriteKey: 'environment/tree1' },
                { type: 'tree', x: 1250, y: 280, spriteKey: 'environment/tree1' },
                { type: 'tree', x: 1450, y: 280, spriteKey: 'environment/tree1' },
                { type: 'tree', x: 1650, y: 280, spriteKey: 'environment/tree1' }
            ],
        });
    }
    
    render(renderer: PixelRenderer, cameraX: number, cameraY: number): void {
        // Render each layer
        for (const layer of this.layers) {
            for (const element of layer.elements) {
                // Background elements are fixed in screen space, not affected by camera
                const screenX = element.x;
                const screenY = element.y;
                
                // Only render if on screen
                if (screenX > -200 && screenX < renderer.width + 200) {
                    renderer.drawSprite(element.spriteKey, screenX, screenY);
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