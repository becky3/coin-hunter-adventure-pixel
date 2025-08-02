import { GAME_RESOLUTION } from '../constants/gameConstants';
import { BaseUIState, Game } from './BaseUIState';
import { PixelRenderer } from '../rendering/PixelRenderer';
import { InputEvent } from '../core/InputSystem';
import { UI_PALETTE_INDICES } from '../utils/pixelArtPalette';
import { Logger } from '../utils/Logger';
import { GameStates } from '../types/GameStateTypes';

interface MenuItem {
    type: 'bgm' | 'se' | 'quit';
    items?: string[];
    currentIndex?: number;
}

/**
 * Game state for sound test mode
 */
export class SoundTestState extends BaseUIState {
    public name = GameStates.SOUND_TEST;
    private selectedRow: number;
    private menuItems: MenuItem[];
    private currentPlayingBGM: string | null;
    
    private static readonly SE_MAP: { [key: string]: string } = {
        'coin': 'coin',
        'jump': 'jump',
        'damage': 'damage',
        'button': 'button',
        'powerup': 'powerup',
        'gamestart': 'gameStart',
        'goal': 'goal',
        'enemydefeat': 'enemyDefeat',
        'projectile': 'projectile'
    };
    
    private static readonly UI_LAYOUT = {
        TITLE_Y: 32,
        MENU_START_Y: 80,
        MENU_LINE_HEIGHT: 24,
        SELECTOR_X: 40,
        BGM_LABEL_X: 56,
        BGM_VALUE_X: 96,
        SE_LABEL_X: 56,
        SE_VALUE_X: 88,
        QUIT_X: 56,
        INSTRUCTIONS_Y1: 184,
        INSTRUCTIONS_Y2: 200,
        MUTE_BUTTON_RIGHT_MARGIN: 80,
        MUTE_BUTTON_Y: 8,
        MUTE_KEY_OFFSET_X: 16,
        MUTE_KEY_OFFSET_Y: 8
    };
    
    constructor(game: Game) {
        super(game);
        this.selectedRow = 0;
        this.menuItems = [
            {
                type: 'bgm',
                items: ['TITLE', 'GAME', 'VICTORY', 'GAMEOVER'],
                currentIndex: 0
            },
            {
                type: 'se',
                items: ['COIN', 'JUMP', 'DAMAGE', 'BUTTON', 'POWERUP', 'GAMESTART', 'GOAL', 'ENEMYDEFEAT', 'PROJECTILE'],
                currentIndex: 0
            },
            {
                type: 'quit'
            }
        ];
        this.inputListeners = [];
        this.currentPlayingBGM = null;
    }
    
    enter(): void {
        this.selectedRow = 0;
        this.currentPlayingBGM = null;
        this.setupInputListeners();
        
        if (this.game.renderer) {
            this.game.renderer.setCamera(0, 0);
        }
        
        Logger.log('SoundTestState', 'Entered sound test state');
    }
    
    private setupInputListeners(): void {
        this.removeInputListeners();
        
        this.inputListeners.push(
            this.game.inputSystem.on('keyPress', (event: InputEvent) => {
                if (event.action === 'up' || event.action === 'down') {
                    this.handleVerticalNavigation(event.action);
                } else if (event.action === 'left' || event.action === 'right') {
                    this.handleHorizontalNavigation(event.action);
                }
            })
        );
        
        this.inputListeners.push(
            this.game.inputSystem.on('keyPress', (event: InputEvent) => {
                const isValidJump = event.action === 'jump' && event.key === 'Space';
                
                if (isValidJump) {
                    this.handleAction();
                }
            })
        );
        
        this.setupMuteListener();
    }
    
    private handleVerticalNavigation(direction: 'up' | 'down'): void {
        if (direction === 'up') {
            this.selectedRow--;
            if (this.selectedRow < 0) {
                this.selectedRow = this.menuItems.length - 1;
            }
        } else {
            this.selectedRow++;
            if (this.selectedRow >= this.menuItems.length) {
                this.selectedRow = 0;
            }
        }
        
        if (this.game.musicSystem) {
            this.game.musicSystem.playSEFromPattern('button');
        }
    }
    
    private handleHorizontalNavigation(direction: 'left' | 'right'): void {
        const currentItem = this.menuItems[this.selectedRow];
        if (!currentItem) return;
        
        if (currentItem.type === 'quit' || !currentItem.items || currentItem.currentIndex === undefined) {
            return;
        }
        
        if (direction === 'left') {
            currentItem.currentIndex--;
            if (currentItem.currentIndex < 0) {
                currentItem.currentIndex = currentItem.items.length - 1;
            }
        } else {
            currentItem.currentIndex++;
            if (currentItem.currentIndex >= currentItem.items.length) {
                currentItem.currentIndex = 0;
            }
        }
        
        if (this.game.musicSystem) {
            this.game.musicSystem.playSEFromPattern('button');
        }
    }
    
    private handleAction(): void {
        const currentItem = this.menuItems[this.selectedRow];
        if (!currentItem) {
            throw new Error(`Invalid menu item at index: ${this.selectedRow}`);
        }
        
        if (currentItem.type === 'quit') {
            if (this.game.musicSystem) {
                this.game.musicSystem.playSEFromPattern('button');
            }
            this.game.stateManager.setState(GameStates.MENU);
            return;
        }
        
        if (!this.game.musicSystem || !currentItem.items) {
            return;
        }
        
        const selectedItemIndex = currentItem.currentIndex || 0;
        const selectedItem = currentItem.items[selectedItemIndex];
        if (!selectedItem) {
            throw new Error(`Invalid item at index ${selectedItemIndex} for menu item type: ${currentItem.type}`);
        }
        const selectedName = selectedItem.toLowerCase();
        
        if (currentItem.type === 'bgm') {
            if (this.currentPlayingBGM === selectedName) {
                this.game.musicSystem.stopBGM();
                this.currentPlayingBGM = null;
            } else {
                if (this.currentPlayingBGM) {
                    this.game.musicSystem.stopBGM();
                }
                this.game.musicSystem.playBGMFromPattern(selectedName as 'title' | 'game' | 'victory' | 'gameover');
                this.currentPlayingBGM = selectedName;
            }
        } else if (currentItem.type === 'se') {
            const seName = SoundTestState.SE_MAP[selectedName] || selectedName;
            this.game.musicSystem.playSEFromPattern(seName);
        }
    }
    
    
    update(_deltaTime: number): void {
    }
    
    render(renderer: PixelRenderer): void {
        renderer.clear(-1);
        renderer.drawRect(0, 0, GAME_RESOLUTION.WIDTH, GAME_RESOLUTION.HEIGHT, UI_PALETTE_INDICES.background);
        
        const centerX = GAME_RESOLUTION.WIDTH / 2;
        renderer.drawTextCentered('SOUND TEST', centerX, SoundTestState.UI_LAYOUT.TITLE_Y, UI_PALETTE_INDICES.highlight);
        
        let y = SoundTestState.UI_LAYOUT.MENU_START_Y;
        this.menuItems.forEach((item, index) => {
            const isSelected = index === this.selectedRow;
            const color = isSelected ? UI_PALETTE_INDICES.highlight : UI_PALETTE_INDICES.primaryText;
            
            if (isSelected) {
                renderer.drawText('>', SoundTestState.UI_LAYOUT.SELECTOR_X, y, color);
            }
            
            if (item.type === 'bgm' && item.items && item.currentIndex !== undefined) {
                renderer.drawText('BGM:', SoundTestState.UI_LAYOUT.BGM_LABEL_X, y, color);
                const bgmName = item.items[item.currentIndex];
                if (!bgmName) {
                    throw new Error(`Invalid BGM item at index ${item.currentIndex}`);
                }
                renderer.drawText(bgmName, SoundTestState.UI_LAYOUT.BGM_VALUE_X, y, color);
            } else if (item.type === 'se' && item.items && item.currentIndex !== undefined) {
                renderer.drawText('SE:', SoundTestState.UI_LAYOUT.SE_LABEL_X, y, color);
                const seName = item.items[item.currentIndex];
                if (!seName) {
                    throw new Error(`Invalid SE item at index ${item.currentIndex}`);
                }
                renderer.drawText(seName, SoundTestState.UI_LAYOUT.SE_VALUE_X, y, color);
            } else if (item.type === 'quit') {
                renderer.drawText('QUIT', SoundTestState.UI_LAYOUT.QUIT_X, y, color);
            }
            
            y += SoundTestState.UI_LAYOUT.MENU_LINE_HEIGHT;
        });
        
        renderer.drawTextCentered('[UP/DN] SELECT [LT/RT] CHANGE', centerX, SoundTestState.UI_LAYOUT.INSTRUCTIONS_Y1, UI_PALETTE_INDICES.mutedText);
        renderer.drawTextCentered('[SPACE] PLAY/STOP', centerX, SoundTestState.UI_LAYOUT.INSTRUCTIONS_Y2, UI_PALETTE_INDICES.mutedText);
        
        this.drawMuteButton(renderer);
    }
    
    private drawMuteButton(renderer: PixelRenderer): void {
        const muteState = this.game.musicSystem?.getMuteState() || false;
        const buttonText = muteState ? 'SOUND:OFF' : 'SOUND:ON';
        const buttonColor = muteState ? UI_PALETTE_INDICES.criticalDanger : UI_PALETTE_INDICES.success;
        
        const x = GAME_RESOLUTION.WIDTH - SoundTestState.UI_LAYOUT.MUTE_BUTTON_RIGHT_MARGIN;
        const y = SoundTestState.UI_LAYOUT.MUTE_BUTTON_Y;
        
        renderer.drawText(buttonText, x, y, buttonColor);
        renderer.drawText('(M)', x + SoundTestState.UI_LAYOUT.MUTE_KEY_OFFSET_X, y + SoundTestState.UI_LAYOUT.MUTE_KEY_OFFSET_Y, UI_PALETTE_INDICES.mutedText);
    }
    
    exit(): void {
        this.removeInputListeners();
        
        if (this.game.musicSystem && this.currentPlayingBGM) {
            this.game.musicSystem.stopBGM();
        }
    }
    
    destroy(): void {
        this.exit();
    }
}