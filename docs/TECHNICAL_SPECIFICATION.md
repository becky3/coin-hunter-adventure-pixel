# 技術仕様書 - コインハンターアドベンチャー

## アーキテクチャ概要

### 基本設計思想
- **Entity-Component-System (ECS)** パターンの簡易実装
- **ゲームループ** による一定フレームレート処理
- **Canvas API** を使用した2D描画
- **レスポンシブデザイン** 対応

## コア設計

### ゲームループ
```typescript
// 60FPSを目標とした固定タイムステップ
const FPS = 60;
const FRAME_TIME = 1000 / FPS;

function gameLoop(): void {
    update();  // ロジック更新
    render();  // 描画処理
    requestAnimationFrame(gameLoop);
}
```

### 座標系
- 原点: Canvas左上 (0, 0)
- X軸: 右方向が正
- Y軸: 下方向が正
- 単位: ピクセル

## 物理演算システム

### 基本パラメータ
```typescript
const PHYSICS = {
    GRAVITY: 0.65,
    MAX_FALL_SPEED: 15,
    FRICTION: 0.85,
    AIR_RESISTANCE: 0.98
} as const;
```

### 移動処理
```typescript
// 速度に基づく位置更新
entity.x += entity.vx;
entity.y += entity.vy;

// 重力適用
if (!entity.grounded) {
    entity.vy += PHYSICS.GRAVITY;
    entity.vy = Math.min(entity.vy, PHYSICS.MAX_FALL_SPEED);
}

// 摩擦適用
if (entity.grounded) {
    entity.vx *= PHYSICS.FRICTION;
}
```

### 当たり判定

#### 矩形同士の衝突判定
```typescript
function checkCollision(a: Bounds, b: Bounds): boolean {
    return a.x < b.x + b.width &&
           a.x + a.width > b.x &&
           a.y < b.y + b.height &&
           a.y + a.height > b.y;
}

interface Bounds {
    x: number;
    y: number;
    width: number;
    height: number;
}
```

#### プラットフォーム判定（一方通行）
```typescript
function checkPlatformCollision(player: Player, platform: Entity): void {
    // 前フレームで上にいて、現在重なっている場合のみ
    if (player.prevY + player.height <= platform.y &&
        player.y + player.height > platform.y &&
        player.x + player.width > platform.x &&
        player.x < platform.x + platform.width) {
        // プラットフォームの上に配置
        player.y = platform.y - player.height;
        player.vy = 0;
        player.grounded = true;
    }
}
```

## エンティティシステム

### 基底クラス設計
```typescript
export class Entity {
    public id: number;
    public x: number;
    public y: number;
    public width: number;
    public height: number;
    public vx: number = 0;
    public vy: number = 0;
    public grounded: boolean = false;
    public active: boolean = true;
    
    constructor(x: number, y: number, width: number, height: number) {
        this.id = ++entityIdCounter;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }
    
    update(deltaTime: number): void {
        // 物理演算適用
    }
    
    render(renderer: PixelRenderer): void {
        // 描画処理
    }
}
```

### エンティティ種別
1. **Player** - プレイヤーキャラクター
2. **Enemy** - 敵キャラクター（スライム、鳥）
3. **Collectible** - 収集アイテム（コイン）
4. **Platform** - 足場
5. **Gimmick** - ギミック（スプリング、ゴール）

## アニメーションシステム

### フレームベースアニメーション
```typescript
interface AnimationFrame {
    spriteKey: string;
    duration: number;
}

class Animation {
    private frames: AnimationFrame[];
    private frameDuration: number;
    private currentFrame: number = 0;
    private frameTimer: number = 0;
    
    constructor(frames: AnimationFrame[], frameDuration: number) {
        this.frames = frames;
        this.frameDuration = frameDuration;
    }
    
    update(): void {
        this.frameTimer++;
        if (this.frameTimer >= this.frameDuration) {
            this.frameTimer = 0;
            this.currentFrame = (this.currentFrame + 1) % this.frames.length;
        }
    }
    
    getCurrentFrame(): AnimationFrame {
        return this.frames[this.currentFrame];
    }
}
```

### アニメーション定義
- **アイドル**: 2フレーム、各30フレーム持続
- **歩行**: 4フレーム、各8フレーム持続
- **ジャンプ**: 1フレーム（静止画）
- **コイン回転**: 4フレーム、各10フレーム持続

## カメラシステム

### スクロール制御
```typescript
interface Camera {
    x: number;
    y: number;
    width: number;
    height: number;
    worldWidth: number;
    worldHeight: number;
    
    follow(target: Entity): void;
}

// PlayState内で実装されているカメラロジック
function updateCamera(camera: Camera, target: Entity): void {
    // プレイヤーを中心に配置
    camera.x = target.x + target.width / 2 - camera.width / 2;
    camera.y = target.y + target.height / 2 - camera.height / 2;
    
    // ワールド境界でクランプ
    camera.x = Math.max(0, Math.min(camera.x, camera.worldWidth - camera.width));
    camera.y = Math.max(0, Math.min(camera.y, camera.worldHeight - camera.height));
}
```

### 視錐台カリング
画面外のオブジェクトは処理をスキップ:
```typescript
function isInView(entity: Entity, camera: Camera): boolean {
    return entity.x + entity.width > camera.x &&
           entity.x < camera.x + camera.width &&
           entity.y + entity.height > camera.y &&
           entity.y < camera.y + camera.height;
}
```

## レンダリングシステム

### 画面解像度
```typescript
// ゲーム画面の解像度設定
export const GAME_RESOLUTION = {
    WIDTH: 256,  // ゲーム画面の幅（ピクセル）
    HEIGHT: 240  // ゲーム画面の高さ（ピクセル）
} as const;

// 表示設定
export const DISPLAY = {
    SCALE: 3,  // 3倍に拡大表示（768x720）
    OUTER_FRAME: {
        ENABLED: true,
        BACKGROUND_COLOR: '#1a1a1a',
        BORDER_COLOR: '#333333',
        BORDER_WIDTH: 2
    }
} as const;
```

### PixelRenderer
ピクセルパーフェクトな描画を実現するレンダリングクラス:

```typescript
export class PixelRenderer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    public scale: number = 1;
    
    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Failed to get 2D context');
        
        this.ctx = ctx;
        
        // ピクセルアートのためアンチエイリアスを無効化
        this.ctx.imageSmoothingEnabled = false;
    }
}
```

### ビットマップフォントシステム
独自のビットマップフォントシステムを実装:

```typescript
// pixelFont.tsで実装されたビットマップフォント
// サポート文字: A-Z, 0-9, 一部記号
// 大文字英語のみ対応（小文字、日本語不可）

export function drawText(
    renderer: PixelRenderer,
    text: string,
    x: number,
    y: number,
    color: string = '#FFFFFF'
): void {
    // PixelRendererとpixelFontを使用して描画
}
```

### 座標系とスケーリング
- **論理座標**: 256×240ピクセルのゲーム内座標
- **物理座標**: 768×720ピクセルの実際の描画座標
- すべての座標計算は論理座標で行い、描画時に自動的にスケーリング

```typescript
// 例: 論理座標 (10, 20) に描画
renderer.drawSprite('player_idle', 10, 20);
// → 実際には (30, 60) の位置に3倍サイズで描画される
```

## ステージデータ構造

### JSONフォーマット
```json
{
    "name": "Stage 1-1",
    "width": 3000,
    "height": 240,
    "timeLimit": 300,
    "playerSpawn": { "x": 100, "y": 150 },
    "goal": { "x": 2800, "y": 150 },
    "platforms": [
        { "x": 0, "y": 200, "width": 3000, "height": 40 }
    ],
    "enemies": [
        { "type": "slime", "x": 500, "y": 180 },
        { "type": "bird", "x": 800, "y": 100 }
    ],
    "coins": [
        { "x": 300, "y": 150 },
        { "x": 350, "y": 150 }
    ],
    "springs": [
        { "x": 1000, "y": 180 }
    ]
}
```

### ステージローダー
```typescript
async function loadStage(stagePath: string): Promise<LevelData> {
    const response = await fetch(stagePath);
    const stageData = await response.json();
    return stageData as LevelData;
}

interface LevelData {
    name: string;
    width: number;
    height: number;
    // ... その他のプロパティ
}
```

## パフォーマンス最適化

### 描画最適化
1. **ダブルバッファリング**: `requestAnimationFrame`使用
2. **視錐台カリング**: 画面外オブジェクトの描画スキップ
3. **レイヤー分離**: 背景、ゲームオブジェクト、UIを別々に管理
4. **スプライトバッチング**: 同種のスプライトをまとめて描画

### ロジック最適化
1. **空間分割**: グリッドベースの衝突判定
2. **オブジェクトプール**: 頻繁に生成・破棄されるオブジェクトの再利用
3. **早期リターン**: 不要な処理の早期スキップ

### メモリ管理
```typescript
// オブジェクトプールの例
class ObjectPool<T> {
    private createFn: () => T;
    private resetFn: (obj: T) => void;
    private pool: T[] = [];
    
    constructor(
        createFn: () => T,
        resetFn: (obj: T) => void,
        initialSize: number = 10
    ) {
        this.createFn = createFn;
        this.resetFn = resetFn;
        
        for (let i = 0; i < initialSize; i++) {
            this.pool.push(this.createFn());
        }
    }
    
    get(): T {
        if (this.pool.length > 0) {
            return this.pool.pop()!;
        }
        return this.createFn();
    }
    
    release(obj: T): void {
        this.resetFn(obj);
        this.pool.push(obj);
    }
}
```

## 入力システム

### キーボード入力管理
```typescript
export class InputSystem {
    private keys: Map<string, boolean> = new Map();
    private previousKeys: Map<string, boolean> = new Map();
    
    constructor() {
        window.addEventListener('keydown', (e: KeyboardEvent) => {
            if (!e.repeat) {
                this.keys.set(e.code, true);
            }
        });
        
        window.addEventListener('keyup', (e: KeyboardEvent) => {
            this.keys.set(e.code, false);
        });
    }
    
    update(): void {
        this.previousKeys = new Map(this.keys);
    }
    
    isPressed(key: string): boolean {
        return this.keys.get(key) || false;
    }
    
    isJustPressed(key: string): boolean {
        return this.keys.get(key) === true && 
               this.previousKeys.get(key) !== true;
    }
}
```

### タッチ/マウス対応
- 画面左半分タップ: 左移動
- 画面右半分タップ: 右移動
- 画面上部タップ: ジャンプ

## サウンドシステム

### Web Audio API使用
```typescript
// MusicSystem.tsで実装されたプログラマブル音源
// Wave形式でBGM、効果音を生成
export class MusicSystem {
    private audioContext: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    public isInitialized: boolean = false;
    
    async init(): Promise<boolean> {
        // ユーザー操作後に初期化が必要
    }
    
    playJumpSound(): void {
        // ジャンプ効果音
    }
    
    playTitleBGM(): void {
        // タイトルBGM
    }
}
```

## エラーハンドリング

### グレースフルデグラデーション
- 音声読み込み失敗時: サイレントモードで継続
- テクスチャ読み込み失敗時: プレースホルダー表示
- ステージデータ破損時: エラーメッセージ表示

### デバッグ機能
```typescript
const DEBUG = {
    SHOW_HITBOX: false,
    SHOW_FPS: true,
    INVINCIBLE: false,
    STAGE_SELECT: true
} as const;
```

## ブラウザ互換性

### 対応ブラウザ
- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

### ポリフィル対応
- `requestAnimationFrame`
- `Array.from`
- `Object.assign`

## セキュリティ考慮事項

1. **XSS対策**: ユーザー入力のサニタイズ
2. **CORS対応**: 適切なヘッダー設定
3. **ローカルストレージ**: スコアデータの暗号化
4. **チート対策**: クライアントサイド検証の限界を理解

## 開発環境設定

### 推奨ツール
- **エディタ**: VSCode
- **デバッガー**: Chrome DevTools
- **バージョン管理**: Git
- **ビルドツール**: Vite
- **テストランナー**: Puppeteer
- **リンター**: ESLint (TypeScript対応)
- **言語**: TypeScript

### パフォーマンス計測
```typescript
class PerformanceMonitor {
    private fps: number = 0;
    private frameCount: number = 0;
    private lastTime: number = performance.now();
    
    update(): void {
        this.frameCount++;
        const currentTime = performance.now();
        
        if (currentTime - this.lastTime >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastTime = currentTime;
        }
    }
    
    getFPS(): number {
        return this.fps;
    }
}
```