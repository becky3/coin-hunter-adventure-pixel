

import { GameCore } from './core/GameCore';

window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});

async function startGame() {
    try {
        console.log('Starting game initialization...');
        const gameCore = new GameCore();

        (window as any).game = gameCore;
        
        console.log('Initializing GameCore...');
        await gameCore.init();
        
        console.log('Starting game loop...');
        gameCore.start();
        
        console.log('Game started successfully');
    } catch (error) {
        console.error('Failed to start game:', error);
        // Loading画面を非表示にする
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
        // エラーメッセージを表示
        const canvas = document.getElementById('gameCanvas');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.fillStyle = 'red';
                ctx.font = '20px Arial';
                ctx.fillText('Error: ' + error.message, 10, 30);
            }
        }
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startGame);
} else {
    startGame();
}
