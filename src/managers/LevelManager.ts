import { LevelLoader } from '../levels/LevelLoader';
import { EventBus } from '../services/EventBus';
import { TILE_SIZE } from '../constants/gameConstants';

export interface LevelData {
    width: number;
    height: number;
    tileSize: number;
    playerSpawn: { x: number; y: number };
    entities?: Array<{ type: string; x: number; y: number }>;
    backgroundColor?: string;
    timeLimit?: number;
}

export class LevelManager {
    private levelLoader: LevelLoader;
    private eventBus: EventBus;
    private physicsSystem: any;
    
    private currentLevel: string | null = null;
    private levelData: LevelData | null = null;
    private tileMap: number[][] = [];
    private levelWidth: number = 0;
    private levelHeight: number = 0;
    private backgroundColor: string = '#5C94FC';
    private timeLimit: number = 300;

    constructor(game: any) {
        this.levelLoader = new LevelLoader();
        this.eventBus = new EventBus();
        this.physicsSystem = game.physicsSystem;
    }

    async initialize(): Promise<void> {
        try {
            await this.levelLoader.loadStageList();
        } catch (error) {
            console.error('Failed to load stage list:', error);
        }
    }

    async loadLevel(levelName: string): Promise<void> {
        this.currentLevel = levelName;
        
        try {
            const levelData = await this.levelLoader.loadStage(levelName);
            this.levelData = levelData;
            
            // Create tile map
            this.tileMap = this.levelLoader.createTileMap(levelData);
            this.levelWidth = levelData.width * levelData.tileSize;
            this.levelHeight = levelData.height * levelData.tileSize;
            
            // Set physics tile map
            this.physicsSystem.setTileMap(this.tileMap, TILE_SIZE);
            
            // Extract level properties
            this.backgroundColor = this.levelLoader.getBackgroundColor(levelData) || '#5C94FC';
            this.timeLimit = this.levelLoader.getTimeLimit(levelData) || 300;
            
            // Emit level loaded event
            this.eventBus.emit('level:loaded', {
                name: levelName,
                width: this.levelWidth,
                height: this.levelHeight,
                backgroundColor: this.backgroundColor,
                timeLimit: this.timeLimit,
                playerSpawn: this.getPlayerSpawn(),
                entities: levelData.entities || []
            });
            
        } catch (error) {
            console.error('Failed to load level:', error);
            this.createTestLevel();
        }
    }

    getCurrentLevel(): string | null {
        return this.currentLevel;
    }

    getLevelData(): LevelData | null {
        return this.levelData;
    }

    getTileMap(): number[][] {
        return this.tileMap;
    }

    getLevelDimensions(): { width: number; height: number } {
        return {
            width: this.levelWidth,
            height: this.levelHeight
        };
    }

    getBackgroundColor(): string {
        return this.backgroundColor;
    }

    getTimeLimit(): number {
        return this.timeLimit;
    }

    getPlayerSpawn(): { x: number; y: number } {
        if (this.levelData && this.levelData.playerSpawn) {
            return {
                x: this.levelData.playerSpawn.x,
                y: this.levelData.playerSpawn.y
            };
        }
        return { x: 2, y: 10 }; // Default spawn
    }

    getEntities(): Array<{ type: string; x: number; y: number }> {
        return this.levelData?.entities || [];
    }

    // Get tile at world position
    getTileAt(worldX: number, worldY: number): number {
        const tileX = Math.floor(worldX / TILE_SIZE);
        const tileY = Math.floor(worldY / TILE_SIZE);
        
        if (tileY >= 0 && tileY < this.tileMap.length &&
            tileX >= 0 && tileX < this.tileMap[tileY].length) {
            return this.tileMap[tileY][tileX];
        }
        return 0;
    }

    // Check if position is solid
    isSolid(worldX: number, worldY: number): boolean {
        return this.getTileAt(worldX, worldY) === 1;
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
        this.backgroundColor = '#5C94FC';
        this.timeLimit = 300;

        this.physicsSystem.setTileMap(this.tileMap, TILE_SIZE);

        this.levelData = {
            width: this.tileMap[0].length,
            height: this.tileMap.length,
            tileSize: TILE_SIZE,
            playerSpawn: { x: 2, y: 10 }
        };

        this.eventBus.emit('level:loaded', {
            name: 'test',
            width: this.levelWidth,
            height: this.levelHeight,
            backgroundColor: this.backgroundColor,
            timeLimit: this.timeLimit,
            playerSpawn: this.getPlayerSpawn(),
            entities: []
        });
    }

    reset(): void {
        this.currentLevel = null;
        this.levelData = null;
        this.tileMap = [];
        this.levelWidth = 0;
        this.levelHeight = 0;
        this.backgroundColor = '#5C94FC';
        this.timeLimit = 300;
    }
}