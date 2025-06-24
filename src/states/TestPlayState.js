/**
 * テスト用のシンプルなPlayState
 */
import { GAME_RESOLUTION, TILE_SIZE } from '../constants/gameConstants.js';

export class TestPlayState {
    constructor(game) {
        this.game = game;
        this.player = null;
        this.tileMap = [];
    }
    
    enter() {
        console.log('TestPlayState: enter');
        
        // プレイヤー初期化
        this.player = {
            x: 64,
            y: 160,
            width: 16,
            height: 16,
            vx: 0,
            vy: 0,
            grounded: false
        };
        
        // シンプルなマップ
        this.tileMap = [];
        for (let y = 0; y < 15; y++) {
            this.tileMap[y] = [];
            for (let x = 0; x < 16; x++) {
                // 最下段2行を地面に
                this.tileMap[y][x] = (y >= 13) ? 1 : 0;
            }
        }
        
        // 中間にプラットフォーム追加
        this.tileMap[10][3] = 1;
        this.tileMap[10][4] = 1;
        this.tileMap[8][6] = 1;
        this.tileMap[8][7] = 1;
        this.tileMap[8][8] = 1;
    }
    
    update() {
        if (!this.player) return;
        
        // 入力処理（デバッグ付き）
        this.player.vx = 0;
        if (this.game.inputSystem.isActionPressed('left')) {
            this.player.vx = -2;
        }
        if (this.game.inputSystem.isActionPressed('right')) {
            this.player.vx = 2;
        }
        
        // ジャンプ（デバッグ付き）
        if (this.game.inputSystem.isActionJustPressed('jump') && this.player.grounded) {
            this.player.vy = -10;
            console.log('Jump!');
        }
        
        // 物理演算
        this.player.vy += 0.5;
        if (this.player.vy > 15) this.player.vy = 15;
        
        // 位置更新
        this.player.x += this.player.vx;
        this.player.y += this.player.vy;
        
        // 地面判定（シンプル版）
        this.player.grounded = false;
        const nextY = this.player.y + this.player.height;
        const tileY = Math.floor(nextY / TILE_SIZE);
        const tileX = Math.floor((this.player.x + this.player.width/2) / TILE_SIZE);
        
        if (tileY >= 0 && tileY < this.tileMap.length && 
            tileX >= 0 && tileX < this.tileMap[0].length) {
            if (this.tileMap[tileY][tileX] === 1) {
                this.player.y = (tileY * TILE_SIZE) - this.player.height;
                this.player.vy = 0;
                this.player.grounded = true;
            }
        }
        
        // 境界制限
        if (this.player.x < 0) this.player.x = 0;
        if (this.player.x > GAME_RESOLUTION.WIDTH - this.player.width) {
            this.player.x = GAME_RESOLUTION.WIDTH - this.player.width;
        }
    }
    
    render(renderer) {
        // 背景
        renderer.clear('#5C94FC');
        
        // タイルマップ - drawRectを使用してスケーリングを適用
        for (let y = 0; y < this.tileMap.length; y++) {
            for (let x = 0; x < this.tileMap[y].length; x++) {
                if (this.tileMap[y][x] === 1) {
                    renderer.drawRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE, '#00AA00');
                }
            }
        }
        
        // プレイヤー - drawRectを使用
        if (this.player) {
            renderer.drawRect(
                Math.floor(this.player.x),
                Math.floor(this.player.y),
                this.player.width,
                this.player.height,
                '#FF0000'
            );
        }
        
        // デバッグ情報
        renderer.drawText('TEST MODE', 8, 8, '#FFFF00');
        if (this.player) {
            renderer.drawText(`X:${Math.floor(this.player.x)} Y:${Math.floor(this.player.y)}`, 8, 24, '#FFFFFF');
            renderer.drawText(`GROUNDED:${this.player.grounded}`, 8, 40, '#FFFFFF');
        }
    }
    
    exit() {
        console.log('TestPlayState: exit');
    }
}