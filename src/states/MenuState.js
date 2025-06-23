/**
 * メニュー画面の状態管理クラス
 */
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
        this.logoTargetY = 80;
        this.optionsAlpha = 0;
        this.enterPressed = false;
        
        // How to Play画面の状態
        this.showHowTo = false;
        this.showCredits = false;
        
        // タイトル画面のアニメーション
        this.titleAnimTimer = 0;
        
        // キー押下状態
        this.upPressed = false;
        this.downPressed = false;
        this.backPressed = false;
    }
    
    /**
     * 状態の初期化
     */
    init() {
        // アニメーションをリセット
        this.logoY = -100;
        this.optionsAlpha = 0;
        this.selectedOption = 0;
        this.enterPressed = false;
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
        
        // 入力処理
        // const input = this.game.inputManager.getInput();  // 現在は未使用
        
        if (this.showHowTo || this.showCredits) {
            // How to Play/Credits画面での入力
            if (this.game.inputManager.isKeyPressed('Escape') || 
                this.game.inputManager.isKeyPressed('Enter') ||
                this.game.inputManager.isKeyPressed('Space')) {
                if (!this.backPressed) {
                    this.backPressed = true;
                    this.showHowTo = false;
                    this.showCredits = false;
                    if (this.game.musicSystem) {
                        this.game.musicSystem.playButtonClickSound();
                    }
                }
            } else {
                this.backPressed = false;
            }
        } else {
            // メニュー選択（カーソルキーのコード修正）
            if (this.game.inputManager.isKeyPressed('ArrowUp') || 
                this.game.inputManager.isKeyPressed('KeyW')) {
                if (!this.upPressed) {
                    this.upPressed = true;
                    this.selectedOption--;
                    if (this.selectedOption < 0) {
                        this.selectedOption = this.options.length - 1;
                    }
                    if (this.game.musicSystem) {
                        this.game.musicSystem.playButtonClickSound();
                    }
                }
            } else {
                this.upPressed = false;
            }
            
            if (this.game.inputManager.isKeyPressed('ArrowDown') || 
                this.game.inputManager.isKeyPressed('KeyS')) {
                if (!this.downPressed) {
                    this.downPressed = true;
                    this.selectedOption++;
                    if (this.selectedOption >= this.options.length) {
                        this.selectedOption = 0;
                    }
                    if (this.game.musicSystem) {
                        this.game.musicSystem.playButtonClickSound();
                    }
                }
            } else {
                this.downPressed = false;
            }
            
            // 決定
            if ((this.game.inputManager.isKeyPressed('Enter') || 
                 this.game.inputManager.isKeyPressed('Space')) && this.optionsAlpha >= 1) {
                if (!this.enterPressed) {
                    this.enterPressed = true;
                    this.executeOption();
                }
            } else {
                this.enterPressed = false;
            }
        }
    }
    
    /**
     * 描画処理
     * @param {PixelRenderer} renderer - レンダラー
     */
    render(renderer) {
        // 背景（シンプルな黒）
        renderer.fillRect(0, 0, renderer.canvas.width, renderer.canvas.height, '#000000');
        
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
        
        // バージョン情報
        renderer.drawText('v0.1.0', 10, renderer.canvas.height - 20, '#666666', 12);
    }
    
    /**
     * タイトルロゴの描画
     */
    drawTitleLogo(renderer) {
        const centerX = renderer.canvas.width / 2;
        
        // メインタイトル（ピクセルフォントサイズ調整）
        const titleY = this.logoY;
        renderer.drawText('COIN HUNTER', centerX - 88, titleY, '#FFD700', 16);
        renderer.drawText('ADVENTURE', centerX - 72, titleY + 30, '#FF6B6B', 16);
    }
    
    /**
     * メニューオプションの描画
     */
    drawMenuOptions(renderer) {
        if (this.optionsAlpha <= 0) return;
        
        const centerX = renderer.canvas.width / 2;
        const startY = 250;
        const lineHeight = 30;
        
        this.options.forEach((option, index) => {
            const y = startY + index * lineHeight;
            const isSelected = index === this.selectedOption;
            
            // テキスト（ピクセルフォントサイズ）
            const color = isSelected ? '#FFD700' : '#FFFFFF';
            const size = 16;
            const offsetX = option.text.length * 8;
            
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
                const cursorX = centerX - offsetX - 20;
                renderer.drawText('>', cursorX, y, '#FFD700', 16);
            }
        });
        
        // 操作説明
        renderer.drawText(
            'ARROW KEYS: SELECT   ENTER/SPACE: CONFIRM', 
            centerX - 168, 
            400, 
            '#999999', 
            12,
            this.optionsAlpha
        );
    }
    
    
    /**
     * How to Play画面の描画
     */
    renderHowToPlay(renderer) {
        const centerX = renderer.canvas.width / 2;
        
        // タイトル
        renderer.drawText('HOW TO PLAY', centerX - 88, 50, '#FFD700', 16);
        
        // 操作説明
        const instructions = [
            { key: 'ARROW KEYS', desc: 'MOVE LEFT/RIGHT' },
            { key: 'UP / SPACE', desc: 'JUMP' },
            { key: 'HOLD JUMP', desc: 'JUMP HIGHER' },
            { key: 'M', desc: 'TOGGLE MUSIC' },
            { key: '@', desc: 'DEBUG MODE' }
        ];
        
        let y = 120;
        instructions.forEach(inst => {
            renderer.drawText(inst.key, 200, y, '#4ECDC4', 12);
            renderer.drawText(inst.desc, 350, y, '#FFFFFF', 12);
            y += 30;
        });
        
        // ゲーム説明
        renderer.drawText('COLLECT ALL COINS AND REACH THE GOAL!', centerX - 152, 300, '#FFFFFF', 12);
        renderer.drawText('WATCH OUT FOR ENEMIES AND OBSTACLES!', centerX - 144, 330, '#FF6B6B', 12);
        
        // 戻る説明
        renderer.drawText('PRESS ESC/ENTER/SPACE TO RETURN', centerX - 128, 450, '#999999', 12);
    }
    
    /**
     * Credits画面の描画
     */
    renderCredits(renderer) {
        const centerX = renderer.canvas.width / 2;
        
        // タイトル
        renderer.drawText('CREDITS', centerX - 56, 50, '#FFD700', 16);
        
        // クレジット内容
        const credits = [
            { role: 'ORIGINAL CONCEPT', name: 'SVG VERSION TEAM' },
            { role: 'PIXEL EDITION', name: 'CANVAS DEVELOPMENT TEAM' },
            { role: 'MUSIC SYSTEM', name: 'WEB AUDIO API' },
            { role: 'SPECIAL THANKS', name: 'ALL PLAYERS!' }
        ];
        
        let y = 150;
        credits.forEach(credit => {
            renderer.drawText(credit.role, centerX - 100, y, '#4ECDC4', 12);
            renderer.drawText(credit.name, centerX - 100, y + 20, '#FFFFFF', 12);
            y += 50;
        });
        
        // 戻る説明
        renderer.drawText('PRESS ESC/ENTER/SPACE TO RETURN', centerX - 128, 450, '#999999', 12);
    }
    
    /**
     * メニュー項目の実行
     */
    executeOption() {
        const option = this.options[this.selectedOption];
        
        if (this.game.musicSystem) {
            this.game.musicSystem.playGameStartSound();
        }
        
        switch (option.action) {
        case 'start':
            // PlayStateへ遷移
            this.game.stateManager.setState('play');
            break;
                
        case 'howto':
            this.showHowTo = true;
            break;
                
        case 'credits':
            this.showCredits = true;
            break;
        }
    }
    
    /**
     * 状態のクリーンアップ
     */
    destroy() {
        // 特に必要なクリーンアップはなし
    }
}