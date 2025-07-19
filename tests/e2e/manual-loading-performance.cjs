const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ 
        headless: false,
        args: ['--enable-logging', '--v=1']
    });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('=== Loading Performance Test ===');
    console.log('Starting fresh page load at:', new Date().toISOString());
    
    // コンソールログを収集
    const consoleLogs = [];
    page.on('console', msg => {
        const text = msg.text();
        if (text.includes('[Performance]')) {
            consoleLogs.push(text);
            console.log('Console:', text);
        }
    });
    
    // ページ読み込み開始時刻
    const startTime = Date.now();
    
    try {
        // ページを開く
        await page.goto('http://localhost:3000', { 
            waitUntil: 'networkidle',
            timeout: 120000 // 2分のタイムアウト
        });
        
        // ローディング画面が消えるまで待つ
        await page.waitForSelector('#loadingScreen', { state: 'hidden', timeout: 120000 });
        
        const loadTime = Date.now() - startTime;
        console.log('\n=== Summary ===');
        console.log('Total load time:', loadTime + 'ms');
        console.log('Loading screen hidden after:', loadTime + 'ms');
        
        // タイトルメニューが表示されるまで待つ
        await page.waitForTimeout(3000);
        
        console.log('\n=== Performance Logs ===');
        consoleLogs.forEach(log => console.log(log));
        
        // スクリーンショットを撮る
        await page.screenshot({ path: 'tests/logs/loading-performance.png' });
        
    } catch (error) {
        console.error('Error during test:', error);
    } finally {
        await browser.close();
    }
})();