/**
 * URLクエリパラメータを解析するユーティリティ
 */
export class URLParams {
    private params: URLSearchParams;
    
    constructor() {
        this.params = new URLSearchParams(window.location.search);
    }
    
    /**
     * ステージ番号とエリア番号からステージIDを生成
     */
    getStageId(): string | null {
        const stage = this.params.get('stage');
        const area = this.params.get('area');
        
        if (stage && area) {
            return `stage${stage}-${area}`;
        }
        
        // 旧形式のサポート（直接ステージID指定）
        const directStage = this.params.get('level');
        if (directStage) {
            return directStage;
        }
        
        return null;
    }
    
    /**
     * デバッグモードかどうか
     */
    isDebugMode(): boolean {
        return this.params.get('debug') === 'true';
    }
    
    /**
     * E2Eテストモードかどうか
     */
    isE2ETestMode(): boolean {
        return this.params.get('e2e') === 'true';
    }
}