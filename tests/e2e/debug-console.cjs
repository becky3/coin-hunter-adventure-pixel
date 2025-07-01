const puppeteer = require('puppeteer');

async function debugConsole() {
    console.log('🔍 デバッグ: コンソールログ確認\n');
    
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
        
        // 少し待つ
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // window.gameの状態を確認
        const gameState = await page.evaluate(() => {
            return {
                gameExists: !!window.game,
                gameLoopRunning: window.game?.gameLoop?.running,
                currentState: window.game?.stateManager?.currentState?.name,
                stateManagerExists: !!window.game?.stateManager,
                entityManagerExists: !!window.game?.stateManager?.currentState?.entityManager,
                playerExists: !!window.game?.stateManager?.currentState?.player
            };
        });
        
        console.log('\n📊 ゲーム状態:');
        console.log('  - game exists:', gameState.gameExists);
        console.log('  - gameLoop running:', gameState.gameLoopRunning);
        console.log('  - current state:', gameState.currentState);
        console.log('  - stateManager exists:', gameState.stateManagerExists);
        console.log('  - entityManager exists:', gameState.entityManagerExists);
        console.log('  - player exists:', gameState.playerExists);
        
    } catch (error) {
        console.error('\n❌ エラー:', error.message);
    } finally {
        await browser.close();
    }
}

debugConsole();