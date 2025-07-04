

import { ServiceLocator } from '../services/ServiceLocator';
import { GAME_CONSTANTS } from '../config/GameConstants';
import { PlayState } from '../states/PlayState';

export class DebugOverlay {
    private serviceLocator: ServiceLocator;
    private debugElement?: HTMLDivElement;
    private statsElements: Map<string, HTMLElement> = new Map();
    private updateLogged = false;
    
    constructor(serviceLocator: ServiceLocator) {
        this.serviceLocator = serviceLocator;
    }

    async init(): Promise<void> {
        this.createDebugUI();
        this.setupEventListeners();
        
        if (this.debugElement) {
            this.debugElement.style.display = 'block';
        }
        
        (window as any).debugOverlay = this;
        
        // Add test functions to window for debugging
        (window as any).testDebugUpdate = () => {
            console.log('[DebugOverlay] Manual update test');
            this.update(0);
        };
        
        (window as any).checkDebugStats = () => {
            console.log('[DebugOverlay] Stats elements:', this.statsElements);
            this.statsElements.forEach((element, key) => {
                console.log(`  ${key}: ${element.textContent}`);
            });
        };
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
            console.log(`[DebugOverlay] Registered stat: ${stat} with key: ${key}`);
        });
        
        this.updateStat('speed', `${GAME_CONSTANTS.GLOBAL_SPEED_MULTIPLIER.toFixed(1)}x`);
        
        const helpDiv = document.createElement('div');
        helpDiv.style.marginTop = '10px';
        helpDiv.style.fontSize = '10px';
        helpDiv.style.color = '#888';
        helpDiv.innerHTML = 'F3: Toggle | +/-: Speed | 0: Reset';
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
            
        });
    }

    update(_deltaTime: number): void {
        // Log once to check if update is being called
        if (!this.updateLogged) {
            console.log('[DebugOverlay] update() is being called');
            this.updateLogged = true;
        }
        
        // Update player position if available
        const game = (window as any).game;
        if (!game) {
            console.warn('[DebugOverlay] game is not available');
            return;
        }
        
        const currentState = game.stateManager?.currentState;
        if (!currentState) {
            console.warn('[DebugOverlay] currentState is not available');
            console.warn('[DebugOverlay] game.stateManager:', game.stateManager);
            console.warn('[DebugOverlay] game.stateManager?.currentState:', game.stateManager?.currentState);
            return;
        }
        
        // Debug log once per state change
        if (this.lastStateName !== currentState.name) {
            this.lastStateName = currentState.name;
            console.log('[DebugOverlay] State changed to:', currentState.name);
            console.log('[DebugOverlay] currentState object:', currentState);
            console.log('[DebugOverlay] Has player property:', 'player' in currentState);
            console.log('[DebugOverlay] Player value:', currentState.player);
        }
        
        // Check if the current state is PlayState (has player getter)
        if (currentState && currentState.name === 'play') {
            // Cast to PlayState to access player property
            const playState = currentState as PlayState;
            console.log('[DebugOverlay] PlayState cast:', playState);
            console.log('[DebugOverlay] playState.player:', playState.player);
            
            const player = playState.player;
            if (player) {
                this.updateStat('player_x', Math.floor(player.x).toString());
                this.updateStat('player_y', Math.floor(player.y).toString());
            } else {
                // Player not available yet
                console.warn('[DebugOverlay] Player not available in PlayState');
                this.updateStat('player_x', '-');
                this.updateStat('player_y', '-');
            }
        } else {
            // Not in play state, clear player position
            this.updateStat('player_x', '-');
            this.updateStat('player_y', '-');
        }
    }
    
    private lastStateName?: string;

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
    

    destroy(): void {
        if (this.debugElement) {
            this.debugElement.remove();
        }
        this.statsElements.clear();
    }
}
