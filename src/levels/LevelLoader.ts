import { bundledStageData } from '../data/bundledData';
import { Logger } from '../utils/Logger';
import { paletteSystem } from '../utils/pixelArtPalette';

interface StageInfo {
    id: string;
    name: string;
    description: string;
    filename: string;
}

interface StageList {
    defaultStage?: string;
    stages: StageInfo[];
}

interface StageData {
    name: string;
    width: number;
    height: number;
    tileSize: number;
    playerSpawn: { x: number; y: number };
    tilemap: number[][];
    entities?: EntityData[];
    goal: { x: number; y: number };
    timeLimit: number;
    backgroundColor: number;
}

interface EntityData {
    type: string;
    x: number;
    y: number;
    [key: string]: unknown;
}


/**
 * LevelLoader implementation
 */


/**
 * LevelLoader
 */
export class LevelLoader {
    private stages: StageInfo[] | null;
    private currentStageData: StageData | null;
    private currentStageId: string | null;
    private basePath: string;
    private stageList: StageList | null;
    
    constructor() {
        this.stages = null;
        this.currentStageData = null;
        this.currentStageId = null;
        this.basePath = '/src/levels/data/';
        this.stageList = null;
    }
    
    async loadStageList(): Promise<StageList> {
        try {
            const url = this.basePath + 'stages.json';
            
            if (bundledStageData[url]) {
                Logger.log(`[LevelLoader] Using bundled data for: ${url}`);
                const data = bundledStageData[url] as StageList;
                this.stages = data.stages;
                this.stageList = data;
                return data;
            }
            
            const startTime = performance.now();
            const response = await fetch(url);
            const fetchTime = performance.now() - startTime;
            Logger.log(`[LevelLoader] Fetched ${url} in ${fetchTime.toFixed(2)}ms`);
            
            if (!response.ok) {
                throw new Error(`ステージリスト読み込みエラー: ${response.status}`);
            }
            
            const data = await response.json() as StageList;
            this.stages = data.stages;
            this.stageList = data;
            
            return data;
        } catch (error) {
            Logger.error('ステージリスト読み込み失敗:', error);
            throw error;
        }
    }
    
    async loadStage(stageId: string): Promise<StageData> {
        try {
            const stageInfo = this.stages?.find(s => s.id === stageId);
            if (!stageInfo) {
                throw new Error(`ステージ情報が見つかりません: ${stageId}`);
            }
            
            const url = this.basePath + stageInfo.filename;
            
            if (bundledStageData[url]) {
                Logger.log(`[LevelLoader] Using bundled data for: ${url}`);
                const stageData = bundledStageData[url] as StageData;
                this.validateStageData(stageData);
                this.currentStageData = stageData;
                this.currentStageId = stageId;
                return stageData;
            }
            
            const startTime = performance.now();
            const response = await fetch(url);
            const fetchTime = performance.now() - startTime;
            Logger.log(`[LevelLoader] Fetched ${url} in ${fetchTime.toFixed(2)}ms`);
            
            if (!response.ok) {
                throw new Error(`ステージデータ読み込みエラー: ${response.status}`);
            }
            
            const stageData = await response.json() as StageData;
            
            this.validateStageData(stageData);
            
            this.currentStageData = stageData;
            this.currentStageId = stageId;
            
            return stageData;
        } catch (error) {
            Logger.error(`ステージ読み込みエラー (${stageId}):`, error);
            throw error;
        }
    }
    
    private validateStageData(data: StageData): void {
        const required: (keyof StageData)[] = ['name', 'width', 'height', 'tileSize', 'playerSpawn', 'tilemap', 'goal', 'timeLimit', 'backgroundColor'];
        
        for (const field of required) {
            if (!(field in data)) {
                throw new Error(`必須フィールドがありません: ${field}`);
            }
        }
        
        if (data.width < 20 || data.width > 200) {
            throw new Error(`ステージ幅が不正です: ${data.width}`);
        }
        if (data.height < 15 || data.height > 100) {
            throw new Error(`ステージ高さが不正です: ${data.height}`);
        }
        
        if (!Array.isArray(data.tilemap)) {
            throw new Error('タイルマップが配列ではありません');
        }
        if (data.tilemap.length !== data.height) {
            throw new Error('タイルマップの高さが一致しません');
        }
        
        if (typeof data.backgroundColor !== 'number') {
            throw new Error('背景色はパレットインデックスで指定してください');
        }
        
        if (typeof data.timeLimit !== 'number') {
            throw new Error('タイムリミットは数値で指定してください');
        }
        
        if (typeof data.goal !== 'object' || typeof data.goal.x !== 'number' || typeof data.goal.y !== 'number') {
            throw new Error('ゴール位置はオブジェクトで、xとyは数値で指定してください');
        }
    }
    
    getCurrentStageData(): StageData | null {
        return this.currentStageData;
    }
    
    getCurrentStageId(): string | null {
        return this.currentStageId;
    }
    
    hasNextStage(): boolean {
        if (!this.stages || !this.currentStageId) return false;
        
        const currentIndex = this.stages.findIndex(s => s.id === this.currentStageId);
        return currentIndex >= 0 && currentIndex < this.stages.length - 1;
    }
    
    getNextStageId(): string | null {
        if (!this.hasNextStage()) return null;
        
        const currentIndex = this.stages.findIndex(s => s.id === this.currentStageId);
        if (currentIndex >= 0 && currentIndex < this.stages.length - 1) {
            return this.stages[currentIndex + 1].id;
        }
        return null;
    }
    
    
    getStageList(): StageInfo[] {
        return this.stages || [];
    }
    
    getStageInfo(stageId: string): StageInfo | null {
        return this.stages?.find(s => s.id === stageId) || null;
    }
    
    createTileMap(levelData: StageData): number[][] {
        if (!levelData || !levelData.tilemap) {
            throw new Error('Invalid level data: missing tilemap');
        }
        return levelData.tilemap;
    }
    
    getEntities(levelData: StageData): EntityData[] {
        if (!levelData) return [];
        return levelData.entities || [];
    }
    
    getPlayerSpawn(levelData: StageData): { x: number; y: number } {
        return levelData.playerSpawn;
    }
    
    getGoalPosition(levelData: StageData): { x: number; y: number } {
        return levelData.goal;
    }
    
    getTimeLimit(levelData: StageData): number {
        return levelData.timeLimit;
    }
    
    getBackgroundColor(levelData: StageData): string {
        const colorIndex = levelData.backgroundColor;
        const color = paletteSystem.masterPalette[colorIndex];
        if (!color) {
            throw new Error(`Invalid background color index: ${colorIndex}. Color not found in master palette.`);
        }
        return color;
    }
}