/**
 * レベルローダー
 * JSONファイルからステージデータを読み込み、進行状況を管理する
 */
export class LevelLoader {
    constructor() {
        this.stages = null;
        this.currentStageData = null;
        this.currentStageId = null;
        this.basePath = '/src/levels/data/';
    }
    
    /**
     * ステージリストを読み込む
     * @returns {Promise<Object>} ステージリストデータ
     */
    async loadStageList() {
        try {
            const response = await fetch(this.basePath + 'stages.json');
            if (!response.ok) {
                throw new Error(`ステージリスト読み込みエラー: ${response.status}`);
            }
            
            const data = await response.json();
            this.stages = data.stages;
            this.stageList = data;
            
            // 保存された進行状況を読み込む
            this.loadProgress();
            
            return data;
        } catch (error) {
            console.error('ステージリスト読み込み失敗:', error);
            
            // フォールバック: デフォルトステージリスト
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
    
    /**
     * 特定のステージデータを読み込む
     * @param {string} stageId - ステージID
     * @returns {Promise<Object>} ステージデータ
     */
    async loadStage(stageId) {
        try {
            // ステージ情報を取得
            const stageInfo = this.stages?.find(s => s.id === stageId);
            if (!stageInfo) {
                throw new Error(`ステージ情報が見つかりません: ${stageId}`);
            }
            
            // ステージデータを読み込む
            const response = await fetch(this.basePath + stageInfo.filename);
            if (!response.ok) {
                throw new Error(`ステージデータ読み込みエラー: ${response.status}`);
            }
            
            const stageData = await response.json();
            
            // データの検証
            this.validateStageData(stageData);
            
            this.currentStageData = stageData;
            this.currentStageId = stageId;
            
            return stageData;
        } catch (error) {
            console.error(`ステージ読み込みエラー (${stageId}):`, error);
            throw error;
        }
    }
    
    /**
     * ステージデータの検証
     * @param {Object} data - ステージデータ
     * @throws {Error} データが不正な場合
     */
    validateStageData(data) {
        const required = ['name', 'width', 'height', 'tileSize', 'playerSpawn', 'tilemap'];
        
        for (const field of required) {
            if (!(field in data)) {
                throw new Error(`必須フィールドがありません: ${field}`);
            }
        }
        
        // サイズの検証
        if (data.width < 20 || data.width > 200) {
            throw new Error(`ステージ幅が不正です: ${data.width}`);
        }
        if (data.height < 15 || data.height > 100) {
            throw new Error(`ステージ高さが不正です: ${data.height}`);
        }
        
        // タイルマップの検証
        if (!Array.isArray(data.tilemap)) {
            throw new Error('タイルマップが配列ではありません');
        }
        if (data.tilemap.length !== data.height) {
            throw new Error('タイルマップの高さが一致しません');
        }
    }
    
    /**
     * 現在のステージデータを取得
     * @returns {Object|null} ステージデータ
     */
    getCurrentStageData() {
        return this.currentStageData;
    }
    
    /**
     * 現在のステージIDを取得
     * @returns {string|null} ステージID
     */
    getCurrentStageId() {
        return this.currentStageId;
    }
    
    /**
     * 次のステージが存在するかチェック
     * @returns {boolean}
     */
    hasNextStage() {
        if (!this.stages || !this.currentStageId) return false;
        
        const currentIndex = this.stages.findIndex(s => s.id === this.currentStageId);
        return currentIndex >= 0 && currentIndex < this.stages.length - 1;
    }
    
    /**
     * 次のステージIDを取得
     * @returns {string|null} 次のステージID
     */
    getNextStageId() {
        if (!this.hasNextStage()) return null;
        
        const currentIndex = this.stages.findIndex(s => s.id === this.currentStageId);
        return this.stages[currentIndex + 1].id;
    }
    
    /**
     * ステージクリア情報を更新
     * @param {string} stageId - ステージID
     * @param {Object} clearInfo - クリア情報
     */
    updateStageClearInfo(stageId, clearInfo) {
        const stage = this.stages?.find(s => s.id === stageId);
        if (!stage) return;
        
        const { score, time, coins, deaths } = clearInfo;
        
        // ベスト記録を更新
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
        
        // クリアフラグを立てる
        stage.cleared = true;
        
        // 次のステージをアンロック
        const currentIndex = this.stages.findIndex(s => s.id === stageId);
        if (currentIndex >= 0 && currentIndex < this.stages.length - 1) {
            this.stages[currentIndex + 1].unlocked = true;
        }
        
        // 進行状況を保存
        this.saveProgress();
    }
    
    /**
     * 進行状況をローカルストレージに保存
     */
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
    
    /**
     * 進行状況をローカルストレージから読み込む
     */
    loadProgress() {
        try {
            const saved = localStorage.getItem('pixelAdventureProgress');
            if (!saved) return;
            
            const progress = JSON.parse(saved);
            if (!progress.stages || !this.stages) return;
            
            // バージョンチェック
            if (progress.version !== 1) {
                console.warn('進行状況のバージョンが異なります');
                return;
            }
            
            // 保存された進行状況を適用
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
    
    /**
     * 進行状況をリセット
     */
    resetProgress() {
        if (!this.stages) return;
        
        // 最初のステージ以外をロック
        this.stages.forEach((stage, index) => {
            stage.unlocked = index === 0;
            stage.cleared = false;
            stage.bestScore = 0;
            stage.bestTime = 0;
            stage.maxCoins = 0;
            stage.minDeaths = 0;
        });
        
        // ローカルストレージをクリア
        try {
            localStorage.removeItem('pixelAdventureProgress');
        } catch (error) {
            console.error('進行状況のリセットに失敗:', error);
        }
    }
    
    /**
     * ステージ一覧を取得
     * @returns {Array} ステージ情報の配列
     */
    getStageList() {
        return this.stages || [];
    }
    
    /**
     * 特定のステージ情報を取得
     * @param {string} stageId - ステージID
     * @returns {Object|null} ステージ情報
     */
    getStageInfo(stageId) {
        return this.stages?.find(s => s.id === stageId) || null;
    }
    
    /**
     * レベルデータからタイルマップを生成
     * @param {Object} levelData - レベルデータ
     * @returns {Array} 2次元配列のタイルマップ
     */
    createTileMap(levelData) {
        if (!levelData || !levelData.tilemap) {
            throw new Error('Invalid level data: missing tilemap');
        }
        return levelData.tilemap;
    }
    
    /**
     * レベルデータからエンティティ情報を取得
     * @param {Object} levelData - レベルデータ
     * @returns {Array} エンティティ情報の配列
     */
    getEntities(levelData) {
        if (!levelData) return [];
        return levelData.entities || [];
    }
    
    /**
     * プレイヤーのスポーン位置を取得
     * @param {Object} levelData - レベルデータ
     * @returns {Object} {x, y} タイル座標
     */
    getPlayerSpawn(levelData) {
        if (!levelData || !levelData.playerSpawn) {
            return { x: 2, y: 10 }; // デフォルト位置
        }
        return levelData.playerSpawn;
    }
    
    /**
     * ゴール位置を取得
     * @param {Object} levelData - レベルデータ
     * @returns {Object|null} {x, y} タイル座標
     */
    getGoalPosition(levelData) {
        if (!levelData || !levelData.goal) {
            return null;
        }
        return levelData.goal;
    }
    
    /**
     * タイムリミットを取得
     * @param {Object} levelData - レベルデータ
     * @returns {number} 秒単位のタイムリミット
     */
    getTimeLimit(levelData) {
        if (!levelData || !levelData.timeLimit) {
            return 300; // デフォルト5分
        }
        return levelData.timeLimit;
    }
    
    /**
     * 背景色を取得
     * @param {Object} levelData - レベルデータ
     * @returns {string} 背景色のカラーコード
     */
    getBackgroundColor(levelData) {
        if (!levelData || !levelData.backgroundColor) {
            return '#5C94FC'; // デフォルトの空色
        }
        return levelData.backgroundColor;
    }
}