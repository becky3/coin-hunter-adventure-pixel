
import { GAME_RESOLUTION, TILE_SIZE } from '../constants/gameConstants';
import { LevelLoader } from '../levels/LevelLoader.js';
import { Player } from '../entities/Player';
import { Slime } from '../entities/enemies/Slime';
import { Coin } from '../entities/Coin';
import { Spring } from '../entities/Spring';
import { GoalFlag } from '../entities/GoalFlag';
import { GameState } from './GameStateManager';
import { PixelRenderer } from '../rendering/PixelRenderer';
import { Entity } from '../entities/Entity';
import { Enemy } from '../entities/Enemy';
import { InputEvent } from '../core/InputSystem';

interface Camera {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface LevelData {
    width: number;
    height: number;
    tileSize: number;
    playerSpawn: { x: number; y: number };
    entities?: Array<{ type: string; x: number; y: number }>;
}

interface Game {
    renderer?: PixelRenderer;
    inputSystem: any;
    musicSystem?: any;
    stateManager: any;
    physicsSystem: any;
    assetLoader?: any;
    frameCount?: number;
    player?: Player;
    entities?: Entity[];
    camera?: Camera;
}

declare global {
    interface Window {
        debugWarp?: (x: number, y: number, tileCoords?: boolean) => void;
    }
}

export class PlayState implements GameState {
    public name = 'play';
    private game: Game;

    private score: number;
    private lives: number;
    private time: number;
    private coinsCollected: number;
    private isPaused: boolean;

    private player: Player | null;
    private enemies: Enemy[];
    private items: Entity[];
    private platforms: Entity[];

    private levelLoader: LevelLoader;
    private currentLevel: string | null;
    private levelData: LevelData | null;
    private tileMap: number[][];
    private levelWidth: number;
    private levelHeight: number;
    private backgroundColor?: string;

    private camera: Camera;

    private lastTimeUpdate: number;

    private inputListeners: Array<() => void>;

    constructor(game: Game) {
        this.game = game;

        this.score = 0;
        this.lives = 3;
        this.time = 300;
        this.coinsCollected = 0;
        this.isPaused = false;

        this.player = null;
        this.enemies = [];
        this.items = [];
        this.platforms = [];

        this.levelLoader = new LevelLoader();
        this.currentLevel = null;
        this.levelData = null;
        this.tileMap = [];
        this.levelWidth = 0;
        this.levelHeight = 0;

        this.camera = {
            x: 0,
            y: 0,
            width: GAME_RESOLUTION.WIDTH,
            height: GAME_RESOLUTION.HEIGHT
        };

        this.lastTimeUpdate = Date.now();

        this.inputListeners = [];

        if (typeof window !== 'undefined') {
            window.debugWarp = (x: number, y: number, tileCoords?: boolean) => this.debugWarp(x, y, tileCoords);
        }
    }

    private async preloadSprites(): Promise<void> {
        
        try {

            await this.game.assetLoader.loadSprite('terrain', 'spring');
            await this.game.assetLoader.loadSprite('terrain', 'goal_flag');

            await this.game.assetLoader.loadSprite('items', 'coin_spin1');
            await this.game.assetLoader.loadSprite('items', 'coin_spin2');
            await this.game.assetLoader.loadSprite('items', 'coin_spin3');
            await this.game.assetLoader.loadSprite('items', 'coin_spin4');
            
        } catch (error) {
            console.error('Failed to preload sprites:', error);
        }
    }

    async enter(params: any = {}): Promise<void> {

        await this.preloadSprites();

        this.game.physicsSystem.entities.clear();

        try {
            await this.levelLoader.loadStageList();
        } catch (error) {
            console.error('Failed to load stage list:', error);
        }

        this.currentLevel = params.level || 'tutorial';
        await this.loadLevel(this.currentLevel);

        this.initializePlayer();

        this.initializeEnemies();

        this.initializeItems();

        this.setupInputListeners();

        this.lastTimeUpdate = Date.now();

        if (this.game.musicSystem && this.game.musicSystem.isInitialized) {
            this.game.musicSystem.playGameBGM();
        }
    }

    update(deltaTime: number): void {
        if (this.isPaused) return;

        this.updateTimer();

        this.game.physicsSystem.update(deltaTime);

        if (this.player) {
            this.player.update(deltaTime);

            this.lives = this.player.health;

            if (this.player.x < 0) this.player.x = 0;
            if (this.player.x + this.player.width > this.levelWidth) {
                this.player.x = this.levelWidth - this.player.width;
            }

            if (this.player.y > this.levelHeight) {
                this.player.takeDamage(this.player.maxHealth);
                
                if (this.player.health > 0) {
                    this.player.respawn(
                        this.levelData!.playerSpawn.x * TILE_SIZE,
                        this.levelData!.playerSpawn.y * TILE_SIZE
                    );
                }
            }
        }

        this.enemies.forEach(enemy => {
            if (enemy.update) {
                enemy.update(deltaTime);
            }
        });

        this.items.forEach(item => item.update && item.update(deltaTime));

        this.checkCoinCollection();

        this.updateCamera();

        if (this.time <= 0 || this.lives <= 0) {
            this.gameOver();
        }
    }

    render(renderer: PixelRenderer): void {

        renderer.clear(this.backgroundColor || '#5C94FC');

        renderer.setCamera(this.camera.x, this.camera.y);

        this.renderTileMap(renderer);

        this.items.forEach(item => item.render && item.render(renderer));
        this.enemies.forEach(enemy => enemy.render && enemy.render(renderer));

        if (this.player) {
            this.player.render(renderer);
        }

        renderer.setCamera(0, 0);

        this.renderHUD(renderer);

        if (this.isPaused) {
            this.renderPauseScreen(renderer);
        }
    }

    exit(): void {

        this.isPaused = false;

        this.removeInputListeners();

        if (this.game.musicSystem) {
            this.game.musicSystem.stopBGM();
        }

        if (this.game.physicsSystem) {
            this.game.physicsSystem.entities.clear();
            this.game.physicsSystem.tileMap = null;
        }

        this.player = null;
        this.enemies = [];
        this.items = [];
        this.platforms = [];
    }

    private async loadLevel(levelName: string): Promise<void> {
        
        try {

            const levelData = await this.levelLoader.loadStage(levelName);
            this.levelData = levelData;

            this.tileMap = this.levelLoader.createTileMap(levelData);
            this.levelWidth = levelData.width * levelData.tileSize;
            this.levelHeight = levelData.height * levelData.tileSize;

            this.game.physicsSystem.setTileMap(this.tileMap, TILE_SIZE);

            this.backgroundColor = this.levelLoader.getBackgroundColor(levelData);

            this.time = this.levelLoader.getTimeLimit(levelData);

            const spawn = this.levelLoader.getPlayerSpawn(levelData);
            if (this.player) {
                this.player.x = spawn.x * TILE_SIZE;
                this.player.y = spawn.y * TILE_SIZE;
            }
            
            // TODO: Entity generation

        } catch (error) {
            console.error('Failed to load level:', error);

            this.createTestLevel();
        }
    }

    private createTestLevel(): void {

        this.tileMap = [
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,1,1,0,0,0,0,0,1,1,1,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
        ];

        this.levelWidth = this.tileMap[0].length * TILE_SIZE;
        this.levelHeight = this.tileMap.length * TILE_SIZE;

        this.game.physicsSystem.setTileMap(this.tileMap, TILE_SIZE);
    }

    private initializePlayer(): void {

        let spawnX = 64;
        let spawnY = 160;
        
        if (this.levelData && this.levelData.playerSpawn) {
            spawnX = this.levelData.playerSpawn.x * TILE_SIZE;
            spawnY = this.levelData.playerSpawn.y * TILE_SIZE;
        }
        
        this.player = new Player(spawnX, spawnY);
        this.player.setInputManager(this.game.inputSystem);
        this.player.setMusicSystem(this.game.musicSystem);
        this.player.setAssetLoader(this.game.assetLoader);

        this.game.physicsSystem.addEntity(this.player, this.game.physicsSystem.layers.PLAYER);
    }

    private initializeEnemies(): void {

        this.enemies = [];

        const slime1 = new Slime(150, 180);
        slime1.direction = -1;
        this.enemies.push(slime1);
        this.game.physicsSystem.addEntity(slime1, this.game.physicsSystem.layers.ENEMY);
        
        const slime2 = new Slime(200, 100);
        slime2.direction = -1;
        this.enemies.push(slime2);
        this.game.physicsSystem.addEntity(slime2, this.game.physicsSystem.layers.ENEMY);

        // TODO: PixelArtRendererを使用してスプライトを読み込む
    }

    private initializeItems(): void {

        this.items = [];

        if (this.levelData && this.levelData.entities) {
            this.levelData.entities.forEach(entity => {
                let item: Entity | null = null;
                
                switch (entity.type) {
                case 'coin':
                    item = new Coin(
                        entity.x * TILE_SIZE,
                        entity.y * TILE_SIZE
                    );
                    break;
                        
                case 'spring':
                    item = new Spring(
                        entity.x * TILE_SIZE,
                        entity.y * TILE_SIZE
                    );

                    this.game.physicsSystem.addEntity(item, this.game.physicsSystem.layers.ITEM);
                    break;
                        
                case 'goal':
                    item = new GoalFlag(
                        entity.x * TILE_SIZE,
                        entity.y * TILE_SIZE
                    );
                    break;
                }
                
                if (item) {
                    this.items.push(item);
                }
            });
        }

        if (!this.levelData || this.items.length === 0) {

            const spring = new Spring(5 * TILE_SIZE, 10 * TILE_SIZE);
            this.items.push(spring);
            this.game.physicsSystem.addEntity(spring, this.game.physicsSystem.layers.ITEM);

            const goal = new GoalFlag(17 * TILE_SIZE, 12 * TILE_SIZE);
            this.items.push(goal);
        }
    }

    private checkItemCollisions(): void {
        if (!this.player) return;
        
        this.items.forEach((item) => {

            if (item.constructor.name === 'Coin' && !(item as Coin).isCollected()) {
                if (item.collidesWith(this.player!)) {

                    const scoreGained = (item as Coin).collect();
                    this.score += scoreGained;
                    this.coinsCollected++;

                    if (this.game.musicSystem && this.game.musicSystem.isInitialized) {
                        this.game.musicSystem.playCoinSound();
                    }
                    
                    console.log(`Coin collected! Score: ${this.score}, Total coins: ${this.coinsCollected}`);
                }
            }

            else if (item.constructor.name === 'GoalFlag' && !(item as GoalFlag).isCleared()) {
                if (item.collidesWith(this.player!)) {

                    (item as GoalFlag).clear();

                    if (this.game.musicSystem && this.game.musicSystem.isInitialized) {
                        this.game.musicSystem.playGoalSound();
                    }
                    
                    console.log('Stage Clear!');

                    // TODO: リザルト画面への遷移を実装
                    this.stageClear();
                }
            }
        });

        this.items = this.items.filter(item => {
            if (item.constructor.name === 'Coin') {
                return !(item as Coin).isCollected();
            }
            return true;
        });
    }

    private checkCoinCollection(): void {
        this.checkItemCollisions();
    }

    private setupInputListeners(): void {

        this.inputListeners.push(
            this.game.inputSystem.on('keyPress', (event: InputEvent) => {
                if (event.action === 'escape') {
                    this.togglePause();
                }
            })
        );

        this.inputListeners.push(
            this.game.inputSystem.on('keyPress', (event: InputEvent) => {
                if (this.isPaused && event.key === 'KeyQ') {
                    this.gameOver();
                }
            })
        );
    }

    private removeInputListeners(): void {
        this.inputListeners.forEach(removeListener => removeListener());
        this.inputListeners = [];
    }

    private updateTimer(): void {
        const now = Date.now();
        const elapsed = (now - this.lastTimeUpdate) / 1000;
        
        if (elapsed >= 1) {
            this.time -= 1;
            this.lastTimeUpdate = now;
        }
    }

    private updateCamera(): void {
        if (!this.player) return;

        this.camera.x = this.player.x + this.player.width / 2 - this.camera.width / 2;
        this.camera.y = this.player.y + this.player.height / 2 - this.camera.height / 2;

        if (this.camera.x < 0) this.camera.x = 0;
        if (this.camera.x + this.camera.width > this.levelWidth) {
            this.camera.x = this.levelWidth - this.camera.width;
        }
        
        if (this.camera.y < 0) this.camera.y = 0;
        if (this.camera.y + this.camera.height > this.levelHeight) {
            this.camera.y = this.levelHeight - this.camera.height;
        }
    }

    private checkTileCollisions(): void {

    }

    private renderTileMap(renderer: PixelRenderer): void {
        if (!this.tileMap) {
            console.warn('No tileMap available');
            return;
        }
        
        const startCol = Math.floor(this.camera.x / TILE_SIZE);
        const endCol = Math.ceil((this.camera.x + this.camera.width) / TILE_SIZE);
        const startRow = Math.floor(this.camera.y / TILE_SIZE);
        const endRow = Math.ceil((this.camera.y + this.camera.height) / TILE_SIZE);
        
        for (let row = startRow; row < endRow && row < this.tileMap.length; row++) {
            for (let col = startCol; col < endCol && col < this.tileMap[row].length; col++) {
                const tile = this.tileMap[row][col];
                
                if (tile === 1) {

                    renderer.drawRect(
                        col * TILE_SIZE,
                        row * TILE_SIZE,
                        TILE_SIZE,
                        TILE_SIZE,
                        '#228B22'
                    );
                }
            }
        }
    }

    private renderHUD(renderer: PixelRenderer): void {
        const blackPattern = [
            [1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1]
        ];
        
        for (let y = 0; y < 24; y += 8) {
            for (let x = 0; x < GAME_RESOLUTION.WIDTH; x += 8) {
                this.drawPatternTile(renderer, x, y, blackPattern, '#000000');
            }
        }
        
        this.renderHorizontalBorder(renderer, 24);

        renderer.drawText(`SCORE: ${this.score}`, 8, 8, '#FFFFFF');
        renderer.drawText(`LIVES: ${this.lives}`, 88, 8, '#FFFFFF');
        
        const minutes = Math.floor(this.time / 60);
        const seconds = this.time % 60;
        const timeStr = `TIME: ${minutes}:${seconds.toString().padStart(2, '0')}`;
        renderer.drawText(timeStr, 152, 8, '#FFFFFF');
    }

    private renderPauseScreen(renderer: PixelRenderer): void {

        const menuWidth = 200;
        const menuHeight = 100;
        const menuX = (GAME_RESOLUTION.WIDTH - menuWidth) / 2;
        const menuY = (GAME_RESOLUTION.HEIGHT - menuHeight) / 2;
        
        const blackPattern = [
            [1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1]
        ];
        
        for (let y = menuY; y < menuY + menuHeight; y += 8) {
            for (let x = menuX; x < menuX + menuWidth; x += 8) {
                this.drawPatternTile(renderer, x, y, blackPattern, '#000000');
            }
        }
        
        this.renderBoxBorder(renderer, menuX - 8, menuY - 8, menuWidth + 16, menuHeight + 16);

        renderer.drawTextCentered('PAUSED', GAME_RESOLUTION.WIDTH / 2, GAME_RESOLUTION.HEIGHT / 2 - 32, '#FFFFFF');
        renderer.drawTextCentered('PRESS ESC TO RESUME', GAME_RESOLUTION.WIDTH / 2, GAME_RESOLUTION.HEIGHT / 2 - 8, '#FFFFFF');
        renderer.drawTextCentered('PRESS Q TO QUIT', GAME_RESOLUTION.WIDTH / 2, GAME_RESOLUTION.HEIGHT / 2 + 16, '#FFFFFF');
    }

    private togglePause(): void {
        this.isPaused = !this.isPaused;
        
        if (this.isPaused) {
            if (this.game.musicSystem) {
                this.game.musicSystem.pauseBGM();
            }
        } else {
            if (this.game.musicSystem && this.game.musicSystem.isInitialized) {
                this.game.musicSystem.resumeBGM();
            }
        }
    }

    private gameOver(): void {
        console.log('Game Over!');

        this.game.stateManager.setState('menu');
    }

    private stageClear(): void {
        console.log('Stage Clear!');
        // TODO: リザルト画面への遷移を実装

        this.game.stateManager.setState('menu');
    }

    private debugWarp(x: number, y: number, tileCoords: boolean = false): void {
        if (!this.player) {
            console.warn('Player not found');
            return;
        }

        const pixelX = tileCoords ? x * TILE_SIZE : x;
        const pixelY = tileCoords ? y * TILE_SIZE : y;

        this.player.x = pixelX;
        this.player.y = pixelY;
        this.player.vx = 0;
        this.player.vy = 0;
        this.player.grounded = false;

        this.updateCamera();
        
        console.log(`Player warped to (${pixelX}, ${pixelY})`);
    }

    private async loadUISprites(): Promise<void> {
        try {
            if (this.game.assetLoader) {
                await this.game.assetLoader.loadSprite('ui', 'border_horizontal', 1);
                await this.game.assetLoader.loadSprite('ui', 'border_vertical', 1);
                await this.game.assetLoader.loadSprite('ui', 'border_corner', 1);
            }
        } catch (error) {
            console.warn('UI sprites loading error:', error);
        }
    }

    private renderHorizontalBorder(renderer: PixelRenderer, y: number): void {
        const blackPattern = [
            [1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1]
        ];
        
        for (let x = 0; x < GAME_RESOLUTION.WIDTH; x += 8) {
            this.drawPatternTile(renderer, x, y - 2, blackPattern, '#000000');
        }
    }

    private renderBoxBorder(renderer: PixelRenderer, x: number, y: number, width: number, height: number): void {
        const blackPattern = [
            [1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1]
        ];

        for (let i = x; i < x + width; i += 8) {
            this.drawPatternTile(renderer, i, y, blackPattern, '#000000');
        }

        for (let i = x; i < x + width; i += 8) {
            this.drawPatternTile(renderer, i, y + height - 8, blackPattern, '#000000');
        }

        for (let i = y + 8; i < y + height - 8; i += 8) {
            this.drawPatternTile(renderer, x, i, blackPattern, '#000000');
        }

        for (let i = y + 8; i < y + height - 8; i += 8) {
            this.drawPatternTile(renderer, x + width - 8, i, blackPattern, '#000000');
        }
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
    
}