const puppeteer = require('puppeteer');

async function testEnemyRender() {
    const browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox']
    });
    const page = await browser.newPage();
    
    // コンソールログを表示
    page.on('console', msg => console.log('Browser:', msg.text()));
    page.on('pageerror', error => console.error('Page error:', error));
    
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(1000);
    
    // ゲームの状態を確認
    const gameState = await page.evaluate(() => {
        const game = window.game;
        if (\!game) return { error: 'Game not found' };
        
        // メニューから開始
        if (game.stateManager.currentState?.startGame) {
            game.stateManager.currentState.startGame();
        }
        
        return {
            state: game.stateManager.currentState?.constructor.name,
            hasPlayer: \!\!game.stateManager.currentState?.player,
            enemyCount: game.stateManager.currentState?.enemies?.length || 0
        };
    });
    
    console.log('Initial state:', gameState);
    
    // PlayStateに遷移を待つ
    await page.waitForTimeout(2000);
    
    // PlayStateの状態を確認
    const playState = await page.evaluate(() => {
        const state = window.game.stateManager.currentState;
        if (\!state) return { error: 'No current state' };
        
        return {
            stateName: state.constructor.name,
            player: state.player ? {
                x: state.player.x,
                y: state.player.y,
                active: state.player.active
            } : null,
            enemies: (state.enemies || []).map(e => ({
                type: e.constructor.name,
                x: e.x,
                y: e.y,
                active: e.active
            })),
            isPaused: state.isPaused
        };
    });
    
    console.log('Play state:', JSON.stringify(playState, null, 2));
    
    // スクリーンショット
    await page.screenshot({ path: 'test-enemy-render.png' });
    
    await browser.close();
}

testEnemyRender().catch(console.error);
