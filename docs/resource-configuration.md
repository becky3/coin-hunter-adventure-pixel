# リソース設定システム

## 概要

リソース設定システムは、ゲームリソース（スプライト、キャラクター、音声、オブジェクト）を外部のJSONファイルで定義できるようにし、コードを変更することなくゲームアセットを簡単に修正できるようにします。

## 構造

すべてのリソース設定は `/src/config/resources/` に配置されています：

```
/src/config/resources/
├── index.json       # メイン設定インデックス
├── sprites.json     # スプライトとアニメーション定義
├── characters.json  # キャラクターのステータスと物理設定
├── audio.json       # 効果音と音楽の定義
└── objects.json     # ゲームオブジェクトの設定
```

## 設定ファイル

### index.json
他のすべての設定ファイルを参照し、グローバル設定を含むメインインデックスファイル。

```json
{
  "version": "1.0.0",
  "configs": {
    "sprites": "./sprites.json",
    "characters": "./characters.json",
    "audio": "./audio.json",
    "objects": "./objects.json"
  },
  "paths": {
    "sprites": "/src/assets/sprites/",
    "levels": "/src/levels/data/"
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

### characters.json
すべてのキャラクターの物理プロパティ、ステータス、動作設定を含む。

```json
{
  "player": {
    "main": {
      "physics": {
        "width": 16,
        "height": 16,
        "speed": 1.17,
        "jumpPower": 10
      },
      "stats": {
        "maxHealth": 3,
        "invulnerabilityTime": 2000
      }
    }
  },
  "enemies": {
    "slime": {
      "physics": {
        "width": 16,
        "height": 16,
        "moveSpeed": 0.25,
        "jumpHeight": 5
      },
      "stats": {
        "maxHealth": 1,
        "damage": 1
      }
    }
  }
}
```

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

### objects.json
コイン、スプリング、ゴールなどのインタラクティブなゲームオブジェクトの設定。

```json
{
  "items": {
    "coin": {
      "physics": {
        "width": 16,
        "height": 16,
        "solid": false
      },
      "properties": {
        "scoreValue": 10,
        "floatSpeed": 0.03,
        "floatAmplitude": 0.1
      }
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

// 特定の設定を取得
const playerConfig = resourceLoader.getCharacterConfig('player', 'main');
const coinConfig = resourceLoader.getObjectConfig('items', 'coin');
const jumpSound = resourceLoader.getAudioConfig('sfx', 'jump');
```

### エンティティでの自動読み込み

エンティティは作成時に自動的に設定を読み込みます：

```typescript
// プレイヤーはコンストラクタで設定を読み込む
const player = new Player(x, y);
// characters.jsonの値を自動的に使用

// コインはコンストラクタで設定を読み込む  
const coin = new Coin(x, y);
// objects.jsonの値を自動的に使用
```

## 新しいリソースの追加

1. **スプライトファイルを追加** `/src/assets/sprites/[category]/` へ
2. **sprites.jsonを更新** スプライト/アニメーション定義を追加
3. **関連する設定ファイルを更新** (characters.json、objects.jsonなど)
4. **コード変更は不要** - エンティティは自動的に新しい値を使用

## メリット

- **簡単なカスタマイズ**: コーディングなしでゲームバランス、物理、ビジュアルを変更
- **MODサポート**: 外部設定によりMOD作成が簡単
- **迅速な反復**: 異なる値を素早くテスト
- **バージョン管理**: 設定の変更をコードとは別に追跡
- **ローカライズ対応**: 複数言語への拡張が容易

## ベストプラクティス

1. **常にデフォルト値を提供**: 設定が失敗した場合のフォールバック値をエンティティに持たせる
2. **値を検証**: 妥当な範囲をチェック（例：health > 0）
3. **プロパティを文書化**: JSONファイルに値を説明するコメントを追加
4. **変更をテスト**: 設定変更後もゲームが動作することを確認
5. **設定をバージョン管理**: 破壊的変更を行う際はバージョン番号を更新