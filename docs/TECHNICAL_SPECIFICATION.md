# 技術仕様書 - コインハンターアドベンチャー

## アーキテクチャ概要

### 基本設計思想
- **Entity-Component-System (ECS)** パターンの簡易実装
- **ゲームループ** による一定フレームレート処理
- **Canvas API** を使用した2D描画
- **レスポンシブデザイン** 対応

## コア設計

### ゲームループ
```javascript
// 60FPSを目標とした固定タイムステップ
const FPS = 60;
const FRAME_TIME = 1000 / FPS;

function gameLoop() {
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
```javascript
const PHYSICS = {
    GRAVITY: 0.65,
    MAX_FALL_SPEED: 15,
    FRICTION: 0.85,
    AIR_RESISTANCE: 0.98
};
```

### 移動処理
```javascript
// 速度に基づく位置更新
entity.x += entity.velX;
entity.y += entity.velY;

// 重力適用
if (!entity.onGround) {
    entity.velY += PHYSICS.GRAVITY;
    entity.velY = Math.min(entity.velY, PHYSICS.MAX_FALL_SPEED);
}

// 摩擦適用
if (entity.onGround) {
    entity.velX *= PHYSICS.FRICTION;
}
```

### 当たり判定

#### 矩形同士の衝突判定
```javascript
function checkCollision(a, b) {
    return a.x < b.x + b.width &&
           a.x + a.width > b.x &&
           a.y < b.y + b.height &&
           a.y + a.height > b.y;
}
```

#### プラットフォーム判定（一方通行）
```javascript
function checkPlatformCollision(player, platform) {
    // 前フレームで上にいて、現在重なっている場合のみ
    if (player.prevY + player.height <= platform.y &&
        player.y + player.height > platform.y &&
        player.x + player.width > platform.x &&
        player.x < platform.x + platform.width) {
        // プラットフォームの上に配置
        player.y = platform.y - player.height;
        player.velY = 0;
        player.onGround = true;
    }
}
```

## エンティティシステム

### 基底クラス設計
```javascript
class Entity {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.velX = 0;
        this.velY = 0;
        this.onGround = false;
        this.active = true;
    }
    
    update() {
        // 物理演算適用
    }
    
    render(ctx, camera) {
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
```javascript
class Animation {
    constructor(frames, frameDuration) {
        this.frames = frames;
        this.frameDuration = frameDuration;
        this.currentFrame = 0;
        this.frameTimer = 0;
    }
    
    update() {
        this.frameTimer++;
        if (this.frameTimer >= this.frameDuration) {
            this.frameTimer = 0;
            this.currentFrame = (this.currentFrame + 1) % this.frames.length;
        }
    }
    
    getCurrentFrame() {
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
```javascript
class Camera {
    constructor(width, height, worldWidth, worldHeight) {
        this.x = 0;
        this.y = 0;
        this.width = width;
        this.height = height;
        this.worldWidth = worldWidth;
        this.worldHeight = worldHeight;
    }
    
    follow(target) {
        // プレイヤーを中心に配置
        this.x = target.x + target.width / 2 - this.width / 2;
        this.y = target.y + target.height / 2 - this.height / 2;
        
        // ワールド境界でクランプ
        this.x = Math.max(0, Math.min(this.x, this.worldWidth - this.width));
        this.y = Math.max(0, Math.min(this.y, this.worldHeight - this.height));
    }
}
```

### 視錐台カリング
画面外のオブジェクトは処理をスキップ:
```javascript
function isInView(entity, camera) {
    return entity.x + entity.width > camera.x &&
           entity.x < camera.x + camera.width &&
           entity.y + entity.height > camera.y &&
           entity.y < camera.y + camera.height;
}
```

## ステージデータ構造

### JSONフォーマット
```json
{
    "name": "Stage 1-1",
    "width": 3000,
    "height": 576,
    "timeLimit": 300,
    "playerSpawn": { "x": 100, "y": 300 },
    "goal": { "x": 2800, "y": 400 },
    "platforms": [
        { "x": 0, "y": 500, "width": 3000, "height": 76 }
    ],
    "enemies": [
        { "type": "slime", "x": 500, "y": 450 },
        { "type": "bird", "x": 800, "y": 200 }
    ],
    "coins": [
        { "x": 300, "y": 400 },
        { "x": 350, "y": 400 }
    ],
    "springs": [
        { "x": 1000, "y": 460 }
    ]
}
```

### ステージローダー
```javascript
async function loadStage(stagePath) {
    const response = await fetch(stagePath);
    const stageData = await response.json();
    return createStageFromData(stageData);
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
```javascript
// オブジェクトプールの例
class ObjectPool {
    constructor(createFn, resetFn, initialSize = 10) {
        this.createFn = createFn;
        this.resetFn = resetFn;
        this.pool = [];
        
        for (let i = 0; i < initialSize; i++) {
            this.pool.push(this.createFn());
        }
    }
    
    get() {
        if (this.pool.length > 0) {
            return this.pool.pop();
        }
        return this.createFn();
    }
    
    release(obj) {
        this.resetFn(obj);
        this.pool.push(obj);
    }
}
```

## 入力システム

### キーボード入力管理
```javascript
class InputManager {
    constructor() {
        this.keys = {};
        this.previousKeys = {};
        
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }
    
    update() {
        this.previousKeys = { ...this.keys };
    }
    
    isPressed(key) {
        return this.keys[key] || false;
    }
    
    isJustPressed(key) {
        return this.keys[key] && !this.previousKeys[key];
    }
}
```

### タッチ/マウス対応
- 画面左半分タップ: 左移動
- 画面右半分タップ: 右移動
- 画面上部タップ: ジャンプ

## サウンドシステム

### Web Audio API使用
```javascript
class SoundManager {
    constructor() {
        this.context = new AudioContext();
        this.sounds = new Map();
        this.musicVolume = 0.5;
        this.sfxVolume = 0.7;
    }
    
    async loadSound(name, url) {
        const response = await fetch(url);
        const buffer = await response.arrayBuffer();
        const audioBuffer = await this.context.decodeAudioData(buffer);
        this.sounds.set(name, audioBuffer);
    }
    
    play(name, loop = false) {
        const source = this.context.createBufferSource();
        const gainNode = this.context.createGain();
        
        source.buffer = this.sounds.get(name);
        source.loop = loop;
        gainNode.gain.value = this.sfxVolume;
        
        source.connect(gainNode);
        gainNode.connect(this.context.destination);
        source.start();
        
        return source;
    }
}
```

## エラーハンドリング

### グレースフルデグラデーション
- 音声読み込み失敗時: サイレントモードで継続
- テクスチャ読み込み失敗時: プレースホルダー表示
- ステージデータ破損時: エラーメッセージ表示

### デバッグ機能
```javascript
const DEBUG = {
    SHOW_HITBOX: false,
    SHOW_FPS: true,
    INVINCIBLE: false,
    STAGE_SELECT: true
};
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
- **ビルドツール**: Webpack/Vite
- **テストランナー**: Jest
- **リンター**: ESLint

### パフォーマンス計測
```javascript
class PerformanceMonitor {
    constructor() {
        this.fps = 0;
        this.frameCount = 0;
        this.lastTime = performance.now();
    }
    
    update() {
        this.frameCount++;
        const currentTime = performance.now();
        
        if (currentTime - this.lastTime >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastTime = currentTime;
        }
    }
}
```