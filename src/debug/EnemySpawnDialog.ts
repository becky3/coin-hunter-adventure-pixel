import { ServiceLocator } from '../services/ServiceLocator';
import { Logger } from '../utils/Logger';

/**
 * Debug dialog for spawning enemies
 */
export class EnemySpawnDialog {
    private serviceLocator: ServiceLocator;
    private dialogElement?: HTMLDivElement;
    private isOpen: boolean = false;
    
    private enemyTypes: string[] = [
        'slime',
        'bat',
        'spider',
        'armorKnight',
        'flyingWizard',
        'fireSlime',
        'lavaBubble'
    ];
    
    constructor(serviceLocator: ServiceLocator) {
        this.serviceLocator = serviceLocator;
    }
    
    init(): void {
        this.createDialog();
        this.setupEventListeners();
        Logger.log('EnemySpawnDialog', 'Initialized');
    }
    
    private createDialog(): void {
        this.dialogElement = document.createElement('div');
        this.dialogElement.id = 'enemy-spawn-dialog';
        this.dialogElement.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            color: #00ff00;
            font-family: monospace;
            font-size: 14px;
            padding: 20px;
            border: 2px solid #00ff00;
            z-index: 10000;
            display: none;
            min-width: 300px;
            max-width: 500px;
        `;
        
        const title = document.createElement('h3');
        title.textContent = 'SPAWN ENEMY';
        title.style.cssText = `
            margin: 0 0 15px 0;
            text-align: center;
            color: #00ff00;
        `;
        this.dialogElement.appendChild(title);
        
        const enemyList = document.createElement('div');
        enemyList.style.cssText = `
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
            margin-bottom: 20px;
        `;
        
        this.enemyTypes.forEach(enemyType => {
            const button = document.createElement('button');
            button.textContent = enemyType.toUpperCase();
            button.dataset.enemyType = enemyType;
            button.style.cssText = `
                background: rgba(0, 255, 0, 0.1);
                color: #00ff00;
                border: 1px solid #00ff00;
                padding: 10px;
                cursor: pointer;
                font-family: monospace;
                font-size: 12px;
                transition: all 0.2s;
            `;
            
            button.addEventListener('click', () => this.spawnEnemy(enemyType));
            button.addEventListener('mouseenter', () => {
                button.style.background = 'rgba(0, 255, 0, 0.3)';
            });
            button.addEventListener('mouseleave', () => {
                button.style.background = 'rgba(0, 255, 0, 0.1)';
            });
            
            enemyList.appendChild(button);
        });
        
        this.dialogElement.appendChild(enemyList);
        
        const closeButton = document.createElement('button');
        closeButton.textContent = 'CLOSE (ESC)';
        closeButton.style.cssText = `
            width: 100%;
            background: rgba(255, 0, 0, 0.1);
            color: #ff0000;
            border: 1px solid #ff0000;
            padding: 10px;
            cursor: pointer;
            font-family: monospace;
            font-size: 12px;
            transition: all 0.2s;
        `;
        
        closeButton.addEventListener('click', () => this.close());
        closeButton.addEventListener('mouseenter', () => {
            closeButton.style.background = 'rgba(255, 0, 0, 0.3)';
        });
        closeButton.addEventListener('mouseleave', () => {
            closeButton.style.background = 'rgba(255, 0, 0, 0.1)';
        });
        
        this.dialogElement.appendChild(closeButton);
        
        document.body.appendChild(this.dialogElement);
    }
    
    private setupEventListeners(): void {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
    }
    
    private spawnEnemy(enemyType: string): void {
        const game = (window as { game?: unknown }).game as { stateManager?: { currentState?: { name: string; player?: { x: number; y: number }; entityManager?: { spawnEnemy?: (type: string, x: number, y: number) => void } } } };
        const currentState = game?.stateManager?.currentState;
        
        if (!currentState || currentState.name !== 'play') {
            Logger.warn('EnemySpawnDialog', 'Can only spawn enemies in PlayState');
            return;
        }
        
        const player = currentState.player;
        if (!player) {
            Logger.warn('EnemySpawnDialog', 'No player found');
            return;
        }
        
        const spawnX = player.x + 80;
        const spawnY = player.y - 60;
        
        const tileX = Math.floor(spawnX / 16);
        const tileY = Math.floor(spawnY / 16);
        
        try {
            const entityManager = currentState.entityManager;
            if (entityManager && typeof entityManager.spawnEnemy === 'function') {
                entityManager.spawnEnemy(enemyType, tileX, tileY);
                Logger.log('EnemySpawnDialog', `Spawned ${enemyType} at (${tileX}, ${tileY})`);
            } else {
                Logger.warn('EnemySpawnDialog', 'EntityManager.spawnEnemy not available');
            }
        } catch (error) {
            Logger.error('EnemySpawnDialog', `Failed to spawn ${enemyType}:`, error);
        }
        
        this.close();
    }
    
    open(): void {
        if (this.dialogElement) {
            this.dialogElement.style.display = 'block';
            this.isOpen = true;
        }
    }
    
    close(): void {
        if (this.dialogElement) {
            this.dialogElement.style.display = 'none';
            this.isOpen = false;
        }
    }
    
    toggle(): void {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }
}