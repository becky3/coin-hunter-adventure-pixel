
import { Entity, CollisionInfo } from './Entity';
import { PixelRenderer } from '../rendering/PixelRenderer';
import { ResourceLoader } from '../config/ResourceLoader';
import { Logger } from '../utils/Logger';

const WAVE_SPEED_MULTIPLIER = 0.03;

/**
 * GoalFlag implementation
 */
export class GoalFlag extends Entity {
    private cleared: boolean;
    declare animationTime: number;
    private waveOffset: number;
    private waveSpeed: number;
    private waveAmplitude: number;

    constructor(x: number, y: number) {
        let goalConfig = null;
        try {
            const resourceLoader = ResourceLoader.getInstance();
            goalConfig = resourceLoader.getObjectConfig('items', 'goalFlag');
        } catch (error) {
            Logger.warn('Failed to load goal flag config:', error);
        }
        
        const width = goalConfig?.physics.width || 32;
        const height = goalConfig?.physics.height || 32;
        
        super(x, y, width, height);
        
        this.gravity = false;
        this.physicsEnabled = false;
        this.solid = goalConfig?.physics.solid || false;
        
        this.cleared = false;
        
        this.animationTime = 0;
        this.waveOffset = 0;
        this.waveSpeed = goalConfig?.properties.waveSpeed || 0.1;
        this.waveAmplitude = goalConfig?.properties.waveAmplitude || 5;
    }

    onUpdate(deltaTime: number): void {
        if (this.cleared) return;
        
        this.waveOffset += this.waveSpeed * deltaTime * WAVE_SPEED_MULTIPLIER;
        
        this.animationTime += deltaTime;
    }

    render(renderer: PixelRenderer): void {
        if (!this.visible) return;
        
        if (renderer.assetLoader && renderer.assetLoader.hasSprite('terrain/goal_flag')) {
            const wave = !this.cleared ? Math.sin(this.waveOffset) * this.waveAmplitude : 0;
            
            renderer.drawSprite('terrain/goal_flag', this.x + wave, this.y);
        } else {
            renderer.drawRect(this.x, this.y, this.width, this.height, '#FFD700');
            
            renderer.drawRect(this.x + 10, this.y, 10, this.height, '#8B4513');
            
            const flagWidth = 20;
            const flagHeight = 15;
            renderer.drawRect(this.x + 20, this.y + 5, flagWidth, flagHeight, '#FF0000');
        }
        
        if (renderer.debug) {
            this.renderDebug(renderer);
        }
    }

    onCollision(collisionInfo?: CollisionInfo): boolean {
        if (!collisionInfo || !collisionInfo.other) return false;
        
        if (collisionInfo.other.constructor.name === 'Player' && !this.cleared) {
            return true;
        }
        return false;
    }
    
    public isCleared(): boolean {
        return this.cleared;
    }

    clear(): void {
        this.cleared = true;
    }

    reset(x: number, y: number): void {
        super.reset(x, y);
        this.cleared = false;
        this.waveOffset = 0;
        this.animationTime = 0;
    }
}