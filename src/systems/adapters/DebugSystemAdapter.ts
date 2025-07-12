

import { ISystem } from '../../services/SystemManager';
import { SystemPriorities } from '../../services/SystemPriorities';
import { DebugOverlay } from '../../debug/DebugOverlay';

/**
 * Adapter for debug system integration
 */
export class DebugSystemAdapter implements ISystem {
    readonly name = 'DebugSystem';
    readonly priority = SystemPriorities.DEBUG;
    enabled = true;
    
    constructor(private debugOverlay: DebugOverlay) {}
    
    update(deltaTime: number): void {
        this.debugOverlay.update(deltaTime);
    }
}
