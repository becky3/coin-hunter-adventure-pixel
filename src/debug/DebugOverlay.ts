

import { GAME_CONSTANTS } from '../config/GameConstants';
import { PlayState } from '../states/PlayState';
import { URLParams } from '../utils/urlParams';
import { Logger } from '../utils/Logger';
import type { StateEvent } from '../states/GameStateManager';
import { EnemySpawnDialog } from './EnemySpawnDialog';
import { PerformanceMonitor } from '../performance/PerformanceMonitor';
import { LevelLoader } from '../levels/LevelLoader';

/**
 * DebugOverlay implementation
 */
export class DebugOverlay {
    private debugElement?: HTMLDivElement;
    private statsElements: Map<string, HTMLElement> = new Map();
    
    private stageList: string[] = [];
    private selectedStageIndex: number = 0;
    private stageSelectElement?: HTMLElement;
    
    private fps: number = 0;
    private frameCount: number = 0;
    private lastFPSUpdate: number = 0;
    
    private enemySpawnDialog?: EnemySpawnDialog;
    private performanceMonitor: PerformanceMonitor;
    private showPerformanceDetails: boolean = false;
    
    constructor() {
        this.performanceMonitor = PerformanceMonitor.getInstance();
    }

    async init(): Promise<void> {
        await this.loadStageList();
        this.createDebugUI();
        this.setupEventListeners();
        
        if (this.debugElement) {
            this.debugElement.style.display = 'block';
        }
        
        this.enemySpawnDialog = new EnemySpawnDialog();
        this.enemySpawnDialog.init();
        
        (window as Window & { debugOverlay?: DebugOverlay }).debugOverlay = this;
        
        this.lastFPSUpdate = performance.now();
        
        Logger.log('DebugOverlay', `Initialized with stage: ${this.stageList[this.selectedStageIndex]} (index: ${this.selectedStageIndex})`);
    }
    
    getFPS(): number {
        return this.fps;
    }
    
    private async loadStageList(): Promise<void> {
        try {
            const levelLoader = new LevelLoader();
            const stageData = await levelLoader.loadStageList();
            this.stageList = stageData.stages.map(stage => stage.id);
            
            const urlParams = new URLParams();
            const urlStage = urlParams.getStageId();
            
            if (urlStage && this.stageList.includes(urlStage)) {
                this.selectedStageIndex = this.stageList.indexOf(urlStage);
            }
            else if (stageData.defaultStage && this.stageList.includes(stageData.defaultStage)) {
                this.selectedStageIndex = this.stageList.indexOf(stageData.defaultStage);
            }
            else {
                this.selectedStageIndex = 0;
            }
            
            Logger.log('DebugOverlay', `Loaded ${this.stageList.length} stages from stages.json`);
        } catch (error) {
            Logger.error('DebugOverlay', 'Failed to load stage list:', error);
            this.stageList = [];
            this.selectedStageIndex = 0;
        }
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
        if (game?.stateManager?.addEventListener) {
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
        drawCalls: { drawSprite: number; drawRect: number; drawText: number; drawLine: number; };
        canvasOperations?: { save: number; restore: number; scale: number; setTransform: number; 
                            globalAlpha: number; fillRect: number; clearRect: number; drawImage: number; };
        pixelMetrics?: { totalPixelsDrawn: number; overdrawRatio: number; offscreenDrawRatio: number; 
                        fillRectArea: number; clearRectArea: number; };
        gpuMetrics?: { estimatedLoad: number; hardwareAcceleration: boolean; webglAvailable: boolean; gpuTier: string; };
        memoryUsed: number;
    }): void {
        const perfDiv = document.getElementById('performance-details');
        if (!perfDiv) return;
        
        let html = '<div style="color: #ffff00">Performance Details:</div>';
        
        html += '<div style="margin-top: 5px; border-top: 1px solid #444; padding-top: 5px;">Draw Calls:</div>';
        html += `<div>Sprites: ${metrics.drawCalls.drawSprite}</div>`;
        html += `<div>Rects: ${metrics.drawCalls.drawRect}</div>`;
        html += `<div>Text: ${metrics.drawCalls.drawText}</div>`;
        html += `<div>Lines: ${metrics.drawCalls.drawLine}</div>`;
        
        if (metrics.canvasOperations) {
            html += '<div style="margin-top: 5px; border-top: 1px solid #444; padding-top: 5px;">Canvas Ops:</div>';
            html += `<div>Save/Restore: ${metrics.canvasOperations.save}/${metrics.canvasOperations.restore}</div>`;
            html += `<div>Scale: ${metrics.canvasOperations.scale}</div>`;
            html += `<div>Transform: ${metrics.canvasOperations.setTransform}</div>`;
        }
        
        if (metrics.pixelMetrics) {
            html += '<div style="margin-top: 5px; border-top: 1px solid #444; padding-top: 5px;">Pixel Stats:</div>';
            html += `<div>Total: ${(metrics.pixelMetrics.totalPixelsDrawn / 1000000).toFixed(2)}M</div>`;
            html += `<div>Overdraw: ${metrics.pixelMetrics.overdrawRatio.toFixed(2)}</div>`;
            html += `<div>Offscreen: ${(metrics.pixelMetrics.offscreenDrawRatio * 100).toFixed(1)}%</div>`;
        }
        
        if (metrics.gpuMetrics) {
            html += '<div style="margin-top: 5px; border-top: 1px solid #444; padding-top: 5px;">GPU:</div>';
            html += `<div>Est.Load: ${metrics.gpuMetrics.estimatedLoad.toFixed(1)}%</div>`;
            html += `<div>HW Accel: ${metrics.gpuMetrics.hardwareAcceleration ? 'Yes' : 'No'}</div>`;
            html += `<div>Tier: ${metrics.gpuMetrics.gpuTier}</div>`;
        }
        
        if (metrics.memoryUsed > 0) {
            html += `<div style="margin-top: 5px;">Memory: ${metrics.memoryUsed.toFixed(1)}MB</div>`;
        }
        
        perfDiv.innerHTML = html;
    }

    destroy(): void {
        if (this.debugElement) {
            this.debugElement.remove();
        }
        this.statsElements.clear();
    }
}
