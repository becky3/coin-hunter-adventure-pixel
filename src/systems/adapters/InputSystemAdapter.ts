

import { ISystem } from '../../services/SystemManager';
import { SystemPriorities } from '../../services/SystemPriorities';
import { InputSystem } from '../../core/InputSystem';
import { Logger } from '../../utils/Logger';

export class InputSystemAdapter implements ISystem {
    readonly name = 'InputSystem';
    readonly priority = SystemPriorities.INPUT;
    enabled = true;
    
    constructor(private inputSystem: InputSystem) {}
    
    private _firstUpdateLogged = false;
    
    update(_deltaTime: number): void {
        if (!this._firstUpdateLogged) {
            Logger.log('InputSystemAdapter: update called');
            this._firstUpdateLogged = true;
        }
        this.inputSystem.update();
    }
}
