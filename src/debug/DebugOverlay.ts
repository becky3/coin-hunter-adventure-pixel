

import { ServiceLocator } from '../services/ServiceLocator';
import { GAME_CONSTANTS } from '../config/GameConstants';
import { PlayState } from '../states/PlayState';
import { URLParams } from '../utils/urlParams';
import { Logger } from '../utils/Logger';
import type { StateEvent } from '../states/GameStateManager';
import { EnemySpawnDialog } from './EnemySpawnDialog';
import { PerformanceMonitor } from '../performance/PerformanceMonitor';

/**
 * DebugOverlay implementation
 */
export class DebugOverlay {
    private serviceLocator: ServiceLocator;
    private debugElement?: HTMLDivElement;
    private statsElements: Map<string, HTMLElement> = new Map();
    
    private stageList: string[] = [
        'stage1-1', 'stage1-2', 'stage1-3',
        'stage0-1', 'stage0-2', 'stage0-3', 'stage0-4',
        'performance-test'
    ];
    private selectedStageIndex: number = 0;
    private stageSelectElement?: HTMLElement;
    
    private fps: number = 0;
    private frameCount: number = 0;
    private lastFPSUpdate: number = 0;
    
    private enemySpawnDialog?: EnemySpawnDialog;
    private performanceMonitor: PerformanceMonitor;
    private showPerformanceDetails: boolean = false;
    
    constructor(serviceLocator: ServiceLocator) {
        this.serviceLocator = serviceLocator;
        this.performanceMonitor = PerformanceMonitor.getInstance();
        
        const urlParams = new URLParams();
        const urlStage = urlParams.getStageId();
        if (urlStage) {
            const stageIndex = this.stageList.indexOf(urlStage);
            if (stageIndex !== -1) {
                this.selectedStageIndex = stageIndex;
            }
        }
    }

    async init(): Promise<void> {
        this.createDebugUI();
        this.setupEventListeners();
        
        if (this.debugElement) {
            this.debugElement.style.display = 'block';
        }
        
        this.enemySpawnDialog = new EnemySpawnDialog(this.serviceLocator);
        this.enemySpawnDialog.init();
        
        (window as Window & { debugOverlay?: DebugOverlay }).debugOverlay = this;
        
        this.lastFPSUpdate = performance.now();
        
        Logger.log('DebugOverlay', `Initialized with stage: ${this.stageList[this.selectedStageIndex]} (index: ${this.selectedStageIndex})`);
    }
    
    getFPS(): number {
        return this.fps;
    }

    private createDebugUI(): void {

        const existingDebug = document.getElementById('debug-info');
        if (existingDebug) {
            existingDebug.remove();
        }

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

        const stats = ['FPS', 'Speed', 'State', 'Player X', 'Player Y', 'Frame Time', 'Draw Calls'];
        stats.forEach(stat => {
            const statElement = document.createElement('div');
            statElement.innerHTML = `${stat}: <span>-</span>`;
            if (this.debugElement) {
                this.debugElement.appendChild(statElement);
            }
            const key = stat.toLowerCase().replace(' ', '_');
            const spanElement = statElement.querySelector('span');
            if (spanElement) {
                this.statsElements.set(key, spanElement);
            }
        });
        
        this.updateStat('speed', `${GAME_CONSTANTS.GLOBAL_SPEED_MULTIPLIER.toFixed(1)}x`);
        
        const stageDiv = document.createElement('div');
        stageDiv.style.marginTop = '10px';
        stageDiv.style.paddingTop = '10px';
        stageDiv.style.borderTop = '1px solid #444';
        stageDiv.innerHTML = `Stage: <span style="color: #ffff00">${this.stageList[this.selectedStageIndex]}</span>`;
        if (this.debugElement) {
            this.debugElement.appendChild(stageDiv);
        }
        const spanElement = stageDiv.querySelector('span');
        if (spanElement) {
            this.stageSelectElement = spanElement;
        }
        
        const performanceDiv = document.createElement('div');
        performanceDiv.id = 'performance-details';
        performanceDiv.style.marginTop = '10px';
        performanceDiv.style.paddingTop = '10px';
        performanceDiv.style.borderTop = '1px solid #444';
        performanceDiv.style.display = 'none';
        if (this.debugElement) {
            this.debugElement.appendChild(performanceDiv);
        }
        
        const helpDiv = document.createElement('div');
        helpDiv.style.marginTop = '10px';
        helpDiv.style.fontSize = '10px';
        helpDiv.style.color = '#888';
        helpDiv.innerHTML = 'F3: Toggle | +/-: Speed | 0: Reset<br>D: Toggle Stage Select | ←→: Select<br>O: Spawn Enemy | P: Performance Details';
        if (this.debugElement) {
            this.debugElement.appendChild(helpDiv);
        }
        
        this.updateStat('state', 'menu');
        
        document.body.appendChild(this.debugElement);
    }

    private setupEventListeners(): void {
        const game = (window as Window & { game?: { stateManager?: { addEventListener?: (event: string, callback: (event: StateEvent) => void) => void; currentState?: { name: string } } } }).game;
        if (game?.stateManager) {
            game.stateManager.addEventListener('stateChange', (event: StateEvent) => {
                const stateData = event.data as { to?: string } | undefined;
                this.updateStat('state', stateData?.to || 'unknown');
            });
        }
        

        window.addEventListener('keydown', (e) => {
            if (e.key === 'F3') {
                e.preventDefault();
                this.toggleVisibility();
            }
            
            if (e.key === '-' || e.key === '_') {
                e.preventDefault();
                this.changeSpeed(-0.1);
            }
            
            if (e.key === '+' || e.key === '=') {
                e.preventDefault();
                this.changeSpeed(0.1);
            }
            
            if (e.key === '0') {
                e.preventDefault();
                this.resetSpeed();
            }
            
            if (e.key === 'o' || e.key === 'O') {
                e.preventDefault();
                const game = (window as Window & { game?: { stateManager?: { addEventListener?: (event: string, callback: (event: StateEvent) => void) => void; currentState?: { name: string } } } }).game;
                const currentState = game?.stateManager?.currentState;
                
                if (currentState && currentState.name === 'play' && this.enemySpawnDialog) {
                    this.enemySpawnDialog.toggle();
                }
            }
            
            if (e.key === 'p' || e.key === 'P') {
                e.preventDefault();
                this.togglePerformanceDetails();
            }
            
            const game = (window as Window & { game?: { stateManager?: { addEventListener?: (event: string, callback: (event: StateEvent) => void) => void; currentState?: { name: string } } } }).game;
            const currentState = game?.stateManager?.currentState;
            
            if (currentState && currentState.name === 'menu' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
                Logger.log('DebugOverlay', `Arrow key pressed: ${e.key}, defaultPrevented: ${e.defaultPrevented}`);
            }
            
            if (currentState && currentState.name === 'menu') {
                if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    e.stopPropagation();
                    this.selectedStageIndex--;
                    if (this.selectedStageIndex < 0) {
                        this.selectedStageIndex = this.stageList.length - 1;
                    }
                    this.updateStageDisplay();
                    Logger.log('DebugOverlay', `Stage left: ${this.stageList[this.selectedStageIndex]}`);
                }
                
                if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    e.stopPropagation();
                    this.selectedStageIndex++;
                    if (this.selectedStageIndex >= this.stageList.length) {
                        this.selectedStageIndex = 0;
                    }
                    this.updateStageDisplay();
                    Logger.log('DebugOverlay', `Stage right: ${this.stageList[this.selectedStageIndex]}`);
                }
            }
        }, true);
    }

    update(_deltaTime: number): void {
        this.frameCount++;
        const currentTime = performance.now();
        if (currentTime >= this.lastFPSUpdate + 1000) {
            this.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastFPSUpdate));
            this.frameCount = 0;
            this.lastFPSUpdate = currentTime;
            this.updateStat('fps', this.fps.toString());
        }
        
        const perfMetrics = this.performanceMonitor.getLatestMetrics();
        if (perfMetrics) {
            this.updateStat('frame_time', `${perfMetrics.frameTime.toFixed(2)}ms`);
            this.updateStat('draw_calls', perfMetrics.drawCalls.total.toString());
            
            if (this.showPerformanceDetails) {
                this.updatePerformanceDetails(perfMetrics);
            }
        }
        
        const game = (window as Window & { game?: { stateManager?: { addEventListener?: (event: string, callback: (event: Event & { data?: { to?: string } }) => void) => void; currentState?: { name: string } } } }).game;
        if (!game) {
            return;
        }
        
        const currentState = game.stateManager?.currentState;
        if (!currentState) {
            return;
        }
        
        if (currentState && currentState.name === 'play') {
            const playState = currentState as PlayState;
            
            const player = playState.player;
            if (player) {
                this.updateStat('player_x', Math.floor(player.x).toString());
                this.updateStat('player_y', Math.floor(player.y).toString());
            } else {
                this.updateStat('player_x', '-');
                this.updateStat('player_y', '-');
            }
        } else {
            this.updateStat('player_x', '-');
            this.updateStat('player_y', '-');
        }
    }

    toggle(): void {
        this.toggleVisibility();
    }

    private updateStat(name: string, value: string): void {
        const element = this.statsElements.get(name);
        if (element) {
            element.textContent = value;
        }
    }

    private toggleVisibility(): void {
        if (this.debugElement) {
            this.debugElement.style.display = 
                this.debugElement.style.display === 'none' ? 'block' : 'none';
        }
    }
    
    private changeSpeed(delta: number): void {
        GAME_CONSTANTS.GLOBAL_SPEED_MULTIPLIER = Math.max(0.1, Math.min(3.0, 
            GAME_CONSTANTS.GLOBAL_SPEED_MULTIPLIER + delta));
        this.updateStat('speed', `${GAME_CONSTANTS.GLOBAL_SPEED_MULTIPLIER.toFixed(1)}x`);
    }
    
    private resetSpeed(): void {
        GAME_CONSTANTS.GLOBAL_SPEED_MULTIPLIER = 1.0;
        this.updateStat('speed', `${GAME_CONSTANTS.GLOBAL_SPEED_MULTIPLIER.toFixed(1)}x`);
    }
    
    private updateStageDisplay(): void {
        if (this.stageSelectElement) {
            this.stageSelectElement.textContent = this.stageList[this.selectedStageIndex];
        }
    }
    
    getSelectedStage(): string | null {
        const game = (window as Window & { game?: { stateManager?: { addEventListener?: (event: string, callback: (event: Event & { data?: { to?: string } }) => void) => void; currentState?: { name: string } } } }).game;
        const currentState = game?.stateManager?.currentState;
        
        if (currentState && currentState.name === 'menu') {
            return this.stageList[this.selectedStageIndex];
        }
        
        return null;
    }
    
    private togglePerformanceDetails(): void {
        this.showPerformanceDetails = !this.showPerformanceDetails;
        const perfDiv = document.getElementById('performance-details');
        if (perfDiv) {
            perfDiv.style.display = this.showPerformanceDetails ? 'block' : 'none';
        }
    }
    
    private updatePerformanceDetails(metrics: {
        fps: number;
        frameTime: number;
        memoryUsed: number;
        drawCalls: {
            drawSprite: number;
            drawRect: number;
            drawText: number;
            drawLine: number;
            total: number;
        };
        timestamp: number;
    }): void {
        const perfDiv = document.getElementById('performance-details');
        if (!perfDiv) return;
        
        perfDiv.innerHTML = `
            <div style="color: #ffff00">Performance Details:</div>
            <div>Sprites: ${metrics.drawCalls.drawSprite}</div>
            <div>Rects: ${metrics.drawCalls.drawRect}</div>
            <div>Text: ${metrics.drawCalls.drawText}</div>
            <div>Lines: ${metrics.drawCalls.drawLine}</div>
            ${metrics.memoryUsed > 0 ? `<div>Memory: ${metrics.memoryUsed.toFixed(1)}MB</div>` : ''}
        `;
    }

    destroy(): void {
        if (this.debugElement) {
            this.debugElement.remove();
        }
        this.statsElements.clear();
    }
}
