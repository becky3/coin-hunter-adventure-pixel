/**
 * 型定義ファイル（将来的なTypeScript移行への準備）
 * 
 * このファイルは現在のJavaScriptコードベースのインターフェースを文書化し、
 * 将来的なTypeScript移行を容易にするためのものです。
 */

// レンダラーインターフェース
interface IRenderer {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    width: number;
    height: number;
    scale: number;
    cameraX: number;
    cameraY: number;
    debug: boolean;
    
    clear(color?: string): void;
    drawRect(x: number, y: number, width: number, height: number, color: string): void;
    drawText(text: string, x: number, y: number, color: string): void;
    drawTextCentered(text: string, x: number, y: number, color: string): void;
    drawSprite(sprite: ImageData | HTMLImageElement, x: number, y: number, scale?: number, flipX?: boolean): void;
    setCamera(x: number, y: number): void;
    worldToScreen(worldX: number, worldY: number): { x: number, y: number };
}

// PixelArtRendererインターフェース（将来実装予定）
interface IPixelArtRenderer extends IRenderer {
    sprites: Map<string, any>;
    animations: Map<string, any>;
    
    hasSprite(key: string): boolean;
    getSprite(key: string): any;
    addSprite(key: string, sprite: any): void;
    playAnimation(key: string, frameTime: number): void;
}

// エンティティインターフェース
interface IEntity {
    x: number;
    y: number;
    width: number;
    height: number;
    vx: number;
    vy: number;
    active: boolean;
    collidable: boolean;
    physicsLayer?: string;
    
    update(deltaTime: number): void;
    render(renderer: IRenderer): void;
    getBounds(): { left: number, right: number, top: number, bottom: number };
    onCollision?(collisionInfo: { other: IEntity, side: string }): void;
}

// 物理システムインターフェース
interface IPhysicsSystem {
    gravity: number;
    entities: Set<IEntity>;
    tileMap: number[][];
    tileSize: number;
    
    addEntity(entity: IEntity, layer: string): void;
    removeEntity(entity: IEntity): void;
    update(): void;
    setTileMap(tileMap: number[][], tileSize: number): void;
}

// ゲーム状態インターフェース
interface IGameState {
    game: any;
    
    enter(params?: any): Promise<void>;
    update(deltaTime: number): void;
    render(renderer: IRenderer): void;
    exit(): void;
}

// 入力システムインターフェース
interface IInputSystem {
    keys: { [key: string]: boolean };
    mouse: { x: number, y: number, buttons: number[] };
    
    on(event: string, callback: Function): Function;
    off(event: string, callback: Function): void;
    isKeyPressed(key: string): boolean;
    isMouseButtonPressed(button: number): boolean;
}

// アセットローダーインターフェース
interface IAssetLoader {
    loadSprite(category: string, name: string, scale?: number): Promise<void>;
    loadAudio(name: string, url: string): Promise<void>;
    getSprite(key: string): any;
    getAudio(key: string): AudioBuffer | null;
}