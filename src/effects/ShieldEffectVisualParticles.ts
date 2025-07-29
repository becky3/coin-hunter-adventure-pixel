import { PixelRenderer } from '../rendering/PixelRenderer';
import { Player } from '../entities/Player';

/**
 * Visual effect for shield power-up
 */
export class ShieldEffectVisual {
    private player: Player;
    private animationTime: number = 0;
    private particles: ShieldParticle[] = [];
    private readonly PARTICLE_COUNT = 8;
    private readonly ORBIT_RADIUS = 24;
    private readonly PARTICLE_SIZE = 3;
    private readonly ROTATION_SPEED = 0.002;

    constructor(player: Player) {
        this.player = player;
        this.initializeParticles();
    }

    private initializeParticles(): void {
        for (let i = 0; i < this.PARTICLE_COUNT; i++) {
            const angle = (Math.PI * 2 * i) / this.PARTICLE_COUNT;
            this.particles.push({
                angle,
                offset: Math.random() * Math.PI * 2,
                speed: 0.8 + Math.random() * 0.4,
                size: this.PARTICLE_SIZE
            });
        }
    }

    update(deltaTime: number): void {
        this.animationTime += deltaTime;
        
        for (const particle of this.particles) {
            particle.angle += this.ROTATION_SPEED * particle.speed * deltaTime;
        }
    }

    render(renderer: PixelRenderer): void {
        const centerX = this.player.x + this.player.width / 2;
        const centerY = this.player.y + this.player.height / 2;

        for (const particle of this.particles) {
            const worldX = centerX + Math.cos(particle.angle + particle.offset) * this.ORBIT_RADIUS;
            const worldY = centerY + Math.sin(particle.angle + particle.offset) * this.ORBIT_RADIUS * 0.7;
            
            const screenPos = renderer.worldToScreen(worldX, worldY);
            
            const pulse = Math.sin(this.animationTime * 0.003 + particle.offset) * 0.3 + 0.7;
            const size = particle.size * pulse;
            
            renderer.ctx.fillStyle = '#80FFFF';
            renderer.ctx.fillRect(
                Math.floor(screenPos.x - size / 2),
                Math.floor(screenPos.y - size / 2),
                Math.ceil(size),
                Math.ceil(size)
            );
            
            renderer.ctx.fillStyle = '#FFFFFF';
            renderer.ctx.fillRect(
                Math.floor(screenPos.x - 1),
                Math.floor(screenPos.y - 1),
                2,
                2
            );
        }
        
    }

    /**
     * Create shield break effect particles
     */
    createBreakEffect(): BreakParticle[] {
        const centerX = this.player.x + this.player.width / 2;
        const centerY = this.player.y + this.player.height / 2;
        const breakParticles: BreakParticle[] = [];

        for (let i = 0; i < 16; i++) {
            const angle = (Math.PI * 2 * i) / 16 + Math.random() * 0.2;
            const speed = 2 + Math.random() * 2;
            
            breakParticles.push({
                x: centerX,
                y: centerY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.0,
                size: 2 + Math.random() * 2
            });
        }

        return breakParticles;
    }
}

interface ShieldParticle {
    angle: number;
    offset: number;
    speed: number;
    size: number;
}

interface BreakParticle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    size: number;
}

/**
 * Renders shield break effect particles
 */
export class ShieldBreakEffect {
    private particles: BreakParticle[];
    private readonly GRAVITY = 0.2;
    private readonly FADE_SPEED = 0.02;

    constructor(particles: BreakParticle[]) {
        this.particles = particles;
    }

    update(deltaTime: number): boolean {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            if (!particle) continue;
            
            particle.x += particle.vx * deltaTime * 0.06;
            particle.y += particle.vy * deltaTime * 0.06;
            particle.vy += this.GRAVITY * deltaTime * 0.06;
            particle.life -= this.FADE_SPEED * deltaTime * 0.06;
            
            if (particle.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
        
        return this.particles.length > 0;
    }

    render(renderer: PixelRenderer): void {
        for (const particle of this.particles) {
            const screenPos = renderer.worldToScreen(particle.x, particle.y);
            const color = `rgba(128, 255, 255, ${particle.life})`;
            
            renderer.ctx.fillStyle = color;
            renderer.ctx.fillRect(
                Math.floor(screenPos.x - particle.size / 2),
                Math.floor(screenPos.y - particle.size / 2),
                Math.ceil(particle.size),
                Math.ceil(particle.size)
            );
        }
    }
}