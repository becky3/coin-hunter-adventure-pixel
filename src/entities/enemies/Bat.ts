import { Enemy } from '../Enemy';
import { PixelRenderer } from '../../rendering/PixelRenderer';
import { ResourceLoader } from '../../config/ResourceLoader';
import { Logger } from '../../utils/Logger';
import { Entity } from '../Entity';
import { EntityInitializer } from '../../interfaces/EntityInitializer';
import { EntityManager } from '../../managers/EntityManager';
import type { AnimationDefinition, EntityPaletteDefinition } from '../../types/animationTypes';

type BatState = 'hanging' | 'flying';

/**
 * Bat enemy that hangs from ceiling and flies in sine wave pattern
 */
export class Bat extends Enemy implements EntityInitializer {
    public spriteKey: string;
    private batState: BatState;
    private detectionRange: number;
    private waveSpeed: number;
    private waveAmplitude: number;
    private initialY: number;
    private flyTime: number;
    private baseSpeed: number;
    private loggedNoPlayer?: boolean;
    private lastLogTime?: number;
    private lastUpdateCheck?: boolean;
    declare friction: number;
    private originalPhysicsEnabled: boolean = true;
    private initialX: number;
    private patrolRange: number;
    public readonly oneCycleDuration: number;
    public readonly ceilingY: number;
    public readonly groundY: number;

    /**
     * Factory method to create a Bat instance
     */
    static create(x: number, y: number): Bat {
        const bat = new Bat(x, y);
        bat.direction = -1;
        return bat;
    }

    constructor(x: number, y: number) {
        let batConfig = null;
        try {
            const resourceLoader = ResourceLoader.getInstance();
            batConfig = resourceLoader.getCharacterConfig('enemies', 'bat');
        } catch (error) {
            Logger.warn('Failed to load bat config, using defaults:', error);
        }
        
        const width = batConfig?.physics.width || 8;
        const height = batConfig?.physics.height || 8;
        
        super(x, y, width, height);
        
        this.maxHealth = batConfig?.stats.maxHealth || 1;
        this.health = this.maxHealth;
        this.damage = batConfig?.stats.damage || 1;
        this.moveSpeed = batConfig?.physics.moveSpeed || 0.5;
        
        this.spriteKey = 'enemies/bat';
        this.animState = 'hang';
        this.batState = 'hanging';
        
        this.detectionRange = batConfig?.ai?.detectRange || 80;
        this.waveSpeed = 2;
        this.waveAmplitude = 20;
        this.initialY = y;
        this.initialX = x;
        this.flyTime = 0;
        this.baseSpeed = 60;
        this.patrolRange = 120;
        this.oneCycleDuration = 2;
        this.ceilingY = 16;
        this.groundY = 160;
        
        this.friction = 1.0;
        this.gravityScale = 0;
        this.gravity = false;
        this.physicsEnabled = false;
        
        if (batConfig?.ai) {
            this.aiType = (batConfig.ai.type as 'patrol' | 'chase' | 'idle') || 'patrol';
            this.attackRange = batConfig.ai.attackRange || 20;
        }
        
        this.setAnimation('hang');
    }
    
    protected updateAI(deltaTime: number): void {
        if (this.state === 'dead' || this.state === 'hurt') {
            return;
        }
        
        if (!this.lastUpdateCheck) {
            Logger.log(`[Bat] updateAI called, deltaTime=${deltaTime}`);
            this.lastUpdateCheck = true;
        }

        if (this.batState === 'hanging') {
            this.vx = 0;
            this.vy = 0;
            this.animState = 'hang';
            if (this.entityAnimationManager) {
                this.entityAnimationManager.setState('hang');
            }
            this.grounded = true;
            
            const player = this.findPlayer();
            if (player) {
                const xDistance = Math.abs(player.x - this.x);
                if (xDistance < this.detectionRange) {
                    this.batState = 'flying';
                    this.flyTime = 0;
                    this.direction = -1;
                    this.facingRight = false;
                    Logger.log(`[Bat] Player detected at X distance ${xDistance}, starting flight to the left`);
                }
            } else {
                if (!this.loggedNoPlayer) {
                    Logger.log('[Bat] No player found in findPlayer()');
                    this.loggedNoPlayer = true;
                }
            }
        } else if (this.batState === 'flying') {
            this.flyTime += deltaTime;
            
            this.vx = this.baseSpeed * this.direction;
            
            const cycleProgress = (this.flyTime % this.oneCycleDuration) / this.oneCycleDuration;
            
            let targetY;
            if (cycleProgress < 0.5) {
                const t = cycleProgress * 2;
                const easedT = t * t;
                targetY = this.ceilingY + ((this.groundY - this.ceilingY) * easedT);
            } else {
                const t = (cycleProgress - 0.5) * 2;
                const easedT = 1 - ((1 - t) * (1 - t));
                targetY = this.groundY - ((this.groundY - this.ceilingY) * easedT);
            }
            
            const yDiff = targetY - this.y;
            this.vy = yDiff * 8;
            
            const moveX = this.vx * deltaTime;
            const moveY = this.vy * deltaTime;
            
            this.x += moveX;
            this.y += moveY;
            
            if (this.direction === -1 && this.x <= this.initialX - this.patrolRange) {
                this.direction = 1;
                this.facingRight = true;
                Logger.log('[Bat] Reached left boundary, turning right');
            } else if (this.direction === 1 && this.x >= this.initialX + this.patrolRange) {
                this.direction = -1;
                this.facingRight = false;
                Logger.log('[Bat] Reached right boundary, turning left');
            }
            
            this.x = Math.max(0, Math.min(this.x, 3000 - this.width));
            this.y = Math.max(0, Math.min(this.y, 300 - this.height));
            
            if (!this.lastLogTime || this.flyTime - this.lastLogTime > 0.5) {
                Logger.log(`[Bat] Flying: flyTime=${this.flyTime.toFixed(2)}, x=${this.x.toFixed(1)}, y=${this.y.toFixed(1)}, targetY=${targetY.toFixed(1)}, direction=${this.direction}`);
                this.lastLogTime = this.flyTime;
            }
            
            this.animState = 'fly';
            if (this.entityAnimationManager) {
                this.entityAnimationManager.setState('fly');
            }
        }
    }
    
    private findPlayer(): Entity | null {
        if (!this.eventBus) {
            Logger.warn('[Bat] No eventBus available');
            return null;
        }
        
        const result = this.eventBus.emit('entity:findPlayer', {});
        if (result && Array.isArray(result) && result.length > 0) {
            return result[0] as Entity;
        }
        return null;
    }

    onCollisionWithWall(): void {
        if (this.batState === 'flying') {
            this.direction *= -1;
            this.facingRight = !this.facingRight;
        }
    }

    update(deltaTime: number): void {
        if (!this.active) return;
        
        if (this.invincibleTime > 0) {
            this.invincibleTime -= deltaTime * 1000;
        }
        
        if (this.stateTimer > 0) {
            this.stateTimer -= deltaTime * 1000;
        }
        
        this.updateAI(deltaTime);
        
        this.updateAnimation(deltaTime);
        this.onUpdate(deltaTime);
    }
    
    
    render(renderer: PixelRenderer): void {
        if (!this.active) return;
        
        if (this.invincibleTime > 0 && Math.floor(this.invincibleTime / 100) % 2 === 0) {
            return;
        }
        
        if (this.entityAnimationManager) {
            this.entityAnimationManager.setState(this.animState === 'hang' ? 'hang' : 'fly');
        }
        this.flipX = this.direction === -1;
        
        super.render(renderer);
    }
    
    /**
     * Initialize this bat in the EntityManager
     */
    initializeInManager(manager: EntityManager): void {
        this.setEventBus(manager.getEventBus());
        manager.addEnemy(this);
        this.physicsLayer = manager.getPhysicsSystem().layers.ENEMY;
    }

    /**
     * Get current bat state
     */
    get currentBatState(): BatState {
        return this.batState;
    }
    
    /**
     * Get animation definitions for bat
     */
    protected getAnimationDefinitions(): AnimationDefinition[] {
        return [
            {
                id: 'hang',
                sprites: ['enemies/bat_hang.json'],
                frameDuration: 0,
                loop: false
            },
            {
                id: 'fly',
                sprites: ['enemies/bat_fly1.json', 'enemies/bat_fly2.json'],
                frameDuration: 150,
                loop: true
            }
        ];
    }
    
    /**
     * Get palette definition for bat
     */
    protected getPaletteDefinition(): EntityPaletteDefinition {
        return {
            default: {
                colors: [
                    null,
                    0x90,
                    0x91,
                    0x21
                ]
            }
        };
    }
}