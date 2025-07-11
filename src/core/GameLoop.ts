
import { Logger } from '../utils/Logger';

/**
 * GameLoop implementation
 */
export class GameLoop {
    private _running: boolean = false;
    private _lastTime: number = 0;
    private readonly targetFPS: number = 60;
    private readonly frameTime: number = 1000 / this.targetFPS;
    private animationFrameId?: number;

    start(updateCallback: (deltaTime: number) => void): void {
        if (this._running) {
            Logger.warn('Game loop is already running');
            return;
        }
        
        this._running = true;
        this._lastTime = performance.now();
        
        const gameLoop = (currentTime: number): void => {
            if (!this._running) return;
            
            let elapsed = currentTime - this._lastTime;
            
            // Panic prevention for tab switches or long pauses
            if (elapsed > 1000) {
                elapsed = this.frameTime;
            }
            
            // Fixed timestep updates
            while (elapsed >= this.frameTime && this._running) {
                updateCallback(this.frameTime / 1000);
                elapsed -= this.frameTime;
                this._lastTime += this.frameTime;
                
                // Prevent spiral of death (max 5 frames per update)
                if (currentTime - this._lastTime > this.frameTime * 5) {
                    this._lastTime = currentTime - this.frameTime;
                    break;
                }
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
