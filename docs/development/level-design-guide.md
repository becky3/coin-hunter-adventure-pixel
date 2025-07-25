# レベルデザインガイド

このドキュメントでは、Stage 2の開発で得られたレベルデザインの知見をまとめます。

## 基本原則

### 1. 難易度の段階的上昇
- ステージの序盤は簡単に、徐々に難しくする
- 新しいギミックは安全な環境で最初に紹介する
- プレイヤーが学習できる余裕を与える

### 2. リスクとリワードのバランス
- 危険なルートには価値のあるアイテムを配置
- 安全なルートも必ず用意する
- プレイヤーに選択肢を与える

### 3. ビジュアルコミュニケーション
- 危険な場所は見た目で分かるようにする
- 底なし穴は明確に識別できるようにする
- ギミックの機能は見た目から推測できるようにする

## FallingFloorの設計

### 基本ルール
1. **必ずペアで配置**
   - 単独のFallingFloorは難易度が高すぎる
   - 最低2つ並べることで渡りやすくする

2. **底なし穴の配置**
   - FallingFloorの下は底なし穴にする
   - より広いエリアで穴を作ることでドラマチックな演出に
   - ただし、デザイン上必要な場合は浅い穴でも可

3. **エリア設計の例**
   ```
   地面: ===  FallingFloor: FF  穴: ___
   
   良い例：
   ===FF FF___________FF FF===
   
   悪い例：
   ===FF___FF___FF___FF===  （単独が多すぎる）
   ```

### 実装例（Stage 2-2）
```javascript
// FallingFloorグループと底なし穴エリア
const pitAreas = [
    { startX: 68, endX: 84, startY: 4, endY: 13 },   // グループ1
    { startX: 93, endX: 117, startY: 4, endY: 13 },  // グループ3（最大）
    // ...
];
```

## エリア分割によるステージ構成

### Stage 2-2の5エリア構成例

1. **導入エリア（x:0-50）**
   - 基本的なジャンプとFallingFloorの紹介
   - 安全な配置で練習できる

2. **上昇エリア（x:50-70）**
   - ジャンプ台を使った垂直移動
   - 高所のコイン収集

3. **大穴エリア（x:70-120）**
   - 最大の底なし穴ゾーン
   - FallingFloorの連続配置
   - メインチャレンジ

4. **連続エリア（x:120-170）**
   - 長いFallingFloorの連続
   - リズムゲーム的な要素

5. **最終エリア（x:170-200）**
   - 高低差のあるFallingFloor配置
   - 総合的なスキルチェック

## 敵の配置

### 基本ルール
1. **コウモリ（bat）**
   - y=1に配置（天井から1つ下）
   - 横移動の妨害役

2. **クモ（spider）**
   - 地面や足場に配置
   - ジャンプタイミングを難しくする

3. **配置の間隔**
   - 敵同士は適度に離す
   - プレイヤーが対処できる密度に

## アイテム配置

### コインの配置パターン
1. **基本配置**
   - 3個セットが基本
   - ジャンプで取れる高さに

2. **リスク配置**
   - FallingFloorの上
   - 敵の近く
   - 分岐ルートの先

3. **配置の注意点**
   - FallingFloorと同じ座標に置かない
   - 埋まらないように注意

## バリデーションテストの活用

### チェック項目
1. **エラー（必須修正）**
   - エンティティの埋まり
   - 無効なエンティティタイプ
   - スポーン/ゴール位置の問題

2. **警告（要確認）**
   - 浮いているエンティティ
   - 到達不可能なアイテム

3. **推奨事項（デザイン提案）**
   - FallingFloorの下の穴の深さ
   - 底なし穴の推奨

### テストコマンド
```bash
cd tests/e2e
node test-stage-validation.cjs
```

## デバッグとテスト

### ステージ個別テスト
特定のステージだけをテストしたい場合：
```bash
# stage2-2-check.cjsのような個別テストファイルを作成
mv test-stage2-2.cjs stage2-2-check.cjs  # 自動実行から除外
node stage2-2-check.cjs  # 手動実行
```

### ログの確認
```bash
ls -la tests/logs/ | tail -10
```

## まとめ

良いレベルデザインは：
- プレイヤーに学習の機会を与える
- 適切な難易度カーブを持つ
- 視覚的に分かりやすい
- 複数の攻略ルートがある
- テストで検証されている

これらの原則を守ることで、楽しくて公平なステージが作成できます。