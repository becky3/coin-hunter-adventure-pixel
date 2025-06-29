

export class GameLoop {
    private _running: boolean = false;
    private _lastTime: number = 0;
    private readonly targetFPS: number = 60;
    private readonly frameTime: number = 1000 / this.targetFPS;
    private animationFrameId?: number;

    start(updateCallback: (deltaTime: number) => void): void {
        if (this._running) {
            console.warn('Game loop is already running');
            return;
        }
        
        this._running = true;
        this._lastTime = performance.now();
        
        const gameLoop = (currentTime: number): void => {
            if (!this._running) return;
            
            const deltaTime = currentTime - this._lastTime;
            
            if (deltaTime >= this.frameTime) {

                updateCallback(deltaTime / 1000);
                this._lastTime = currentTime - (deltaTime % this.frameTime);
            }
            
            this.animationFrameId = requestAnimationFrame(gameLoop);
        };
        
        this.animationFrameId = requestAnimationFrame(gameLoop);
    }

    stop(): void {
        this._running = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = undefined;
        }
    }

    isRunning(): boolean {
        return this._running;
    }

    get running(): boolean {
        return this._running;
    }

    get lastTime(): number {
        return this._lastTime;
    }
}
