import { GameState, GameStateManager } from './GameStateManager';
import { PixelRenderer } from '../rendering/PixelRenderer';
import { InputSystem, InputEvent } from '../core/InputSystem';
import { MusicSystem } from '../audio/MusicSystem';

interface Game {
    renderer?: PixelRenderer;
    inputSystem: InputSystem;
    musicSystem?: MusicSystem;
    stateManager: GameStateManager;
}

/**
 * Base class for UI states with common functionality
 */
export abstract class BaseUIState implements GameState {
    protected game: Game;
    protected inputListeners: Array<() => void> = [];

    constructor(game: Game) {
        this.game = game;
    }

    abstract enter(): void;
    abstract exit(): void;
    abstract update(deltaTime: number): void;
    abstract render(renderer: PixelRenderer): void;

    /**
     * Setup common mute functionality listener
     */
    protected setupMuteListener(): void {
        this.inputListeners.push(
            this.game.inputSystem.on('keyPress', (event: InputEvent) => {
                if (event.action === 'mute') {
                    if (this.game.musicSystem) {
                        this.game.musicSystem.toggleMute();
                        this.game.musicSystem.playSEFromPattern('button');
                    }
                }
            })
        );
    }

    /**
     * Remove all input listeners
     */
    protected removeInputListeners(): void {
        this.inputListeners.forEach(removeListener => removeListener());
        this.inputListeners = [];
    }
}