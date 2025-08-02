import { GAME_RESOLUTION } from '../constants/gameConstants';
import { BaseUIState, Game } from './BaseUIState';
import { PixelRenderer } from '../rendering/PixelRenderer';
import { InputEvent } from '../core/InputSystem';
import { URLParams } from '../utils/urlParams';
import { Logger } from '../utils/Logger';
import { UI_PALETTE_INDICES } from '../utils/pixelArtPalette';
import { GameStates } from '../types/GameStateTypes';

interface MenuOption {
    text: string;
    action: string;
}

/**
 * Game state for menu mode
 */
export class MenuState extends BaseUIState {
    public name = GameStates.MENU;
    private selectedOption: number;
    private options: MenuOption[];
    private logoY: number;
    private logoTargetY: number;
    private optionsAlpha: number;
    private showHowTo: boolean;
    private showCredits: boolean;
    private titleAnimTimer: number;
    private _firstUpdateLogged: boolean = false;
    

    constructor(game: Game) {
        super(game);
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
        Logger.log('[Performance] MenuState.init() started:', performance.now().toFixed(2) + 'ms');
        this.logoY = -100;
        this.optionsAlpha = 0;
        this.selectedOption = 0;
        this.showHowTo = false;
        this.showCredits = false;
        if (this.game.musicSystem?.isInitialized) {
            Logger.log('[Performance] Playing title BGM:', performance.now().toFixed(2) + 'ms');
            this.game.musicSystem.playBGMFromPattern('title');
        }
        Logger.log('[Performance] MenuState.init() completed:', performance.now().toFixed(2) + 'ms');
    }
    
    enter(): void {
        Logger.log('[Performance] MenuState.enter() called:', performance.now().toFixed(2) + 'ms');
        this.init();
        this.setupInputListeners();
        if (this.game.renderer) {
            this.game.renderer.setCamera(0, 0);
        }
        Logger.log('[Performance] MenuState.enter() completed:', performance.now().toFixed(2) + 'ms');
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
        
        this.setupMuteListener();
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
        renderer.clear(-1);
        renderer.drawRect(0, 0, GAME_RESOLUTION.WIDTH, GAME_RESOLUTION.HEIGHT, UI_PALETTE_INDICES.background);
        
        if (this.showHowTo) {
            this.renderHowToPlay(renderer);
        } else if (this.showCredits) {
            this.renderCredits(renderer);
        } else {
            this.drawTitleLogo(renderer);
            this.drawMenuOptions(renderer);
        }
        this.drawMuteButton(renderer);
        renderer.drawText('v0.1.0', 8, GAME_RESOLUTION.HEIGHT - 16, UI_PALETTE_INDICES.mutedText);
    }
    
    private drawTitleLogo(renderer: PixelRenderer): void {
        const centerX = GAME_RESOLUTION.WIDTH / 2;
        const titleY = this.logoY;
        renderer.drawTextCentered('COIN HUNTER', centerX, titleY, UI_PALETTE_INDICES.highlight, 1, true);
        renderer.drawTextCentered('ADVENTURE', centerX, titleY + 16, UI_PALETTE_INDICES.warning, 1, true);
    }
    
    private drawMenuOptions(renderer: PixelRenderer): void {
        if (this.optionsAlpha <= 0) return;
        
        const centerX = GAME_RESOLUTION.WIDTH / 2;
        const startY = 104;
        const lineHeight = 24;
        
        this.options.forEach((option, index) => {
            const y = startY + index * lineHeight;
            const isSelected = index === this.selectedOption;
            renderer.setAlpha(this.optionsAlpha);
            
            const colorIndex = isSelected ? UI_PALETTE_INDICES.highlight : UI_PALETTE_INDICES.primaryText;
            renderer.drawTextCentered(option.text, centerX, y, colorIndex);
            if (isSelected) {
                const textWidth = option.text.length * 8;
                const cursorX = centerX - Math.floor(textWidth / 2) - 16;
                renderer.drawText('>', cursorX, y, UI_PALETTE_INDICES.highlight);
            }
            
            renderer.resetAlpha();
        });
        renderer.setAlpha(this.optionsAlpha);
        
        renderer.drawTextCentered('ARROWS:SELECT', centerX, 200, UI_PALETTE_INDICES.secondaryText);
        renderer.drawTextCentered('ENTER/SPACE:OK', centerX, 208, UI_PALETTE_INDICES.secondaryText);
        
        renderer.resetAlpha();
    }

    private renderHowToPlay(renderer: PixelRenderer): void {
        const centerX = GAME_RESOLUTION.WIDTH / 2;
        renderer.drawTextCentered('HOW TO PLAY', centerX, 24, UI_PALETTE_INDICES.highlight);
        const instructions = [
            { key: 'ARROWS', desc: 'MOVE' },
            { key: 'UP/SPACE', desc: 'JUMP' },
            { key: 'HOLD JUMP', desc: 'JUMP HIGH' },
            { key: 'M', desc: 'MUTE' },
            { key: 'F3', desc: 'DEBUG' }
        ];
        
        let y = 56;
        instructions.forEach(inst => {
            renderer.drawText(inst.key, 40, y, UI_PALETTE_INDICES.accentText);
            renderer.drawText(inst.desc, 120, y, UI_PALETTE_INDICES.primaryText);
            y += 16;
        });
        renderer.drawTextCentered('COLLECT ALL COINS!', centerX, 160, UI_PALETTE_INDICES.primaryText);
        renderer.drawTextCentered('REACH THE GOAL!', centerX, 176, UI_PALETTE_INDICES.primaryText);
        renderer.drawTextCentered('AVOID ENEMIES!', centerX, 192, UI_PALETTE_INDICES.warning);
        renderer.drawTextCentered('ESC/ENTER TO RETURN', centerX, 216, UI_PALETTE_INDICES.secondaryText);
    }
    
    private renderCredits(renderer: PixelRenderer): void {
        const centerX = GAME_RESOLUTION.WIDTH / 2;
        renderer.drawTextCentered('CREDITS', centerX, 24, UI_PALETTE_INDICES.highlight);
        const credits = [
            { role: 'ORIGINAL', name: 'SVG TEAM' },
            { role: 'PIXEL VER', name: 'CANVAS TEAM' },
            { role: 'MUSIC', name: 'WEB AUDIO' },
            { role: 'THANKS', name: 'ALL PLAYERS' }
        ];
        
        let y = 56;
        credits.forEach(credit => {
            renderer.drawText(credit.role, 40, y, UI_PALETTE_INDICES.accentText);
            renderer.drawText(credit.name, 40, y + 8, UI_PALETTE_INDICES.primaryText);
            y += 32;
        });
        renderer.drawTextCentered('ESC/ENTER TO RETURN', centerX, 216, UI_PALETTE_INDICES.secondaryText);
    }
    
    private drawMuteButton(renderer: PixelRenderer): void {
        const muteState = this.game.musicSystem?.getMuteState() || false;
        const buttonText = muteState ? 'SOUND:OFF' : 'SOUND:ON';
        const buttonColor = muteState ? UI_PALETTE_INDICES.criticalDanger : UI_PALETTE_INDICES.success;
        
        const x = GAME_RESOLUTION.WIDTH - 80;
        const y = 8;
        
        renderer.drawText(buttonText, x, y, buttonColor);
        renderer.drawText('(M)', x + 16, y + 8, UI_PALETTE_INDICES.mutedText);
    }
    
    private executeOption(): void {
        const option = this.options[this.selectedOption];
        if (!option) {
            throw new Error(`Invalid menu option at index: ${this.selectedOption}`);
        }
        
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
                
                const level = selectedStage || 'stage1-1';
                Logger.log('MenuState', `Starting stage: ${level} (source: ${debugSelectedStage ? 'debug overlay' : selectedStage ? 'URL parameter' : 'default'}`);
                
                this.game.stateManager.setState(GameStates.INTERMISSION, { 
                    type: 'start',
                    level: level,
                    lives: 3,
                    score: 0
                });
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
            this.game.stateManager.setState(GameStates.SOUND_TEST);
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