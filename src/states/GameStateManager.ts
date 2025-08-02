import { PixelRenderer } from '../rendering/PixelRenderer';
import { GameStateKey } from '../types/GameStateTypes';
import { Logger } from '../utils/Logger';

export interface GameState {
    name?: GameStateKey;
    enter?(params?: StateChangeParams): void | Promise<void>;
    exit?(): void;
    update?(deltaTime: number): void;
    render?(renderer: PixelRenderer): void;
}

export interface StateChangeParams {
    [key: string]: unknown;
}

export interface GameSnapshot {
    timestamp: number;
    frame: number;
    currentState: GameStateKey | undefined;
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
    data: unknown;
}

type EventListener = (event: StateEvent) => void;

/**
 * Game state for gamemanager mode
 */
export class GameStateManager {
    private states: Map<GameStateKey, GameState>;
    private _currentState: GameState | null;
    private _currentStateName?: GameStateKey;
    private previousState: GameState | null;
    private stateHistory: GameSnapshot[];
    private maxHistory: number;
    private recording: boolean;
    private listeners: Map<string, EventListener[]>;
    private _enteringPromise: Promise<void> | null = null;

    constructor() {
        this.states = new Map();
        this._currentState = null;
        this.previousState = null;
        this.stateHistory = [];
        this.maxHistory = 1000;
        this.recording = false;
        this.listeners = new Map();
    }
    
    registerState(state: GameState): void {
        if (!state.name) {
            throw new Error('State must have a name property');
        }
        this.states.set(state.name, state);
    }
    
    changeState(name: GameStateKey, params: StateChangeParams = {}): void {
        if (!this.states.has(name)) {
            throw new Error(`State "${name}" not found`);
        }
        
        if (this._currentState) {
            if (this._currentState.exit) {
                this._currentState.exit();
            }
            this.previousState = this._currentState;
        }
        const state = this.states.get(name);
        if (!state) {
            throw new Error(`State '${name}' not found`);
        }
        this._currentState = state;
        this._currentStateName = name;
        if (this._currentState.enter) {
    
            const enterResult = this._currentState.enter(params);
            if (enterResult && typeof enterResult === 'object' && 'then' in enterResult) {
                this._enteringPromise = enterResult;
                enterResult.finally(() => {
                    this._enteringPromise = null;
                    Logger.log(`[GameStateManager] _enteringPromise cleared for state: ${name}`);
                });
            }
        }
        this.recordEvent('stateChange', { from: this.previousState?.name, to: name, params });
    }
    
    setState(name: GameStateKey, params: StateChangeParams = {}): void {
        this.changeState(name, params);
    }
    
    update(deltaTime: number): void {

        if (this._enteringPromise) {
            return;
        }
        if (this._currentState && this._currentState.update) {
            this._currentState.update(deltaTime);
        }
    }
    
    render(renderer: PixelRenderer): void {

        if (this._enteringPromise) {
            return;
        }
        if (this._currentState && this._currentState.render) {
            this._currentState.render(renderer);
        }
    }
    
    captureGameSnapshot(game: {
        frameCount?: number;
        player?: {
            x: number;
            y: number;
            vx: number;
            vy: number;
            grounded: boolean;
            health: number;
            score: number;
        };
        entities?: Array<{
            constructor: { name: string };
            x: number;
            y: number;
            active: boolean;
        }>;
        camera?: {
            x: number;
            y: number;
        };
    }): GameSnapshot | null {
        if (!game) return null;
        
        const snapshot: GameSnapshot = {
            timestamp: Date.now(),
            frame: game.frameCount || 0,
            currentState: this._currentState?.name,
            player: game.player ? {
                x: game.player.x,
                y: game.player.y,
                vx: game.player.vx,
                vy: game.player.vy,
                grounded: game.player.grounded,
                health: game.player.health,
                score: game.player.score
            } : null,
            entities: game.entities ? game.entities.map((e) => ({
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
    
    recordEvent(eventType: string, data: unknown): StateEvent {
        const event: StateEvent = {
            timestamp: Date.now(),
            type: eventType,
            data: data
        };
        const eventListeners = this.listeners.get(eventType);
        if (eventListeners) {
            eventListeners.forEach(fn => fn(event));
        }
        
        return event;
    }
    
    addEventListener(eventType: string, callback: EventListener): void {
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, []);
        }
        const eventListeners = this.listeners.get(eventType);
        if (eventListeners) {
            eventListeners.push(callback);
        }
    }
    
    removeEventListener(eventType: string, callback: EventListener): void {
        const listeners = this.listeners.get(eventType);
        if (listeners) {
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
    
    get currentState(): GameState | null {
        return this._currentState;
    }
    
    get currentStateName(): GameStateKey | undefined {
        return this._currentStateName;
    }
    
    destroy(): void {
        if (this._currentState && this._currentState.exit) {
            this._currentState.exit();
        }
        this.states.clear();
        this.listeners.clear();
        this.stateHistory = [];
        this._currentState = null;
        this.previousState = null;
    }
}