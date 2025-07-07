
import { GameCore } from './core/GameCore';
import { Logger } from './utils/Logger';

window.addEventListener('error', (event) => {
    Logger.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    Logger.error('Unhandled promise rejection:', event.reason);
});

async function startGame() {
    try {
        Logger.log('Starting game initialization...');
        const gameCore = new GameCore();

        (window as Window & { game?: GameCore }).game = gameCore;
        
        Logger.log('Initializing GameCore...');
        await gameCore.init();
        
        Logger.log('Starting game loop...');
        gameCore.start();
        
        Logger.log('Game started successfully');
    } catch (error) {
        Logger.error('Failed to start game:', error);
        // Loading画面を非表示にする
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
        // エラーメッセージを表示
        const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
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
