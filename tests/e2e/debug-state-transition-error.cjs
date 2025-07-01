const puppeteer = require('puppeteer');

async function debugStateTransitionError() {
    console.log('🔍 状態遷移エラーデバッグ\n');
    
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // すべてのログを記録
    const logs = [];
    page.on('console', msg => {
        const text = msg.text();
        logs.push({ type: msg.type(), text });
        if (msg.type() === 'error' || text.includes('error') || text.includes('Error')) {
            console.log(`[${msg.type()}] ${text}`);
        }
    });
    
    page.on('pageerror', error => {
        console.log('PAGE ERROR:', error.message);
    });
    
    try {
        await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // エラーハンドリングを改善して再試行
        const result = await page.evaluate(() => {
            try {
                // 状態を確認
                const stateManager = window.game?.stateManager;
                const states = stateManager?.states;
                
                // Mapの内容を確認
                let registeredStates = [];
                if (states instanceof Map) {
                    registeredStates = Array.from(states.keys());
                }
                
                // 'play'状態が登録されているか確認
                const hasPlayState = states?.has?.('play');
                
                // 手動で状態遷移を試みる
                let transitionResult = null;
                try {
                    stateManager.setState('play');
                    transitionResult = 'Success';
                } catch (error) {
                    transitionResult = {
                        error: error.message,
                        stack: error.stack
                    };
                }
                
                return {
                    registeredStates,
                    hasPlayState,
                    transitionResult,
                    currentState: stateManager?.currentState?.name
                };
            } catch (error) {
                return {
                    globalError: error.message
                };
            }
        });
        
        console.log('\n📊 デバッグ結果:', JSON.stringify(result, null, 2));
        
        // 最近のエラーログ
        const errorLogs = logs.filter(log => 
            log.type === 'error' || 
            log.text.toLowerCase().includes('error') ||
            log.text.toLowerCase().includes('fail')
        );
        
        if (errorLogs.length > 0) {
            console.log('\n❌ エラーログ:');
            errorLogs.slice(-10).forEach(log => {
                console.log(`  [${log.type}] ${log.text}`);
            });
        }
        
    } catch (error) {
        console.error('❌ テストエラー:', error.message);
    } finally {
        await browser.close();
    }
}

debugStateTransitionError();