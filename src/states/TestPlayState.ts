import { GAME_RESOLUTION, TILE_SIZE } from '../constants/gameConstants';
import { GameState } from './GameStateManager';
import { PixelRenderer } from '../rendering/PixelRenderer';
import { Logger } from '../utils/Logger';
import { InputSystem } from '../core/InputSystem';
import { TEST_TILE_PALETTE } from '../rendering/CommonPalettes';
import { GameStates } from '../types/GameStateTypes';

interface TestPlayer {
    x: number;
    y: number;
    width: number;
    height: number;
    vx: number;
    vy: number;
    grounded: boolean;
}

interface Game {
    inputSystem: InputSystem;
}

/**
 * Game state for testplay mode
 */
export class TestPlayState implements GameState {
    public name = GameStates.TEST_PLAY;
    private game: Game;
    private player: TestPlayer | null;
    private tileMap: number[][];
    
    constructor(game: Game) {
        this.game = game;
        this.player = null;
        this.tileMap = [];
    }
    
    enter(): void {
        Logger.log('TestPlayState: enter');

        this.player = {
            x: 64,
            y: 160,
            width: 16,
            height: 16,
            vx: 0,
            vy: 0,
            grounded: false
        };

        this.tileMap = [];
        for (let y = 0; y < 15; y++) {
            this.tileMap[y] = [];
            for (let x = 0; x < 16; x++) {
                const row = this.tileMap[y];
                if (row) {
                    row[x] = (y >= 13) ? 1 : 0;
                }
            }
        }

        const row10 = this.tileMap[10];
        const row8 = this.tileMap[8];
        if (row10) {
            row10[3] = 1;
            row10[4] = 1;
        }
        if (row8) {
            row8[6] = 1;
            row8[7] = 1;
            row8[8] = 1;
        }
    }
    
    update(): void {
        if (!this.player) return;

        this.player.vx = 0;
        if (this.game.inputSystem.isActionPressed('left')) {
            this.player.vx = -2;
        }
        if (this.game.inputSystem.isActionPressed('right')) {
            this.player.vx = 2;
        }

        if (this.game.inputSystem.isActionJustPressed('jump') && this.player.grounded) {
            this.player.vy = -10;
            Logger.log('Jump!');
        }

        this.player.vy += 0.5;
        if (this.player.vy > 15) this.player.vy = 15;

        this.player.x += this.player.vx;
        this.player.y += this.player.vy;

        this.player.grounded = false;
        const nextY = this.player.y + this.player.height;
        const tileY = Math.floor(nextY / TILE_SIZE);
        const tileX = Math.floor((this.player.x + this.player.width/2) / TILE_SIZE);
        
        if (tileY >= 0 && tileY < this.tileMap.length && tileX >= 0) {
            const tileRow = this.tileMap[tileY];
            if (tileRow && tileX < tileRow.length && tileRow[tileX] === 1) {
                this.player.y = (tileY * TILE_SIZE) - this.player.height;
                this.player.vy = 0;
                this.player.grounded = true;
            }
        }

        if (this.player.x < 0) this.player.x = 0;
        if (this.player.x > GAME_RESOLUTION.WIDTH - this.player.width) {
            this.player.x = GAME_RESOLUTION.WIDTH - this.player.width;
        }
    }
    
    render(renderer: PixelRenderer): void {

        renderer.clear(0, 0);

        for (let y = 0; y < this.tileMap.length; y++) {
            const tileRow = this.tileMap[y];
            if (!tileRow) continue;
            
            for (let x = 0; x < tileRow.length; x++) {
                if (tileRow[x] === 1) {
                    const tileColor = TEST_TILE_PALETTE.default.colors[1];
                    renderer.drawRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE, tileColor);
                }
            }
        }

        if (this.player) {
            const playerColor = TEST_TILE_PALETTE.default.colors[2];
            renderer.drawRect(
                Math.floor(this.player.x),
                Math.floor(this.player.y),
                this.player.width,
                this.player.height,
                playerColor
            );
        }

        const titleColor = TEST_TILE_PALETTE.default.colors[2];
        const infoColor = TEST_TILE_PALETTE.default.colors[3];
        
        renderer.drawText('TEST MODE', 8, 8, titleColor);
        if (this.player) {
            renderer.drawText(`X:${Math.floor(this.player.x)} Y:${Math.floor(this.player.y)}`, 8, 24, infoColor);
            renderer.drawText(`GROUNDED:${this.player.grounded}`, 8, 40, infoColor);
        }
    }
    
    exit(): void {
        Logger.log('TestPlayState: exit');
    }
}