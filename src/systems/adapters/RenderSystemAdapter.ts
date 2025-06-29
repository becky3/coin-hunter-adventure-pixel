
// src/systems/adapters/RenderSystemAdapter.ts

import { ISystem } from '../../services/SystemManager';
import { SystemPriorities } from '../../services/SystemPriorities';
import { PixelRenderer } from '../../rendering/PixelRenderer';
import { GameStateManager } from '../../states/GameStateManager';

export class RenderSystemAdapter implements ISystem {
    readonly name = 'RenderSystem';
    readonly priority = SystemPriorities.RENDER;
    enabled = true;
    
    constructor(
        private stateManager: GameStateManager
    ) {}
    
    render(renderer: PixelRenderer): void {
        // レンダラーのクリア
        renderer.clear('#000000');
        
        // 現在のステートの描画
        this.stateManager.render(renderer);
    }
}
