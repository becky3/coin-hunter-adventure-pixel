/**
 * ゲーム全体の定数定義
 */

// ゲーム画面の解像度設定
export const GAME_RESOLUTION = {
    WIDTH: 256,  // ゲーム画面の幅（ピクセル）
    HEIGHT: 240  // ゲーム画面の高さ（ピクセル）
};

// 表示設定
export const DISPLAY = {
    // 実際のキャンバスサイズ（ゲーム画面を何倍に拡大するか）
    SCALE: 3,  // 3倍に拡大表示（768x720）
    
    // アウターフレーム（メタスペース）の設定
    OUTER_FRAME: {
        ENABLED: true,
        BACKGROUND_COLOR: '#1a1a1a',  // ダークグレー
        BORDER_COLOR: '#333333',
        BORDER_WIDTH: 2
    }
};

// キャンバスの実際のサイズ
export const CANVAS_SIZE = {
    WIDTH: GAME_RESOLUTION.WIDTH * DISPLAY.SCALE,
    HEIGHT: GAME_RESOLUTION.HEIGHT * DISPLAY.SCALE
};

// FPS設定
export const FPS = {
    TARGET: 60,
    FRAME_TIME: 1000 / 60  // ミリ秒
};