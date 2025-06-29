
// src/debug/DebugOverlay.ts

import { ServiceLocator } from '../services/ServiceLocator';
import { ServiceNames } from '../services/ServiceNames';
import { EventBus } from '../services/EventBus';
import { GameEvents } from '../services/GameEvents';

/**
 * デバッグ情報の表示を管理
 */
export class DebugOverlay {
    private serviceLocator: ServiceLocator;
    private debugElement?: HTMLDivElement;
    private statsElements: Map<string, HTMLElement> = new Map();
    private lastFrameTime: number = 0;
    private frameCount: number = 0;
    private fps: number = 0;
    
    constructor(serviceLocator: ServiceLocator) {
        this.serviceLocator = serviceLocator;
    }
    
    /**
     * デバッグオーバーレイの初期化
     */
    async init(): Promise<void> {
        this.createDebugUI();
        this.setupEventListeners();
    }
    
    /**
     * デバッグUIの作成
     */
    private createDebugUI(): void {
        // 既存のデバッグ要素があれば削除
        const existingDebug = document.getElementById('debug-info');
        if (existingDebug) {
            existingDebug.remove();
        }
        
        // デバッグコンテナの作成
        this.debugElement = document.createElement('div');
        this.debugElement.id = 'debug-info';
        this.debugElement.style.cssText = `
            position: fixed;
            top: 10px;
            left: 10px;
            background: rgba(0, 0, 0, 0.7);
            color: #00ff00;
            font-family: monospace;
            font-size: 12px;
            padding: 10px;
            border: 1px solid #00ff00;
            z-index: 1000;
            pointer-events: none;
        `;
        
        // 統計情報の要素を作成
        const stats = ['FPS', 'Entities', 'State', 'Camera', 'Input'];
        stats.forEach(stat => {
            const statElement = document.createElement('div');
            statElement.innerHTML = `${stat}: <span>-</span>`;
            this.debugElement!.appendChild(statElement);
            this.statsElements.set(stat.toLowerCase(), statElement.querySelector('span')!);
        });
        
        document.body.appendChild(this.debugElement);
    }
    
    /**
     * イベントリスナーの設定
     */
    private setupEventListeners(): void {
        const eventBus = this.serviceLocator.get<EventBus>(ServiceNames.EVENT_BUS);
        
        // ステート変更イベント
        eventBus.on(GameEvents.STATE_CHANGE, (data) => {
            this.updateStat('state', data.to);
        });
        
        // キー入力の表示設定
        // F3キーでデバッグ表示の切り替え
        window.addEventListener('keydown', (e) => {
            if (e.key === 'F3') {
                e.preventDefault();
                this.toggleVisibility();
            }
        });
    }
    
    /**
     * フレーム更新（FPS計算）
     */
    update(deltaTime: number): void {
        this.frameCount++;
        const currentTime = performance.now();
        
        if (currentTime - this.lastFrameTime >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastFrameTime = currentTime;
            this.updateStat('fps', this.fps.toString());
        }
        
        // その他の統計情報を更新
        this.updateStats();
    }
    
    /**
     * 統計情報の更新
     */
    private updateStats(): void {
        // エンティティ数の更新
        const physicsSystem = this.serviceLocator.tryGet(ServiceNames.PHYSICS) as any;
        if (physicsSystem && physicsSystem.entities) {
            this.updateStat('entities', physicsSystem.entities.size.toString());
        }
        
        // カメラ位置の更新
        const renderer = this.serviceLocator.tryGet(ServiceNames.RENDERER) as any;
        if (renderer && renderer.getCameraPosition) {
            const pos = renderer.getCameraPosition();
            this.updateStat('camera', `${Math.floor(pos.x)}, ${Math.floor(pos.y)}`);
        }
        
        // 入力状態の更新
        const inputSystem = this.serviceLocator.tryGet(ServiceNames.INPUT) as any;
        if (inputSystem) {
            const keys: string[] = [];
            if (inputSystem.isActionPressed?.('left')) keys.push('←');
            if (inputSystem.isActionPressed?.('right')) keys.push('→');
            if (inputSystem.isActionPressed?.('jump')) keys.push('SPACE');
            this.updateStat('input', keys.join(' ') || 'none');
        }
    }
    
    /**
     * 統計情報の更新
     */
    private updateStat(name: string, value: string): void {
        const element = this.statsElements.get(name);
        if (element) {
            element.textContent = value;
        }
    }
    
    /**
     * デバッグ表示の切り替え
     */
    private toggleVisibility(): void {
        if (this.debugElement) {
            this.debugElement.style.display = 
                this.debugElement.style.display === 'none' ? 'block' : 'none';
        }
    }
    
    /**
     * クリーンアップ
     */
    destroy(): void {
        if (this.debugElement) {
            this.debugElement.remove();
        }
        this.statsElements.clear();
    }
}
