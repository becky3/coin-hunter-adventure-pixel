/**
 * メインゲームクラス
 */
export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = false;
        
        this.running = false;
        this.lastTime = 0;
        
        // FPS設定
        this.targetFPS = 60;
        this.frameTime = 1000 / this.targetFPS;
    }
    
    async initialize() {
        console.log('Initializing game...');
        
        // TODO: アセットローダーの初期化
        // TODO: 入力マネージャーの初期化
        // TODO: シーンマネージャーの初期化
        
        return Promise.resolve();
    }
    
    start() {
        console.log('Starting game...');
        this.running = true;
        this.lastTime = performance.now();
        this.gameLoop();
    }
    
    gameLoop = (currentTime) => {
        if (!this.running) return;
        
        const deltaTime = currentTime - this.lastTime;
        
        if (deltaTime >= this.frameTime) {
            this.update(deltaTime);
            this.render();
            
            this.lastTime = currentTime - (deltaTime % this.frameTime);
        }
        
        requestAnimationFrame(this.gameLoop);
    }
    
    update(deltaTime) {
        // TODO: ゲームロジックの更新
    }
    
    render() {
        // クリア
        this.ctx.fillStyle = '#5C94FC';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // TODO: ゲームオブジェクトの描画
        
        // 仮のテキスト表示
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = '24px Arial';
        this.ctx.fillText('Coin Hunter Adventure - Pixel Edition', 20, 40);
        this.ctx.fillText('Work in Progress...', 20, 80);
    }
    
    stop() {
        this.running = false;
    }
}