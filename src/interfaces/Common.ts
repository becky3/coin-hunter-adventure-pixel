
import type { PixelRenderer } from '../rendering/PixelRenderer';

// src/interfaces/Common.ts

/**
 * 2D座標
 */
export interface Vector2D {
    x: number;
    y: number;
}

/**
 * 矩形領域
 */
export interface Rectangle {
    x: number;
    y: number;
    width: number;
    height: number;
}

/**
 * 初期化可能なオブジェクト
 */
export interface Initializable {
    init(): Promise<void> | void;
}

/**
 * 更新可能なオブジェクト
 */
export interface Updatable {
    update(deltaTime: number): void;
}

/**
 * 描画可能なオブジェクト
 */
export interface Renderable {
    render(renderer: PixelRenderer): void;
}

/**
 * 破棄可能なオブジェクト
 */
export interface Destroyable {
    destroy(): void;
}
