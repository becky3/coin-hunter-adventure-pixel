import { LevelLoader } from '../levels/LevelLoader';
import { EventBus } from '../services/EventBus';
import { TILE_SIZE } from '../constants/gameConstants';
import { PhysicsSystem } from '../physics/PhysicsSystem';
import { Logger } from '../utils/Logger';

export interface LevelData {
    name?: string;
    width: number;
    height: number;
    tileSize: number;
    playerSpawn: { x: number; y: number };
    entities?: Array<{ type: string; x: number; y: number }>;
    backgroundColor: number;
    timeLimit: number;
    goal: { x: number; y: number };
}

interface GameServices {
    eventBus?: EventBus;
    physicsSystem: PhysicsSystem;
}

/**
 * Manages level functionality
 */
export class LevelManager {
    private levelLoader: LevelLoader;
    private eventBus: EventBus;
    private physicsSystem: PhysicsSystem;
    
    private currentLevel: string | null = null;
    private levelData: LevelData | null = null;
    private tileMap: number[][] = [];
    private levelWidth: number = 0;
    private levelHeight: number = 0;
    private backgroundColorIndex: number = 0x12;
    private timeLimit: number = 300;
    
    private static readonly MAX_AREAS_PER_STAGE = 3;
    private static readonly MAX_STAGES = 1;

    constructor(game: GameServices) {
        this.levelLoader = new LevelLoader();
        this.eventBus = game.eventBus || new EventBus();
        this.physicsSystem = game.physicsSystem;
    }

    async initialize(): Promise<void> {
        try {
            await this.levelLoader.loadStageList();
        } catch (error) {
            Logger.error('Failed to load stage list:', error);
        }
    }

    async loadLevel(levelName: string): Promise<void> {
        this.currentLevel = levelName;
        
        try {
            const levelData = await this.levelLoader.loadStage(levelName);
            this.levelData = levelData;
            
            this.tileMap = this.levelLoader.createTileMap(levelData);
            this.levelWidth = levelData.width * levelData.tileSize;
            this.levelHeight = levelData.height * levelData.tileSize;
            
            this.physicsSystem.setTileMap(this.tileMap, TILE_SIZE);
            
            this.backgroundColorIndex = levelData.backgroundColor;
            this.timeLimit = this.levelLoader.getTimeLimit(levelData);
            
            this.eventBus.emit('level:loaded', {
                name: levelName,
                width: this.levelWidth,
                height: this.levelHeight,
                backgroundColor: this.backgroundColorIndex,
                timeLimit: this.timeLimit,
                playerSpawn: this.getPlayerSpawn(),
                entities: levelData.entities || [],
                goal: this.levelLoader.getGoalPosition(levelData)
            });
            
        } catch (error) {
            Logger.error('Failed to load level:', error);
            
            this.eventBus.emit('level:load-error', {
                levelName,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            
            throw new Error(`Failed to load stage: ${levelName}. ${error instanceof Error ? error.message : 'Unknown error'}`);
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

    getBackgroundColorIndex(): number {
        return this.backgroundColorIndex;
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
        throw new Error('No player spawn position found in level data');
    }

    getEntities(): Array<{ type: string; x: number; y: number }> {
        return this.levelData?.entities || [];
    }
    
    getLevelLoader(): LevelLoader {
        return this.levelLoader;
    }

    getTileAt(worldX: number, worldY: number): number {
        const tileX = Math.floor(worldX / TILE_SIZE);
        const tileY = Math.floor(worldY / TILE_SIZE);
        
        if (tileY >= 0 && tileY < this.tileMap.length &&
            tileX >= 0 && tileX < this.tileMap[tileY].length) {
            return this.tileMap[tileY][tileX];
        }
        return 0;
    }

    isSolid(worldX: number, worldY: number): boolean {
        return this.getTileAt(worldX, worldY) === 1;
    }
    
    getNextLevel(): string | null {
        if (!this.currentLevel) return null;
        
        const match = this.currentLevel.match(/^stage(\d+)-(\d+)$/);
        if (!match) return null;
        
        const stageNum = parseInt(match[1]);
        const areaNum = parseInt(match[2]);
        
        if (this.levelData && this.levelData.name) {
            Logger.log(`Level data has name: ${this.levelData.name}`);
        }
        
        if (areaNum < LevelManager.MAX_AREAS_PER_STAGE) {
            return `stage${stageNum}-${areaNum + 1}`;
        } else if (stageNum < LevelManager.MAX_STAGES) {
            return `stage${stageNum + 1}-1`;
        } else {
            return null;
        }
    }
    
    isFinalLevel(): boolean {
        const nextLevel = this.getNextLevel();
        return nextLevel === null;
    }


    reset(): void {
        this.currentLevel = null;
        this.levelData = null;
        this.tileMap = [];
        this.levelWidth = 0;
        this.levelHeight = 0;
        this.backgroundColorIndex = 0x12;
        this.timeLimit = 300;
    }
    
    renderTileMap(_renderer: unknown): void {
    }
    
}