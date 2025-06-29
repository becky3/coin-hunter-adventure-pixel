

import { ISystem } from '../../services/SystemManager';
import { SystemPriorities } from '../../services/SystemPriorities';
import { InputSystem } from '../../core/InputSystem';

export class InputSystemAdapter implements ISystem {
    readonly name = 'InputSystem';
    readonly priority = SystemPriorities.INPUT;
    enabled = true;
    
    constructor(private inputSystem: InputSystem) {}
    
    update(_deltaTime: number): void {
        this.inputSystem.update();
    }
}
