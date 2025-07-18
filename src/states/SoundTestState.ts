import { GAME_RESOLUTION } from '../constants/gameConstants';
import { GameState, GameStateManager } from './GameStateManager';
import { PixelRenderer } from '../rendering/PixelRenderer';
import { InputSystem } from '../core/InputSystem';
import { MusicSystem } from '../audio/MusicSystem';
import { UI_PALETTE_INDICES, getMasterColor } from '../utils/pixelArtPalette';
import { Logger } from '../utils/Logger';

interface Game {
    renderer?: PixelRenderer;
    inputSystem: InputSystem;
    musicSystem?: MusicSystem;
    stateManager: GameStateManager;
}

interface MenuItem {
    type: 'bgm' | 'se' | 'quit';
    items?: string[];
    currentIndex?: number;
}

/**
 * Game state for sound test mode
 */
export class SoundTestState implements GameState {
    public name = 'soundtest';
    private game: Game;
    private selectedRow: number;
    private menuItems: MenuItem[];
    private inputListeners: Array<() => void>;
    private currentPlayingBGM: string | null;
    
    constructor(game: Game) {
        this.game = game;
        this.selectedRow = 0;
        this.menuItems = [
            {
                type: 'bgm',
                items: ['TITLE', 'GAME', 'VICTORY', 'GAMEOVER'],
                currentIndex: 0
            },
            {
                type: 'se',
                items: ['COIN', 'JUMP', 'DAMAGE', 'BUTTON', 'POWERUP', 'GAMESTART', 'GOAL', 'ENEMYDEFEAT'],
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
        
        if (currentItem.type === 'quit') {
            if (this.game.musicSystem) {
                this.game.musicSystem.playSEFromPattern('button');
            }
            this.game.stateManager.setState('menu');
            return;
        }
        
        if (!this.game.musicSystem || !currentItem.items) {
            return;
        }
        
        const selectedName = currentItem.items[currentItem.currentIndex || 0].toLowerCase();
        
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
            const seMap: { [key: string]: string } = {
                'coin': 'coin',
                'jump': 'jump',
                'damage': 'damage',
                'button': 'button',
                'powerup': 'powerup',
                'gamestart': 'gameStart',
                'goal': 'goal',
                'enemydefeat': 'enemyDefeat'
            };
            
            const seName = seMap[selectedName] || selectedName;
            this.game.musicSystem.playSEFromPattern(seName);
        }
    }
    
    private removeInputListeners(): void {
        this.inputListeners.forEach(removeListener => removeListener());
        this.inputListeners = [];
    }
    
    update(_deltaTime: number): void {
    }
    
    render(renderer: PixelRenderer): void {
        renderer.clear(getMasterColor(UI_PALETTE_INDICES.black));
        
        const centerX = GAME_RESOLUTION.WIDTH / 2;
        renderer.drawTextCentered('SOUND TEST', centerX, 32, getMasterColor(UI_PALETTE_INDICES.gold));
        
        let y = 80;
        this.menuItems.forEach((item, index) => {
            const isSelected = index === this.selectedRow;
            const color = isSelected ? getMasterColor(UI_PALETTE_INDICES.gold) : getMasterColor(UI_PALETTE_INDICES.white);
            
            if (isSelected) {
                renderer.drawText('>', 40, y, color);
            }
            
            if (item.type === 'bgm' && item.items && item.currentIndex !== undefined) {
                renderer.drawText('BGM:', 56, y, color);
                const bgmName = item.items[item.currentIndex];
                renderer.drawText(bgmName, 96, y, color);
            } else if (item.type === 'se' && item.items && item.currentIndex !== undefined) {
                renderer.drawText('SE:', 56, y, color);
                const seName = item.items[item.currentIndex];
                renderer.drawText(seName, 88, y, color);
            } else if (item.type === 'quit') {
                renderer.drawText('QUIT', 56, y, color);
            }
            
            y += 24;
        });
        
        renderer.drawTextCentered('[UP/DN] SELECT [LT/RT] CHANGE', centerX, 184, getMasterColor(UI_PALETTE_INDICES.gray));
        renderer.drawTextCentered('[SPACE] PLAY/STOP', centerX, 200, getMasterColor(UI_PALETTE_INDICES.gray));
        
        this.drawMuteButton(renderer);
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