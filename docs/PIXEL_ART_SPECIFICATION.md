# ピクセルアート資産仕様書

## 基本規格

### グリッドサイズ
- 基本単位: 8×8ピクセル
- すべてのスプライトサイズは8の倍数

### 標準スプライトサイズ
| カテゴリ | サイズ | 備考 |
|---------|--------|------|
| プレイヤー | 16×16 | アニメーション対応 |
| 小型敵 | 16×16 | スライム等 |
| 中型敵 | 16×16 | 鳥等 |
| アイテム | 8×8 | コイン等 |
| 地形タイル | 16×16 | タイリング対応 |
| ギミック | 16×16 | スプリング等 |
| 大型オブジェクト | 32×16以上 | 雲、ゴール旗等 |

## パレットシステム

### マスターパレット（52色）
レトロゲーム機の制限を模倣した52色のマスターパレットを使用。

```javascript
const MASTER_PALETTE = {
    // グレースケール (00-0F)
    0x00: '#000000',  // 純黒
    0x01: '#1C1C1C',
    0x02: '#393939',
    0x03: '#595959',
    0x04: '#797979',
    0x05: '#999999',
    0x06: '#B9B9B9',
    0x07: '#DCDCDC',
    0x08: '#FFFFFF',  // 純白
    
    // 赤系 (10-1A)
    0x10: '#B71C1C',  // 深紅
    0x11: '#D32F2F',
    0x12: '#F44336',
    0x13: '#FF5252',
    0x14: '#FF8A80',
    0x15: '#FFCDD2',
    
    // オレンジ系 (20-25)
    0x20: '#E65100',
    0x21: '#FF6F00',
    0x22: '#FF9800',
    0x23: '#FFB74D',
    0x24: '#FFE0B2',
    
    // 黄色系 (30-35)
    0x30: '#F57F17',
    0x31: '#F9A825',
    0x32: '#FFD600',
    0x33: '#FFEB3B',
    0x34: '#FFF59D',
    0x35: '#FFFDE7',
    
    // 緑系 (40-4A)
    0x40: '#1B5E20',
    0x41: '#2E7D32',
    0x42: '#388E3C',
    0x43: '#4CAF50',
    0x44: '#81C784',
    0x45: '#C8E6C9',
    
    // 青系 (50-5A)
    0x50: '#0D47A1',
    0x51: '#1976D2',
    0x52: '#2196F3',
    0x53: '#64B5F6',
    0x54: '#BBDEFB',
    0x55: '#E3F2FD',
    
    // 紫系 (60-65)
    0x60: '#4A148C',
    0x61: '#7B1FA2',
    0x62: '#9C27B0',
    0x63: '#BA68C8',
    0x64: '#E1BEE7'
};
```

### ステージ別パレット構成
各ステージで使用可能な4色×4パレット（計16色）を定義。

#### 草原ステージ
```javascript
const GRASSLAND_PALETTE = [
    ['#87CEEB', '#98D8C8', '#F7DC6F', '#FFFFFF'],  // 空・雲
    ['#8B4513', '#D2691E', '#F4A460', '#DEB887'],  // 地面・土
    ['#228B22', '#32CD32', '#7CFC00', '#ADFF2F'],  // 草・植物
    ['#FFD700', '#FFA500', '#FF6347', '#DC143C']   // アイテム・敵
];
```

#### 洞窟ステージ
```javascript
const CAVE_PALETTE = [
    ['#1C1C1C', '#2F4F4F', '#708090', '#A9A9A9'],  // 背景・岩
    ['#8B4513', '#A0522D', '#D2691E', '#DEB887'],  // 地面
    ['#4169E1', '#1E90FF', '#87CEEB', '#E0FFFF'],  // 水・氷
    ['#FFD700', '#FF4500', '#FF6347', '#DC143C']   // アイテム・敵
];
```

#### 雪原ステージ
```javascript
const SNOW_PALETTE = [
    ['#87CEEB', '#B0E0E6', '#E0FFFF', '#FFFFFF'],  // 空・雪
    ['#4682B4', '#5F9EA0', '#6495ED', '#7B68EE'],  // 氷・影
    ['#8B4513', '#A0522D', '#BC8F8F', '#D2B48C'],  // 木・建物
    ['#FFD700', '#FFA500', '#FF6347', '#FF1493']   // アイテム・敵
];
```

## スプライトデータ構造

### 個別スプライトJSON形式
```json
{
    "name": "player_idle",
    "width": 16,
    "height": 16,
    "description": "プレイヤー待機ポーズ",
    "data": [
        [0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0],
        [0,0,0,1,1,2,2,2,2,2,2,1,1,0,0,0],
        // ... 16行のピクセルデータ
    ]
}
```

### パレットインデックス
- 0: 透明
- 1-4: 各パレットの色インデックス

## アニメーション定義

### プレイヤーアニメーション
| 状態 | フレーム数 | ファイル名 | 持続フレーム |
|------|-----------|-----------|-------------|
| 待機 | 1 | idle.json | - |
| 歩行 | 2 | walk1.json, walk2.json | 各8フレーム |
| ジャンプ | 1 | jump.json | - |
| ダメージ | 1 | damage.json | - |

### 敵アニメーション
| キャラ | 状態 | フレーム数 | ファイル名 |
|--------|------|-----------|-----------|
| スライム | 移動 | 2 | slime_idle1.json, slime_idle2.json |
| 鳥 | 飛行 | 2 | bird_fly1.json, bird_fly2.json |

### アイテムアニメーション
| アイテム | フレーム数 | ファイル名 | 持続フレーム |
|---------|-----------|-----------|-------------|
| コイン | 4 | coin_spin1-4.json | 各10フレーム |
| スプリング | 2 | spring_idle.json, spring_pressed.json | - |

## ファイル構造

```
src/assets/sprites/
├── player/
│   ├── idle.json
│   ├── walk1.json
│   ├── walk2.json
│   ├── jump.json
│   └── damage.json
├── enemies/
│   ├── slime_idle1.json
│   ├── slime_idle2.json
│   ├── bird_fly1.json
│   └── bird_fly2.json
├── items/
│   ├── coin_spin1.json
│   ├── coin_spin2.json
│   ├── coin_spin3.json
│   └── coin_spin4.json
├── terrain/
│   ├── ground_tile.json
│   ├── grass_tile.json
│   ├── stone_tile.json
│   └── ice_tile.json
└── ui/
    ├── heart.json
    ├── heart_empty.json
    └── numbers/
        ├── 0.json
        └── ...
```

## 描画最適化

### スプライトキャッシング
```javascript
class SpriteCache {
    constructor() {
        this.cache = new Map();
    }
    
    getSprite(name, palette, scale = 1) {
        const key = `${name}_${palette}_${scale}`;
        
        if (!this.cache.has(key)) {
            const canvas = this.renderSprite(name, palette, scale);
            this.cache.set(key, canvas);
        }
        
        return this.cache.get(key);
    }
}
```

### バッチレンダリング
同一パレット・スケールのスプライトをまとめて描画:
```javascript
class SpriteBatcher {
    constructor() {
        this.batches = new Map();
    }
    
    addSprite(sprite, x, y, palette, scale) {
        const key = `${palette}_${scale}`;
        
        if (!this.batches.has(key)) {
            this.batches.set(key, []);
        }
        
        this.batches.get(key).push({ sprite, x, y });
    }
    
    flush(ctx) {
        for (const [key, sprites] of this.batches) {
            // バッチ描画処理
        }
        this.batches.clear();
    }
}
```

## タイリングシステム

### 地形タイルの自動接続
```javascript
const TILE_RULES = {
    GROUND: {
        center: 'ground_center',
        edges: {
            top: 'ground_top',
            bottom: 'ground_bottom',
            left: 'ground_left',
            right: 'ground_right'
        },
        corners: {
            topLeft: 'ground_corner_tl',
            topRight: 'ground_corner_tr',
            bottomLeft: 'ground_corner_bl',
            bottomRight: 'ground_corner_br'
        }
    }
};
```

## エフェクト仕様

### パーティクルエフェクト
```javascript
const PARTICLE_EFFECTS = {
    COIN_COLLECT: {
        count: 8,
        lifetime: 30,
        speed: 2,
        gravity: 0.1,
        colors: [0x33, 0x34] // 黄色系
    },
    ENEMY_DEFEAT: {
        count: 12,
        lifetime: 45,
        speed: 3,
        gravity: 0.2,
        colors: [0x13, 0x14] // 赤系
    }
};
```

## フォント仕様

### ピクセルフォント
- サイズ: 5×7ピクセル（内部データ）
- 表示サイズ: 8×8ピクセル（固定グリッド）
- 文字セット: A-Z、0-9、基本記号
- 実装: ビットマップフォント方式

### 使用例
```javascript
const pixelFont = new PixelFont();

// スコア表示
pixelFont.drawNumber(ctx, score, 6, 10, 10, 2, '#FFFFFF');

// テキスト表示
pixelFont.drawText(ctx, 'GAME OVER', 100, 50, 3, '#FF0000');
```

## レンダリングシステム

### グリッドベース配置
すべての描画要素は8×8ピクセルグリッドに基づいて配置されます。

#### テキスト描画のグリッド配置
```javascript
// PixelRendererでの実装
export const FONT = {
    SIZE: 8,     // 論理サイズ（ピクセル）
    FAMILY: "'Press Start 2P', monospace",
    GRID: 8      // 文字配置のグリッドサイズ
};

// テキスト描画時の自動グリッドスナップ
drawText(text, x, y, color = '#FFFFFF', alpha = 1) {
    // グリッドにスナップ
    const snappedX = Math.floor(x / FONT.GRID) * FONT.GRID;
    const snappedY = Math.floor(y / FONT.GRID) * FONT.GRID;
    // ...
}
```

#### グリッド配置の利点
1. **一貫性のある配置**: すべてのテキストが整列
2. **レトロゲーム風**: ファミコンのような固定幅フォント表現
3. **読みやすさ**: 文字間隔が一定で視認性向上

### スケーリングシステム
- ゲーム解像度: 256×240ピクセル（固定）
- 表示解像度: 768×720ピクセル（3倍スケール）
- すべての座標は論理座標で指定し、描画時に自動スケーリング

```javascript
// 論理座標での指定
renderer.drawText('HELLO', 16, 16);  // 16,16の位置に配置

// 実際の描画座標（3倍スケール）
// 画面上では 48,48 の位置に描画される
```

### ピクセルパーフェクト描画
```javascript
// アンチエイリアスを無効化
ctx.imageSmoothingEnabled = false;
ctx.mozImageSmoothingEnabled = false;
ctx.webkitImageSmoothingEnabled = false;
ctx.msImageSmoothingEnabled = false;
```

## ガイドライン

### ピクセルアート作成時の注意点
1. **アンチエイリアスを使用しない**
2. **限定されたパレットを守る**
3. **1ピクセルの重みを意識**
4. **シルエットを明確に**
5. **アニメーションは最小限のフレーム数で**

### 色の選択
- **明暗のコントラストを確保**
- **同系色でグラデーションを作る**
- **背景との視認性を考慮**

### 最適化のヒント
- **透明ピクセルを活用**してファイルサイズ削減
- **対称性を利用**して水平反転で済む場合は1方向のみ作成
- **タイルパターン**は継ぎ目が目立たないよう設計

## テキスト表示の制限

### 利用可能な文字
現在のピクセルフォントシステムでは以下の文字のみサポート：
- **数字**: 0-9
- **大文字アルファベット**: A-Z
- **記号**: スペース、ピリオド、コロン、ハイフン等の一部

### 非対応文字
- **小文字アルファベット**: 未実装
- **日本語**: ひらがな、カタカナ、漢字すべて未対応
- **特殊記号**: 多くの記号が未対応

### 文字使用時の注意
- ゲーム内のテキストはすべて大文字英語で記述
- ステージ名、メッセージ等もすべて大文字英語に統一
- 将来的な多言語対応を考慮した設計にする