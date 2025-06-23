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
        this.coinAnimTimer = 0;
        this.starAnimTimer = 0;
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
        this.coinAnimTimer += deltaTime;
        this.starAnimTimer += deltaTime;
        
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
            if (this.game.inputManager.isKeyJustPressed('Escape') || 
                this.game.inputManager.isKeyJustPressed('Enter') ||
                this.game.inputManager.isKeyJustPressed('Space')) {
                this.showHowTo = false;
                this.showCredits = false;
                if (this.game.musicSystem) {
                    this.game.musicSystem.playButtonClickSound();
                }
            }
        } else {
            // メニュー選択
            if (this.game.inputManager.isKeyJustPressed('ArrowUp') || 
                this.game.inputManager.isKeyJustPressed('KeyW')) {
                this.selectedOption--;
                if (this.selectedOption < 0) {
                    this.selectedOption = this.options.length - 1;
                }
                if (this.game.musicSystem) {
                    this.game.musicSystem.playButtonClickSound();
                }
            }
            
            if (this.game.inputManager.isKeyJustPressed('ArrowDown') || 
                this.game.inputManager.isKeyJustPressed('KeyS')) {
                this.selectedOption++;
                if (this.selectedOption >= this.options.length) {
                    this.selectedOption = 0;
                }
                if (this.game.musicSystem) {
                    this.game.musicSystem.playButtonClickSound();
                }
            }
            
            // 決定
            if ((this.game.inputManager.isKeyJustPressed('Enter') || 
                 this.game.inputManager.isKeyJustPressed('Space')) && 
                 !this.enterPressed && this.optionsAlpha >= 1) {
                this.enterPressed = true;
                this.executeOption();
            }
        }
    }
    
    /**
     * 描画処理
     * @param {PixelRenderer} renderer - レンダラー
     */
    render(renderer) {
        // 背景
        renderer.fillRect(0, 0, renderer.canvas.width, renderer.canvas.height, '#1a1a2e');
        
        // 装飾的な星背景
        this.drawStarfield(renderer);
        
        if (this.showHowTo) {
            this.renderHowToPlay(renderer);
        } else if (this.showCredits) {
            this.renderCredits(renderer);
        } else {
            // タイトルロゴ
            this.drawTitleLogo(renderer);
            
            // メニューオプション
            this.drawMenuOptions(renderer);
            
            // 装飾的なコイン
            this.drawDecorativeCoins(renderer);
        }
        
        // バージョン情報
        renderer.drawText('v0.1.0 - Pixel Edition', 10, renderer.canvas.height - 10, '#666666', 10);
    }
    
    /**
     * タイトルロゴの描画
     */
    drawTitleLogo(renderer) {
        const centerX = renderer.canvas.width / 2;
        
        // メインタイトル
        const titleY = this.logoY;
        renderer.drawText('COIN HUNTER', centerX - 120, titleY, '#FFD700', 48);
        renderer.drawText('ADVENTURE', centerX - 90, titleY + 50, '#FF6B6B', 36);
        
        // Pixel Edition サブタイトル
        renderer.drawText('- Pixel Edition -', centerX - 60, titleY + 90, '#4ECDC4', 16);
        
        // タイトルの影
        renderer.drawText('COIN HUNTER', centerX - 118, titleY + 2, '#B8860B', 48);
        renderer.drawText('ADVENTURE', centerX - 88, titleY + 52, '#CC5555', 36);
    }
    
    /**
     * メニューオプションの描画
     */
    drawMenuOptions(renderer) {
        if (this.optionsAlpha <= 0) return;
        
        const centerX = renderer.canvas.width / 2;
        const startY = 300;
        const lineHeight = 50;
        
        this.options.forEach((option, index) => {
            const y = startY + index * lineHeight;
            const isSelected = index === this.selectedOption;
            
            // 選択中の項目の背景
            if (isSelected) {
                const pulse = Math.sin(this.titleAnimTimer * 0.005) * 0.3 + 0.7;
                renderer.fillRect(
                    centerX - 150, 
                    y - 25, 
                    300, 
                    40, 
                    `rgba(78, 205, 196, ${0.3 * pulse * this.optionsAlpha})`
                );
            }
            
            // テキスト
            const color = isSelected ? '#FFD700' : '#FFFFFF';
            const size = isSelected ? 24 : 20;
            const offsetX = option.text.length * size / 4;
            
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
                const cursorX = centerX - offsetX - 30;
                renderer.drawText('▶', cursorX + Math.sin(this.titleAnimTimer * 0.01) * 5, y, '#FFD700', 20);
            }
        });
        
        // 操作説明
        renderer.drawText(
            'Arrow Keys: Select   Enter/Space: Confirm', 
            centerX - 150, 
            450, 
            '#999999', 
            12,
            this.optionsAlpha
        );
    }
    
    /**
     * 星背景の描画
     */
    drawStarfield(renderer) {
        const stars = 50;
        for (let i = 0; i < stars; i++) {
            const x = (i * 137) % renderer.canvas.width;
            const y = (i * 89) % renderer.canvas.height;
            const size = (i % 3) + 1;
            const brightness = Math.sin(this.starAnimTimer * 0.001 + i) * 0.3 + 0.7;
            const color = `rgba(255, 255, 255, ${brightness * 0.5})`;
            
            renderer.fillRect(x, y, size, size, color);
        }
    }
    
    /**
     * 装飾的なコインの描画
     */
    drawDecorativeCoins(renderer) {
        const coinPositions = [
            { x: 100, y: 100, size: 16 },
            { x: 700, y: 150, size: 20 },
            { x: 150, y: 400, size: 18 },
            { x: 650, y: 380, size: 16 }
        ];
        
        coinPositions.forEach((pos, index) => {
            const rotation = this.coinAnimTimer * 0.002 + index * Math.PI / 2;
            const scale = Math.abs(Math.cos(rotation));
            
            renderer.strokeCircle(
                pos.x, 
                pos.y + Math.sin(this.coinAnimTimer * 0.001 + index) * 10, 
                pos.size * scale, 
                '#FFD700',
                2
            );
            
            // コインの中の文字
            if (scale > 0.3) {
                renderer.drawText(
                    '¢', 
                    pos.x - 5, 
                    pos.y + 5 + Math.sin(this.coinAnimTimer * 0.001 + index) * 10, 
                    '#FFD700', 
                    16
                );
            }
        });
    }
    
    /**
     * How to Play画面の描画
     */
    renderHowToPlay(renderer) {
        const centerX = renderer.canvas.width / 2;
        
        // タイトル
        renderer.drawText('HOW TO PLAY', centerX - 80, 50, '#FFD700', 32);
        
        // 操作説明
        const instructions = [
            { key: '← →', desc: 'Move left/right' },
            { key: '↑ / Space', desc: 'Jump' },
            { key: 'Hold Jump', desc: 'Jump higher' },
            { key: 'M', desc: 'Toggle music' },
            { key: '@', desc: 'Debug mode' }
        ];
        
        let y = 150;
        instructions.forEach(inst => {
            renderer.drawText(inst.key, 200, y, '#4ECDC4', 18);
            renderer.drawText(inst.desc, 350, y, '#FFFFFF', 16);
            y += 40;
        });
        
        // ゲーム説明
        renderer.drawText('Collect all coins and reach the goal!', centerX - 150, 400, '#FFFFFF', 18);
        renderer.drawText('Watch out for enemies and obstacles!', centerX - 150, 430, '#FF6B6B', 16);
        
        // 戻る説明
        renderer.drawText('Press ESC/Enter/Space to return', centerX - 120, 500, '#999999', 14);
    }
    
    /**
     * Credits画面の描画
     */
    renderCredits(renderer) {
        const centerX = renderer.canvas.width / 2;
        
        // タイトル
        renderer.drawText('CREDITS', centerX - 50, 50, '#FFD700', 32);
        
        // クレジット内容
        const credits = [
            { role: 'Original Concept', name: 'SVG Version Team' },
            { role: 'Pixel Edition', name: 'Canvas Development Team' },
            { role: 'Music System', name: 'Web Audio API' },
            { role: 'Special Thanks', name: 'All Players!' }
        ];
        
        let y = 150;
        credits.forEach(credit => {
            renderer.drawText(credit.role, centerX - 100, y, '#4ECDC4', 16);
            renderer.drawText(credit.name, centerX - 100, y + 25, '#FFFFFF', 14);
            y += 70;
        });
        
        // 戻る説明
        renderer.drawText('Press ESC/Enter/Space to return', centerX - 120, 500, '#999999', 14);
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