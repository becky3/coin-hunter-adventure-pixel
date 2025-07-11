

import { ISystem } from '../../services/SystemManager';
import { SystemPriorities } from '../../services/SystemPriorities';
import { PhysicsSystem } from '../../physics/PhysicsSystem';

/**
 * Adapter for physics system integration
 */
export class PhysicsSystemAdapter implements ISystem {
    readonly name = 'PhysicsSystem';
    readonly priority = SystemPriorities.PHYSICS;
    enabled = true;
    
    constructor(private physicsSystem: PhysicsSystem) {}
    
    update(deltaTime: number): void {
        this.physicsSystem.update(deltaTime);
    }
}
