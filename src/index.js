// Coin Hunter Adventure - Pixel Edition
// Entry point

import { Game } from './core/Game.js';

// ゲームの初期化
window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const loadingScreen = document.getElementById('loadingScreen');
    
    // ゲームインスタンスの作成
    const game = new Game(canvas);
    
    // アセット読み込み完了後にゲーム開始
    game.initialize().then(() => {
        loadingScreen.style.display = 'none';
        game.start();
    }).catch(error => {
        console.error('Failed to initialize game:', error);
        loadingScreen.textContent = 'Error loading game';
    });
});