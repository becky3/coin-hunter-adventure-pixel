import { GAME_RESOLUTION } from '../constants/gameConstants';
import { PixelRenderer } from '../rendering/PixelRenderer';
import { EventBus } from '../services/EventBus';
import { UI_PALETTE_INDICES, getMasterColor } from '../utils/pixelArtPalette';

const HUD_BACKGROUND_HEIGHT = 24;
const HUD_BORDER_HEIGHT = 2;

export interface HUDData {
    score: number;
    lives: number;
    time: number;
    coinsCollected: number;
    playerX?: number;
    playerY?: number;
    stageName?: string;
}

interface GameServices {
    eventBus?: EventBus;
}

/**
 * Manages hud functionality
 */
export class HUDManager {
    private eventBus: EventBus;
    private hudData: HUDData;
    private isPaused: boolean = false;
    private _message: string | null = null;
    private _messageTimer: number = 0;
    private patternTileCache: Map<string, HTMLCanvasElement> = new Map();
    private hudBackgroundCanvas?: HTMLCanvasElement;
    private pauseBackgroundCanvas?: HTMLCanvasElement;

    constructor(_game: GameServices) {
        this.eventBus = _game.eventBus || new EventBus();
        
        this.hudData = {
            score: 0,
            lives: 3,
            time: 300,
            coinsCollected: 0
        };

        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        this.eventBus.on('coin:collected', (data: { score: number }) => {
            this.hudData.score += data.score;
            this.hudData.coinsCollected++;
        });


        this.eventBus.on('game:time-updated', (data: { time: number }) => {
            this.hudData.time = data.time;
        });

        this.eventBus.on('game:paused', () => {
            this.isPaused = true;
        });

        this.eventBus.on('game:resumed', () => {
            this.isPaused = false;
        });
    }

    updateTime(time: number): void {
        this.hudData.time = time;
    }

    updateLives(lives: number): void {
        this.hudData.lives = lives;
    }

    updateScore(score: number): void {
        this.hudData.score = score;
    }
    
    
    updateCoins(coins: number): void {
        this.hudData.coinsCollected = coins;
    }
    
    updateTimer(time: number): void {
        this.hudData.time = time;
    }
    
    updatePlayerPosition(x: number, y: number): void {
        this.hudData.playerX = Math.floor(x);
        this.hudData.playerY = Math.floor(y);
    }
    
    updateStageName(stageName: string): void {
        this.hudData.stageName = stageName;
    }
    
    initialize(): void {
        this.generateHUDBackground();
        this.generatePauseBackground();
    }
    
    cleanup(): void {
        this.patternTileCache.clear();
        this.hudBackgroundCanvas = undefined;
        this.pauseBackgroundCanvas = undefined;
    }
    
    private generateHUDBackground(): void {
        this.hudBackgroundCanvas = document.createElement('canvas');
        this.hudBackgroundCanvas.width = GAME_RESOLUTION.WIDTH;
        this.hudBackgroundCanvas.height = 26;
        const ctx = this.hudBackgroundCanvas.getContext('2d');
        if (!ctx) return;
        
        ctx.imageSmoothingEnabled = false;
        const blackColor = getMasterColor(UI_PALETTE_INDICES.black);
        ctx.fillStyle = blackColor;
        ctx.fillRect(0, 0, GAME_RESOLUTION.WIDTH, HUD_BACKGROUND_HEIGHT);
        ctx.fillRect(0, HUD_BACKGROUND_HEIGHT, GAME_RESOLUTION.WIDTH, HUD_BORDER_HEIGHT);
    }
    
    private generatePauseBackground(): void {
        const menuWidth = 200;
        const menuHeight = 100;
        
        this.pauseBackgroundCanvas = document.createElement('canvas');
        this.pauseBackgroundCanvas.width = menuWidth;
        this.pauseBackgroundCanvas.height = menuHeight;
        const ctx = this.pauseBackgroundCanvas.getContext('2d');
        if (!ctx) return;
        
        ctx.imageSmoothingEnabled = false;
        const blackColor = getMasterColor(UI_PALETTE_INDICES.black);
        ctx.fillStyle = blackColor;
        ctx.fillRect(0, 0, menuWidth, menuHeight);
    }
    
    showPauseOverlay(): void {
        this.isPaused = true;
    }
    
    hidePauseOverlay(): void {
        this.isPaused = false;
    }

    getHUDData(): HUDData {
        return this.hudData;
    }
    
    get message(): string | null {
        return this._message;
    }
    
    get messageTimer(): number {
        return this._messageTimer;
    }

    render(renderer: PixelRenderer): void {
        this.renderHUD(renderer);
        
        if (this._message) {
            this.renderMessage(renderer);
        } else if (this.isPaused) {
            this.renderPauseScreen(renderer);
        }
    }

    private renderHUD(renderer: PixelRenderer): void {
        if (this.hudBackgroundCanvas) {
            renderer.drawSprite(this.hudBackgroundCanvas, 0, 0, false);
        } else {
            const blackPattern = this.createSolidPattern(1);
            const blackColor = getMasterColor(UI_PALETTE_INDICES.black);
            
            for (let y = 0; y < 24; y += 8) {
                for (let x = 0; x < GAME_RESOLUTION.WIDTH; x += 8) {
                    this.drawPatternTile(renderer, x, y, blackPattern, blackColor);
                }
            }
            
            this.renderHorizontalBorder(renderer, 24);
        }

        renderer.drawText(`SCORE: ${this.hudData.score}`, 8, 8, getMasterColor(UI_PALETTE_INDICES.white));
        renderer.drawText(`LIVES: ${this.hudData.lives}`, 88, 8, getMasterColor(UI_PALETTE_INDICES.white));
        
        const minutes = Math.floor(this.hudData.time / 60);
        const seconds = this.hudData.time % 60;
        const timeStr = `TIME: ${minutes}:${seconds.toString().padStart(2, '0')}`;
        renderer.drawText(timeStr, 8, 16, getMasterColor(UI_PALETTE_INDICES.white));
        
        if (this.hudData.stageName) {
            renderer.drawText(this.hudData.stageName, 120, 16, getMasterColor(UI_PALETTE_INDICES.white));
        }
    }

    private renderPauseScreen(renderer: PixelRenderer): void {
        const menuWidth = 200;
        const menuHeight = 100;
        const menuX = (GAME_RESOLUTION.WIDTH - menuWidth) / 2;
        const menuY = (GAME_RESOLUTION.HEIGHT - menuHeight) / 2;
        
        if (this.pauseBackgroundCanvas) {
            renderer.drawSprite(this.pauseBackgroundCanvas, menuX, menuY, false);
        } else {
            const blackPattern = this.createSolidPattern(1);
            const blackColor = getMasterColor(UI_PALETTE_INDICES.black);
            
            for (let y = menuY; y < menuY + menuHeight; y += 8) {
                for (let x = menuX; x < menuX + menuWidth; x += 8) {
                    this.drawPatternTile(renderer, x, y, blackPattern, blackColor);
                }
            }
        }
        
        this.renderBoxBorder(renderer, menuX - 8, menuY - 8, menuWidth + 16, menuHeight + 16);

        renderer.drawTextCentered('PAUSED', GAME_RESOLUTION.WIDTH / 2, GAME_RESOLUTION.HEIGHT / 2 - 32, getMasterColor(UI_PALETTE_INDICES.white));
        renderer.drawTextCentered('PRESS ESC TO RESUME', GAME_RESOLUTION.WIDTH / 2, GAME_RESOLUTION.HEIGHT / 2 - 8, getMasterColor(UI_PALETTE_INDICES.white));
        renderer.drawTextCentered('PRESS Q TO QUIT', GAME_RESOLUTION.WIDTH / 2, GAME_RESOLUTION.HEIGHT / 2 + 16, getMasterColor(UI_PALETTE_INDICES.white));
    }

    private renderHorizontalBorder(renderer: PixelRenderer, y: number): void {
        const blackPattern = this.createSolidPattern(1);
        const blackColor = getMasterColor(UI_PALETTE_INDICES.black);
        
        for (let x = 0; x < GAME_RESOLUTION.WIDTH; x += 8) {
            this.drawPatternTile(renderer, x, y - 2, blackPattern, blackColor);
        }
    }

    private renderBoxBorder(renderer: PixelRenderer, x: number, y: number, width: number, height: number): void {
        const blackPattern = this.createSolidPattern(1);
        const blackColor = getMasterColor(UI_PALETTE_INDICES.black);

        for (let i = x; i < x + width; i += 8) {
            this.drawPatternTile(renderer, i, y, blackPattern, blackColor);
        }

        for (let i = x; i < x + width; i += 8) {
            this.drawPatternTile(renderer, i, y + height - 8, blackPattern, blackColor);
        }

        for (let i = y + 8; i < y + height - 8; i += 8) {
            this.drawPatternTile(renderer, x, i, blackPattern, blackColor);
        }

        for (let i = y + 8; i < y + height - 8; i += 8) {
            this.drawPatternTile(renderer, x + width - 8, i, blackPattern, blackColor);
        }
    }

    private createSolidPattern(value: number): number[][] {
        const pattern: number[][] = [];
        for (let i = 0; i < 8; i++) {
            pattern.push([value, value, value, value, value, value, value, value]);
        }
        return pattern;
    }

    private drawPatternTile(renderer: PixelRenderer, x: number, y: number, pattern: number[][], color: string): void {
        const cacheKey = `${JSON.stringify(pattern)}_${color}`;
        let tileCanvas = this.patternTileCache.get(cacheKey);
        
        if (!tileCanvas) {
            const tileSize = 8;
            tileCanvas = document.createElement('canvas');
            tileCanvas.width = tileSize;
            tileCanvas.height = tileSize;
            const ctx = tileCanvas.getContext('2d');
            if (!ctx) return;
            
            const imageData = new ImageData(tileSize, tileSize);
            const data = imageData.data;

            let r = 255, g = 255, b = 255;
            if (color && color.startsWith('#')) {
                const hex = color.slice(1);
                r = parseInt(hex.substr(0, 2), 16);
                g = parseInt(hex.substr(2, 2), 16);
                b = parseInt(hex.substr(4, 2), 16);
            }
            
            for (let py = 0; py < tileSize; py++) {
                for (let px = 0; px < tileSize; px++) {
                    const idx = (py * tileSize + px) * 4;
                    if (pattern[py][px] === 1) {
                        data[idx] = r;
                        data[idx + 1] = g;
                        data[idx + 2] = b;
                        data[idx + 3] = 255;
                    } else {
                        data[idx + 3] = 0;
                    }
                }
            }
            
            ctx.putImageData(imageData, 0, 0);
            this.patternTileCache.set(cacheKey, tileCanvas);
        }
        
        renderer.drawSprite(tileCanvas, x, y, false);
    }

    setPaused(paused: boolean): void {
        this.isPaused = paused;
    }

    showMessage(text: string, duration: number = 3000): void {
        this._message = text;
        this._messageTimer = duration;
    }
    
    update(deltaTime: number): void {
        if (this._messageTimer > 0) {
            this._messageTimer -= deltaTime * 1000;
            if (this._messageTimer <= 0) {
                this._message = null;
            }
        }
    }
    
    private renderMessage(renderer: PixelRenderer): void {
        const centerX = GAME_RESOLUTION.WIDTH / 2;
        const centerY = GAME_RESOLUTION.HEIGHT / 2;
        
        const lines = this._message ? this._message.split('\n') : [];
        const lineHeight = 16;
        
        const bgWidth = 240;
        const bgHeight = 40 + (lines.length - 1) * lineHeight;
        const bgX = centerX - bgWidth / 2;
        const bgY = centerY - bgHeight / 2;
        
        renderer.drawRect(bgX, bgY, bgWidth, bgHeight, getMasterColor(UI_PALETTE_INDICES.black));
        renderer.drawRect(bgX + 2, bgY + 2, bgWidth - 4, bgHeight - 4, getMasterColor(UI_PALETTE_INDICES.gold));
        renderer.drawRect(bgX + 4, bgY + 4, bgWidth - 8, bgHeight - 8, getMasterColor(UI_PALETTE_INDICES.black));
        
        if (lines.length > 0) {
            const textStartY = centerY - ((lines.length - 1) * lineHeight) / 2;
            lines.forEach((line, index) => {
                renderer.drawTextCentered(line, centerX, textStartY + index * lineHeight - 4, getMasterColor(UI_PALETTE_INDICES.gold));
            });
        }
    }

    reset(): void {
        this.hudData = {
            score: 0,
            lives: 3,
            time: 300,
            coinsCollected: 0
        };
        this.isPaused = false;
        this._message = null;
        this._messageTimer = 0;
    }
}