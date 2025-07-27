
import { GameCore } from './core/GameCore';
import { Logger } from './utils/Logger';

Logger.log('[Performance] index.ts loaded:', performance.now().toFixed(2) + 'ms');

interface PerformanceMetrics {
    scriptStart: number;
    phases: Array<{name: string, start: number, end: number, duration: number}>;
}

declare global {
    interface Window {
        performanceMetrics: PerformanceMetrics;
    }
}

window.performanceMetrics = {
    scriptStart: performance.now(),
    phases: []
};

function recordPhase(name: string, start: number, end: number): void {
    const duration = end - start;
    window.performanceMetrics.phases.push({ name, start, end, duration });
    Logger.log(`[Performance] ${name}: ${duration.toFixed(2)}ms (${start.toFixed(2)}ms - ${end.toFixed(2)}ms)`);
}

window.addEventListener('error', (event) => {
    Logger.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    Logger.error('Unhandled promise rejection:', event.reason);
});

async function startGame() {
    try {
        const startTime = performance.now();
        Logger.log('[Performance] startGame() called:', startTime.toFixed(2) + 'ms');
        Logger.log('Starting game initialization...');
        
        const gameCoreCreateStart = performance.now();
        const gameCore = new GameCore();
        const gameCoreCreateEnd = performance.now();
        recordPhase('GameCore constructor', gameCoreCreateStart, gameCoreCreateEnd);

        (window as Window & { game?: GameCore }).game = gameCore;
        
        Logger.log('Initializing GameCore...');
        const initStartTime = performance.now();
        Logger.log('[Performance] Before gameCore.init():', initStartTime.toFixed(2) + 'ms');
        await gameCore.init();
        const initEndTime = performance.now();
        Logger.log('[Performance] After gameCore.init():', initEndTime.toFixed(2) + 'ms', '(took', (initEndTime - initStartTime).toFixed(2) + 'ms)');
        recordPhase('GameCore.init()', initStartTime, initEndTime);
        
        Logger.log('Starting game loop...');
        const gameStartTime = performance.now();
        Logger.log('[Performance] Before gameCore.start():', gameStartTime.toFixed(2) + 'ms');
        gameCore.start();
        const gameStartEndTime = performance.now();
        recordPhase('GameCore.start()', gameStartTime, gameStartEndTime);
        
        Logger.log('Game started successfully');
        
        const totalTime = gameStartEndTime - window.performanceMetrics.scriptStart;
        Logger.log(`[Performance] Total initialization time: ${totalTime.toFixed(2)}ms`);
        
        Logger.log('[Performance] Summary:');
        window.performanceMetrics.phases.forEach((phase) => {
            Logger.log(`  ${phase.name}: ${phase.duration.toFixed(2)}ms`);
        });
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
    Logger.log('[Performance] Document still loading, waiting for DOMContentLoaded');
    document.addEventListener('DOMContentLoaded', () => {
        Logger.log('[Performance] DOMContentLoaded fired:', performance.now().toFixed(2) + 'ms');
        startGame();
    });
} else {
    Logger.log('[Performance] Document already loaded, starting immediately');
    startGame();
}
