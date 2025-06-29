
// src/services/SystemPriorities.ts

/**
 * システムの実行優先順位
 * 数値が小さいほど先に実行される
 */
export const SystemPriorities = {
    INPUT: 100,          // 入力は最初に処理
    PHYSICS: 200,        // 物理演算
    GAME_LOGIC: 300,     // ゲームロジック
    ANIMATION: 400,      // アニメーション
    AUDIO: 500,          // オーディオ
    RENDER: 600,         // レンダリングは最後
    DEBUG: 700           // デバッグは一番最後
} as const;
