
// src/index.ts

import { GameCore } from './core/GameCore';

// グローバルエラーハンドラー
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});

// ゲームの初期化と開始
async function startGame() {
    try {
        const gameCore = new GameCore();
        // window.gameに登録（デバッグとの互換性のため）
        (window as any).game = gameCore;
        
        await gameCore.init();
        gameCore.start();
    } catch (error) {
        console.error('Failed to start game:', error);
    }
}

// DOMContentLoadedを待ってからゲームを開始
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startGame);
} else {
    startGame();
}
