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

export class EventCoordinator {
    private eventBus: EventBus;
    private entityManager: EntityManager;
    private levelManager: LevelManager;
    private onStageClear: () => void;
    private onGameOver: () => void;
    
    private listeners: Array<{ event: string; handler: (data: any) => void }> = [];
    
    constructor(config: EventCoordinatorConfig) {
        this.eventBus = config.eventBus;
        this.entityManager = config.entityManager;
        this.levelManager = config.levelManager;
        this.onStageClear = config.onStageClear;
        this.onGameOver = config.onGameOver;
        
        this.setupEventListeners();
    }
    
    private setupEventListeners(): void {
        // Coin collection event
        this.addListener('coin:collected', (data: any) => {
            Logger.log(`Coin collected! Score: ${data.score}`);
            const player = this.entityManager.getPlayer();
            if (player) {
                player.addScore(data.score);
                player.collectCoin(1);
            }
        });
        
        // Goal reached event
        this.addListener('goal:reached', () => {
            this.onStageClear();
        });
        
        // Player death event is handled entirely by PlayState
        // which manages lives, respawn, and game over
        
        // Enemy defeated event
        this.addListener('enemy:defeated', (data: any) => {
            Logger.log(`Enemy defeated! Score: ${data.score}`);
            const player = this.entityManager.getPlayer();
            if (player) {
                player.addScore(data.score);
            }
        });
        
        // Spring bounce event
        this.addListener('spring:bounce', (data: any) => {
            Logger.log('Spring bounced!', data);
        });
        
        // Level specific events
        this.addListener('level:trigger', (data: any) => {
            Logger.log('Level trigger activated:', data);
            this.handleLevelTrigger(data);
        });
    }
    
    private addListener(event: string, handler: (data: any) => void): void {
        this.eventBus.on(event, handler);
        this.listeners.push({ event, handler });
    }
    
    private handleLevelTrigger(data: any): void {
        switch (data.type) {
        case 'checkpoint':
            this.handleCheckpoint(data);
            break;
        case 'secret':
            this.handleSecretArea(data);
            break;
        case 'boss':
            this.handleBossEncounter(data);
            break;
        default:
            Logger.warn('Unknown level trigger type:', data.type);
        }
    }
    
    private handleCheckpoint(data: any): void {
        const player = this.entityManager.getPlayer();
        if (player) {
            // Save checkpoint position
            Logger.log('Checkpoint reached at:', data.position);
            // TODO: Implement checkpoint functionality in LevelManager
            // this.levelManager.setCheckpoint(data.position);
        }
    }
    
    private handleSecretArea(data: any): void {
        Logger.log('Secret area discovered!', data);
        // Award bonus points
        const player = this.entityManager.getPlayer();
        if (player) {
            player.addScore(data.bonusScore || 500);
        }
    }
    
    private handleBossEncounter(data: any): void {
        Logger.log('Boss encounter started!', data);
        // Initialize boss battle
        this.eventBus.emit('boss:start', data);
    }
    
    cleanup(): void {
        // Remove all event listeners
        for (const { event, handler } of this.listeners) {
            this.eventBus.off(event, handler);
        }
        this.listeners = [];
    }
}