export class GameStateManager {
    constructor() {
        this.states = new Map();
        this.currentState = null;
        this.previousState = null;
        this.stateHistory = [];
        this.maxHistory = 1000;
        this.recording = false;
        this.listeners = new Map();
    }
    
    registerState(name, state) {
        this.states.set(name, state);
    }
    
    changeState(name, params = {}) {
        if (!this.states.has(name)) {
            throw new Error(`State "${name}" not found`);
        }
        
        if (this.currentState) {
            if (this.currentState.exit) {
                this.currentState.exit();
            }
            this.previousState = this.currentState;
        }
        this.currentState = this.states.get(name);
        this.currentStateName = name;
        if (this.currentState.enter) {
            this.currentState.enter(params);
        }
        this.recordEvent('stateChange', { from: this.previousState?.name, to: name, params });
    }
    
    setState(name, params = {}) {
        this.changeState(name, params);
    }
    
    update(deltaTime) {
        if (this.currentState && this.currentState.update) {
            this.currentState.update(deltaTime);
        }
    }
    
    render(renderer) {
        if (this.currentState && this.currentState.render) {
            this.currentState.render(renderer);
        }
    }
    
    captureGameSnapshot(game) {
        if (!game) return null;
        
        const snapshot = {
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
            entities: game.entities ? game.entities.map(e => ({
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
    startRecording() {
        this.recording = true;
        this.stateHistory = [];
    }
    
    stopRecording() {
        this.recording = false;
        return this.stateHistory;
    }
    recordEvent(eventType, data) {
        const event = {
            timestamp: Date.now(),
            type: eventType,
            data: data
        };
        if (this.listeners.has(eventType)) {
            this.listeners.get(eventType).forEach(fn => fn(event));
        }
        
        return event;
    }
    addEventListener(eventType, callback) {
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, []);
        }
        this.listeners.get(eventType).push(callback);
    }
    removeEventListener(eventType, callback) {
        if (this.listeners.has(eventType)) {
            const listeners = this.listeners.get(eventType);
            const index = listeners.indexOf(callback);
            if (index !== -1) {
                listeners.splice(index, 1);
            }
        }
    }
    async waitForCondition(conditionFn, timeout = 5000) {
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
    destroy() {
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