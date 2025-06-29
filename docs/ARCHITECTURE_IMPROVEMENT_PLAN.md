# アーキテクチャ改善計画

## 1. 概要

現在のコードベースは機能的ですが、以下の問題により保守性と拡張性に課題があります：

- **God Object問題**: Game.tsが全てのサブシステムを管理
- **責任の不明確さ**: 各クラスが多くの責任を持ちすぎている
- **密結合**: モジュール間の依存関係が複雑
- **UI管理の分散**: UI関連のコードが各所に分散

本計画では、これらの問題を段階的に解決するための詳細設計を提供します。

## 2. 提案するアーキテクチャ

### 2.1 レイヤーアーキテクチャ

```
┌─────────────────────────────────────────┐
│          Application Layer              │
│        (Game, States, UI)               │
├─────────────────────────────────────────┤
│          Service Layer                  │
│  (ServiceLocator, EventBus, Systems)   │
├─────────────────────────────────────────┤
│          Core Layer                     │
│   (Entities, Components, Interfaces)   │
├─────────────────────────────────────────┤
│          Infrastructure Layer           │
│  (Renderer, Input, Audio, Assets)      │
└─────────────────────────────────────────┘
```

### 2.2 主要コンポーネント

#### ServiceLocator（新規）
```typescript
// src/core/ServiceLocator.ts
interface ServiceLocator {
    register<T>(name: string, service: T): void;
    get<T>(name: string): T;
    has(name: string): boolean;
}
```

**責任**: 
- サービスの登録と取得
- 依存関係の管理
- Game.tsからサブシステム管理の責任を移管

#### EventBus（新規）
```typescript
// src/core/EventBus.ts
interface EventBus {
    emit(event: string, data?: any): void;
    on(event: string, handler: EventHandler): void;
    off(event: string, handler: EventHandler): void;
}
```

**責任**:
- モジュール間の疎結合な通信
- ゲームイベントの管理
- 直接参照の削減

#### SystemManager（新規）
```typescript
// src/core/SystemManager.ts
interface SystemManager {
    registerSystem(name: string, system: System): void;
    update(deltaTime: number): void;
    render(renderer: PixelRenderer): void;
}
```

**責任**:
- システムのライフサイクル管理
- 更新順序の制御
- レンダリングパイプラインの管理

### 2.3 リファクタリング対象

#### Game.ts → より小さな責任へ分割
```typescript
// 現在のGame.ts（373行）を以下に分割：

// src/core/GameCore.ts（~50行）
class GameCore {
    private serviceLocator: ServiceLocator;
    private systemManager: SystemManager;
    
    async init(): Promise<void> {
        // サービスの初期化とシステムの登録のみ
    }
}

// src/core/GameLoop.ts（~30行）
class GameLoop {
    private running: boolean = false;
    private lastTime: number = 0;
    
    start(updateCallback: (dt: number) => void): void;
    stop(): void;
}

// src/debug/DebugOverlay.ts（~80行）
class DebugOverlay {
    render(renderer: PixelRenderer, stats: DebugStats): void;
}
```

#### PlayState.ts → 機能別モジュールへ分割
```typescript
// 現在のPlayState.ts（919行）を以下に分割：

// src/states/play/PlayStateCore.ts（~100行）
class PlayStateCore implements GameState {
    // 状態管理のコアロジックのみ
}

// src/states/play/EntityManager.ts（~150行）
class EntityManager {
    // エンティティの生成、更新、削除
}

// src/states/play/CameraController.ts（~80行）
class CameraController {
    // カメラ制御ロジック
}

// src/states/play/LevelManager.ts（~100行）
class LevelManager {
    // レベルのロードと管理
}

// src/ui/PlayStateUI.ts（~200行）
class PlayStateUI {
    // UI表示ロジック（HUD、ポーズメニューなど）
}
```

### 2.4 新しいディレクトリ構造

```
src/
├── application/     # アプリケーション層
│   ├── Game.ts
│   └── states/
├── services/        # サービス層
│   ├── ServiceLocator.ts
│   ├── EventBus.ts
│   └── SystemManager.ts
├── systems/         # ゲームシステム
│   ├── PhysicsSystem.ts
│   ├── RenderSystem.ts
│   ├── InputSystem.ts
│   └── AudioSystem.ts
├── entities/        # エンティティとコンポーネント
│   ├── Entity.ts
│   ├── components/
│   └── prefabs/
├── ui/             # UI層
│   ├── components/
│   ├── screens/
│   └── overlays/
├── infrastructure/ # インフラストラクチャ層
│   ├── rendering/
│   ├── input/
│   ├── audio/
│   └── assets/
└── utils/          # ユーティリティ
```

## 3. 実装計画

### Phase 1: 基盤整備（1週間）
1. ServiceLocatorの実装
2. EventBusの実装
3. SystemManagerの実装
4. 基本的なインターフェース定義

### Phase 2: Game.tsのリファクタリング（1週間）
1. GameCoreへの分割
2. GameLoopの抽出
3. DebugOverlayの分離
4. ServiceLocatorへの移行

### Phase 3: PlayStateのリファクタリング（2週間）
1. EntityManagerの抽出
2. CameraControllerの分離
3. LevelManagerの作成
4. UI要素の分離

### Phase 4: システムの統合（1週間）
1. 全システムのSystemManager統合
2. EventBusを使用した通信への移行
3. 依存関係の整理

### Phase 5: UI層の確立（1週間）
1. UIコンポーネントの作成
2. 画面遷移の管理
3. HUDシステムの確立

## 4. 移行戦略

### 4.1 段階的移行
- 既存の機能を維持しながら段階的に移行
- 各フェーズごとにテストを実施
- 一時的に新旧両方のコードが共存

### 4.2 インターフェースによる抽象化
```typescript
// 既存コードとの互換性を保つためのアダプター
class GameAdapter implements LegacyGame {
    constructor(private serviceLocator: ServiceLocator) {}
    
    // 既存のインターフェースを新しいアーキテクチャにマップ
    getRenderer(): PixelRenderer {
        return this.serviceLocator.get<RenderSystem>('render').getRenderer();
    }
}
```

### 4.3 テスト戦略
- 各モジュールの単体テスト作成
- 統合テストによる動作確認
- パフォーマンステストの実施

## 5. 期待される効果

1. **保守性の向上**
   - 各モジュールの責任が明確化
   - 変更の影響範囲が限定的に

2. **拡張性の向上**
   - 新機能の追加が容易に
   - システムの入れ替えが可能に

3. **テスタビリティの向上**
   - モジュール単位でのテストが可能
   - モックの作成が容易に

4. **パフォーマンスの最適化**
   - システムごとの最適化が可能
   - 不要な処理の削減

## 6. リスクと対策

### リスク
1. 大規模なリファクタリングによる不具合の混入
2. 開発期間の長期化
3. パフォーマンスの低下

### 対策
1. 段階的な移行と十分なテスト
2. 優先順位を付けて最小限の変更から開始
3. パフォーマンス計測の実施

## 7. 次のステップ

1. この設計の承認を得る
2. Phase 1の詳細設計を作成
3. 実装開始

---

この計画は、現在のコードベースの問題を解決し、将来の拡張に備えた堅牢なアーキテクチャを提供します。