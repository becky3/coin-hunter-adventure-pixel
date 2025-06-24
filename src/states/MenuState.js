/**
 * メニュー画面の状態管理クラス
 */
import { GAME_RESOLUTION } from '../constants/gameConstants.js';

export class MenuState {
    constructor(game) {
        this.game = game;
        this.selectedOption = 0;
        this.options = [
            { text: 'START GAME', action: 'start' },
            { text: 'HOW TO PLAY', action: 'howto' },
            { text: 'CREDITS', action: 'credits' }
        ];
        
        // アニメーション用
        this.logoY = -100;
        this.logoTargetY = 40;
        this.optionsAlpha = 0;
        
        // How to Play画面の状態
        this.showHowTo = false;
        this.showCredits = false;
        
        // タイトル画面のアニメーション
        this.titleAnimTimer = 0;
        
        // 入力イベントリスナー
        this.inputListeners = [];
    }
    
    /**
     * 状態の初期化
     */
    init() {
        // アニメーションをリセット
        this.logoY = -100;
        this.optionsAlpha = 0;
        this.selectedOption = 0;
        this.showHowTo = false;
        this.showCredits = false;
        
        // タイトルBGMを再生
        if (this.game.musicSystem?.isInitialized) {
            this.game.musicSystem.playTitleBGM();
        }
    }
    
    /**
     * 状態に入った時の処理
     */
    enter() {
        this.init();
        this.setupInputListeners();
        
        // カメラをリセット（メニューでは常に0,0）
        if (this.game.renderer) {
            this.game.renderer.setCamera(0, 0);
        }
    }
    
    /**
     * 入力イベントリスナーの設定
     */
    setupInputListeners() {
        // 既存のリスナーをクリア
        this.removeInputListeners();
        
        // メニュー選択の上移動
        this.inputListeners.push(
            this.game.inputSystem.on('keyPress', (event) => {
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
        
        // メニュー項目の決定
        this.inputListeners.push(
            this.game.inputSystem.on('keyPress', (event) => {
                // jumpアクションは、Spaceキーが押された時のみ処理（ArrowUpは除外）
                const isValidJump = event.action === 'jump' && event.key === 'Space';
                const isValidAction = event.action === 'action';
                
                if ((isValidAction || isValidJump) && 
                    !this.showHowTo && !this.showCredits && 
                    this.optionsAlpha >= 1) {
                    // 次のフレームで実行して、他のリスナーとの競合を避ける
                    const self = this;
                    setTimeout(() => {
                        self.executeOption();
                    }, 0);
                }
            })
        );
        
        // How to Play/Credits画面からの戻る
        this.inputListeners.push(
            this.game.inputSystem.on('keyPress', (event) => {
                // jumpアクションは、Spaceキーが押された時のみ処理（ArrowUpは除外）
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
        
        // ミュートトグル
        this.inputListeners.push(
            this.game.inputSystem.on('keyPress', (event) => {
                if (event.action === 'mute') {
                    if (this.game.musicSystem) {
                        this.game.musicSystem.toggleMute();
                        this.game.musicSystem.playButtonClickSound();
                    }
                }
            })
        );
    }
    
    /**
     * 入力イベントリスナーの解除
     */
    removeInputListeners() {
        this.inputListeners.forEach(removeListener => removeListener());
        this.inputListeners = [];
    }
    
    /**
     * 更新処理
     * @param {number} deltaTime - 経過時間
     */
    update(deltaTime) {
        
        // アニメーションタイマー更新
        this.titleAnimTimer += deltaTime;
        
        // ロゴのアニメーション
        if (this.logoY < this.logoTargetY) {
            this.logoY += 5;
            if (this.logoY > this.logoTargetY) {
                this.logoY = this.logoTargetY;
            }
        }
        
        // オプションのフェードイン
        if (this.logoY >= this.logoTargetY && this.optionsAlpha < 1) {
            this.optionsAlpha += 0.02;
            if (this.optionsAlpha > 1) {
                this.optionsAlpha = 1;
            }
        }
        
        // 入力処理はsetupInputListenersでイベントベースに移行
    }
    
    /**
     * 描画処理
     * @param {PixelRenderer} renderer - レンダラー
     */
    render(renderer) {
        // 背景（シンプルな黒）
        renderer.clear('#000000');
        
        if (this.showHowTo) {
            this.renderHowToPlay(renderer);
        } else if (this.showCredits) {
            this.renderCredits(renderer);
        } else {
            // タイトルロゴ
            this.drawTitleLogo(renderer);
            
            // メニューオプション
            this.drawMenuOptions(renderer);
        }
        
        // ミュートボタン
        this.drawMuteButton(renderer);
        
        // バージョン情報
        renderer.drawText('v0.1.0', 2, GAME_RESOLUTION.HEIGHT - 10, '#666666');
    }
    
    /**
     * タイトルロゴの描画
     */
    drawTitleLogo(renderer) {
        const centerX = GAME_RESOLUTION.WIDTH / 2;
        
        // メインタイトル（ピクセルフォントサイズ調整）
        const titleY = this.logoY;
        renderer.drawText('COIN HUNTER', centerX - 44, titleY, '#FFD700');
        renderer.drawText('ADVENTURE', centerX - 36, titleY + 15, '#FF6B6B');
    }
    
    /**
     * メニューオプションの描画
     */
    drawMenuOptions(renderer) {
        if (this.optionsAlpha <= 0) return;
        
        const centerX = GAME_RESOLUTION.WIDTH / 2;
        const startY = 100;
        const lineHeight = 20;
        
        this.options.forEach((option, index) => {
            const y = startY + index * lineHeight;
            const isSelected = index === this.selectedOption;
            
            // テキスト（ピクセルフォントサイズ）
            const color = isSelected ? '#FFD700' : '#FFFFFF';
            const size = 8;
            const offsetX = option.text.length * 4;
            
            renderer.drawText(
                option.text, 
                centerX - offsetX, 
                y, 
                color, 
                size,
                this.optionsAlpha
            );
            
            // 選択カーソル
            if (isSelected) {
                const cursorX = centerX - offsetX - 10;
                renderer.drawText('>', cursorX, y, '#FFD700');
            }
        });
        
        // 操作説明
        renderer.drawText(
            'ARROWS:SELECT', 
            centerX - 52, 
            180, 
            '#999999', 
            6,
            this.optionsAlpha
        );
        renderer.drawText(
            'ENTER/SPACE:OK', 
            centerX - 56, 
            190, 
            '#999999', 
            6,
            this.optionsAlpha
        );
    }
    
    
    /**
     * How to Play画面の描画
     */
    renderHowToPlay(renderer) {
        const centerX = GAME_RESOLUTION.WIDTH / 2;
        
        // タイトル
        renderer.drawText('HOW TO PLAY', centerX - 44, 20, '#FFD700');
        
        // 操作説明
        const instructions = [
            { key: 'ARROWS', desc: 'MOVE' },
            { key: 'UP/SPACE', desc: 'JUMP' },
            { key: 'HOLD JUMP', desc: 'JUMP HIGH' },
            { key: 'M', desc: 'MUTE' },
            { key: '@', desc: 'DEBUG' }
        ];
        
        let y = 50;
        instructions.forEach(inst => {
            renderer.drawText(inst.key, 40, y, '#4ECDC4');
            renderer.drawText(inst.desc, 120, y, '#FFFFFF');
            y += 20;
        });
        
        // ゲーム説明
        renderer.drawText('COLLECT ALL COINS!', centerX - 72, 160, '#FFFFFF');
        renderer.drawText('REACH THE GOAL!', centerX - 60, 175, '#FFFFFF');
        renderer.drawText('AVOID ENEMIES!', centerX - 56, 190, '#FF6B6B');
        
        // 戻る説明
        renderer.drawText('ESC/ENTER TO RETURN', centerX - 76, 220, '#999999');
    }
    
    /**
     * Credits画面の描画
     */
    renderCredits(renderer) {
        const centerX = GAME_RESOLUTION.WIDTH / 2;
        
        // タイトル
        renderer.drawText('CREDITS', centerX - 28, 20, '#FFD700');
        
        // クレジット内容
        const credits = [
            { role: 'ORIGINAL', name: 'SVG TEAM' },
            { role: 'PIXEL VER', name: 'CANVAS TEAM' },
            { role: 'MUSIC', name: 'WEB AUDIO' },
            { role: 'THANKS', name: 'ALL PLAYERS' }
        ];
        
        let y = 50;
        credits.forEach(credit => {
            renderer.drawText(credit.role, 40, y, '#4ECDC4');
            renderer.drawText(credit.name, 40, y + 10, '#FFFFFF');
            y += 30;
        });
        
        // 戻る説明
        renderer.drawText('ESC/ENTER TO RETURN', centerX - 76, 220, '#999999');
    }
    
    /**
     * ミュートボタンの描画
     */
    drawMuteButton(renderer) {
        const muteState = this.game.musicSystem?.getMuteState() || false;
        const buttonText = muteState ? 'SOUND: OFF' : 'SOUND: ON';
        const buttonColor = muteState ? '#FF0000' : '#00FF00';
        
        // 右上に配置
        const x = GAME_RESOLUTION.WIDTH - 60;
        const y = 10;
        
        renderer.drawText(buttonText, x, y, buttonColor);
        renderer.drawText('(M)', x + 10, y + 8, '#666666');
    }
    
    /**
     * メニュー項目の実行
     */
    executeOption() {
        const option = this.options[this.selectedOption];
        
        switch (option.action) {
        case 'start':
            // PlayStateへ遷移
            if (this.game.musicSystem) {
                this.game.musicSystem.playGameStartSound();
            }
            try {
                this.game.stateManager.setState('play');
            } catch (error) {
                console.error('PlayState not yet implemented:', error);
                // For now, just log the error and stay in menu
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
    
    /**
     * 状態から出る時の処理
     */
    exit() {
        this.removeInputListeners();
    }
    
    /**
     * 状態の破棄時の処理
     */
    destroy() {
        // exit()を呼び出してクリーンアップを統一
        this.exit();
    }
}