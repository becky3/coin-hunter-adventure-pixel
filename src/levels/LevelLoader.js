export class LevelLoader {
    constructor() {
        this.stages = null;
        this.currentStageData = null;
        this.currentStageId = null;
        this.basePath = '/src/levels/data/';
    }
    
    async loadStageList() {
        try {
            const response = await fetch(this.basePath + 'stages.json');
            if (!response.ok) {
                throw new Error(`ステージリスト読み込みエラー: ${response.status}`);
            }
            
            const data = await response.json();
            this.stages = data.stages;
            this.stageList = data;
            
            this.loadProgress();
            
            return data;
        } catch (error) {
            console.error('ステージリスト読み込み失敗:', error);
            
            const fallbackData = {
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
    
    async loadStage(stageId) {
        try {
            const stageInfo = this.stages?.find(s => s.id === stageId);
            if (!stageInfo) {
                throw new Error(`ステージ情報が見つかりません: ${stageId}`);
            }
            
            const response = await fetch(this.basePath + stageInfo.filename);
            if (!response.ok) {
                throw new Error(`ステージデータ読み込みエラー: ${response.status}`);
            }
            
            const stageData = await response.json();
            
            this.validateStageData(stageData);
            
            this.currentStageData = stageData;
            this.currentStageId = stageId;
            
            return stageData;
        } catch (error) {
            console.error(`ステージ読み込みエラー (${stageId}):`, error);
            throw error;
        }
    }
    
    validateStageData(data) {
        const required = ['name', 'width', 'height', 'tileSize', 'playerSpawn', 'tilemap'];
        
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
    
    getCurrentStageData() {
        return this.currentStageData;
    }
    
    getCurrentStageId() {
        return this.currentStageId;
    }
    
    hasNextStage() {
        if (!this.stages || !this.currentStageId) return false;
        
        const currentIndex = this.stages.findIndex(s => s.id === this.currentStageId);
        return currentIndex >= 0 && currentIndex < this.stages.length - 1;
    }
    
    getNextStageId() {
        if (!this.hasNextStage()) return null;
        
        const currentIndex = this.stages.findIndex(s => s.id === this.currentStageId);
        return this.stages[currentIndex + 1].id;
    }
    
    updateStageClearInfo(stageId, clearInfo) {
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
        
        const currentIndex = this.stages.findIndex(s => s.id === stageId);
        if (currentIndex >= 0 && currentIndex < this.stages.length - 1) {
            this.stages[currentIndex + 1].unlocked = true;
        }
        
        this.saveProgress();
    }
    
    saveProgress() {
        if (!this.stages) return;
        
        const progress = {
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
    
    loadProgress() {
        try {
            const saved = localStorage.getItem('pixelAdventureProgress');
            if (!saved) return;
            
            const progress = JSON.parse(saved);
            if (!progress.stages || !this.stages) return;
            
            if (progress.version !== 1) {
                console.warn('進行状況のバージョンが異なります');
                return;
            }
            
            progress.stages.forEach(savedStage => {
                const stage = this.stages.find(s => s.id === savedStage.id);
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
    
    resetProgress() {
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
    
    getStageList() {
        return this.stages || [];
    }
    
    getStageInfo(stageId) {
        return this.stages?.find(s => s.id === stageId) || null;
    }
    
    createTileMap(levelData) {
        if (!levelData || !levelData.tilemap) {
            throw new Error('Invalid level data: missing tilemap');
        }
        return levelData.tilemap;
    }
    
    getEntities(levelData) {
        if (!levelData) return [];
        return levelData.entities || [];
    }
    
    getPlayerSpawn(levelData) {
        if (!levelData || !levelData.playerSpawn) {
            return { x: 2, y: 10 };
        }
        return levelData.playerSpawn;
    }
    
    getGoalPosition(levelData) {
        if (!levelData || !levelData.goal) {
            return null;
        }
        return levelData.goal;
    }
    
    getTimeLimit(levelData) {
        if (!levelData || !levelData.timeLimit) {
            return 300;
        }
        return levelData.timeLimit;
    }
    
    getBackgroundColor(levelData) {
        if (!levelData || !levelData.backgroundColor) {
            return '#5C94FC';
        }
        return levelData.backgroundColor;
    }
}