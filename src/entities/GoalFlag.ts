
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
    private pixelCircleCache: Map<number, { x: number; y: number }[]>;

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
        this.pixelCircleCache = new Map();
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
            
            if (this.cleared) {
                this.renderClearEffect(renderer);
            }
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

    private renderClearEffect(renderer: PixelRenderer): void {
        const time = this.animationTime * 0.001;
        const baseRadius = 30;
        const radiusVariation = 10;
        const radius = Math.floor(baseRadius + Math.sin(time * 2) * radiusVariation);
        
        const pattern = this.getPixelCircle(radius);
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        
        const color = this.animationTime % 200 < 100 ? '#FFFF00' : '#FFD700';
        
        pattern.forEach(pixel => {
            renderer.drawRect(
                centerX + pixel.x - 0.5,
                centerY + pixel.y - 0.5,
                1,
                1,
                color
            );
        });
    }
    
    private getPixelCircle(radius: number): { x: number; y: number }[] {
        const roundedRadius = Math.floor(radius);
        
        if (this.pixelCircleCache.has(roundedRadius)) {
            return this.pixelCircleCache.get(roundedRadius) || [];
        }
        
        const points: { x: number; y: number }[] = [];
        
        let x = 0;
        let y = roundedRadius;
        let d = 3 - 2 * roundedRadius;
        
        const addPoints = (cx: number, cy: number) => {
            points.push({ x: cx, y: cy });
            points.push({ x: -cx, y: cy });
            points.push({ x: cx, y: -cy });
            points.push({ x: -cx, y: -cy });
            points.push({ x: cy, y: cx });
            points.push({ x: -cy, y: cx });
            points.push({ x: cy, y: -cx });
            points.push({ x: -cy, y: -cx });
        };
        
        addPoints(x, y);
        
        while (y >= x) {
            x++;
            
            if (d > 0) {
                y--;
                d = d + 4 * (x - y) + 10;
            } else {
                d = d + 4 * x + 6;
            }
            
            addPoints(x, y);
        }
        
        const uniquePoints = Array.from(
            new Map(points.map(p => [`${p.x},${p.y}`, p])).values()
        );
        
        this.pixelCircleCache.set(roundedRadius, uniquePoints);
        
        return uniquePoints;
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
        this.pixelCircleCache.clear();
    }
}