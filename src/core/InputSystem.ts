
import { Logger } from '../utils/Logger';

export type InputEventType = 'keyPress' | 'keyRelease' | 'keyHold';
export type ActionName = 'left' | 'right' | 'up' | 'down' | 'jump' | 'action' | 'escape' | 'mute' | 'debug';

export interface InputEvent {
    type: InputEventType;
    key: string;
    action: ActionName | null;
    timestamp: number;
}

export type InputEventListener = (event: InputEvent) => void;
export type UnsubscribeFunction = () => void;

interface KeyMap {
    [action: string]: string[];
}

interface Listeners {
    keyPress: InputEventListener[];
    keyRelease: InputEventListener[];
    keyHold: InputEventListener[];
}

interface DebugInfo {
    pressedKeys: string[];
    pressedActions: string[];
    eventCount: number;
    listenerCounts: {
        keyPress: number;
        keyRelease: number;
        keyHold: number;
    };
}

/**
 * System for managing input operations
 */

export class InputSystem {
    private keys: Map<string, boolean>;
    private previousKeys: Map<string, boolean>;
    private justPressedKeys: Set<string>;
    private justReleasedKeys: Set<string>;
    
    private listeners: Listeners;
    
    private keyMap: KeyMap;
    
    private reverseKeyMap: Map<string, string[]>;
    
    private eventQueue: InputEvent[];

    constructor() {
        this.keys = new Map();
        this.previousKeys = new Map();
        this.justPressedKeys = new Set();
        this.justReleasedKeys = new Set();
        
        this.listeners = {
            keyPress: [],
            keyRelease: [],
            keyHold: []
        };
        
        this.keyMap = {
            'left': ['ArrowLeft', 'KeyA'],
            'right': ['ArrowRight', 'KeyD'],
            'up': ['ArrowUp', 'KeyW'],
            'down': ['ArrowDown', 'KeyS'],
            'jump': ['Space', 'ArrowUp', 'KeyW'],
            'action': ['Enter', 'KeyE'],
            'escape': ['Escape'],
            'mute': ['KeyM'],
            'debug': ['Digit2', 'BracketLeft']
        };
        
        this.reverseKeyMap = new Map();
        for (const [action, keys] of Object.entries(this.keyMap)) {
            for (const key of keys) {
                if (!this.reverseKeyMap.has(key)) {
                    this.reverseKeyMap.set(key, []);
                }
                const keyActions = this.reverseKeyMap.get(key);
                if (keyActions) {
                    keyActions.push(action);
                }
            }
        }
        
        this.eventQueue = [];
        
        this.setupEventListeners();
    }
    
    private setupEventListeners(): void {
        window.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.target instanceof HTMLElement && 
                (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
                return;
            }
            
            const code = e.code;
            if (this.keys.get(code)) {
                return;
            }
            
            this.keys.set(code, true);
            if (this.reverseKeyMap.has(code)) {
                e.preventDefault();
            }
        });
        
        window.addEventListener('keyup', (e: KeyboardEvent) => {
            const code = e.code;
            this.keys.set(code, false);
        });
        
        window.addEventListener('blur', () => {
            this.keys.clear();
        });
    }
    
    update(): void {
        this.eventQueue = [];
        
        this.justPressedKeys.clear();
        this.justReleasedKeys.clear();
        for (const [key, currentState] of this.keys) {
            const previousState = this.previousKeys.get(key) || false;
            if (currentState && !previousState) {
                this.justPressedKeys.add(key);
                this.triggerKeyPress(key);
            }
            if (!currentState && previousState) {
                this.justReleasedKeys.add(key);
                this.triggerKeyRelease(key);
            }
            if (currentState && previousState) {
                this.triggerKeyHold(key);
            }
        }
        for (const [key, previousState] of this.previousKeys) {
            const currentState = this.keys.get(key) || false;
            if (!currentState && previousState) {
                this.justReleasedKeys.add(key);
                this.triggerKeyRelease(key);
            }
        }
        this.previousKeys.clear();
        for (const [key, state] of this.keys) {
            this.previousKeys.set(key, state);
        }
    }
    
    private triggerKeyPress(key: string): void {
        const actions = this.reverseKeyMap.get(key) || [];
        
        // デバッグログ（Spaceキーの場合のみ）
        if (key === 'Space') {
            Logger.log('InputSystem: Space key pressed, actions:', actions);
        }
        
        for (const action of actions) {
            const event: InputEvent = {
                type: 'keyPress',
                key: key,
                action: action as ActionName,
                timestamp: Date.now()
            };
            
            this.eventQueue.push(event);
            for (const listener of this.listeners.keyPress) {
                listener(event);
            }
        }
        if (actions.length === 0) {
            const event: InputEvent = {
                type: 'keyPress',
                key: key,
                action: null,
                timestamp: Date.now()
            };
            
            this.eventQueue.push(event);
            for (const listener of this.listeners.keyPress) {
                listener(event);
            }
        }
    }
    
    private triggerKeyRelease(key: string): void {
        const actions = this.reverseKeyMap.get(key) || [];
        
        for (const action of actions) {
            const event: InputEvent = {
                type: 'keyRelease',
                key: key,
                action: action as ActionName,
                timestamp: Date.now()
            };
            
            this.eventQueue.push(event);
            for (const listener of this.listeners.keyRelease) {
                listener(event);
            }
        }
    }
    
    private triggerKeyHold(key: string): void {
        const actions = this.reverseKeyMap.get(key) || [];
        
        for (const action of actions) {
            const event: InputEvent = {
                type: 'keyHold',
                key: key,
                action: action as ActionName,
                timestamp: Date.now()
            };
            for (const listener of this.listeners.keyHold) {
                listener(event);
            }
        }
    }
    
    on(eventType: InputEventType, callback: InputEventListener): UnsubscribeFunction {
        if (!this.listeners[eventType]) {
            Logger.warn(`Unknown event type: ${eventType}`);
            return () => {};
        }
        
        this.listeners[eventType].push(callback);
        return () => {
            const index = this.listeners[eventType].indexOf(callback);
            if (index !== -1) {
                this.listeners[eventType].splice(index, 1);
            }
        };
    }
    
    once(eventType: InputEventType, callback: InputEventListener): UnsubscribeFunction {
        const removeListener = this.on(eventType, (event) => {
            callback(event);
            removeListener();
        });
        
        return removeListener;
    }
    
    isActionPressed(action: string): boolean {
        const keys = this.keyMap[action];
        if (!keys) return false;
        
        return keys.some(key => this.keys.get(key) || false);
    }
    
    isActionJustPressed(action: string): boolean {
        const keys = this.keyMap[action];
        if (!keys) return false;
        
        return keys.some(key => this.justPressedKeys.has(key));
    }
    
    isActionJustReleased(action: string): boolean {
        const keys = this.keyMap[action];
        if (!keys) return false;
        
        return keys.some(key => this.justReleasedKeys.has(key));
    }
    
    isKeyPressed(keyCode: string): boolean {
        return this.keys.get(keyCode) || false;
    }
    
    getEventQueue(): InputEvent[] {
        return [...this.eventQueue];
    }
    
    setKeyMapping(action: string, keys: string[]): void {
        if (this.keyMap[action]) {
            for (const key of this.keyMap[action]) {
                const actions = this.reverseKeyMap.get(key);
                if (actions) {
                    const index = actions.indexOf(action);
                    if (index !== -1) {
                        actions.splice(index, 1);
                    }
                    if (actions.length === 0) {
                        this.reverseKeyMap.delete(key);
                    }
                }
            }
        }
        this.keyMap[action] = keys;
        for (const key of keys) {
            if (!this.reverseKeyMap.has(key)) {
                this.reverseKeyMap.set(key, []);
            }
            const keyActions = this.reverseKeyMap.get(key);
            if (keyActions) {
                keyActions.push(action);
            }
        }
    }
    
    reset(): void {
        this.keys.clear();
        this.previousKeys.clear();
        this.eventQueue = [];
    }
    
    getDebugInfo(): DebugInfo {
        const pressedKeys: string[] = [];
        const pressedActions: string[] = [];
        
        for (const [key, pressed] of this.keys) {
            if (pressed) {
                pressedKeys.push(key);
                const actions = this.reverseKeyMap.get(key) || [];
                pressedActions.push(...actions);
            }
        }
        
        return {
            pressedKeys: [...new Set(pressedKeys)],
            pressedActions: [...new Set(pressedActions)],
            eventCount: this.eventQueue.length,
            listenerCounts: {
                keyPress: this.listeners.keyPress.length,
                keyRelease: this.listeners.keyRelease.length,
                keyHold: this.listeners.keyHold.length
            }
        };
    }
}