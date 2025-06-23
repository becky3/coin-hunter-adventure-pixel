/**
 * 入力管理クラス
 * キーボード入力を管理し、ゲーム用の入力情報に変換する
 */
export class InputManager {
    constructor() {
        this.keys = {};
        this.lastKeys = {};
        
        // イベントハンドラをバインドして保存
        this.keydownHandler = this.handleKeydown.bind(this);
        this.keyupHandler = this.handleKeyup.bind(this);
        this.blurHandler = this.handleBlur.bind(this);
        
        this.setupEventListeners();
    }
    
    handleKeydown(e) {
        // 矢印キーとスペースのデフォルト動作を防ぐ
        if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
            e.preventDefault();
        }
        this.keys[e.code] = true;
        
        // @キーでデバッグモード切り替え（gameインスタンスが存在する場合）
        if (e.key === '@' && window.game) {
            window.game.debug = !window.game.debug;
        }
        
        // Mキーで音楽ミュート切り替え
        if (e.key.toLowerCase() === 'm' && window.game?.musicSystem) {
            window.game.musicSystem.toggleMute();
        }
    }
    
    handleKeyup(e) {
        this.keys[e.code] = false;
    }
    
    handleBlur() {
        // ウィンドウがフォーカスを失ったときすべてのキーをリリース
        this.keys = {};
    }
    
    setupEventListeners() {
        document.addEventListener('keydown', this.keydownHandler);
        document.addEventListener('keyup', this.keyupHandler);
        window.addEventListener('blur', this.blurHandler);
    }
    
    update() {
        // 前フレームの状態を保存（キーの押し始めを検出するため）
        this.lastKeys = { ...this.keys };
    }
    
    /**
     * ゲーム用の入力情報を取得
     * @returns {Object} 入力状態（left, right, jump, action）
     */
    getInput() {
        return {
            left: this.keys['ArrowLeft'] || this.keys['KeyA'],
            right: this.keys['ArrowRight'] || this.keys['KeyD'],
            jump: this.keys['Space'] || this.keys['ArrowUp'] || this.keys['KeyW'],
            action: this.keys['Enter'] || this.keys['KeyE']
        };
    }
    
    /**
     * キーが今フレームで押されたかを判定
     * @param {string} keyCode - キーコード
     * @returns {boolean}
     */
    isKeyJustPressed(keyCode) {
        return this.keys[keyCode] && !this.lastKeys[keyCode];
    }
    
    /**
     * キーが押されているかを判定
     * @param {string} keyCode - キーコード
     * @returns {boolean}
     */
    isKeyPressed(keyCode) {
        return this.keys[keyCode];
    }
    
    /**
     * クリーンアップ処理
     */
    destroy() {
        document.removeEventListener('keydown', this.keydownHandler);
        document.removeEventListener('keyup', this.keyupHandler);
        window.removeEventListener('blur', this.blurHandler);
        this.keys = {};
        this.lastKeys = {};
    }
}