const puppeteer = require('puppeteer');

async function debugMenuInput() {
    console.log('🔍 メニュー入力デバッグ\n');
    
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // MenuStateのログを捕捉
    const menuLogs = [];
    page.on('console', msg => {
        const text = msg.text();
        if (text.includes('MenuState') || text.includes('InputSystem') || text.includes('Space')) {
            console.log('📝 LOG:', text);
            menuLogs.push(text);
        }
    });
    
    try {
        await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });
        
        // 初期化とメニュー表示を待つ
        await page.waitForFunction(
            () => window.game?.stateManager?.currentState?.name === 'menu' &&
                  window.game?.stateManager?.currentState?.optionsAlpha >= 1,
            { timeout: 10000 }
        );
        
        console.log('✅ メニュー準備完了\n');
        
        // InputSystemのデバッグ情報を取得
        const inputInfo = await page.evaluate(() => {
            const inputSystem = window.game?.inputSystem;
            if (inputSystem) {
                const debugInfo = inputSystem.getDebugInfo?.();
                return {
                    hasInputSystem: true,
                    debugInfo: debugInfo || null,
                    listeners: {
                        keyPress: inputSystem.listeners?.keyPress?.length || 0,
                        keyRelease: inputSystem.listeners?.keyRelease?.length || 0
                    }
                };
            }
            return { hasInputSystem: false };
        });
        
        console.log('🎮 InputSystem情報:', inputInfo);
        
        // Spaceキーを押す前の状態
        const beforeSpace = await page.evaluate(() => ({
            stateName: window.game?.stateManager?.currentState?.name,
            selectedOption: window.game?.stateManager?.currentState?.selectedOption,
            optionsAlpha: window.game?.stateManager?.currentState?.optionsAlpha
        }));
        
        console.log('\n📊 Space押下前:', beforeSpace);
        
        // Spaceキーを押す
        console.log('\n🎮 Spaceキーを押します...');
        await page.keyboard.down('Space');
        await new Promise(resolve => setTimeout(resolve, 100));
        await page.keyboard.up('Space');
        
        // 処理を待つ
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Space押下後の状態
        const afterSpace = await page.evaluate(() => ({
            stateName: window.game?.stateManager?.currentState?.name,
            selectedOption: window.game?.stateManager?.currentState?.selectedOption,
            playerExists: !!window.game?.stateManager?.currentState?.player
        }));
        
        console.log('\n📊 Space押下後:', afterSpace);
        
        // executeOptionを手動で呼んでみる
        if (afterSpace.stateName === 'menu') {
            console.log('\n🔧 executeOptionを手動実行...');
            const executeResult = await page.evaluate(() => {
                const state = window.game?.stateManager?.currentState;
                if (state?.executeOption) {
                    state.executeOption();
                    return { executed: true };
                }
                return { executed: false, error: 'executeOption not found' };
            });
            
            console.log('実行結果:', executeResult);
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const finalState = await page.evaluate(() => ({
                stateName: window.game?.stateManager?.currentState?.name
            }));
            
            console.log('最終状態:', finalState);
        }
        
        // ログ確認
        console.log('\n📋 MenuStateログ:');
        menuLogs.forEach(log => console.log('  -', log));
        
    } catch (error) {
        console.error('❌ エラー:', error.message);
    } finally {
        await browser.close();
    }
}

debugMenuInput();