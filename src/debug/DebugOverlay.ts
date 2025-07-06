

import { ServiceLocator } from '../services/ServiceLocator';
import { GAME_CONSTANTS } from '../config/GameConstants';
import { PlayState } from '../states/PlayState';
import { URLParams } from '../utils/urlParams';
import { Logger } from '../utils/Logger';

export class DebugOverlay {
    private serviceLocator: ServiceLocator;
    private debugElement?: HTMLDivElement;
    private statsElements: Map<string, HTMLElement> = new Map();
    
    // Stage selection
    private stageList: string[] = [
        'stage1-1', 'stage1-2', 'stage1-3',
        'stage0-1', 'stage0-2', 'stage0-3',
        'performance-test'
    ];
    private selectedStageIndex: number = 0;
    private stageSelectElement?: HTMLElement;
    
    constructor(serviceLocator: ServiceLocator) {
        this.serviceLocator = serviceLocator;
        
        // Initialize selected stage from URL parameters
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
        
        (window as any).debugOverlay = this;
        
        Logger.log('DebugOverlay', `Initialized with stage: ${this.stageList[this.selectedStageIndex]} (index: ${this.selectedStageIndex})`);
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

        const stats = ['Speed', 'State', 'Player X', 'Player Y'];
        stats.forEach(stat => {
            const statElement = document.createElement('div');
            statElement.innerHTML = `${stat}: <span>-</span>`;
            this.debugElement!.appendChild(statElement);
            const key = stat.toLowerCase().replace(' ', '_');
            this.statsElements.set(key, statElement.querySelector('span')!);
        });
        
        this.updateStat('speed', `${GAME_CONSTANTS.GLOBAL_SPEED_MULTIPLIER.toFixed(1)}x`);
        
        // Add stage selection UI
        const stageDiv = document.createElement('div');
        stageDiv.style.marginTop = '10px';
        stageDiv.style.paddingTop = '10px';
        stageDiv.style.borderTop = '1px solid #444';
        stageDiv.innerHTML = `Stage: <span style="color: #ffff00">${this.stageList[this.selectedStageIndex]}</span>`;
        this.debugElement!.appendChild(stageDiv);
        this.stageSelectElement = stageDiv.querySelector('span')!;
        
        const helpDiv = document.createElement('div');
        helpDiv.style.marginTop = '10px';
        helpDiv.style.fontSize = '10px';
        helpDiv.style.color = '#888';
        helpDiv.innerHTML = 'F3: Toggle | +/-: Speed | 0: Reset<br>D: Toggle Stage Select | ←→: Select';
        this.debugElement!.appendChild(helpDiv);
        
        // Initialize default values
        this.updateStat('state', 'menu');
        
        document.body.appendChild(this.debugElement);
    }

    private setupEventListeners(): void {
        // Listen to state changes
        const game = (window as any).game;
        if (game?.stateManager) {
            game.stateManager.addEventListener('stateChange', (event: any) => {
                this.updateStat('state', event.data.to || 'unknown');
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
            
            // Stage selection controls
            const game = (window as any).game;
            const currentState = game?.stateManager?.currentState;
            
            // Debug: Log all arrow key presses in menu
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
        }, true);  // Use capture phase to handle events before InputSystem
    }

    update(_deltaTime: number): void {
        // Update player position if available
        const game = (window as any).game;
        if (!game) {
            return;
        }
        
        const currentState = game.stateManager?.currentState;
        if (!currentState) {
            return;
        }
        
        // Check if the current state is PlayState (has player getter)
        if (currentState && currentState.name === 'play') {
            // Cast to PlayState to access player property
            const playState = currentState as PlayState;
            
            const player = playState.player;
            if (player) {
                this.updateStat('player_x', Math.floor(player.x).toString());
                this.updateStat('player_y', Math.floor(player.y).toString());
            } else {
                // Player not available yet
                this.updateStat('player_x', '-');
                this.updateStat('player_y', '-');
            }
        } else {
            // Not in play state, clear player position
            this.updateStat('player_x', '-');
            this.updateStat('player_y', '-');
        }
    }

    toggle(): void {
        this.toggleVisibility();
    }

    private updateStats(): void {
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
        const game = (window as any).game;
        const currentState = game?.stateManager?.currentState;
        
        // Only return selected stage if we're in menu state
        if (currentState && currentState.name === 'menu') {
            return this.stageList[this.selectedStageIndex];
        }
        
        return null;
    }

    destroy(): void {
        if (this.debugElement) {
            this.debugElement.remove();
        }
        this.statsElements.clear();
    }
}
