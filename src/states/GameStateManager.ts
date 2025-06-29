import { PixelRenderer } from '../rendering/PixelRenderer';

export interface GameState {
    name?: string;
    enter?(params?: any): void;
    exit?(): void;
    update?(deltaTime: number): void;
    render?(renderer: PixelRenderer): void;
}

export interface StateChangeParams {
    [key: string]: any;
}

export interface GameSnapshot {
    timestamp: number;
    frame: number;
    currentState: string | undefined;
    player: {
        x: number;
        y: number;
        vx: number;
        vy: number;
        grounded: boolean;
        health: number;
        score: number;
    } | null;
    entities: Array<{
        type: string;
        x: number;
        y: number;
        active: boolean;
    }>;
    camera: {
        x: number;
        y: number;
    } | null;
}

export interface StateEvent {
    timestamp: number;
    type: string;
    data: any;
}

type EventListener = (event: StateEvent) => void;

export class GameStateManager {
    private states: Map<string, GameState>;
    private currentState: GameState | null;
    private currentStateName?: string;
    private previousState: GameState | null;
    private stateHistory: GameSnapshot[];
    private maxHistory: number;
    private recording: boolean;
    private listeners: Map<string, EventListener[]>;

    constructor() {
        this.states = new Map();
        this.currentState = null;
        this.previousState = null;
        this.stateHistory = [];
        this.maxHistory = 1000;
        this.recording = false;
        this.listeners = new Map();
    }
    
    registerState(name: string, state: GameState): void {
        this.states.set(name, state);
    }
    
    changeState(name: string, params: StateChangeParams = {}): void {
        if (!this.states.has(name)) {
            throw new Error(`State "${name}" not found`);
        }
        
        if (this.currentState) {
            if (this.currentState.exit) {
                this.currentState.exit();
            }
            this.previousState = this.currentState;
        }
        this.currentState = this.states.get(name)!;
        this.currentStateName = name;
        if (this.currentState.enter) {
            this.currentState.enter(params);
        }
        this.recordEvent('stateChange', { from: this.previousState?.name, to: name, params });
    }
    
    setState(name: string, params: StateChangeParams = {}): void {
        this.changeState(name, params);
    }
    
    update(deltaTime: number): void {
        if (this.currentState && this.currentState.update) {
            this.currentState.update(deltaTime);
        }
    }
    
    render(renderer: PixelRenderer): void {
        if (this.currentState && this.currentState.render) {
            this.currentState.render(renderer);
        }
    }
    
    captureGameSnapshot(game: any): GameSnapshot | null {
        if (!game) return null;
        
        const snapshot: GameSnapshot = {
            timestamp: Date.now(),
            frame: game.frameCount || 0,
            currentState: this.currentState?.name,
            player: game.player ? {
                x: game.player.x,
                y: game.player.y,
                vx: game.player.vx,
                vy: game.player.vy,
                grounded: game.player.grounded,
                health: game.player.health,
                score: game.player.score
            } : null,
            entities: game.entities ? game.entities.map((e: any) => ({
                type: e.constructor.name,
                x: e.x,
                y: e.y,
                active: e.active
            })) : [],
            camera: game.camera ? {
                x: game.camera.x,
                y: game.camera.y
            } : null
        };
        
        if (this.recording) {
            this.stateHistory.push(snapshot);
            if (this.stateHistory.length > this.maxHistory) {
                this.stateHistory.shift();
            }
        }
        
        return snapshot;
    }
    
    startRecording(): void {
        this.recording = true;
        this.stateHistory = [];
    }
    
    stopRecording(): GameSnapshot[] {
        this.recording = false;
        return this.stateHistory;
    }
    
    recordEvent(eventType: string, data: any): StateEvent {
        const event: StateEvent = {
            timestamp: Date.now(),
            type: eventType,
            data: data
        };
        if (this.listeners.has(eventType)) {
            this.listeners.get(eventType)!.forEach(fn => fn(event));
        }
        
        return event;
    }
    
    addEventListener(eventType: string, callback: EventListener): void {
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, []);
        }
        this.listeners.get(eventType)!.push(callback);
    }
    
    removeEventListener(eventType: string, callback: EventListener): void {
        if (this.listeners.has(eventType)) {
            const listeners = this.listeners.get(eventType)!;
            const index = listeners.indexOf(callback);
            if (index !== -1) {
                listeners.splice(index, 1);
            }
        }
    }
    
    async waitForCondition(conditionFn: () => boolean, timeout: number = 5000): Promise<void> {
        const startTime = Date.now();
        
        return new Promise((resolve, reject) => {
            const check = () => {
                if (conditionFn()) {
                    resolve();
                } else if (Date.now() - startTime > timeout) {
                    reject(new Error('Condition timeout'));
                } else {
                    requestAnimationFrame(check);
                }
            };
            check();
        });
    }
    
    destroy(): void {
        if (this.currentState && this.currentState.exit) {
            this.currentState.exit();
        }
        this.states.clear();
        this.listeners.clear();
        this.stateHistory = [];
        this.currentState = null;
        this.previousState = null;
    }
}