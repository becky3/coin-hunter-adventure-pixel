/**
 * ゲーム状態管理システム
 * ゲームの状態遷移とデバッグ用の状態スナップショット機能を提供
 */
export class GameStateManager {
    constructor() {
        this.states = new Map();
        this.currentState = null;
        this.previousState = null;
        
        // デバッグ用の状態履歴
        this.stateHistory = [];
        this.maxHistory = 1000;
        this.recording = false;
        
        // イベントリスナー
        this.listeners = new Map();
    }
    
    /**
     * 状態を登録
     * @param {string} name - 状態名
     * @param {Object} state - 状態オブジェクト（enter, update, render, exit メソッドを持つ）
     */
    registerState(name, state) {
        this.states.set(name, state);
    }
    
    /**
     * 状態を切り替え
     * @param {string} name - 切り替え先の状態名
     * @param {Object} params - 状態に渡すパラメータ
     */
    changeState(name, params = {}) {
        if (!this.states.has(name)) {
            throw new Error(`State "${name}" not found`);
        }
        
        // 現在の状態を終了
        if (this.currentState) {
            if (this.currentState.exit) {
                this.currentState.exit();
            }
            this.previousState = this.currentState;
        }
        
        // 新しい状態を開始
        this.currentState = this.states.get(name);
        if (this.currentState.enter) {
            this.currentState.enter(params);
        }
        
        // イベントを記録
        this.recordEvent('stateChange', { from: this.previousState?.name, to: name, params });
    }
    
    /**
     * 現在の状態を更新
     * @param {number} deltaTime - 前フレームからの経過時間
     */
    update(deltaTime) {
        if (this.currentState && this.currentState.update) {
            this.currentState.update(deltaTime);
        }
    }
    
    /**
     * 現在の状態を描画
     * @param {CanvasRenderingContext2D} ctx - 描画コンテキスト
     */
    render(ctx) {
        if (this.currentState && this.currentState.render) {
            this.currentState.render(ctx);
        }
    }
    
    // デバッグ機能：ゲーム状態のスナップショットを作成
    captureGameSnapshot(game) {
        if (!game) return null;
        
        const snapshot = {
            timestamp: Date.now(),
            frame: game.frameCount || 0,
            currentState: this.currentState?.name,
            player: game.player ? {
                x: game.player.x,
                y: game.player.y,
                vx: game.player.vx,
                vy: game.player.vy,
                grounded: game.player.grounded,
                health: game.player.health,
                score: game.player.score
            } : null,
            entities: game.entities ? game.entities.map(e => ({
                type: e.constructor.name,
                x: e.x,
                y: e.y,
                active: e.active
            })) : [],
            camera: game.camera ? {
                x: game.camera.x,
                y: game.camera.y
            } : null
        };
        
        if (this.recording) {
            this.stateHistory.push(snapshot);
            if (this.stateHistory.length > this.maxHistory) {
                this.stateHistory.shift();
            }
        }
        
        return snapshot;
    }
    
    // 記録開始/停止
    startRecording() {
        this.recording = true;
        this.stateHistory = [];
    }
    
    stopRecording() {
        this.recording = false;
        return this.stateHistory;
    }
    
    // イベントの記録
    recordEvent(eventType, data) {
        const event = {
            timestamp: Date.now(),
            type: eventType,
            data: data
        };
        
        // リスナーに通知
        if (this.listeners.has(eventType)) {
            this.listeners.get(eventType).forEach(fn => fn(event));
        }
        
        return event;
    }
    
    // イベントリスナー登録
    addEventListener(eventType, callback) {
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, []);
        }
        this.listeners.get(eventType).push(callback);
    }
    
    // イベントリスナー削除
    removeEventListener(eventType, callback) {
        if (this.listeners.has(eventType)) {
            const listeners = this.listeners.get(eventType);
            const index = listeners.indexOf(callback);
            if (index !== -1) {
                listeners.splice(index, 1);
            }
        }
    }
    
    // 特定の条件を満たすまで待機（デバッグ用）
    async waitForCondition(conditionFn, timeout = 5000) {
        const startTime = Date.now();
        
        return new Promise((resolve, reject) => {
            const check = () => {
                if (conditionFn()) {
                    resolve();
                } else if (Date.now() - startTime > timeout) {
                    reject(new Error('Condition timeout'));
                } else {
                    requestAnimationFrame(check);
                }
            };
            check();
        });
    }
    
    // クリーンアップ
    destroy() {
        if (this.currentState && this.currentState.exit) {
            this.currentState.exit();
        }
        this.states.clear();
        this.listeners.clear();
        this.stateHistory = [];
        this.currentState = null;
        this.previousState = null;
    }
}