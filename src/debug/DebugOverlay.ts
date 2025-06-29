

import { ServiceLocator } from '../services/ServiceLocator';
import { ServiceNames } from '../services/ServiceNames';
import { EventBus } from '../services/EventBus';
import { GameEvents } from '../services/GameEvents';

export class DebugOverlay {
    private serviceLocator: ServiceLocator;
    private debugElement?: HTMLDivElement;
    private statsElements: Map<string, HTMLElement> = new Map();
    private lastFrameTime: number = 0;
    private frameCount: number = 0;
    private fps: number = 0;
    
    constructor(serviceLocator: ServiceLocator) {
        this.serviceLocator = serviceLocator;
    }

    async init(): Promise<void> {
        this.createDebugUI();
        this.setupEventListeners();
    }

    private createDebugUI(): void {

        const existingDebug = document.getElementById('debug-info');
        if (existingDebug) {
            existingDebug.remove();
        }

        this.debugElement = document.createElement('div');
        this.debugElement.id = 'debug-info';
        this.debugElement.style.cssText = `
            position: fixed;
            top: 10px;
            left: 10px;
            background: rgba(0, 0, 0, 0.7);
            color: #00ff00;
            font-family: monospace;
            font-size: 12px;
            padding: 10px;
            border: 1px solid #00ff00;
            z-index: 1000;
            pointer-events: none;
        `;

        const stats = ['FPS', 'Entities', 'State', 'Camera', 'Input'];
        stats.forEach(stat => {
            const statElement = document.createElement('div');
            statElement.innerHTML = `${stat}: <span>-</span>`;
            this.debugElement!.appendChild(statElement);
            this.statsElements.set(stat.toLowerCase(), statElement.querySelector('span')!);
        });
        
        document.body.appendChild(this.debugElement);
    }

    private setupEventListeners(): void {
        const eventBus = this.serviceLocator.get<EventBus>(ServiceNames.EVENT_BUS);

        eventBus.on(GameEvents.STATE_CHANGE, (data) => {
            this.updateStat('state', data.to);
        });

        window.addEventListener('keydown', (e) => {
            if (e.key === 'F3') {
                e.preventDefault();
                this.toggleVisibility();
            }
        });
    }

    update(_deltaTime: number): void {
        this.frameCount++;
        const currentTime = performance.now();
        
        if (currentTime - this.lastFrameTime >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastFrameTime = currentTime;
            this.updateStat('fps', this.fps.toString());
        }

        this.updateStats();
    }

    private updateStats(): void {

        const physicsSystem = this.serviceLocator.tryGet(ServiceNames.PHYSICS) as any;
        if (physicsSystem && physicsSystem.entities) {
            this.updateStat('entities', physicsSystem.entities.size.toString());
        }

        const renderer = this.serviceLocator.tryGet(ServiceNames.RENDERER) as any;
        if (renderer && renderer.getCameraPosition) {
            const pos = renderer.getCameraPosition();
            this.updateStat('camera', `${Math.floor(pos.x)}, ${Math.floor(pos.y)}`);
        }

        const inputSystem = this.serviceLocator.tryGet(ServiceNames.INPUT) as any;
        if (inputSystem) {
            const keys: string[] = [];
            if (inputSystem.isActionPressed?.('left')) keys.push('←');
            if (inputSystem.isActionPressed?.('right')) keys.push('→');
            if (inputSystem.isActionPressed?.('jump')) keys.push('SPACE');
            this.updateStat('input', keys.join(' ') || 'none');
        }
    }

    private updateStat(name: string, value: string): void {
        const element = this.statsElements.get(name);
        if (element) {
            element.textContent = value;
        }
    }

    private toggleVisibility(): void {
        if (this.debugElement) {
            this.debugElement.style.display = 
                this.debugElement.style.display === 'none' ? 'block' : 'none';
        }
    }

    destroy(): void {
        if (this.debugElement) {
            this.debugElement.remove();
        }
        this.statsElements.clear();
    }
}
