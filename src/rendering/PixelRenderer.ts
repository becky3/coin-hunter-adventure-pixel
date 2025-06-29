import { GAME_RESOLUTION, DISPLAY, FONT } from '../constants/gameConstants';
import { PixelArtRenderer } from '../utils/pixelArt';

export interface SpriteData {
    width: number;
    height: number;
    canvas?: HTMLCanvasElement;
    imageData?: ImageData;
    flippedCanvas?: HTMLCanvasElement;
}

export class PixelRenderer {
    private canvas: HTMLCanvasElement;
    public ctx: CanvasRenderingContext2D;
    private width: number;
    private height: number;
    private canvasWidth: number;
    private canvasHeight: number;
    public scale: number;
    private cameraX: number;
    private cameraY: number;
    private spriteCache: Map<string, HTMLCanvasElement>;
    public debug: boolean;
    public pixelArtRenderer?: PixelArtRenderer;
    public assetLoader?: any;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        this.ctx.imageSmoothingEnabled = false;
        (this.ctx as any).mozImageSmoothingEnabled = false;
        (this.ctx as any).webkitImageSmoothingEnabled = false;
        (this.ctx as any).msImageSmoothingEnabled = false;
        this.width = GAME_RESOLUTION.WIDTH;
        this.height = GAME_RESOLUTION.HEIGHT;
        this.canvasWidth = canvas.width;
        this.canvasHeight = canvas.height;
        this.scale = DISPLAY.SCALE;
        this.cameraX = 0;
        this.cameraY = 0;
        this.spriteCache = new Map();
        this.debug = false;
    }
    
    clear(color: string | null = null): void {
        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        
        if (color) {
            this.ctx.fillStyle = color;
            this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
        } else {
            this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
        }
        
        this.ctx.restore();
    }
    
    public getCameraPosition(): { x: number; y: number } {
        return { x: this.cameraX, y: this.cameraY };
    }

    setCamera(x: number, y: number): void {
        this.cameraX = Math.floor(x);
        this.cameraY = Math.floor(y);
    }
    
    drawSprite(sprite: string | SpriteData | HTMLCanvasElement | ImageData, x: number, y: number, flipX: boolean = false): void {
        let finalSprite: SpriteData | HTMLCanvasElement | ImageData | null = null;

        if (typeof sprite === 'string') {
            if (this.pixelArtRenderer && this.pixelArtRenderer.sprites.has(sprite)) {
                const pixelSprite = this.pixelArtRenderer.sprites.get(sprite)!;
                const canvas = flipX ? pixelSprite.flippedCanvas : pixelSprite.canvas;
                finalSprite = canvas;
            }
            else if (this.assetLoader) {
                const loadedSprite = this.assetLoader.loadedAssets.get(sprite);
                if (!loadedSprite) {
                    this.assetLoader.loadSprite(...sprite.split('/') as [string, string]);
                    return;
                }
                finalSprite = loadedSprite.imageData || loadedSprite.canvas;
                if (!finalSprite) return;
            } else {
                return;
            }
        } else {
            finalSprite = sprite;
        }

        const spriteWidth = 'width' in finalSprite ? finalSprite.width : 0;
        const spriteHeight = 'height' in finalSprite ? finalSprite.height : 0;

        const drawX = Math.floor((x - this.cameraX) * this.scale);
        const drawY = Math.floor((y - this.cameraY) * this.scale);
        if (drawX + spriteWidth * this.scale < 0 || drawX > this.canvasWidth ||
            drawY + spriteHeight * this.scale < 0 || drawY > this.canvasHeight) {
            return;
        }
        
        this.ctx.save();
        
        if (flipX) {
            this.ctx.translate(drawX + spriteWidth * this.scale, drawY);
            this.ctx.scale(-1, 1);
            this.ctx.translate(-drawX, -drawY);
        }
        
        if (finalSprite instanceof ImageData) {
            const tempCanvas = this._getOrCreateTempCanvas(finalSprite);
            this.ctx.drawImage(
                tempCanvas,
                0, 0, spriteWidth, spriteHeight,
                drawX, drawY, spriteWidth * this.scale, spriteHeight * this.scale
            );
        } else if (finalSprite instanceof HTMLCanvasElement || (finalSprite && 'canvas' in finalSprite)) {
            const canvas = finalSprite instanceof HTMLCanvasElement ? finalSprite : (finalSprite as any).canvas;
            this.ctx.drawImage(
                canvas,
                0, 0, spriteWidth, spriteHeight,
                drawX, drawY, spriteWidth * this.scale, spriteHeight * this.scale
            );
        }
        
        this.ctx.restore();
        if (this.debug) {
            this.drawDebugBox(drawX, drawY, spriteWidth * this.scale, spriteHeight * this.scale);
        }
    }
    
    drawRect(x: number, y: number, width: number, height: number, color: string, fill: boolean = true): void {
        const drawX = Math.floor((x - this.cameraX) * this.scale);
        const drawY = Math.floor((y - this.cameraY) * this.scale);
        
        this.ctx.fillStyle = color;
        this.ctx.strokeStyle = color;
        
        if (fill) {
            this.ctx.fillRect(drawX, drawY, width * this.scale, height * this.scale);
        } else {
            this.ctx.strokeRect(drawX, drawY, width * this.scale, height * this.scale);
        }
    }
    
    drawText(text: string, x: number, y: number, color: string = '#FFFFFF', alpha: number = 1): void {
        const snappedX = Math.floor(x / FONT.GRID) * FONT.GRID;
        const snappedY = Math.floor(y / FONT.GRID) * FONT.GRID;
        
        const drawX = Math.floor((snappedX - this.cameraX) * this.scale);
        const drawY = Math.floor((snappedY - this.cameraY) * this.scale);
        const scaledSize = FONT.SIZE * this.scale;
        
        this.ctx.save();
        this.ctx.globalAlpha = alpha;
        this.ctx.fillStyle = color;
        this.ctx.font = `${scaledSize}px ${FONT.FAMILY}`;
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'top';
        this.ctx.fillText(text, drawX, drawY);
        this.ctx.restore();
    }
    
    drawTextCentered(text: string, centerX: number, y: number, color: string = '#FFFFFF', alpha: number = 1): void {
        const textWidth = text.length * FONT.GRID;
        const x = centerX - Math.floor(textWidth / 2);
        this.drawText(text, x, y, color, alpha);
    }
    
    drawLine(x1: number, y1: number, x2: number, y2: number, color: string = '#FFFFFF', width: number = 1): void {
        const drawX1 = Math.floor((x1 - this.cameraX) * this.scale);
        const drawY1 = Math.floor((y1 - this.cameraY) * this.scale);
        const drawX2 = Math.floor((x2 - this.cameraX) * this.scale);
        const drawY2 = Math.floor((y2 - this.cameraY) * this.scale);
        
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = width * this.scale;
        this.ctx.beginPath();
        this.ctx.moveTo(drawX1, drawY1);
        this.ctx.lineTo(drawX2, drawY2);
        this.ctx.stroke();
    }
    
    drawDebugBox(x: number, y: number, width: number, height: number): void {
        this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x, y, width, height);
    }
    
    drawTilemap(
        tilemap: number[][], 
        getTileSprite: (tileId: number) => SpriteData | HTMLCanvasElement | string | null, 
        tileSize: number, 
        scale: number = 1
    ): void {
        const startX = Math.floor(this.cameraX / (tileSize * scale));
        const startY = Math.floor(this.cameraY / (tileSize * scale));
        const endX = Math.ceil((this.cameraX + this.width) / (tileSize * scale));
        const endY = Math.ceil((this.cameraY + this.height) / (tileSize * scale));
        
        for (let y = startY; y < Math.min(endY, tilemap.length); y++) {
            if (y < 0) continue;
            
            for (let x = startX; x < Math.min(endX, tilemap[y].length); x++) {
                if (x < 0) continue;
                
                const tileId = tilemap[y][x];
                if (tileId === 0) continue;
                
                const sprite = getTileSprite(tileId);
                if (sprite) {
                    this.drawSprite(
                        sprite,
                        x * tileSize * scale,
                        y * tileSize * scale
                    );
                }
            }
        }
    }
    
    isInView(x: number, y: number, width: number = 0, height: number = 0): boolean {
        return x + width >= this.cameraX &&
               x <= this.cameraX + this.width &&
               y + height >= this.cameraY &&
               y <= this.cameraY + this.height;
    }
    
    worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
        return {
            x: Math.floor((worldX - this.cameraX) * this.scale),
            y: Math.floor((worldY - this.cameraY) * this.scale)
        };
    }
    
    screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
        return {
            x: (screenX / this.scale) + this.cameraX,
            y: (screenY / this.scale) + this.cameraY
        };
    }
    
    private _getOrCreateTempCanvas(imageData: ImageData): HTMLCanvasElement {
        const key = `${imageData.width}x${imageData.height}`;
        
        if (!this.spriteCache.has(key)) {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = imageData.width;
            tempCanvas.height = imageData.height;
            this.spriteCache.set(key, tempCanvas);
        }
        
        const tempCanvas = this.spriteCache.get(key)!;
        const tempCtx = tempCanvas.getContext('2d')!;
        tempCtx.putImageData(imageData, 0, 0);
        
        return tempCanvas;
    }
    
    setDebugMode(enabled: boolean): void {
        this.debug = enabled;
    }
    
    resize(width: number, height: number): void {
        this.canvasWidth = width;
        this.canvasHeight = height;
        this.canvas.width = width;
        this.canvas.height = height;
        this.width = GAME_RESOLUTION.WIDTH;
        this.height = GAME_RESOLUTION.HEIGHT;
        this.scale = Math.min(width / GAME_RESOLUTION.WIDTH, height / GAME_RESOLUTION.HEIGHT);
        this.ctx.imageSmoothingEnabled = false;
        (this.ctx as any).mozImageSmoothingEnabled = false;
        (this.ctx as any).webkitImageSmoothingEnabled = false;
        (this.ctx as any).msImageSmoothingEnabled = false;
    }
    
    fillRect(x: number, y: number, width: number, height: number, color: string): void {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, width, height);
    }
    
    strokeCircle(x: number, y: number, radius: number, color: string = '#FFFFFF', lineWidth: number = 1): void {
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = lineWidth;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.stroke();
    }
}