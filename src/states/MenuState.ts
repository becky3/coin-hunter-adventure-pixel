import { GAME_RESOLUTION } from '../constants/gameConstants';
import { GameState } from './GameStateManager';
import { PixelRenderer } from '../rendering/PixelRenderer';
import { InputEvent } from '../core/InputSystem';
import { URLParams } from '../utils/urlParams';
import { GameEnvironment } from '../utils/gameEnvironment';

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
    
    // Debug stage selection
    private debugMode: boolean = false;
    private stageList: string[] = [];
    private selectedStageIndex: number = 0;

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
        
        // Initialize stage list
        this.stageList = [
            'stage1-1', 'stage1-2', 'stage1-3',
            'stage0-1', 'stage0-2', 'stage0-3',
            'performance-test'
        ];
    }
    
    private init(): void {
        this.logoY = -100;
        this.optionsAlpha = 0;
        this.selectedOption = 0;
        this.showHowTo = false;
        this.showCredits = false;
        if (this.game.musicSystem?.isInitialized) {
            this.game.musicSystem.playBGMFromPattern('title');
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
        
        // Debug mode toggle (D key)
        this.inputListeners.push(
            this.game.inputSystem.on('keyPress', (event: InputEvent) => {
                if (event.key === 'KeyD' && !this.showHowTo && !this.showCredits) {
                    this.debugMode = !this.debugMode;
                    if (this.game.musicSystem) {
                        this.game.musicSystem.playSEFromPattern('button');
                    }
                }
            })
        );
        
        // Stage selection in debug mode (Left/Right arrows)
        this.inputListeners.push(
            this.game.inputSystem.on('keyPress', (event: InputEvent) => {
                if (this.debugMode && !this.showHowTo && !this.showCredits) {
                    if (event.action === 'left') {
                        this.selectedStageIndex--;
                        if (this.selectedStageIndex < 0) {
                            this.selectedStageIndex = this.stageList.length - 1;
                        }
                        if (this.game.musicSystem) {
                            this.game.musicSystem.playSEFromPattern('button');
                        }
                    } else if (event.action === 'right') {
                        this.selectedStageIndex++;
                        if (this.selectedStageIndex >= this.stageList.length) {
                            this.selectedStageIndex = 0;
                        }
                        if (this.game.musicSystem) {
                            this.game.musicSystem.playSEFromPattern('button');
                        }
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
        
        // Draw debug overlay
        if (this.debugMode) {
            this.drawDebugOverlay(renderer);
        }
    }
    
    private drawTitleLogo(renderer: PixelRenderer): void {
        const centerX = GAME_RESOLUTION.WIDTH / 2;
        const titleY = this.logoY;
        renderer.drawTextCentered('COIN HUNTER', centerX, titleY, '#FFD700', 1, true);
        renderer.drawTextCentered('ADVENTURE', centerX, titleY + 16, '#FF6B6B', 1, true);
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
    
    private drawDebugOverlay(renderer: PixelRenderer): void {
        // Debug panel background
        renderer.drawRect(4, 4, 120, 40, '#000000', true);
        renderer.drawRect(4, 4, 120, 40, '#00FF00', false);
        
        // Debug mode indicator
        renderer.drawText('DEBUG MODE', 8, 8, '#00FF00');
        
        // Stage selection
        renderer.drawText('STAGE:', 8, 20, '#00FF00');
        const stageName = this.stageList[this.selectedStageIndex];
        renderer.drawText(stageName, 56, 20, '#FFFF00');
        
        // Navigation hint
        renderer.drawText('< > SELECT', 8, 32, '#888888');
    }
    
    private executeOption(): void {
        const option = this.options[this.selectedOption];
        
        switch (option.action) {
        case 'start':
            if (this.game.musicSystem) {
                this.game.musicSystem.playSEFromPattern('gameStart');
            }
            try {
                // URLパラメータからステージIDを取得
                const urlParams = new URLParams();
                const stageId = urlParams.getStageId();
                
                // Determine if stage progression should be enabled based on environment
                const enableProgression = GameEnvironment.shouldEnableStageProgression();
                console.log(`Environment: ${GameEnvironment.getEnvironmentName()}, Stage progression: ${enableProgression ? 'ENABLED' : 'DISABLED'}`);
                
                // Check if debug mode stage selection overrides
                const selectedStage = this.debugMode ? this.stageList[this.selectedStageIndex] : stageId;
                
                if (selectedStage) {
                    console.log(`Starting stage: ${selectedStage} (debug mode: ${this.debugMode})`);
                    this.game.stateManager.setState('play', { 
                        level: selectedStage,
                        enableProgression: enableProgression 
                    });
                } else {
                    this.game.stateManager.setState('play', { 
                        enableProgression: enableProgression 
                    });
                }
            } catch (error) {
                console.error('Error transitioning to play state:', error);
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
        }
    }
    
    exit(): void {
        this.removeInputListeners();
        
        // Stop menu BGM when leaving menu
        if (this.game.musicSystem) {
            this.game.musicSystem.stopBGM();
        }
    }
    
    destroy(): void {
        this.exit();
    }
}