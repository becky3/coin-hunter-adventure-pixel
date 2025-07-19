import { GAME_RESOLUTION } from '../constants/gameConstants';
import { GameState, GameStateManager } from './GameStateManager';
import { PixelRenderer } from '../rendering/PixelRenderer';
import { InputSystem } from '../core/InputSystem';
import { URLParams } from '../utils/urlParams';
import { Logger } from '../utils/Logger';
import { MusicSystem } from '../audio/MusicSystem';
import { UI_PALETTE_INDICES, getMasterColor } from '../utils/pixelArtPalette';

interface MenuOption {
    text: string;
    action: string;
}

interface Game {
    renderer?: PixelRenderer;
    inputSystem: InputSystem;
    musicSystem?: MusicSystem;
    stateManager: GameStateManager;
}

/**
 * Game state for menu mode
 */
export class MenuState implements GameState {
    public name = 'menu';
    private game: Game;
    private selectedOption: number;
    private options: MenuOption[];
    private logoY: number;
    private logoTargetY: number;
    private optionsAlpha: number;
    private showHowTo: boolean;
    private showCredits: boolean;
    private titleAnimTimer: number;
    private inputListeners: Array<() => void>;
    private _firstUpdateLogged: boolean = false;
    

    constructor(game: Game) {
        this.game = game;
        this.selectedOption = 0;
        this.options = [
            { text: 'START GAME', action: 'start' },
            { text: 'HOW TO PLAY', action: 'howto' },
            { text: 'CREDITS', action: 'credits' },
            { text: 'SOUND TEST', action: 'soundtest' }
        ];
        this.logoY = -100;
        this.logoTargetY = 40;
        this.optionsAlpha = 0;
        this.showHowTo = false;
        this.showCredits = false;
        this.titleAnimTimer = 0;
        this.inputListeners = [];
    }
    
    private init(): void {
        console.log('[Performance] MenuState.init() started:', performance.now().toFixed(2) + 'ms');
        this.logoY = -100;
        this.optionsAlpha = 0;
        this.selectedOption = 0;
        this.showHowTo = false;
        this.showCredits = false;
        if (this.game.musicSystem?.isInitialized) {
            console.log('[Performance] Playing title BGM:', performance.now().toFixed(2) + 'ms');
            this.game.musicSystem.playBGMFromPattern('title');
        }
        console.log('[Performance] MenuState.init() completed:', performance.now().toFixed(2) + 'ms');
    }
    
    enter(): void {
        console.log('[Performance] MenuState.enter() called:', performance.now().toFixed(2) + 'ms');
        this.init();
        this.setupInputListeners();
        if (this.game.renderer) {
            this.game.renderer.setCamera(0, 0);
        }
        console.log('[Performance] MenuState.enter() completed:', performance.now().toFixed(2) + 'ms');
    }
    
    private setupInputListeners(): void {
        this.removeInputListeners();
        this.inputListeners.push(
            this.game.inputSystem.on('keyPress', (event: InputEvent) => {
                if ((event.action === 'up' || event.action === 'down') && 
                    !this.showHowTo && !this.showCredits) {
                    
                    if (event.action === 'up') {
                        this.selectedOption--;
                        if (this.selectedOption < 0) {
                            this.selectedOption = this.options.length - 1;
                        }
                    } else {
                        this.selectedOption++;
                        if (this.selectedOption >= this.options.length) {
                            this.selectedOption = 0;
                        }
                    }
                    
                    if (this.game.musicSystem) {
                        this.game.musicSystem.playSEFromPattern('button');
                    }
                }
            })
        );
        this.inputListeners.push(
            this.game.inputSystem.on('keyPress', (event: InputEvent) => {
                const isValidJump = event.action === 'jump' && event.key === 'Space';
                const isValidAction = event.action === 'action';
                
                
                if ((isValidAction || isValidJump) && 
                    !this.showHowTo && !this.showCredits && 
                    this.optionsAlpha >= 1) {
                    setTimeout(() => {
                        this.executeOption();
                    }, 0);
                }
            })
        );
        this.inputListeners.push(
            this.game.inputSystem.on('keyPress', (event: InputEvent) => {
                const isValidJump = event.action === 'jump' && event.key === 'Space';
                const isValidAction = event.action === 'action';
                const isEscape = event.action === 'escape';
                
                if ((this.showHowTo || this.showCredits) && 
                    (isEscape || isValidAction || isValidJump)) {
                    this.showHowTo = false;
                    this.showCredits = false;
                    if (this.game.musicSystem) {
                        this.game.musicSystem.playSEFromPattern('button');
                    }
                }
            })
        );
        
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
    
    private removeInputListeners(): void {
        this.inputListeners.forEach(removeListener => removeListener());
        this.inputListeners = [];
    }
    
    update(deltaTime: number): void {
        this.titleAnimTimer += deltaTime;
        if (this.logoY < this.logoTargetY) {
            this.logoY += 5;
            if (this.logoY > this.logoTargetY) {
                this.logoY = this.logoTargetY;
            }
        }
        if (this.logoY >= this.logoTargetY && this.optionsAlpha < 1) {
            this.optionsAlpha += 0.02;
            if (this.optionsAlpha > 1) {
                this.optionsAlpha = 1;
            }
        }
        
        if (!this._firstUpdateLogged) {
            Logger.log('MenuState', `update called, optionsAlpha: ${this.optionsAlpha}`);
            this._firstUpdateLogged = true;
        }
    }
    
    render(renderer: PixelRenderer): void {
        renderer.clear(getMasterColor(UI_PALETTE_INDICES.black));
        
        if (this.showHowTo) {
            this.renderHowToPlay(renderer);
        } else if (this.showCredits) {
            this.renderCredits(renderer);
        } else {
            this.drawTitleLogo(renderer);
            this.drawMenuOptions(renderer);
        }
        this.drawMuteButton(renderer);
        renderer.drawText('v0.1.0', 8, GAME_RESOLUTION.HEIGHT - 16, getMasterColor(UI_PALETTE_INDICES.darkGray));
    }
    
    private drawTitleLogo(renderer: PixelRenderer): void {
        const centerX = GAME_RESOLUTION.WIDTH / 2;
        const titleY = this.logoY;
        renderer.drawTextCentered('COIN HUNTER', centerX, titleY, getMasterColor(UI_PALETTE_INDICES.gold), 1, true);
        renderer.drawTextCentered('ADVENTURE', centerX, titleY + 16, getMasterColor(UI_PALETTE_INDICES.lightRed), 1, true);
    }
    
    private drawMenuOptions(renderer: PixelRenderer): void {
        if (this.optionsAlpha <= 0) return;
        
        const centerX = GAME_RESOLUTION.WIDTH / 2;
        const startY = 104;
        const lineHeight = 24;
        const goldColor = getMasterColor(UI_PALETTE_INDICES.gold);
        const whiteColor = getMasterColor(UI_PALETTE_INDICES.white);
        
        this.options.forEach((option, index) => {
            const y = startY + index * lineHeight;
            const isSelected = index === this.selectedOption;
            const color = isSelected ? goldColor : whiteColor;
            const prevAlpha = renderer.ctx.globalAlpha;
            renderer.ctx.globalAlpha = this.optionsAlpha;
            
            renderer.drawTextCentered(option.text, centerX, y, color);
            if (isSelected) {
                const textWidth = option.text.length * 8;
                const cursorX = centerX - Math.floor(textWidth / 2) - 16;
                renderer.drawText('>', cursorX, y, goldColor);
            }
            
            renderer.ctx.globalAlpha = prevAlpha;
        });
        const prevAlpha = renderer.ctx.globalAlpha;
        renderer.ctx.globalAlpha = this.optionsAlpha;
        
        renderer.drawTextCentered('ARROWS:SELECT', centerX, 200, getMasterColor(UI_PALETTE_INDICES.gray));
        renderer.drawTextCentered('ENTER/SPACE:OK', centerX, 208, getMasterColor(UI_PALETTE_INDICES.gray));
        
        renderer.ctx.globalAlpha = prevAlpha;
    }

    private renderHowToPlay(renderer: PixelRenderer): void {
        const centerX = GAME_RESOLUTION.WIDTH / 2;
        renderer.drawTextCentered('HOW TO PLAY', centerX, 24, getMasterColor(UI_PALETTE_INDICES.gold));
        const instructions = [
            { key: 'ARROWS', desc: 'MOVE' },
            { key: 'UP/SPACE', desc: 'JUMP' },
            { key: 'HOLD JUMP', desc: 'JUMP HIGH' },
            { key: 'M', desc: 'MUTE' },
            { key: 'F3', desc: 'DEBUG' }
        ];
        
        let y = 56;
        instructions.forEach(inst => {
            renderer.drawText(inst.key, 40, y, getMasterColor(UI_PALETTE_INDICES.cyan));
            renderer.drawText(inst.desc, 120, y, getMasterColor(UI_PALETTE_INDICES.white));
            y += 16;
        });
        renderer.drawTextCentered('COLLECT ALL COINS!', centerX, 160, getMasterColor(UI_PALETTE_INDICES.white));
        renderer.drawTextCentered('REACH THE GOAL!', centerX, 176, getMasterColor(UI_PALETTE_INDICES.white));
        renderer.drawTextCentered('AVOID ENEMIES!', centerX, 192, getMasterColor(UI_PALETTE_INDICES.lightRed));
        renderer.drawTextCentered('ESC/ENTER TO RETURN', centerX, 216, getMasterColor(UI_PALETTE_INDICES.gray));
    }
    
    private renderCredits(renderer: PixelRenderer): void {
        const centerX = GAME_RESOLUTION.WIDTH / 2;
        renderer.drawTextCentered('CREDITS', centerX, 24, getMasterColor(UI_PALETTE_INDICES.gold));
        const credits = [
            { role: 'ORIGINAL', name: 'SVG TEAM' },
            { role: 'PIXEL VER', name: 'CANVAS TEAM' },
            { role: 'MUSIC', name: 'WEB AUDIO' },
            { role: 'THANKS', name: 'ALL PLAYERS' }
        ];
        
        let y = 56;
        credits.forEach(credit => {
            renderer.drawText(credit.role, 40, y, getMasterColor(UI_PALETTE_INDICES.cyan));
            renderer.drawText(credit.name, 40, y + 8, getMasterColor(UI_PALETTE_INDICES.white));
            y += 32;
        });
        renderer.drawTextCentered('ESC/ENTER TO RETURN', centerX, 216, getMasterColor(UI_PALETTE_INDICES.gray));
    }
    
    private drawMuteButton(renderer: PixelRenderer): void {
        const muteState = this.game.musicSystem?.getMuteState() || false;
        const buttonText = muteState ? 'SOUND:OFF' : 'SOUND:ON';
        const buttonColor = muteState ? getMasterColor(UI_PALETTE_INDICES.brightRed) : getMasterColor(UI_PALETTE_INDICES.green);
        
        const x = GAME_RESOLUTION.WIDTH - 80;
        const y = 8;
        
        renderer.drawText(buttonText, x, y, buttonColor);
        renderer.drawText('(M)', x + 16, y + 8, getMasterColor(UI_PALETTE_INDICES.darkGray));
    }
    
    private executeOption(): void {
        const option = this.options[this.selectedOption];
        
        switch (option.action) {
        case 'start':
            if (this.game.musicSystem) {
                this.game.musicSystem.playSEFromPattern('gameStart');
            }
            try {
                const urlParams = new URLParams();
                const stageId = urlParams.getStageId();
                
                const debugOverlay = (window as Window & { debugOverlay?: { getSelectedStage?: () => string } }).debugOverlay;
                const debugSelectedStage = debugOverlay?.getSelectedStage?.();
                
                const selectedStage = debugSelectedStage || stageId;
                
                if (selectedStage) {
                    Logger.log('MenuState', `Starting stage: ${selectedStage} (source: ${debugSelectedStage ? 'debug overlay' : 'URL parameter'}`);
                    this.game.stateManager.setState('play', { 
                        level: selectedStage
                    });
                } else {
                    this.game.stateManager.setState('play');
                }
            } catch (error) {
                Logger.error('MenuState', 'Error transitioning to play state:', error);
            }
            break;
                
        case 'howto':
            if (this.game.musicSystem) {
                this.game.musicSystem.playSEFromPattern('button');
            }
            this.showHowTo = true;
            break;
                
        case 'credits':
            if (this.game.musicSystem) {
                this.game.musicSystem.playSEFromPattern('button');
            }
            this.showCredits = true;
            break;
            
        case 'soundtest':
            if (this.game.musicSystem) {
                this.game.musicSystem.playSEFromPattern('button');
            }
            this.game.stateManager.setState('soundtest');
            break;
        }
    }
    
    exit(): void {
        this.removeInputListeners();
        
        if (this.game.musicSystem) {
            this.game.musicSystem.stopBGM();
        }
    }
    
    destroy(): void {
        this.exit();
    }
}