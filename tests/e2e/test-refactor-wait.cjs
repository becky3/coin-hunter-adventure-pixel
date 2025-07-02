const puppeteer = require('puppeteer');

async function testRefactorWait() {
    console.log('🔍 Architecture Refactor Test (待機版)\n');
    
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
        console.log('テストページを読み込み中...\n');
        await page.goto('http://localhost:3000/tests/manual/test-architecture-refactor.html', { 
            waitUntil: 'networkidle0',
            timeout: 10000 
        });
        
        // MusicSystemのタイムアウト（5秒）+ 追加の待機時間
        console.log('MusicSystemタイムアウトを待機中...');
        await new Promise(resolve => setTimeout(resolve, 7000));
        
        // ページ内のログを取得
        const pageStatus = await page.evaluate(() => {
            const logDiv = document.getElementById('log');
            const logs = [];
            if (logDiv) {
                const entries = logDiv.querySelectorAll('div');
                entries.forEach(entry => {
                    logs.push({
                        text: entry.textContent,
                        className: entry.className
                    });
                });
            }
            
            return {
                logs,
                gameExists: !!window.game,
                gameLoopRunning: window.game?.gameLoop?.isRunning?.(),
                stateManagerExists: !!window.game?.stateManager,
                currentState: window.game?.stateManager?.currentState?.name,
                playerExists: !!window.game?.stateManager?.currentState?.player,
                entityManagerExists: !!window.game?.stateManager?.currentState?.entityManager,
                // エラーチェック
                hasError: logs.some(log => log.className === 'error')
            };
        });
        
        console.log('\n🎮 ゲーム状態:');
        console.log('  - Game exists:', pageStatus.gameExists);
        console.log('  - GameLoop running:', pageStatus.gameLoopRunning);
        console.log('  - StateManager exists:', pageStatus.stateManagerExists);
        console.log('  - Current state:', pageStatus.currentState);
        console.log('  - Player exists:', pageStatus.playerExists);
        console.log('  - EntityManager exists:', pageStatus.entityManagerExists);
        console.log('  - Has errors:', pageStatus.hasError);
        
        console.log('\n📋 ページ内ログ (最新10件):');
        const recentLogs = pageStatus.logs.slice(-10);
        recentLogs.forEach(log => {
            if (log.className === 'error') {
                console.error('  ❌ ' + log.text);
            } else if (log.className === 'success') {
                console.log('  ✅ ' + log.text);
            } else if (log.className === 'warning') {
                console.warn('  ⚠️ ' + log.text);
            } else {
                console.log('  ' + log.text);
            }
        });
        
        // もしエラーがあれば全てのエラーログを表示
        if (pageStatus.hasError) {
            console.log('\n❌ エラーログ:');
            pageStatus.logs.filter(log => log.className === 'error').forEach(log => {
                console.error('  ' + log.text);
            });
        }
        
        // Spaceキーを押してゲームを開始
        if (pageStatus.currentState === 'menu') {
            console.log('\n🎮 Spaceキーを押してゲームを開始...');
            await page.keyboard.press('Space');
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // 再度状態を確認
            const afterStart = await page.evaluate(() => ({
                currentState: window.game?.stateManager?.currentState?.name,
                playerExists: !!window.game?.stateManager?.currentState?.player
            }));
            
            console.log('\n🎮 ゲーム開始後:');
            console.log('  - Current state:', afterStart.currentState);
            console.log('  - Player exists:', afterStart.playerExists);
        }
        
    } catch (error) {
        console.error('\n❌ エラー:', error.message);
    } finally {
        await browser.close();
    }
}

testRefactorWait();