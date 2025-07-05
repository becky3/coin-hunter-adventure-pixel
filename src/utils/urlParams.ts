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
        // 簡潔な形式: ?s=1-1
        const shortForm = this.params.get('s');
        if (shortForm) {
            return `stage${shortForm}`;
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