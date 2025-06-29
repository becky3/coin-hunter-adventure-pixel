
// src/core/GameLoop.ts

/**
 * ゲームループの管理
 */
export class GameLoop {
    private running: boolean = false;
    private lastTime: number = 0;
    private readonly targetFPS: number = 60;
    private readonly frameTime: number = 1000 / this.targetFPS;
    private animationFrameId?: number;
    
    /**
     * ゲームループを開始
     * @param updateCallback フレームごとに呼ばれるコールバック（deltaTimeを渡す）
     */
    start(updateCallback: (deltaTime: number) => void): void {
        if (this.running) {
            console.warn('Game loop is already running');
            return;
        }
        
        this.running = true;
        this.lastTime = performance.now();
        
        const gameLoop = (currentTime: number): void => {
            if (!this.running) return;
            
            const deltaTime = currentTime - this.lastTime;
            
            if (deltaTime >= this.frameTime) {
                // deltaTimeを秒単位に変換して渡す
                updateCallback(deltaTime / 1000);
                this.lastTime = currentTime - (deltaTime % this.frameTime);
            }
            
            this.animationFrameId = requestAnimationFrame(gameLoop);
        };
        
        this.animationFrameId = requestAnimationFrame(gameLoop);
    }
    
    /**
     * ゲームループを停止
     */
    stop(): void {
        this.running = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = undefined;
        }
    }
    
    /**
     * ゲームループが実行中かどうか
     */
    isRunning(): boolean {
        return this.running;
    }
}
