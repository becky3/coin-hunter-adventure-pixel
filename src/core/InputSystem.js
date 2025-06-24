/**
 * イベントベースの入力管理システム
 * キーボード入力をイベントとして管理し、リスナーに通知する
 */
export class InputSystem {
    constructor() {
        // キーの現在の状態
        this.keys = new Map();
        
        // キーの前フレームの状態
        this.previousKeys = new Map();
        
        // 今フレームで押されたキー
        this.justPressedKeys = new Set();
        
        // 今フレームで離されたキー
        this.justReleasedKeys = new Set();
        
        // イベントリスナー
        this.listeners = {
            keyPress: [],      // キーが押された瞬間
            keyRelease: [],    // キーが離された瞬間
            keyHold: []        // キーが押され続けている間
        };
        
        // キーマッピング（ゲームアクション → 実際のキー）
        this.keyMap = {
            'left': ['ArrowLeft', 'KeyA'],
            'right': ['ArrowRight', 'KeyD'],
            'up': ['ArrowUp', 'KeyW'],
            'down': ['ArrowDown', 'KeyS'],
            'jump': ['Space', 'ArrowUp', 'KeyW'],
            'action': ['Enter', 'KeyE'],
            'escape': ['Escape'],
            'mute': ['KeyM'],
            'debug': ['Digit2', 'BracketLeft']  // 2キーまたは@キー（JISキーボード）
        };
        
        // 逆引きマップを生成
        this.reverseKeyMap = new Map();
        for (const [action, keys] of Object.entries(this.keyMap)) {
            for (const key of keys) {
                if (!this.reverseKeyMap.has(key)) {
                    this.reverseKeyMap.set(key, []);
                }
                this.reverseKeyMap.get(key).push(action);
            }
        }
        
        // イベントキュー（フレーム間でのイベント保持）
        this.eventQueue = [];
        
        // キーボードイベントの設定
        this.setupEventListeners();
    }
    
    /**
     * キーボードイベントリスナーの設定
     */
    setupEventListeners() {
        window.addEventListener('keydown', (e) => {
            // フォーム要素にフォーカスがある場合は無視
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }
            
            const code = e.code;
            
            // 既に押されている場合はリピートを防ぐ
            if (this.keys.get(code)) {
                return;
            }
            
            this.keys.set(code, true);
            
            // デフォルトの動作を防ぐ（スクロールなど）
            if (this.reverseKeyMap.has(code)) {
                e.preventDefault();
            }
        });
        
        window.addEventListener('keyup', (e) => {
            const code = e.code;
            this.keys.set(code, false);
        });
        
        // ブラウザのフォーカスが外れた時にキーをリセット
        window.addEventListener('blur', () => {
            this.keys.clear();
        });
    }
    
    /**
     * フレームごとの更新処理
     */
    update() {
        // イベントキューをクリア
        this.eventQueue = [];
        
        // 今フレームのキー状態をクリア
        this.justPressedKeys.clear();
        this.justReleasedKeys.clear();
        
        // 各キーの状態をチェック
        for (const [key, currentState] of this.keys) {
            const previousState = this.previousKeys.get(key) || false;
            
            // キーが押された瞬間
            if (currentState && !previousState) {
                this.justPressedKeys.add(key);
                this.triggerKeyPress(key);
            }
            
            // キーが離された瞬間
            if (!currentState && previousState) {
                this.justReleasedKeys.add(key);
                this.triggerKeyRelease(key);
            }
            
            // キーが押され続けている
            if (currentState && previousState) {
                this.triggerKeyHold(key);
            }
        }
        
        // 離されたキーもチェック（previousKeysにあってkeysにないもの）
        for (const [key, previousState] of this.previousKeys) {
            const currentState = this.keys.get(key) || false;
            if (!currentState && previousState) {
                this.justReleasedKeys.add(key);
                this.triggerKeyRelease(key);
            }
        }
        
        // 前フレームの状態を更新
        this.previousKeys.clear();
        for (const [key, state] of this.keys) {
            this.previousKeys.set(key, state);
        }
    }
    
    /**
     * キー押下イベントをトリガー
     * @private
     */
    triggerKeyPress(key) {
        const actions = this.reverseKeyMap.get(key) || [];
        
        for (const action of actions) {
            const event = {
                type: 'keyPress',
                key: key,
                action: action,
                timestamp: Date.now()
            };
            
            this.eventQueue.push(event);
            
            // リスナーに通知
            for (const listener of this.listeners.keyPress) {
                listener(event);
            }
        }
    }
    
    /**
     * キー解放イベントをトリガー
     * @private
     */
    triggerKeyRelease(key) {
        const actions = this.reverseKeyMap.get(key) || [];
        
        for (const action of actions) {
            const event = {
                type: 'keyRelease',
                key: key,
                action: action,
                timestamp: Date.now()
            };
            
            this.eventQueue.push(event);
            
            // リスナーに通知
            for (const listener of this.listeners.keyRelease) {
                listener(event);
            }
        }
    }
    
    /**
     * キー保持イベントをトリガー
     * @private
     */
    triggerKeyHold(key) {
        const actions = this.reverseKeyMap.get(key) || [];
        
        for (const action of actions) {
            const event = {
                type: 'keyHold',
                key: key,
                action: action,
                timestamp: Date.now()
            };
            
            // リスナーに通知（イベントキューには追加しない）
            for (const listener of this.listeners.keyHold) {
                listener(event);
            }
        }
    }
    
    /**
     * イベントリスナーを登録
     * @param {string} eventType - イベントタイプ（keyPress, keyRelease, keyHold）
     * @param {Function} callback - コールバック関数
     * @returns {Function} リスナー解除関数
     */
    on(eventType, callback) {
        if (!this.listeners[eventType]) {
            console.warn(`Unknown event type: ${eventType}`);
            return () => {};
        }
        
        this.listeners[eventType].push(callback);
        
        // リスナー解除関数を返す
        return () => {
            const index = this.listeners[eventType].indexOf(callback);
            if (index !== -1) {
                this.listeners[eventType].splice(index, 1);
            }
        };
    }
    
    /**
     * ワンタイムイベントリスナーを登録
     * @param {string} eventType - イベントタイプ
     * @param {Function} callback - コールバック関数
     * @returns {Function} リスナー解除関数
     */
    once(eventType, callback) {
        const removeListener = this.on(eventType, (event) => {
            callback(event);
            removeListener();
        });
        
        return removeListener;
    }
    
    /**
     * アクションが現在押されているかチェック
     * @param {string} action - アクション名
     * @returns {boolean}
     */
    isActionPressed(action) {
        const keys = this.keyMap[action];
        if (!keys) return false;
        
        return keys.some(key => this.keys.get(key) || false);
    }
    
    /**
     * アクションが今フレームで押されたかチェック
     * @param {string} action - アクション名
     * @returns {boolean}
     */
    isActionJustPressed(action) {
        const keys = this.keyMap[action];
        if (!keys) return false;
        
        return keys.some(key => this.justPressedKeys.has(key));
    }
    
    /**
     * アクションが今フレームで離されたかチェック
     * @param {string} action - アクション名
     * @returns {boolean}
     */
    isActionJustReleased(action) {
        const keys = this.keyMap[action];
        if (!keys) return false;
        
        return keys.some(key => this.justReleasedKeys.has(key));
    }
    
    /**
     * 特定のキーが押されているかチェック（生のキーコード）
     * @param {string} keyCode - キーコード
     * @returns {boolean}
     */
    isKeyPressed(keyCode) {
        return this.keys.get(keyCode) || false;
    }
    
    /**
     * 現在のフレームのイベントキューを取得
     * @returns {Array} イベントの配列
     */
    getEventQueue() {
        return [...this.eventQueue];
    }
    
    /**
     * キーマッピングを追加または更新
     * @param {string} action - アクション名
     * @param {string[]} keys - キーコードの配列
     */
    setKeyMapping(action, keys) {
        // 古いマッピングを削除
        if (this.keyMap[action]) {
            for (const key of this.keyMap[action]) {
                const actions = this.reverseKeyMap.get(key);
                if (actions) {
                    const index = actions.indexOf(action);
                    if (index !== -1) {
                        actions.splice(index, 1);
                    }
                    if (actions.length === 0) {
                        this.reverseKeyMap.delete(key);
                    }
                }
            }
        }
        
        // 新しいマッピングを設定
        this.keyMap[action] = keys;
        for (const key of keys) {
            if (!this.reverseKeyMap.has(key)) {
                this.reverseKeyMap.set(key, []);
            }
            this.reverseKeyMap.get(key).push(action);
        }
    }
    
    /**
     * 全てのキー状態をリセット
     */
    reset() {
        this.keys.clear();
        this.previousKeys.clear();
        this.eventQueue = [];
    }
    
    /**
     * デバッグ情報を取得
     * @returns {Object}
     */
    getDebugInfo() {
        const pressedKeys = [];
        const pressedActions = [];
        
        for (const [key, pressed] of this.keys) {
            if (pressed) {
                pressedKeys.push(key);
                const actions = this.reverseKeyMap.get(key) || [];
                pressedActions.push(...actions);
            }
        }
        
        return {
            pressedKeys: [...new Set(pressedKeys)],
            pressedActions: [...new Set(pressedActions)],
            eventCount: this.eventQueue.length,
            listenerCounts: {
                keyPress: this.listeners.keyPress.length,
                keyRelease: this.listeners.keyRelease.length,
                keyHold: this.listeners.keyHold.length
            }
        };
    }
}