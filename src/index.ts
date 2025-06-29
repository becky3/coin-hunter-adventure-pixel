

import { GameCore } from './core/GameCore';

window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});

async function startGame() {
    try {
        const gameCore = new GameCore();

        (window as any).game = gameCore;
        
        await gameCore.init();
        gameCore.start();
    } catch (error) {
        console.error('Failed to start game:', error);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startGame);
} else {
    startGame();
}
