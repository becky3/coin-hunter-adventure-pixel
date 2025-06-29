interface StageInfo {
    id: string;
    name: string;
    description: string;
    filename: string;
    unlocked: boolean;
    cleared?: boolean;
    bestScore?: number;
    bestTime?: number;
    maxCoins?: number;
    minDeaths?: number;
}

interface StageList {
    stages: StageInfo[];
    currentStage: string;
}

interface StageData {
    name: string;
    width: number;
    height: number;
    tileSize: number;
    playerSpawn: { x: number; y: number };
    tilemap: number[][];
    entities?: EntityData[];
    goal?: { x: number; y: number };
    timeLimit?: number;
    backgroundColor?: string;
}

interface EntityData {
    type: string;
    x: number;
    y: number;
    [key: string]: any;
}

interface ClearInfo {
    score: number;
    time: number;
    coins: number;
    deaths: number;
}

interface SavedProgress {
    version: number;
    lastPlayed: number;
    stages: Array<{
        id: string;
        unlocked: boolean;
        cleared: boolean;
        bestScore: number;
        bestTime: number;
        maxCoins: number;
        minDeaths: number;
    }>;
}

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
            const response = await fetch(this.basePath + 'stages.json');
            if (!response.ok) {
                throw new Error(`ステージリスト読み込みエラー: ${response.status}`);
            }
            
            const data = await response.json() as StageList;
            this.stages = data.stages;
            this.stageList = data;
            
            this.loadProgress();
            
            return data;
        } catch (error) {
            console.error('ステージリスト読み込み失敗:', error);
            
            const fallbackData: StageList = {
                stages: [
                    {
                        id: 'tutorial',
                        name: 'TUTORIAL',
                        description: 'LEARN BASIC CONTROLS',
                        filename: 'tutorial.json',
                        unlocked: true
                    },
                    {
                        id: 'level1',
                        name: 'GRASSLAND 1-1',
                        description: 'THE ADVENTURE BEGINS',
                        filename: 'level1.json',
                        unlocked: false
                    }
                ],
                currentStage: 'tutorial'
            };
            
            this.stages = fallbackData.stages;
            this.stageList = fallbackData;
            return fallbackData;
        }
    }
    
    async loadStage(stageId: string): Promise<StageData> {
        try {
            const stageInfo = this.stages?.find(s => s.id === stageId);
            if (!stageInfo) {
                throw new Error(`ステージ情報が見つかりません: ${stageId}`);
            }
            
            const response = await fetch(this.basePath + stageInfo.filename);
            if (!response.ok) {
                throw new Error(`ステージデータ読み込みエラー: ${response.status}`);
            }
            
            const stageData = await response.json() as StageData;
            
            this.validateStageData(stageData);
            
            this.currentStageData = stageData;
            this.currentStageId = stageId;
            
            return stageData;
        } catch (error) {
            console.error(`ステージ読み込みエラー (${stageId}):`, error);
            throw error;
        }
    }
    
    private validateStageData(data: StageData): void {
        const required: (keyof StageData)[] = ['name', 'width', 'height', 'tileSize', 'playerSpawn', 'tilemap'];
        
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
        
        const currentIndex = this.stages.findIndex(s => s.id === this.currentStageId!);
        return this.stages![currentIndex + 1].id;
    }
    
    updateStageClearInfo(stageId: string, clearInfo: ClearInfo): void {
        const stage = this.stages?.find(s => s.id === stageId);
        if (!stage) return;
        
        const { score, time, coins, deaths } = clearInfo;
        
        if (!stage.bestScore || score > stage.bestScore) {
            stage.bestScore = score;
        }
        if (!stage.bestTime || time < stage.bestTime) {
            stage.bestTime = time;
        }
        if (!stage.maxCoins || coins > stage.maxCoins) {
            stage.maxCoins = coins;
        }
        if (!stage.minDeaths || deaths < stage.minDeaths) {
            stage.minDeaths = deaths;
        }
        
        stage.cleared = true;
        
        const currentIndex = this.stages!.findIndex(s => s.id === stageId);
        if (currentIndex >= 0 && currentIndex < this.stages!.length - 1) {
            this.stages![currentIndex + 1].unlocked = true;
        }
        
        this.saveProgress();
    }
    
    private saveProgress(): void {
        if (!this.stages) return;
        
        const progress: SavedProgress = {
            version: 1,
            lastPlayed: Date.now(),
            stages: this.stages.map(s => ({
                id: s.id,
                unlocked: s.unlocked || false,
                cleared: s.cleared || false,
                bestScore: s.bestScore || 0,
                bestTime: s.bestTime || 0,
                maxCoins: s.maxCoins || 0,
                minDeaths: s.minDeaths || 0
            }))
        };
        
        try {
            localStorage.setItem('pixelAdventureProgress', JSON.stringify(progress));
        } catch (error) {
            console.error('進行状況の保存に失敗:', error);
        }
    }
    
    private loadProgress(): void {
        try {
            const saved = localStorage.getItem('pixelAdventureProgress');
            if (!saved) return;
            
            const progress = JSON.parse(saved) as SavedProgress;
            if (!progress.stages || !this.stages) return;
            
            if (progress.version !== 1) {
                console.warn('進行状況のバージョンが異なります');
                return;
            }
            
            progress.stages.forEach(savedStage => {
                const stage = this.stages!.find(s => s.id === savedStage.id);
                if (stage) {
                    stage.unlocked = savedStage.unlocked;
                    stage.cleared = savedStage.cleared;
                    stage.bestScore = savedStage.bestScore || 0;
                    stage.bestTime = savedStage.bestTime || 0;
                    stage.maxCoins = savedStage.maxCoins || 0;
                    stage.minDeaths = savedStage.minDeaths || 0;
                }
            });
        } catch (error) {
            console.error('進行状況の読み込みに失敗:', error);
        }
    }
    
    resetProgress(): void {
        if (!this.stages) return;
        
        this.stages.forEach((stage, index) => {
            stage.unlocked = index === 0;
            stage.cleared = false;
            stage.bestScore = 0;
            stage.bestTime = 0;
            stage.maxCoins = 0;
            stage.minDeaths = 0;
        });
        
        try {
            localStorage.removeItem('pixelAdventureProgress');
        } catch (error) {
            console.error('進行状況のリセットに失敗:', error);
        }
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
        if (!levelData || !levelData.playerSpawn) {
            return { x: 2, y: 10 };
        }
        return levelData.playerSpawn;
    }
    
    getGoalPosition(levelData: StageData): { x: number; y: number } | null {
        if (!levelData || !levelData.goal) {
            return null;
        }
        return levelData.goal;
    }
    
    getTimeLimit(levelData: StageData): number {
        if (!levelData || !levelData.timeLimit) {
            return 300;
        }
        return levelData.timeLimit;
    }
    
    getBackgroundColor(levelData: StageData): string {
        if (!levelData || !levelData.backgroundColor) {
            return '#5C94FC';
        }
        return levelData.backgroundColor;
    }
}