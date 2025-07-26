# ステージ作成ガイド

このドキュメントでは、新しいステージを作成する際の手順とベストプラクティスを説明します。

## ステージデータの構造

ステージデータは `src/levels/data/` ディレクトリにJSONファイルとして保存されます。

### 基本構造

```json
{
  "id": "stage1-1",
  "name": "STAGE 1-1", 
  "stageType": "grassland",
  "width": 200,
  "height": 15,
  "tileSize": 16,
  "backgroundColor": 1,
  "playerSpawn": { "x": 2, "y": 11 },
  "goal": { "x": 197, "y": 11 },
  "timeLimit": 300,
  "tilemap": [...],
  "tileTypes": {
    "0": "empty",
    "1": "ground",
    "2": "spike"
  },
  "entities": [...]
}
```

## エンティティタイプ

使用可能なエンティティタイプ（EntityFactoryで認識される正しい名前）：

- `coin` - コイン
- `spring` - ジャンプ台
- `falling_floor` - 落ちる床（`fallingfloor`ではない）
- `goal` - ゴール
- `slime` - スライム
- `bat` - コウモリ
- `spider` - クモ
- `armor_knight` - アーマーナイト（`armorKnight`ではない）
- `shield_stone` - シールドストーン（`shieldstone`ではない）
- `power_glove` - パワーグローブ（`powerglove`ではない）

## ステージタイプとパレット

現在定義されているステージタイプ：
- `grassland` - 草原
- `cave` - 洞窟
- `snow` - 雪原

各ステージタイプに対応するパレットが `src/renderer/pixelArtPalette.ts` に定義されている必要があります。

## 座標系について

### エンティティの座標系
- **左下原点**（y=0が最下部）
- プレイヤーのスポーン位置は足元の座標

### タイルマップの座標系
- **左上原点**（y=0が最上部）
- バリデーションテストではこの違いに注意

## ステージ作成の手順

1. **ステージファイルの作成**
   - `src/levels/data/stage{world}-{level}.json` を作成
   - 基本構造をコピーして必要な値を設定

2. **タイルマップの設計**
   - 高さ15、幅は適切に設定（通常150-250）
   - 0: 空、1: ブロック、2: スパイク

3. **エンティティの配置**
   - 座標は左下原点で指定
   - 適切な間隔で配置

4. **バリデーションテストの実行**
   ```bash
   cd tests/e2e
   node test-stage-validation.cjs
   ```

5. **動作確認**
   - 開発サーバーで実際にプレイして確認

## よくあるエラーと解決方法

### エンティティタイプのエラー
- `fallingfloor` → `falling_floor`
- `shieldstone` → `shield_stone`
- `powerglove` → `power_glove`

### 座標系の混乱
- エンティティは左下原点
- タイルマップは左上原点

### パレットエラー
- 新しいステージタイプを追加する場合は、対応するパレットも定義する

## 関連ドキュメント

- [レベルデザインガイド](./level-design-guide.md) - ステージ設計の詳細な知見
- [テストガイド](./testing.md) - バリデーションテストの詳細