const puppeteer = require('puppeteer');

async function testRefactorPage() {
    console.log('🔍 Architecture Refactor Test Page 確認\n');
    
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // コンソールログを捕捉
    const logs = [];
    page.on('console', msg => {
        const type = msg.type();
        const text = msg.text();
        logs.push({ type, text });
        
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
        console.error('Stack:', error.stack);
    });
    
    try {
        console.log('テストページを読み込み中...\n');
        await page.goto('http://localhost:3000/tests/manual/test-architecture-refactor.html', { 
            waitUntil: 'networkidle0',
            timeout: 10000 
        });
        
        // 初期化を待つ
        await new Promise(resolve => setTimeout(resolve, 3000));
        
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
            
            // ステータス情報も取得
            const statusDiv = document.getElementById('status');
            const statusText = statusDiv ? statusDiv.innerText : '';
            
            return {
                logs,
                status: statusText,
                gameExists: !!window.game,
                stateManagerExists: !!window.game?.stateManager,
                currentState: window.game?.stateManager?.currentState?.name,
                playerExists: !!window.game?.stateManager?.currentState?.player,
                entityManagerExists: !!window.game?.stateManager?.currentState?.entityManager
            };
        });
        
        console.log('\n📊 ページステータス:');
        console.log(pageStatus.status);
        
        console.log('\n🎮 ゲーム状態:');
        console.log('  - Game exists:', pageStatus.gameExists);
        console.log('  - StateManager exists:', pageStatus.stateManagerExists);
        console.log('  - Current state:', pageStatus.currentState);
        console.log('  - Player exists:', pageStatus.playerExists);
        console.log('  - EntityManager exists:', pageStatus.entityManagerExists);
        
        console.log('\n📋 ページ内ログ:');
        pageStatus.logs.forEach(log => {
            if (log.className === 'error') {
                console.error('  ' + log.text);
            } else if (log.className === 'success') {
                console.log('  ✅ ' + log.text);
            } else if (log.className === 'warning') {
                console.warn('  ' + log.text);
            } else {
                console.log('  ' + log.text);
            }
        });
        
        // スクリーンショットを撮る
        await page.screenshot({ path: 'tests/screenshots/refactor-test.png', fullPage: true });
        console.log('\n📸 スクリーンショットを保存: tests/screenshots/refactor-test.png');
        
    } catch (error) {
        console.error('\n❌ エラー:', error.message);
    } finally {
        await browser.close();
    }
}

testRefactorPage();