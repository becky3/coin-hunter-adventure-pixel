import { EventBus } from '../services/EventBus';
import { EntityManager } from '../managers/EntityManager';
import { LevelManager } from '../managers/LevelManager';
import { Logger } from '../utils/Logger';

export interface EventCoordinatorConfig {
    eventBus: EventBus;
    entityManager: EntityManager;
    levelManager: LevelManager;
    onStageClear: () => void;
    onGameOver: () => void;
}

/**
 * EventCoordinator implementation
 */
export class EventCoordinator {
    private eventBus: EventBus;
    private entityManager: EntityManager;
    private onStageClear: () => void;
    
    private listeners: Array<{ event: string; handler: (data: unknown) => void }> = [];
    
    constructor(config: EventCoordinatorConfig) {
        this.eventBus = config.eventBus;
        this.entityManager = config.entityManager;
        this.onStageClear = config.onStageClear;
        
        this.setupEventListeners();
    }
    
    private setupEventListeners(): void {
        this.addListener('coin:collected', (data) => {
            const coinData = data as { score: number };
            Logger.log(`Coin collected! Score: ${coinData.score}`);
            const player = this.entityManager.getPlayer();
            if (player) {
                player.addScore(coinData.score);
                player.collectCoin(1);
            }
        });
        
        this.addListener('goal:reached', () => {
            this.onStageClear();
        });
        
        
        this.addListener('enemy:defeated', (data) => {
            const enemyData = data as { score: number };
            Logger.log(`Enemy defeated! Score: ${enemyData.score}`);
            const player = this.entityManager.getPlayer();
            if (player) {
                player.addScore(enemyData.score);
            }
        });
        
        this.addListener('spring:bounce', (data) => {
            Logger.log('Spring bounced!', data);
        });
        
        this.addListener('level:trigger', (data) => {
            Logger.log('Level trigger activated:', data);
            this.handleLevelTrigger(data);
        });
    }
    
    private addListener(event: string, handler: (data: unknown) => void): void {
        this.eventBus.on(event, handler);
        this.listeners.push({ event, handler });
    }
    
    private handleLevelTrigger(data: unknown): void {
        const triggerData = data as { type: string; position?: { x: number; y: number }; bonusScore?: number };
        switch (triggerData.type) {
        case 'checkpoint':
            this.handleCheckpoint(triggerData);
            break;
        case 'secret':
            this.handleSecretArea(triggerData);
            break;
        case 'boss':
            this.handleBossEncounter(triggerData);
            break;
        default:
            Logger.warn('Unknown level trigger type:', triggerData.type);
        }
    }
    
    private handleCheckpoint(data: { position?: { x: number; y: number } }): void {
        const player = this.entityManager.getPlayer();
        if (player) {
            Logger.log('Checkpoint reached at:', data.position);
            // TODO: Implement checkpoint functionality in LevelManager
        }
    }
    
    private handleSecretArea(data: { bonusScore?: number }): void {
        Logger.log('Secret area discovered!', data);
        const player = this.entityManager.getPlayer();
        if (player) {
            player.addScore(data.bonusScore || 500);
        }
    }
    
    private handleBossEncounter(data: unknown): void {
        Logger.log('Boss encounter started!', data);
        this.eventBus.emit('boss:start', data);
    }
    
    cleanup(): void {
        for (const { event, handler } of this.listeners) {
            this.eventBus.off(event, handler);
        }
        this.listeners = [];
    }
}