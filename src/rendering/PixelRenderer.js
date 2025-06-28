import { GAME_RESOLUTION, DISPLAY, FONT } from '../constants/gameConstants.js';

export class PixelRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.mozImageSmoothingEnabled = false;
        this.ctx.webkitImageSmoothingEnabled = false;
        this.ctx.msImageSmoothingEnabled = false;
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
    
    clear(color = null) {
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
    
    setCamera(x, y) {
        this.cameraX = Math.floor(x);
        this.cameraY = Math.floor(y);
    }
    
    drawSprite(sprite, x, y, flipX = false) {
        if (typeof sprite === 'string') {
            if (this.pixelArtRenderer && this.pixelArtRenderer.sprites.has(sprite)) {
                const pixelSprite = this.pixelArtRenderer.sprites.get(sprite);
                const canvas = flipX ? pixelSprite.flippedCanvas : pixelSprite.canvas;
                sprite = canvas;
            }
            else if (this.assetLoader) {
                const loadedSprite = this.assetLoader.loadedAssets.get(sprite);
                if (!loadedSprite) {
                    this.assetLoader.loadSprite(...sprite.split('/'));
                    return;
                }
                sprite = loadedSprite.imageData || loadedSprite.canvas;
                if (!sprite) return;
            } else {
                return;
            }
        }
        const drawX = Math.floor((x - this.cameraX) * this.scale);
        const drawY = Math.floor((y - this.cameraY) * this.scale);
        if (drawX + sprite.width * this.scale < 0 || drawX > this.canvasWidth ||
            drawY + sprite.height * this.scale < 0 || drawY > this.canvasHeight) {
            return;
        }
        
        this.ctx.save();
        
        if (flipX) {
            this.ctx.translate(drawX + sprite.width * this.scale, drawY);
            this.ctx.scale(-1, 1);
            this.ctx.translate(-drawX, -drawY);
        }
        
        if (sprite instanceof ImageData) {
            const tempCanvas = this._getOrCreateTempCanvas(sprite);
            this.ctx.drawImage(
                tempCanvas,
                0, 0, sprite.width, sprite.height,
                drawX, drawY, sprite.width * this.scale, sprite.height * this.scale
            );
        } else {
            this.ctx.drawImage(
                sprite,
                0, 0, sprite.width, sprite.height,
                drawX, drawY, sprite.width * this.scale, sprite.height * this.scale
            );
        }
        
        this.ctx.restore();
        if (this.debug) {
            this.drawDebugBox(drawX, drawY, sprite.width * this.scale, sprite.height * this.scale);
        }
    }
    
    drawRect(x, y, width, height, color, fill = true) {
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
    
    drawText(text, x, y, color = '#FFFFFF', alpha = 1) {
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
    
    drawTextCentered(text, centerX, y, color = '#FFFFFF', alpha = 1) {
        const textWidth = text.length * FONT.GRID;
        const x = centerX - Math.floor(textWidth / 2);
        this.drawText(text, x, y, color, alpha);
    }
    
    drawLine(x1, y1, x2, y2, color = '#FFFFFF', width = 1) {
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
    
    drawDebugBox(x, y, width, height) {
        this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x, y, width, height);
    }
    
    drawTilemap(tilemap, getTileSprite, tileSize, scale = 1) {
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
    
    isInView(x, y, width = 0, height = 0) {
        return x + width >= this.cameraX &&
               x <= this.cameraX + this.width &&
               y + height >= this.cameraY &&
               y <= this.cameraY + this.height;
    }
    
    worldToScreen(worldX, worldY) {
        return {
            x: Math.floor((worldX - this.cameraX) * this.scale),
            y: Math.floor((worldY - this.cameraY) * this.scale)
        };
    }
    
    screenToWorld(screenX, screenY) {
        return {
            x: (screenX / this.scale) + this.cameraX,
            y: (screenY / this.scale) + this.cameraY
        };
    }
    
    _getOrCreateTempCanvas(imageData) {
        const key = `${imageData.width}x${imageData.height}`;
        
        if (!this.spriteCache.has(key)) {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = imageData.width;
            tempCanvas.height = imageData.height;
            this.spriteCache.set(key, tempCanvas);
        }
        
        const tempCanvas = this.spriteCache.get(key);
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.putImageData(imageData, 0, 0);
        
        return tempCanvas;
    }
    
    setDebugMode(enabled) {
        this.debug = enabled;
    }
    
    resize(width, height) {
        this.canvasWidth = width;
        this.canvasHeight = height;
        this.canvas.width = width;
        this.canvas.height = height;
        this.width = GAME_RESOLUTION.WIDTH;
        this.height = GAME_RESOLUTION.HEIGHT;
        this.scale = Math.min(width / GAME_RESOLUTION.WIDTH, height / GAME_RESOLUTION.HEIGHT);
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.mozImageSmoothingEnabled = false;
        this.ctx.webkitImageSmoothingEnabled = false;
        this.ctx.msImageSmoothingEnabled = false;
    }
    
    fillRect(x, y, width, height, color) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, width, height);
    }
    
    strokeCircle(x, y, radius, color = '#FFFFFF', lineWidth = 1) {
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = lineWidth;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.stroke();
    }
}