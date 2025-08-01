import { GAME_RESOLUTION, DISPLAY, FONT } from '../constants/gameConstants';
import { PixelArtRenderer, PixelArtSprite } from '../utils/pixelArt';
import { Logger } from '../utils/Logger';
import { AssetLoader } from '../assets/AssetLoader';
import { SpriteData } from '../types/animationTypes';
import { paletteSystem } from '../utils/pixelArtPalette';
import { MasterPalette } from './MasterPalette';


/**
 * Handles rendering of pixel elements
 */


/**
 * PixelRenderer
 */
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
    public stageDependentSpriteCache: Map<string, PixelArtSprite>;
    public currentStageType: string;
    public debug: boolean;
    public pixelArtRenderer?: PixelArtRenderer;
    public assetLoader?: AssetLoader;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        const context = canvas.getContext('2d');
        if (!context) {
            throw new Error('Failed to get 2D context from canvas');
        }
        this.ctx = context;
        this.ctx.imageSmoothingEnabled = false;
        
        const extCtx = this.ctx as CanvasRenderingContext2D & { 
            mozImageSmoothingEnabled?: boolean;
            webkitImageSmoothingEnabled?: boolean;
            msImageSmoothingEnabled?: boolean;
        };
        extCtx.mozImageSmoothingEnabled = false;
        extCtx.webkitImageSmoothingEnabled = false;
        extCtx.msImageSmoothingEnabled = false;
        this.width = GAME_RESOLUTION.WIDTH;
        this.height = GAME_RESOLUTION.HEIGHT;
        this.canvasWidth = canvas.width;
        this.canvasHeight = canvas.height;
        this.scale = DISPLAY.SCALE;
        this.cameraX = 0;
        this.cameraY = 0;
        this.spriteCache = new Map();
        this.stageDependentSpriteCache = new Map();
        this.currentStageType = '';
        this.debug = false;
    }
    
    clear(backgroundPaletteIndex: number = 0, colorIndex: number = 0): void {
        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        
        if (backgroundPaletteIndex >= 0) {
            const color = paletteSystem.getColor('background', backgroundPaletteIndex, colorIndex);
            this.ctx.fillStyle = color || '#000000';
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
    
    setStageType(stageType: string): void {
        if (this.currentStageType !== stageType) {
            this.currentStageType = stageType;
            this.stageDependentSpriteCache.clear();
        }
    }
    
    drawSprite(sprite: string | SpriteData | HTMLCanvasElement | ImageData, x: number, y: number, flipX: boolean = false, paletteIndex: number = 0): void {
        let finalSprite: SpriteData | HTMLCanvasElement | ImageData | null = null;

        if (typeof sprite === 'string') {
            if (this.pixelArtRenderer) {
                const cacheKey = `${sprite}_${paletteIndex}`;
                let cachedSprite = this.stageDependentSpriteCache.get(cacheKey);
                
                if (!cachedSprite) {
                    const pixelData = this.pixelArtRenderer.stageDependentSprites.get(sprite);
                    if (!pixelData) {
                        throw new Error(`[PixelRenderer] Sprite '${sprite}' not loaded`);
                    }
                    
                    const colors: { [key: number]: string | null } = {};
                    for (let i = 0; i < 4; i++) {
                        colors[i] = paletteSystem.getColor('sprite', paletteIndex, i);
                    }
                    
                    cachedSprite = new PixelArtSprite(pixelData, colors);
                    this.stageDependentSpriteCache.set(cacheKey, cachedSprite);
                }
                
                const canvas = flipX ? cachedSprite.flippedCanvas : cachedSprite.canvas;
                finalSprite = canvas;
            }
            else if (this.assetLoader) {
                const loadedSprite = this.assetLoader.loadedAssets.get(sprite);
                if (!loadedSprite) {
                    Logger.warn(`[PixelRenderer] Sprite '${sprite}' not loaded, attempting to load now`);
                    this.assetLoader.loadSprite(...sprite.split('/') as [string, string]);
                    return;
                }
                const spriteData = loadedSprite.imageData || loadedSprite.canvas;
                if (!spriteData) {
                    Logger.warn(`[PixelRenderer] Loaded sprite '${sprite}' has no imageData or canvas`);
                    return;
                }
                finalSprite = spriteData;
            } else {
                Logger.error('[PixelRenderer] No asset loader available to load sprite');
                return;
            }
        } else {
            finalSprite = sprite;
        }

        if (!finalSprite) {
            Logger.error(`[PixelRenderer] Sprite not found: ${sprite}`);
            return;
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
        } else if (finalSprite instanceof HTMLCanvasElement) {
            this.ctx.drawImage(
                finalSprite,
                0, 0, spriteWidth, spriteHeight,
                drawX, drawY, spriteWidth * this.scale, spriteHeight * this.scale
            );
        }
        
        this.ctx.restore();
        if (this.debug) {
            this.drawDebugBox(drawX, drawY, spriteWidth * this.scale, spriteHeight * this.scale);
        }
    }
    
    /**
     * Draw a single pixel at the specified world coordinates
     * @param x World X coordinate
     * @param y World Y coordinate
     * @param color Color hex string
     */
    drawPixel(x: number, y: number, color: string): void {
        const drawX = Math.floor((x - this.cameraX) * this.scale);
        const drawY = Math.floor((y - this.cameraY) * this.scale);
        
        this.ctx.fillStyle = color;
        this.ctx.fillRect(drawX, drawY, this.scale, this.scale);
    }
    
    drawRect(x: number, y: number, width: number, height: number, colorIndex: number, fill: boolean = true): void {
        const drawX = Math.floor((x - this.cameraX) * this.scale);
        const drawY = Math.floor((y - this.cameraY) * this.scale);
        
        const color = MasterPalette.getColor(colorIndex);
        this.ctx.fillStyle = color;
        this.ctx.strokeStyle = color;
        
        if (fill) {
            this.ctx.fillRect(drawX, drawY, width * this.scale, height * this.scale);
        } else {
            this.ctx.strokeRect(drawX, drawY, width * this.scale, height * this.scale);
        }
    }
    
    drawText(text: string, x: number, y: number, colorIndex: number = 0x03, alpha: number = 1, suppressWarning: boolean = false): void {
        const snappedX = Math.floor(x / FONT.GRID) * FONT.GRID;
        const snappedY = Math.floor(y / FONT.GRID) * FONT.GRID;
        
        const textWidth = text.length * FONT.GRID;
        const textHeight = FONT.SIZE;
        
        if (!suppressWarning && (snappedX < 0 || snappedY < 0 || 
            snappedX + textWidth > GAME_RESOLUTION.WIDTH || 
            snappedY + textHeight > GAME_RESOLUTION.HEIGHT)) {
            Logger.warn(`[PixelRenderer] Text "${text}" is being drawn outside screen bounds at (${x}, ${y}). Game resolution: ${GAME_RESOLUTION.WIDTH}x${GAME_RESOLUTION.HEIGHT}`);
        }
        
        const drawX = Math.floor((snappedX - this.cameraX) * this.scale);
        const drawY = Math.floor((snappedY - this.cameraY) * this.scale);
        const scaledSize = FONT.SIZE * this.scale;
        
        this.ctx.save();
        this.ctx.globalAlpha = alpha;
        const color = MasterPalette.getColor(colorIndex);
        this.ctx.fillStyle = color;
        this.ctx.font = `${scaledSize}px ${FONT.FAMILY}`;
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'top';
        this.ctx.fillText(text, drawX, drawY);
        this.ctx.restore();
    }
    
    drawTextCentered(text: string, centerX: number, y: number, colorIndex: number = 0x03, alpha: number = 1, suppressWarning: boolean = false): void {
        const textWidth = text.length * FONT.GRID;
        const x = centerX - Math.floor(textWidth / 2);
        this.drawText(text, x, y, colorIndex, alpha, suppressWarning);
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
            
            const row = tilemap[y];
            if (!row) continue;
            
            for (let x = startX; x < Math.min(endX, row.length); x++) {
                if (x < 0) continue;
                
                const tileId = row[x];
                if (tileId === undefined || tileId === 0) continue;
                
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
        
        const tempCanvas = this.spriteCache.get(key);
        if (!tempCanvas) {
            throw new Error(`Canvas not found in sprite cache for key: ${key}`);
        }
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) {
            throw new Error('Failed to get 2D context from temp canvas');
        }
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
        
        const extCtx = this.ctx as CanvasRenderingContext2D & { 
            mozImageSmoothingEnabled?: boolean;
            webkitImageSmoothingEnabled?: boolean;
            msImageSmoothingEnabled?: boolean;
        };
        extCtx.mozImageSmoothingEnabled = false;
        extCtx.webkitImageSmoothingEnabled = false;
        extCtx.msImageSmoothingEnabled = false;
    }
    
    fillRect(x: number, y: number, width: number, height: number, color: string): void {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, width, height);
    }
}