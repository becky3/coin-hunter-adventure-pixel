const puppeteer = require('puppeteer');

async function fullWaitTest() {
    console.log('🔍 完全待機テスト\n');
    
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    const logs = [];
    
    // コンソールログを捕捉
    page.on('console', msg => {
        const type = msg.type();
        const text = msg.text();
        logs.push({ time: Date.now(), type, text });
        
        if (type === 'error') {
            console.error('❌ ERROR:', text);
        } else if (type === 'warning') {
            console.warn('⚠️  WARN:', text);
        } else {
            console.log('📝 LOG:', text);
        }
    });
    
    try {
        console.log('ページを読み込み中...\n');
        await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });
        
        // MusicSystemのタイムアウトを待つ（6秒）
        console.log('\nMusicSystemのタイムアウトを待機中...');
        await new Promise(resolve => setTimeout(resolve, 6000));
        
        // ゲーム状態を確認
        const gameState = await page.evaluate(() => {
            const game = window.game;
            return {
                gameExists: !!game,
                gameLoopExists: !!game?.gameLoop,
                gameLoopRunning: game?.gameLoop?.isRunning?.() || false,
                currentState: game?.stateManager?.currentState?.name,
                stateManagerExists: !!game?.stateManager,
                systemManagerExists: !!game?.serviceLocator?.get('SystemManager'),
                services: game?.serviceLocator ? Object.keys(game.serviceLocator.services || {}) : []
            };
        });
        
        console.log('\n🎮 ゲーム状態:');
        console.log('  - Game exists:', gameState.gameExists);
        console.log('  - GameLoop exists:', gameState.gameLoopExists);
        console.log('  - GameLoop running:', gameState.gameLoopRunning);
        console.log('  - Current state:', gameState.currentState);
        console.log('  - StateManager exists:', gameState.stateManagerExists);
        console.log('  - SystemManager exists:', gameState.systemManagerExists);
        
        // 最後の10個のログを表示
        console.log('\n📋 最新のログ:');
        const recentLogs = logs.slice(-10);
        recentLogs.forEach(log => {
            console.log(`  [${log.type}] ${log.text}`);
        });
        
        // ゲームが初期化されている場合、メニューでSpaceキーを押す
        if (gameState.currentState === 'menu') {
            console.log('\n🎮 メニューでSpaceキーを押します...');
            await page.keyboard.press('Space');
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const afterSpace = await page.evaluate(() => ({
                currentState: window.game?.stateManager?.currentState?.name,
                player: !!window.game?.stateManager?.currentState?.player
            }));
            
            console.log('\n🎮 Space押下後:');
            console.log('  - Current state:', afterSpace.currentState);
            console.log('  - Player exists:', afterSpace.player);
        }
        
    } catch (error) {
        console.error('\n❌ エラー:', error.message);
    } finally {
        await browser.close();
    }
}

fullWaitTest();