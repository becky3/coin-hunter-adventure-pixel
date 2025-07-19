
import { GameCore } from './core/GameCore';
import { Logger } from './utils/Logger';

console.log('[Performance] index.ts loaded:', performance.now().toFixed(2) + 'ms');

window.addEventListener('error', (event) => {
    Logger.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    Logger.error('Unhandled promise rejection:', event.reason);
});

async function startGame() {
    try {
        const startTime = performance.now();
        console.log('[Performance] startGame() called:', startTime.toFixed(2) + 'ms');
        Logger.log('Starting game initialization...');
        const gameCore = new GameCore();

        (window as Window & { game?: GameCore }).game = gameCore;
        
        Logger.log('Initializing GameCore...');
        const initStartTime = performance.now();
        console.log('[Performance] Before gameCore.init():', initStartTime.toFixed(2) + 'ms');
        await gameCore.init();
        const initEndTime = performance.now();
        console.log('[Performance] After gameCore.init():', initEndTime.toFixed(2) + 'ms', '(took', (initEndTime - initStartTime).toFixed(2) + 'ms)');
        
        Logger.log('Starting game loop...');
        const gameStartTime = performance.now();
        console.log('[Performance] Before gameCore.start():', gameStartTime.toFixed(2) + 'ms');
        gameCore.start();
        
        Logger.log('Game started successfully');
    } catch (error) {
        Logger.error('Failed to start game:', error);
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
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
    console.log('[Performance] Document still loading, waiting for DOMContentLoaded');
    document.addEventListener('DOMContentLoaded', () => {
        console.log('[Performance] DOMContentLoaded fired:', performance.now().toFixed(2) + 'ms');
        startGame();
    });
} else {
    console.log('[Performance] Document already loaded, starting immediately');
    startGame();
}
