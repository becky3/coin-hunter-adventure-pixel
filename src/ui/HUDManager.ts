import { GAME_RESOLUTION } from '../constants/gameConstants';
import { PixelRenderer } from '../rendering/PixelRenderer';
import { EventBus } from '../services/EventBus';

export interface HUDData {
    score: number;
    lives: number;
    time: number;
    coinsCollected: number;
}

export class HUDManager {
    private eventBus: EventBus;
    private hudData: HUDData;
    private isPaused: boolean = false;

    constructor(_game: any) {
        this.eventBus = new EventBus();
        
        this.hudData = {
            score: 0,
            lives: 3,
            time: 300,
            coinsCollected: 0
        };

        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        // Listen for game events
        this.eventBus.on('coin:collected', (data: any) => {
            this.hudData.score += data.score;
            this.hudData.coinsCollected++;
        });

        this.eventBus.on('player:health-changed', (data: any) => {
            this.hudData.lives = data.health;
        });

        this.eventBus.on('game:time-updated', (data: any) => {
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

    getHUDData(): HUDData {
        return this.hudData;
    }

    render(renderer: PixelRenderer): void {
        this.renderHUD(renderer);
        
        if (this.isPaused) {
            this.renderPauseScreen(renderer);
        }
    }

    private renderHUD(renderer: PixelRenderer): void {
        // Black background for HUD area
        const blackPattern = this.createSolidPattern(1);
        
        for (let y = 0; y < 24; y += 8) {
            for (let x = 0; x < GAME_RESOLUTION.WIDTH; x += 8) {
                this.drawPatternTile(renderer, x, y, blackPattern, '#000000');
            }
        }
        
        // Bottom border of HUD
        this.renderHorizontalBorder(renderer, 24);

        // Render HUD text
        renderer.drawText(`SCORE: ${this.hudData.score}`, 8, 8, '#FFFFFF');
        renderer.drawText(`LIVES: ${this.hudData.lives}`, 88, 8, '#FFFFFF');
        
        const minutes = Math.floor(this.hudData.time / 60);
        const seconds = this.hudData.time % 60;
        const timeStr = `TIME: ${minutes}:${seconds.toString().padStart(2, '0')}`;
        renderer.drawText(timeStr, 152, 8, '#FFFFFF');
    }

    private renderPauseScreen(renderer: PixelRenderer): void {
        const menuWidth = 200;
        const menuHeight = 100;
        const menuX = (GAME_RESOLUTION.WIDTH - menuWidth) / 2;
        const menuY = (GAME_RESOLUTION.HEIGHT - menuHeight) / 2;
        
        const blackPattern = this.createSolidPattern(1);
        
        // Draw pause menu background
        for (let y = menuY; y < menuY + menuHeight; y += 8) {
            for (let x = menuX; x < menuX + menuWidth; x += 8) {
                this.drawPatternTile(renderer, x, y, blackPattern, '#000000');
            }
        }
        
        // Draw pause menu border
        this.renderBoxBorder(renderer, menuX - 8, menuY - 8, menuWidth + 16, menuHeight + 16);

        // Draw pause menu text
        renderer.drawTextCentered('PAUSED', GAME_RESOLUTION.WIDTH / 2, GAME_RESOLUTION.HEIGHT / 2 - 32, '#FFFFFF');
        renderer.drawTextCentered('PRESS ESC TO RESUME', GAME_RESOLUTION.WIDTH / 2, GAME_RESOLUTION.HEIGHT / 2 - 8, '#FFFFFF');
        renderer.drawTextCentered('PRESS Q TO QUIT', GAME_RESOLUTION.WIDTH / 2, GAME_RESOLUTION.HEIGHT / 2 + 16, '#FFFFFF');
    }

    private renderHorizontalBorder(renderer: PixelRenderer, y: number): void {
        const blackPattern = this.createSolidPattern(1);
        
        for (let x = 0; x < GAME_RESOLUTION.WIDTH; x += 8) {
            this.drawPatternTile(renderer, x, y - 2, blackPattern, '#000000');
        }
    }

    private renderBoxBorder(renderer: PixelRenderer, x: number, y: number, width: number, height: number): void {
        const blackPattern = this.createSolidPattern(1);

        // Top border
        for (let i = x; i < x + width; i += 8) {
            this.drawPatternTile(renderer, i, y, blackPattern, '#000000');
        }

        // Bottom border
        for (let i = x; i < x + width; i += 8) {
            this.drawPatternTile(renderer, i, y + height - 8, blackPattern, '#000000');
        }

        // Left border
        for (let i = y + 8; i < y + height - 8; i += 8) {
            this.drawPatternTile(renderer, x, i, blackPattern, '#000000');
        }

        // Right border
        for (let i = y + 8; i < y + height - 8; i += 8) {
            this.drawPatternTile(renderer, x + width - 8, i, blackPattern, '#000000');
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
        const tileSize = 8;
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
        
        renderer.drawSprite(imageData, x, y, false);
    }

    setPaused(paused: boolean): void {
        this.isPaused = paused;
    }

    reset(): void {
        this.hudData = {
            score: 0,
            lives: 3,
            time: 300,
            coinsCollected: 0
        };
        this.isPaused = false;
    }
}