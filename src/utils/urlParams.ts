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
        const shortForm = this.params.get('s');
        if (shortForm) {
            if (shortForm.startsWith('stage') || shortForm.startsWith('test-')) {
                return shortForm;
            }
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
    
    /**
     * タイトル画面をスキップするかどうか
     */
    shouldSkipTitle(): boolean {
        return this.params.get('skip_title') === 'true';
    }
    
    /**
     * テストモードかどうか
     * test=true の場合、AudioContextなどを無効化してテスト用に最適化
     */
    isTestMode(): boolean {
        return this.params.get('test') === 'true';
    }
}