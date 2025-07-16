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
            // すでに "stage" で始まっている場合はそのまま返す
            if (shortForm.startsWith('stage')) {
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
}