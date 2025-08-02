import { GameState, GameStateManager, StateChangeParams } from './GameStateManager';
import { PixelRenderer } from '../rendering/PixelRenderer';
import { GameStates } from '../types/GameStateTypes';
import { InputSystem } from '../core/InputSystem';
import { Logger } from '../utils/Logger';
import { AssetLoader, StageType } from '../assets/AssetLoader';
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
    stageType?: string;
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
    private playerSprite: string | null = null;
    
    constructor(game: Game) {
        this.game = game;
        this.params = {} as IntermissionParams;
    }
    
    async enter(params?: StateChangeParams): Promise<void> {
        const p = params as unknown as IntermissionParams | undefined;
        
        if (!p || !p.type || !p.level || p.lives === undefined) {
            throw new Error('[IntermissionState] Missing required parameters: type, level, and lives are required');
        }
        
        this.params = {
            type: p.type,
            level: p.level,
            lives: p.lives,
            ...(p.stageType && { stageType: p.stageType }),
            score: p.score || 0,
            playerState: p.playerState || {}
        };
        Logger.log('[IntermissionState] Entering with params:', this.params);
        this.timer = 0;
        

        if (!this.game.assetLoader) {
            throw new Error('[IntermissionState] AssetLoader is required');
        }
        

        if (!this.params.stageType) {
            const stageData = await this.game.assetLoader.loadStageData(this.params.level);
            this.params.stageType = stageData.stageType;
        }
        

        this.game.assetLoader.setStageType(this.params.stageType as StageType);
        Logger.log(`[IntermissionState] Stage type set to: ${this.params.stageType} for level: ${this.params.level}`);
        

        const spriteKey = 'player/idle';
        

        if (this.params.type === 'death') {
            this.playerSprite = spriteKey;
            Logger.log('[IntermissionState] Using already loaded player sprite:', this.playerSprite);

            await new Promise(resolve => setTimeout(resolve, 0));
        } else {

            try {
                const spriteData = await this.game.assetLoader.loadSprite('player', 'idle');
                this.playerSprite = spriteData.key;
                Logger.log('[IntermissionState] Player sprite loaded:', this.playerSprite);
            } catch (error) {
                Logger.error('[IntermissionState] Failed to load player sprite:', error);
                throw new Error(`Failed to load player sprite: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
    }
    
    update(deltaTime: number): void {
        if (this.timer === undefined) {
            this.timer = 0;
        }
        this.timer += deltaTime * 1000;
        

        if (this.timer < 1000 || (this.timer > 1900 && this.timer < 2100)) {
            Logger.log(`[IntermissionState] update() called - timer: ${this.timer.toFixed(1)}ms, deltaTime: ${deltaTime}s`);
        }
        
        if (this.timer >= this.DISPLAY_DURATION) {
            Logger.log('[IntermissionState] Timer reached, transitioning to PlayState');
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
        renderer.clear(-1);
        renderer.drawRect(0, 0, GAME_RESOLUTION.WIDTH, GAME_RESOLUTION.HEIGHT, 0x00);
        
        const centerX = GAME_RESOLUTION.WIDTH / 2;
        const centerY = GAME_RESOLUTION.HEIGHT / 2;
        
        const stageName = this.formatStageName(this.params.level);
        const stageNameWidth = stageName.length * 8;
        renderer.drawText(stageName, centerX - stageNameWidth / 2, centerY - 40, 0x30);
        
        this.renderLivesDisplay(renderer, centerX, centerY);
        
        if (this.params.type === 'start') {
            const readyText = 'GET READY!';
            const readyTextWidth = readyText.length * 8;
            renderer.drawText(readyText, centerX - readyTextWidth / 2, centerY + 40, 0x30);
        }
    }
    
    exit(): void {
        Logger.log('[IntermissionState] Exiting');
    }
    
    private formatStageName(level: string): string {
        return level.toUpperCase();
    }
    
    private renderLivesDisplay(renderer: PixelRenderer, centerX: number, centerY: number): void {
        const lives = this.params.lives;
        

        if (this.playerSprite) {
            const spriteX = centerX - 40;
            const spriteY = centerY - 8;
            renderer.drawSprite(this.playerSprite, spriteX, spriteY);
        }
        

        const xText = 'X';
        renderer.drawText(xText, centerX - 20, centerY, 0x30);
        
        const livesText = lives.toString();
        renderer.drawText(livesText, centerX, centerY, 0x30);
    }
}