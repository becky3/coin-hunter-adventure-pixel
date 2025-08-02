import { GameState, GameStateManager, StateChangeParams } from './GameStateManager';
import { PixelRenderer } from '../rendering/PixelRenderer';
import { GameStates } from '../types/GameStateTypes';
import { InputSystem } from '../core/InputSystem';
import { Logger } from '../utils/Logger';
import { AssetLoader } from '../assets/AssetLoader';
import { GAME_RESOLUTION } from '../constants/gameConstants';

interface Game {
    renderer?: PixelRenderer;
    inputSystem: InputSystem;
    stateManager: GameStateManager;
    assetLoader?: AssetLoader;
}

interface IntermissionParams {
    type: 'start' | 'death';
    level: string;
    lives: number;
    score?: number;
    playerState?: {
        powerUps?: string[];
        isSmall?: boolean;
    };
}

/**
 * Intermission state shown between levels and after player death
 */
export class IntermissionState implements GameState {
    public name = GameStates.INTERMISSION;
    private game: Game;
    private params: IntermissionParams;
    private timer: number = 0;
    private readonly DISPLAY_DURATION = 2000;
    
    constructor(game: Game) {
        this.game = game;
        this.params = {
            type: 'start',
            level: '1-1',
            lives: 3
        };
    }
    
    async enter(params?: StateChangeParams): Promise<void> {
        const p = params as IntermissionParams;
        this.params = {
            type: p?.type || 'start',
            level: p?.level || '1-1',
            lives: p?.lives || 3,
            score: p?.score,
            playerState: p?.playerState
        };
        Logger.log('[IntermissionState] Entering with params:', this.params);
        this.timer = 0;
    }
    
    update(deltaTime: number): void {
        this.timer += deltaTime;
        
        if (this.timer >= this.DISPLAY_DURATION) {
            this.game.stateManager.setState(GameStates.PLAY, {
                level: this.params.level,
                enableProgression: true,
                playerState: {
                    score: this.params.score || 0,
                    lives: this.params.lives,
                    powerUps: this.params.playerState?.powerUps || [],
                    isSmall: this.params.playerState?.isSmall || false
                },
                isRespawn: this.params.type === 'death'
            });
        }
    }
    
    render(renderer: PixelRenderer): void {
        renderer.clear(0, 0);
        
        const centerX = GAME_RESOLUTION.WIDTH / 2;
        const centerY = GAME_RESOLUTION.HEIGHT / 2;
        
        const stageName = this.formatStageName(this.params.level);
        renderer.drawText(stageName, centerX, centerY - 40, 0x30);
        
        this.renderLivesDisplay(renderer, centerX, centerY);
        
        if (this.params.type === 'start') {
            renderer.drawText('GET READY!', centerX, centerY + 40, 0x30);
        }
    }
    
    exit(): void {
        Logger.log('[IntermissionState] Exiting');
    }
    
    private formatStageName(level: string): string {
        return `STAGE ${level.toUpperCase()}`;
    }
    
    private renderLivesDisplay(renderer: PixelRenderer, centerX: number, centerY: number): void {
        const lives = this.params.lives;
        
        const livesText = `LIVES X ${lives}`;
        renderer.drawText(livesText, centerX, centerY, 0x30);
    }
}