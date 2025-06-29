
import type { PixelRenderer } from '../rendering/PixelRenderer';

export interface Vector2D {
    x: number;
    y: number;
}

export interface Rectangle {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface Initializable {
    init(): Promise<void> | void;
}

export interface Updatable {
    update(deltaTime: number): void;
}

export interface Renderable {
    render(renderer: PixelRenderer): void;
}

export interface Destroyable {
    destroy(): void;
}
