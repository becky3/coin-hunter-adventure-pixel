/**
 * イベントベースの入力管理システム
 * キーボード入力をイベントとして管理し、リスナーに通知する
 */
export class InputSystem {
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
                this.reverseKeyMap.get(key).push(action);
            }
        }
        
        this.eventQueue = [];
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        window.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
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
        
        window.addEventListener('keyup', (e) => {
            const code = e.code;
            this.keys.set(code, false);
        });
        
        window.addEventListener('blur', () => {
            this.keys.clear();
        });
    }
    
    update() {
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
    
    triggerKeyPress(key) {
        const actions = this.reverseKeyMap.get(key) || [];
        for (const action of actions) {
            const event = {
                type: 'keyPress',
                key: key,
                action: action,
                timestamp: Date.now()
            };
            
            this.eventQueue.push(event);
            for (const listener of this.listeners.keyPress) {
                listener(event);
            }
        }
        if (actions.length === 0) {
            const event = {
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
    
    triggerKeyRelease(key) {
        const actions = this.reverseKeyMap.get(key) || [];
        
        for (const action of actions) {
            const event = {
                type: 'keyRelease',
                key: key,
                action: action,
                timestamp: Date.now()
            };
            
            this.eventQueue.push(event);
            for (const listener of this.listeners.keyRelease) {
                listener(event);
            }
        }
    }
    
    triggerKeyHold(key) {
        const actions = this.reverseKeyMap.get(key) || [];
        
        for (const action of actions) {
            const event = {
                type: 'keyHold',
                key: key,
                action: action,
                timestamp: Date.now()
            };
            for (const listener of this.listeners.keyHold) {
                listener(event);
            }
        }
    }
    
    on(eventType, callback) {
        if (!this.listeners[eventType]) {
            console.warn(`Unknown event type: ${eventType}`);
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
    
    once(eventType, callback) {
        const removeListener = this.on(eventType, (event) => {
            callback(event);
            removeListener();
        });
        
        return removeListener;
    }
    
    isActionPressed(action) {
        const keys = this.keyMap[action];
        if (!keys) return false;
        
        return keys.some(key => this.keys.get(key) || false);
    }
    
    isActionJustPressed(action) {
        const keys = this.keyMap[action];
        if (!keys) return false;
        
        return keys.some(key => this.justPressedKeys.has(key));
    }
    
    isActionJustReleased(action) {
        const keys = this.keyMap[action];
        if (!keys) return false;
        
        return keys.some(key => this.justReleasedKeys.has(key));
    }
    
    isKeyPressed(keyCode) {
        return this.keys.get(keyCode) || false;
    }
    
    getEventQueue() {
        return [...this.eventQueue];
    }
    
    setKeyMapping(action, keys) {
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
            this.reverseKeyMap.get(key).push(action);
        }
    }
    
    reset() {
        this.keys.clear();
        this.previousKeys.clear();
        this.eventQueue = [];
    }
    
    getDebugInfo() {
        const pressedKeys = [];
        const pressedActions = [];
        
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