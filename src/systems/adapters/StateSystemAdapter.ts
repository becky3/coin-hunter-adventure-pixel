

import { ISystem } from '../../services/SystemManager';
import { SystemPriorities } from '../../services/SystemPriorities';
import { GameStateManager } from '../../states/GameStateManager';

/**
 * Adapter for state system integration
 */
export class StateSystemAdapter implements ISystem {
    readonly name = 'StateSystem';
    readonly priority = SystemPriorities.GAME_LOGIC;
    enabled = true;
    
    constructor(private stateManager: GameStateManager) {}
    
    update(deltaTime: number): void {
        this.stateManager.update(deltaTime);
    }
}
