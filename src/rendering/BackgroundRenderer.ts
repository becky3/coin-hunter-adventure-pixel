import { PixelRenderer } from './PixelRenderer';
import { GAME_RESOLUTION } from '../constants/gameConstants';
import { SpritePaletteIndex } from '../utils/pixelArtPalette';
import { BackgroundElementPool } from './BackgroundElementPool';
import { BackgroundChunkManager } from './BackgroundChunkManager';
import { Logger } from '../utils/Logger';

export interface BackgroundElement {
    type: 'cloud' | 'tree' | 'mountain';
    x: number;
    y: number;
    spriteKey: string;
}

/**
 * Optimized background renderer with dynamic element generation
 */
export class BackgroundRenderer {
    private cloudPool: BackgroundElementPool;
    private cloudChunks: BackgroundChunkManager;
    private treeChunks: BackgroundChunkManager;
    private viewportMargin: number = 200;
    private lastCameraX: number = 0;
    private activeCloudElements: Map<string, BackgroundElement> = new Map();
    private isFirstRender: boolean = true;
    
    constructor() {
        this.cloudPool = new BackgroundElementPool('cloud');
        this.cloudChunks = new BackgroundChunkManager(512);
        this.treeChunks = new BackgroundChunkManager(512);
        
        this.initializeElementPositions();
    }
    
    private initializeElementPositions(): void {
        for (let x = 0; x < 6000; x += 150) {
            const cloudType = (x / 150) % 2 === 0 ? 'environment/cloud1' : 'environment/cloud2';
            const yOffset = Math.sin(x / 200) * 20;
            this.cloudChunks.addElement(x, 50 + yOffset, cloudType);
        }
        
        const groundY = 160;
        for (let x = 50; x < 6000; x += 200) {
            this.treeChunks.addElement(x, groundY, 'environment/tree1');
        }
        
        Logger.log(`Initialized optimized background: ${this.cloudChunks.getTotalElements()} clouds, ${this.treeChunks.getTotalElements()} trees`);
    }
    
    render(renderer: PixelRenderer): void {
        const camera = renderer.getCameraPosition();
        const viewportStart = camera.x - this.viewportMargin;
        const viewportEnd = camera.x + GAME_RESOLUTION.WIDTH + this.viewportMargin;
        
        const trees = this.treeChunks.getElementsInRange(viewportStart, viewportEnd);
        trees.forEach(tree => {
            renderer.drawSprite(tree.spriteKey, tree.x, tree.y, false, SpritePaletteIndex.ENVIRONMENT_NATURE);
        });
        
        if (this.isFirstRender || Math.abs(camera.x - this.lastCameraX) > 50) {
            this.updateActiveCloudElements(viewportStart, viewportEnd);
            this.lastCameraX = camera.x;
            this.isFirstRender = false;
        }
        
        this.activeCloudElements.forEach(element => {
            if (element.x > camera.x - 100 && element.x < camera.x + GAME_RESOLUTION.WIDTH + 100) {
                renderer.drawSprite(element.spriteKey, element.x, element.y, false, SpritePaletteIndex.ENVIRONMENT_SKY);
            }
        });
    }
    
    private updateActiveCloudElements(viewportStart: number, viewportEnd: number): void {
        const toRemove: string[] = [];
        this.activeCloudElements.forEach((element, key) => {
            if (element.x < viewportStart || element.x > viewportEnd) {
                toRemove.push(key);
            }
        });
        
        toRemove.forEach(key => {
            const element = this.activeCloudElements.get(key) as BackgroundElement;
            this.cloudPool.release(element);
            this.activeCloudElements.delete(key);
        });
        
        const cloudsInRange = this.cloudChunks.getElementsInRange(viewportStart, viewportEnd);
        cloudsInRange.forEach(pos => {
            const key = `${pos.x}_${pos.y}`;
            if (!this.activeCloudElements.has(key)) {
                const element = this.cloudPool.acquire(pos.x, pos.y, pos.spriteKey);
                this.activeCloudElements.set(key, element);
            }
        });
    }
    
    getDebugInfo(): { 
        activeClouds: number; 
        } {
        return {
            activeClouds: this.activeCloudElements.size
        };
    }
}