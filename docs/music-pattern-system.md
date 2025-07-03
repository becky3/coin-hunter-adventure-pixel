# 音楽パターンシステム

## 概要

音楽パターンシステムは、ゲームのBGMと効果音をJSONファイルで定義できるようにし、コードを変更することなく音楽データを管理・編集できるようにします。

## ファイル構造

音楽パターンは個別のJSONファイルとして以下のディレクトリに配置されています：

```
/src/config/resources/
├── bgm/           # BGMファイル
│   ├── title.json
│   ├── game.json
│   ├── victory.json
│   └── gameover.json
└── se/            # 効果音ファイル
    ├── coin.json
    ├── jump.json
    ├── damage.json
    ├── button.json
    ├── gameStart.json
    ├── goal.json
    └── enemyDefeat.json
```

## データフォーマット

### BGM設定

```json
{
  "bgm": {
    "title": {
      "name": "Title Theme",
      "tempo": 120,
      "loop": true,
      "tracks": [
        {
          "name": "bass",
          "instrument": {
            "type": "sine",
            "volume": 0.4
          },
          "pattern": {
            "notes": ["C3", "C3", "G3", "G3"],
            "durations": [0.5, 0.5, 0.5, 0.5],
            "loop": true
          }
        }
      ]
    }
  }
}
```

### SE設定

```json
{
  "se": {
    "coin": {
      "name": "Coin Collect",
      "tracks": [
        {
          "instrument": {
            "type": "sine",
            "volume": 0.5
          },
          "pattern": {
            "notes": ["A5", "C6", "E6"],
            "durations": [0.08, 0.08, 0.12],
            "times": [0, 0.04, 0.08]
          }
        }
      ]
    }
  }
}
```

## パターンタイプ

### 1. メロディーパターン
音符と長さを指定して旋律を定義：
```json
{
  "notes": ["C4", "D4", "E4"],
  "durations": [0.5, 0.5, 1.0]
}
```

### 2. コードパターン
和音を定義：
```json
{
  "chords": [["C4", "E4", "G4"], ["F4", "A4", "C5"]],
  "durations": [1.0, 1.0]
}
```

### 3. ドラムパターン
打楽器のビートを定義：
```json
{
  "beats": [
    { "type": "kick", "time": 0 },
    { "type": "snare", "time": 1 },
    { "type": "hihat", "time": 0.5 }
  ],
  "duration": 4,
  "loop": true
}
```

### 4. 周波数パターン
効果音用の周波数変化を定義：
```json
{
  "frequencies": [{ "start": 440, "end": 880 }],
  "durations": [0.2]
}
```

## 楽器設定

### type（波形）
- `sine` - サイン波（柔らかい音）
- `square` - 矩形波（8ビット風）
- `triangle` - 三角波（中間的な音）
- `sawtooth` - のこぎり波（力強い音）
- `drums` - ドラム専用

### envelope（エンベロープ）
音の立ち上がりと減衰を制御：
```json
{
  "attack": 0.01,
  "decayTime": 0.1,
  "decay": 0.7,
  "sustain": 0.5,
  "release": 0.2
}
```

## 使用方法

### 新しいBGMの追加

1. `/src/config/resources/bgm/` に新しいJSONファイルを作成（例: `boss.json`）
2. 必要なトラック（bass、drums、melodyなど）を定義
3. ResourceLoaderの `bgmFiles` 配列に新しいファイル名を追加
4. ゲームコードで `musicSystem.playBGMFromPattern('boss')` を呼び出し

### 新しい効果音の追加

1. `/src/config/resources/se/` に新しいJSONファイルを作成（例: `powerup.json`）
2. 音のパターンを定義
3. ResourceLoaderの `seFiles` 配列に新しいファイル名を追加
4. ゲームコードで `musicSystem.playSEFromPattern('powerup')` を呼び出し

## 利用可能な音符

- C3 - C6（ド〜ド）
- 半音階もサポート（C#4、Eb5など）
- 周波数直接指定も可能

## ベストプラクティス

1. **テンポの統一**: BGM内のすべてのトラックは同じテンポを使用
2. **音量バランス**: 各トラックの音量を調整してミックスを最適化
3. **ループ設定**: BGMは通常 `loop: true`、効果音は `loop: false`
4. **パフォーマンス**: 同時に再生するトラック数は5-10程度に抑える

## トラブルシューティング

### 音が再生されない
- ResourceLoaderが初期化されているか確認
- 音符名が正しいか確認（大文字小文字に注意）
- ブラウザの音声再生ポリシーを確認

### タイミングがずれる
- `times` 配列を使用して正確なタイミングを指定
- `durations` の合計がループ周期と一致しているか確認

### 音が歪む
- 音量設定を下げる（0.1〜0.5推奨）
- 同時再生数を減らす