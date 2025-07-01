const puppeteer = require('puppeteer');

async function debugConsoleWait() {
    console.log('🔍 デバッグ: コンソールログ確認（タイムアウト待機版）\n');
    
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // コンソールログを捕捉
    page.on('console', msg => {
        const type = msg.type();
        const text = msg.text();
        
        if (type === 'error') {
            console.error('❌ ERROR:', text);
        } else if (type === 'warning') {
            console.warn('⚠️  WARN:', text);
        } else {
            console.log('📝 LOG:', text);
        }
    });
    
    // ページエラーを捕捉
    page.on('pageerror', error => {
        console.error('❌ PAGE ERROR:', error.message);
    });
    
    try {
        console.log('ページを読み込み中...\n');
        await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });
        
        // MusicSystemのタイムアウトを待つ（6秒）
        console.log('\nMusicSystemのタイムアウトを待機中...');
        await new Promise(resolve => setTimeout(resolve, 6000));
        
        // window.gameの状態を確認
        const gameState = await page.evaluate(() => {
            return {
                gameExists: !!window.game,
                gameLoopExists: !!window.game?.gameLoop,
                gameLoopRunning: window.game?.gameLoop?.running || window.game?.gameLoop?.isRunning?.(),
                currentState: window.game?.stateManager?.currentState?.name,
                stateManagerExists: !!window.game?.stateManager,
                entityManagerExists: !!window.game?.stateManager?.currentState?.entityManager,
                playerExists: !!window.game?.stateManager?.currentState?.player,
                playerFromGetter: !!window.game?.stateManager?.currentState?.player
            };
        });
        
        console.log('\n📊 ゲーム状態:');
        console.log('  - game exists:', gameState.gameExists);
        console.log('  - gameLoop exists:', gameState.gameLoopExists);
        console.log('  - gameLoop running:', gameState.gameLoopRunning);
        console.log('  - current state:', gameState.currentState);
        console.log('  - stateManager exists:', gameState.stateManagerExists);
        console.log('  - entityManager exists:', gameState.entityManagerExists);
        console.log('  - player exists:', gameState.playerExists);
        console.log('  - player from getter:', gameState.playerFromGetter);
        
        // ゲームループの詳細を確認
        const loopDetails = await page.evaluate(() => {
            const loop = window.game?.gameLoop;
            return {
                loopType: typeof loop,
                hasStart: typeof loop?.start === 'function',
                hasStop: typeof loop?.stop === 'function',
                hasIsRunning: typeof loop?.isRunning === 'function',
                runningValue: loop?.running,
                isRunningResult: loop?.isRunning?.()
            };
        });
        
        console.log('\n🔄 GameLoop詳細:');
        console.log('  - loop type:', loopDetails.loopType);
        console.log('  - has start:', loopDetails.hasStart);
        console.log('  - has stop:', loopDetails.hasStop);
        console.log('  - has isRunning:', loopDetails.hasIsRunning);
        console.log('  - running value:', loopDetails.runningValue);
        console.log('  - isRunning result:', loopDetails.isRunningResult);
        
    } catch (error) {
        console.error('\n❌ エラー:', error.message);
    } finally {
        await browser.close();
    }
}

debugConsoleWait();