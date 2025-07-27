# リソース設定システム

## 概要

リソース設定システムは、ゲームリソース（スプライト、キャラクター、音声、オブジェクト）を外部のJSONファイルで定義できるようにし、コードを変更することなくゲームアセットを簡単に修正できるようにします。

## 構造

すべてのリソース設定は `/src/config/` に配置されています：

```
/src/config/
├── resources/
│   ├── index.json       # メイン設定インデックス
│   ├── sprites.json     # スプライトとアニメーション定義
│   ├── audio.json       # 効果音と音楽の定義
│   └── physics.json     # システムレベルの物理設定
└── entities/            # 個別エンティティ設定
    ├── player.json
    ├── enemies/
    │   ├── slime.json
    │   ├── bat.json
    │   ├── spider.json
    │   └── armor_knight.json
    ├── items/
    │   └── coin.json
    ├── terrain/
    │   ├── spring.json
    │   ├── goal_flag.json
    │   └── falling_floor.json
    └── powerups/
        ├── power_glove.json
        └── shield_stone.json
```

> **注意**: `characters.json`と`objects.json`は廃止されました。すべてのエンティティ設定は`/src/config/entities/`以下の個別ファイルで管理されます。

## 設定ファイル

### index.json
他のすべての設定ファイルを参照し、グローバル設定を含むメインインデックスファイル。

```json
{
  "version": "1.0.0",
  "configs": {
    "sprites": "./sprites.json",
    "audio": "./audio.json"
  },
  "paths": {
    "sprites": "/src/assets/sprites/",
    "levels": "/src/levels/data/",
    "fonts": "/src/assets/fonts/"
  },
  "settings": {
    "defaultPalette": "default",
    "pixelSize": 16,
    "tileSize": 16
  }
}
```

### sprites.json
ゲーム内のすべてのスプライトとアニメーションをカテゴリ別に定義。

```json
{
  "categories": {
    "player": {
      "sprites": [
        { "name": "idle", "type": "static" }
      ],
      "animations": [
        { "name": "walk", "frameCount": 4, "frameDuration": 100 },
        { "name": "jump", "frameCount": 2, "frameDuration": 200 }
      ]
    }
  }
}
```

### エンティティ設定ファイル
各エンティティの物理プロパティ、ステータス、動作設定を個別ファイルで管理。

- **player.json** - プレイヤーキャラクターの設定
- **enemies/** - 敵キャラクターの設定ディレクトリ
  - slime.json, bat.json, spider.json, armor_knight.json
- **items/** - アイテムの設定ディレクトリ
  - coin.json
- **terrain/** - 地形オブジェクトの設定ディレクトリ
  - spring.json, goal_flag.json, falling_floor.json
- **powerups/** - パワーアップアイテムの設定ディレクトリ
  - power_glove.json, shield_stone.json

### audio.json
BGMと効果音をそのプロパティとともに定義。

```json
{
  "bgm": {
    "title": {
      "type": "loop",
      "tempo": 120,
      "volume": 0.3
    }
  },
  "sfx": {
    "jump": {
      "type": "effect",
      "waveform": "square",
      "frequency": {
        "start": 440,
        "end": 880
      },
      "duration": 0.1,
      "volume": 0.3
    }
  }
}
```


## 使用方法

### ResourceLoader

`ResourceLoader` クラスはすべてのリソース設定へのアクセスを提供します：

```typescript
import { ResourceLoader } from '../config/ResourceLoader';

// シングルトンインスタンスを取得
const resourceLoader = ResourceLoader.getInstance();

// 初期化（すべての設定を読み込み）
await resourceLoader.initialize();

// 新しい個別エンティティ設定を取得（推奨）
const playerConfig = resourceLoader.getEntityConfigSync('player');
const coinConfig = resourceLoader.getEntityConfigSync('items', 'coin');
const slimeConfig = resourceLoader.getEntityConfigSync('enemies', 'slime');

// 音声設定を取得
const jumpSound = resourceLoader.getAudioConfig('sfx', 'jump');
```

### エンティティでの自動読み込み

エンティティは作成時に自動的に設定を読み込みます：

```typescript
// プレイヤーはコンストラクタで設定を読み込む
const player = new Player(x, y);
// src/config/entities/player.jsonの値を自動的に使用

// コインはコンストラクタで設定を読み込む  
const coin = new Coin(x, y);
// src/config/entities/items/coin.jsonの値を自動的に使用

// 敵キャラクターも同様
const slime = new Slime(x, y);
// src/config/entities/enemies/slime.jsonの値を自動的に使用
```

## 新しいリソースの追加

### 新しいエンティティを追加する場合

1. **エンティティ設定ファイルを作成** `/src/config/entities/[type]/[name].json`
2. **スプライトファイルを追加** `/src/assets/sprites/[category]/` へ
3. **sprites.jsonを更新** スプライト/アニメーション定義を追加
4. **ResourceLoaderのpreloadEntityConfigs()に追加** 新しいエンティティタイプを登録
5. **bundledData.tsを更新** 新しい設定ファイルをインポート
6. **TypeScript型定義を追加** `ResourceConfig.ts`に必要に応じて新しいインターフェースを追加
7. **エンティティクラスを作成** 設定を読み込むコンストラクタを実装

### 型安全性

エンティティ設定は型安全に管理されています：

```typescript
// BaseItemConfigを継承して新しいアイテムタイプを定義
export interface NewItemConfig extends BaseItemConfig {
  properties: {
    // 具体的なプロパティを定義
    customValue: number;
    specialFlag: boolean;
  };
  sprites: BaseItemConfig['sprites'] & {
    // スプライト固有の設定
    animation?: {
      name: string;
      frameCount: number;
      frameDuration: number;
    };
  };
}

// ItemConfig型に追加
export type ItemConfig = CoinConfig | SpringConfig | ... | NewItemConfig;
```

## メリット

- **簡単なカスタマイズ**: コーディングなしでゲームバランス、物理、ビジュアルを変更
- **MODサポート**: 外部設定によりMOD作成が簡単
- **迅速な反復**: 異なる値を素早くテスト
- **バージョン管理**: 設定の変更をコードとは別に追跡
- **ローカライズ対応**: 複数言語への拡張が容易

## ベストプラクティス

1. **設定ファイルを唯一の情報源に**: すべての初期値は設定ファイルで管理し、コード内にフォールバック値を持たせない
2. **値を検証**: 妥当な範囲をチェック（例：health > 0）
3. **プロパティを文書化**: JSONファイルに値を説明するコメントを追加
4. **変更をテスト**: 設定変更後もゲームが動作することを確認
5. **設定をバージョン管理**: 破壊的変更を行う際はバージョン番号を更新
6. **エラーハンドリング**: 設定が見つからない場合は明示的にエラーを投げる