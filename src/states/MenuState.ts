import { GAME_RESOLUTION } from '../constants/gameConstants';
import { GameState } from './GameStateManager';
import { PixelRenderer } from '../rendering/PixelRenderer';
import { InputEvent } from '../core/InputSystem';

interface MenuOption {
    text: string;
    action: string;
}

interface Game {
    renderer?: PixelRenderer;
    inputSystem: any;
    musicSystem?: any;
    stateManager: any;
}

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
            { text: 'CREDITS', action: 'credits' }
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
        this.logoY = -100;
        this.optionsAlpha = 0;
        this.selectedOption = 0;
        this.showHowTo = false;
        this.showCredits = false;
        if (this.game.musicSystem?.isInitialized) {
            this.game.musicSystem.playTitleBGM();
        }
    }
    
    enter(): void {
        this.init();
        this.setupInputListeners();
        if (this.game.renderer) {
            this.game.renderer.setCamera(0, 0);
        }
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
                        this.game.musicSystem.playButtonClickSound();
                    }
                }
            })
        );
        this.inputListeners.push(
            this.game.inputSystem.on('keyPress', (event: InputEvent) => {
                const isValidJump = event.action === 'jump' && event.key === 'Space';
                const isValidAction = event.action === 'action';
                
                console.log('MenuState: keyPress event', {
                    action: event.action,
                    key: event.key,
                    isValidJump,
                    isValidAction,
                    optionsAlpha: this.optionsAlpha,
                    showHowTo: this.showHowTo,
                    showCredits: this.showCredits
                });
                
                if ((isValidAction || isValidJump) && 
                    !this.showHowTo && !this.showCredits && 
                    this.optionsAlpha >= 1) {
                    console.log('MenuState: Executing option...');
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
                        this.game.musicSystem.playButtonClickSound();
                    }
                }
            })
        );
        this.inputListeners.push(
            this.game.inputSystem.on('keyPress', (event: InputEvent) => {
                if (event.action === 'mute') {
                    if (this.game.musicSystem) {
                        this.game.musicSystem.toggleMute();
                        this.game.musicSystem.playButtonClickSound();
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
        
        // デバッグ: 初回のみログ出力
        if (!this._firstUpdateLogged) {
            console.log('MenuState: update called, optionsAlpha:', this.optionsAlpha);
            this._firstUpdateLogged = true;
        }
    }
    
    render(renderer: PixelRenderer): void {
        renderer.clear('#000000');
        
        if (this.showHowTo) {
            this.renderHowToPlay(renderer);
        } else if (this.showCredits) {
            this.renderCredits(renderer);
        } else {
            this.drawTitleLogo(renderer);
            this.drawMenuOptions(renderer);
        }
        this.drawMuteButton(renderer);
        renderer.drawText('v0.1.0', 8, GAME_RESOLUTION.HEIGHT - 16, '#666666');
    }
    
    private drawTitleLogo(renderer: PixelRenderer): void {
        const centerX = GAME_RESOLUTION.WIDTH / 2;
        const titleY = this.logoY;
        renderer.drawTextCentered('COIN HUNTER', centerX, titleY, '#FFD700');
        renderer.drawTextCentered('ADVENTURE', centerX, titleY + 16, '#FF6B6B');
    }
    
    private drawMenuOptions(renderer: PixelRenderer): void {
        if (this.optionsAlpha <= 0) return;
        
        const centerX = GAME_RESOLUTION.WIDTH / 2;
        const startY = 104;
        const lineHeight = 24;
        
        this.options.forEach((option, index) => {
            const y = startY + index * lineHeight;
            const isSelected = index === this.selectedOption;
            const color = isSelected ? '#FFD700' : '#FFFFFF';
            const prevAlpha = renderer.ctx.globalAlpha;
            renderer.ctx.globalAlpha = this.optionsAlpha;
            
            renderer.drawTextCentered(option.text, centerX, y, color);
            if (isSelected) {
                const textWidth = option.text.length * 8;
                const cursorX = centerX - Math.floor(textWidth / 2) - 16;
                renderer.drawText('>', cursorX, y, '#FFD700');
            }
            
            renderer.ctx.globalAlpha = prevAlpha;
        });
        const prevAlpha = renderer.ctx.globalAlpha;
        renderer.ctx.globalAlpha = this.optionsAlpha;
        
        renderer.drawTextCentered('ARROWS:SELECT', centerX, 184, '#999999');
        renderer.drawTextCentered('ENTER/SPACE:OK', centerX, 192, '#999999');
        
        renderer.ctx.globalAlpha = prevAlpha;
    }

    private renderHowToPlay(renderer: PixelRenderer): void {
        const centerX = GAME_RESOLUTION.WIDTH / 2;
        renderer.drawTextCentered('HOW TO PLAY', centerX, 24, '#FFD700');
        const instructions = [
            { key: 'ARROWS', desc: 'MOVE' },
            { key: 'UP/SPACE', desc: 'JUMP' },
            { key: 'HOLD JUMP', desc: 'JUMP HIGH' },
            { key: 'M', desc: 'MUTE' },
            { key: 'F3', desc: 'DEBUG' }
        ];
        
        let y = 56;
        instructions.forEach(inst => {
            renderer.drawText(inst.key, 40, y, '#4ECDC4');
            renderer.drawText(inst.desc, 120, y, '#FFFFFF');
            y += 16;
        });
        renderer.drawTextCentered('COLLECT ALL COINS!', centerX, 160, '#FFFFFF');
        renderer.drawTextCentered('REACH THE GOAL!', centerX, 176, '#FFFFFF');
        renderer.drawTextCentered('AVOID ENEMIES!', centerX, 192, '#FF6B6B');
        renderer.drawTextCentered('ESC/ENTER TO RETURN', centerX, 216, '#999999');
    }
    
    private renderCredits(renderer: PixelRenderer): void {
        const centerX = GAME_RESOLUTION.WIDTH / 2;
        renderer.drawTextCentered('CREDITS', centerX, 24, '#FFD700');
        const credits = [
            { role: 'ORIGINAL', name: 'SVG TEAM' },
            { role: 'PIXEL VER', name: 'CANVAS TEAM' },
            { role: 'MUSIC', name: 'WEB AUDIO' },
            { role: 'THANKS', name: 'ALL PLAYERS' }
        ];
        
        let y = 56;
        credits.forEach(credit => {
            renderer.drawText(credit.role, 40, y, '#4ECDC4');
            renderer.drawText(credit.name, 40, y + 8, '#FFFFFF');
            y += 32;
        });
        renderer.drawTextCentered('ESC/ENTER TO RETURN', centerX, 216, '#999999');
    }
    
    private drawMuteButton(renderer: PixelRenderer): void {
        const muteState = this.game.musicSystem?.getMuteState() || false;
        const buttonText = muteState ? 'SOUND:OFF' : 'SOUND:ON';
        const buttonColor = muteState ? '#FF0000' : '#00FF00';
        
        const x = GAME_RESOLUTION.WIDTH - 80;
        const y = 8;
        
        renderer.drawText(buttonText, x, y, buttonColor);
        renderer.drawText('(M)', x + 16, y + 8, '#666666');
    }
    
    private executeOption(): void {
        const option = this.options[this.selectedOption];
        
        switch (option.action) {
        case 'start':
            if (this.game.musicSystem) {
                this.game.musicSystem.playGameStartSound();
            }
            try {
                this.game.stateManager.setState('play');
            } catch (error) {
                console.error('PlayState not yet implemented:', error);
            }
            break;
                
        case 'howto':
            if (this.game.musicSystem) {
                this.game.musicSystem.playButtonClickSound();
            }
            this.showHowTo = true;
            break;
                
        case 'credits':
            if (this.game.musicSystem) {
                this.game.musicSystem.playButtonClickSound();
            }
            this.showCredits = true;
            break;
        }
    }
    
    exit(): void {
        this.removeInputListeners();
    }
    
    destroy(): void {
        this.exit();
    }
}