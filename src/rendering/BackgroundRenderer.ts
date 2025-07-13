import { PixelRenderer } from './PixelRenderer';
import { GAME_RESOLUTION } from '../constants/gameConstants';
import { BackgroundElementPool } from './BackgroundElementPool';
import { BackgroundChunkManager } from './BackgroundChunkManager';
import { Logger } from '../utils/Logger';

export interface BackgroundElement {
    type: 'cloud' | 'tree' | 'mountain';
    x: number;
    y: number;
    spriteKey: string;
}

interface OffscreenChunk {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    startX: number;
    endX: number;
}

/**
 * Optimized background renderer with dynamic element generation and offscreen rendering
 */
export class BackgroundRenderer {
    private cloudPool: BackgroundElementPool;
    private cloudChunks: BackgroundChunkManager;
    private treeChunks: BackgroundChunkManager;
    private viewportMargin: number = 200;
    private lastCameraX: number = 0;
    private activeCloudElements: Map<string, BackgroundElement> = new Map();
    private isFirstRender: boolean = true;
    private offscreenChunks: Map<number, OffscreenChunk> = new Map();
    private chunkSize: number = 512;
    private chunkHeight: number = GAME_RESOLUTION.HEIGHT;
    
    constructor() {
        this.cloudPool = new BackgroundElementPool('cloud');
        this.cloudChunks = new BackgroundChunkManager(this.chunkSize);
        this.treeChunks = new BackgroundChunkManager(this.chunkSize);
        
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
        
        this.renderStaticLayer(renderer, camera, viewportStart, viewportEnd);
        
        if (this.isFirstRender || Math.abs(camera.x - this.lastCameraX) > 50) {
            this.updateActiveCloudElements(viewportStart, viewportEnd);
            this.lastCameraX = camera.x;
            this.isFirstRender = false;
        }
        
        this.activeCloudElements.forEach(element => {
            if (element.x > camera.x - 100 && element.x < camera.x + GAME_RESOLUTION.WIDTH + 100) {
                renderer.drawSprite(element.spriteKey, element.x, element.y);
            }
        });
    }
    
    private renderStaticLayer(renderer: PixelRenderer, camera: { x: number, y: number }, viewportStart: number, viewportEnd: number): void {
        const startChunk = Math.floor(viewportStart / this.chunkSize);
        const endChunk = Math.floor(viewportEnd / this.chunkSize);
        
        for (let chunkIndex = startChunk; chunkIndex <= endChunk; chunkIndex++) {
            let chunk = this.offscreenChunks.get(chunkIndex);
            
            if (!chunk) {
                chunk = this.createOffscreenChunk(chunkIndex, renderer);
                if (chunk) {
                    this.offscreenChunks.set(chunkIndex, chunk);
                }
            }
            
            if (chunk && chunk.ctx.canvas.width > 0) {
                const destX = chunk.startX - camera.x;
                const destY = 0;
                
                if (destX < GAME_RESOLUTION.WIDTH && destX + chunk.ctx.canvas.width > 0) {
                    renderer.ctx.drawImage(
                        chunk.canvas,
                        0, 0, chunk.canvas.width, chunk.canvas.height,
                        destX * renderer.scale, destY * renderer.scale, 
                        chunk.canvas.width * renderer.scale, chunk.canvas.height * renderer.scale
                    );
                }
            }
        }
        
        this.cleanupDistantChunks(camera.x);
    }
    
    private createOffscreenChunk(chunkIndex: number, mainRenderer?: PixelRenderer): OffscreenChunk | null {
        const startX = chunkIndex * this.chunkSize;
        const endX = startX + this.chunkSize;
        
        const trees = this.treeChunks.getElementsInRange(startX, endX);
        if (trees.length === 0) {
            return null;
        }
        
        const canvas = document.createElement('canvas');
        canvas.width = this.chunkSize;
        canvas.height = this.chunkHeight;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            return null;
        }
        
        ctx.imageSmoothingEnabled = false;
        
        const tempRenderer = new PixelRenderer(canvas);
        tempRenderer.scale = 1;
        tempRenderer.setCamera(startX, 0);
        
        if (mainRenderer && mainRenderer.pixelArtRenderer) {
            tempRenderer.pixelArtRenderer = mainRenderer.pixelArtRenderer;
        }
        
        trees.forEach(tree => {
            tempRenderer.drawSprite(tree.spriteKey, tree.x, tree.y);
        });
        
        return {
            canvas,
            ctx,
            startX,
            endX
        };
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
    
    private cleanupDistantChunks(cameraX: number): void {
        const maxDistance = this.chunkSize * 3;
        
        const toDelete: number[] = [];
        this.offscreenChunks.forEach((chunk, index) => {
            const chunkCenter = chunk.startX + this.chunkSize / 2;
            if (Math.abs(chunkCenter - cameraX) > maxDistance) {
                toDelete.push(index);
            }
        });
        
        toDelete.forEach(index => {
            this.offscreenChunks.delete(index);
        });
    }
    
    getDebugInfo(): { 
        activeClouds: number; 
        offscreenChunks: number;
        } {
        return {
            activeClouds: this.activeCloudElements.size,
            offscreenChunks: this.offscreenChunks.size
        };
    }
}