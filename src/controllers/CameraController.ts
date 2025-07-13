import { GAME_RESOLUTION } from '../constants/gameConstants';
import { Entity } from '../entities/Entity';
import { EventBus } from '../services/EventBus';
import { Logger } from '../utils/Logger';

export interface Camera {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface GameServices {
    eventBus?: EventBus;
}

/**
 * Controls camera behavior
 */
export class CameraController {
    private camera: Camera;
    private eventBus: EventBus;
    private target: Entity | null = null;
    private levelWidth: number = 0;
    private levelHeight: number = 0;
    
    private smoothing: number = 0.1;
    private offsetX: number = 0;
    private offsetY: number = 0;
    private bounds: { minX: number; minY: number; maxX: number; maxY: number } | null = null;

    constructor(_game: GameServices) {
        this.camera = {
            x: 0,
            y: 0,
            width: GAME_RESOLUTION.WIDTH,
            height: GAME_RESOLUTION.HEIGHT
        };
        
        this.eventBus = _game.eventBus || new EventBus();
        
        this.eventBus.on('level:loaded', (data: { width: number; height: number }) => {
            this.setLevelBounds(data.width, data.height);
        });
    }

    getCamera(): Camera {
        return this.camera;
    }

    setTarget(entity: Entity | null): void {
        this.target = entity;
        if (entity) {
            this.eventBus.emit('camera:target-changed', { target: entity });
        }
    }

    setLevelBounds(width: number, height: number): void {
        this.levelWidth = width;
        this.levelHeight = height;
        this.updateBounds();
    }

    setOffset(x: number, y: number): void {
        this.offsetX = x;
        this.offsetY = y;
    }

    setSmoothing(value: number): void {
        this.smoothing = Math.max(0, Math.min(1, value));
    }

    setBounds(bounds: { minX: number; minY: number; maxX: number; maxY: number } | null): void {
        this.bounds = bounds;
    }

    update(_deltaTime: number): void {
        if (!this.target) {
            Logger.warn('[CameraController] update called but no target is set');
            return;
        }

        const targetX = this.target.x + this.target.width / 2 - this.camera.width / 2 + this.offsetX;
        const targetY = this.target.y + this.target.height / 2 - this.camera.height / 2 + this.offsetY;

        if (this.smoothing > 0) {
            this.camera.x += (targetX - this.camera.x) * this.smoothing;
            this.camera.y += (targetY - this.camera.y) * this.smoothing;
        } else {
            this.camera.x = targetX;
            this.camera.y = targetY;
        }

        this.constrainToBounds();
    }

    private updateBounds(): void {
        if (!this.bounds) {
            this.constrainToBounds();
        }
    }

    private constrainToBounds(): void {
        if (this.camera.x < 0) {
            this.camera.x = 0;
        }
        if (this.camera.x + this.camera.width > this.levelWidth) {
            this.camera.x = this.levelWidth - this.camera.width;
        }
        
        if (this.camera.y < 0) {
            this.camera.y = 0;
        }
        if (this.camera.y + this.camera.height > this.levelHeight) {
            this.camera.y = this.levelHeight - this.camera.height;
        }

        if (this.bounds) {
            if (this.camera.x < this.bounds.minX) {
                this.camera.x = this.bounds.minX;
            }
            if (this.camera.x > this.bounds.maxX) {
                this.camera.x = this.bounds.maxX;
            }
            if (this.camera.y < this.bounds.minY) {
                this.camera.y = this.bounds.minY;
            }
            if (this.camera.y > this.bounds.maxY) {
                this.camera.y = this.bounds.maxY;
            }
        }
    }

    setPosition(x: number, y: number): void {
        this.camera.x = x;
        this.camera.y = y;
        this.constrainToBounds();
    }

    getVisibleBounds(): { left: number; top: number; right: number; bottom: number } {
        return {
            left: this.camera.x,
            top: this.camera.y,
            right: this.camera.x + this.camera.width,
            bottom: this.camera.y + this.camera.height
        };
    }

    isVisible(x: number, y: number, width: number = 0, height: number = 0): boolean {
        const bounds = this.getVisibleBounds();
        return !(x + width < bounds.left || 
                x > bounds.right || 
                y + height < bounds.top || 
                y > bounds.bottom);
    }

    shake(intensity: number, duration: number): void {
        // TODO: Implement camera shake effect
        this.eventBus.emit('camera:shake', { intensity, duration });
    }

    reset(): void {
        this.camera.x = 0;
        this.camera.y = 0;
        this.target = null;
        this.levelWidth = 0;
        this.levelHeight = 0;
        this.bounds = null;
    }
}