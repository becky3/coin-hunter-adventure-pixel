const puppeteer = require('puppeteer');

async function debugPlayStateError() {
    console.log('🔍 PlayStateエラーデバッグ\n');
    
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // すべてのエラーとログを捕捉
    const logs = [];
    page.on('console', msg => {
        logs.push({
            type: msg.type(),
            text: msg.text()
        });
        if (msg.type() === 'error') {
            console.log('❌ ERROR:', msg.text());
        }
    });
    
    page.on('pageerror', error => {
        console.log('❌ PAGE ERROR:', error.message);
    });
    
    try {
        await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });
        
        // メニューまで待機
        await page.waitForFunction(
            () => window.game?.stateManager?.currentState?.name === 'menu' &&
                  window.game?.stateManager?.currentState?.optionsAlpha >= 1,
            { timeout: 10000 }
        );
        
        console.log('✅ メニュー準備完了\n');
        
        // Spaceキーを押してゲーム開始
        console.log('🎮 ゲーム開始...');
        await page.keyboard.press('Space');
        
        // 状態遷移を待つ（エラーも含めて）
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 現在の状態を確認
        const stateInfo = await page.evaluate(() => {
            const stateManager = window.game?.stateManager;
            const currentState = stateManager?.currentState;
            
            // PlayStateクラスの存在確認
            const hasPlayStateClass = typeof window.PlayState !== 'undefined';
            
            // エラー情報の収集
            let errorInfo = null;
            if (stateManager?.lastError) {
                errorInfo = {
                    message: stateManager.lastError.message,
                    stack: stateManager.lastError.stack
                };
            }
            
            return {
                currentStateName: currentState?.name,
                hasStateManager: !!stateManager,
                hasPlayStateClass,
                errorInfo,
                stateKeys: currentState ? Object.keys(currentState) : []
            };
        });
        
        console.log('📊 状態情報:');
        console.log('  現在の状態:', stateInfo.currentStateName);
        console.log('  StateManager存在:', stateInfo.hasStateManager);
        console.log('  PlayStateクラス存在:', stateInfo.hasPlayStateClass);
        console.log('  エラー情報:', stateInfo.errorInfo);
        console.log('  State Keys:', stateInfo.stateKeys);
        
        // エラーログ確認
        console.log('\n📋 エラーログ:');
        logs.filter(log => log.type === 'error').forEach(log => {
            console.log('  -', log.text);
        });
        
        // 最近のログ
        console.log('\n📋 最近のログ (最後の10件):');
        logs.slice(-10).forEach(log => {
            console.log(`  [${log.type}] ${log.text}`);
        });
        
    } catch (error) {
        console.error('❌ テストエラー:', error.message);
    } finally {
        await browser.close();
    }
}

debugPlayStateError();