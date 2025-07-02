const puppeteer = require('puppeteer');

async function checkRegisteredStates() {
    console.log('🔍 登録済み状態確認\n');
    
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    try {
        await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 登録済みの状態を確認
        const stateInfo = await page.evaluate(() => {
            const stateManager = window.game?.stateManager;
            if (!stateManager) return { hasStateManager: false };
            
            // statesプロパティを探す
            let states = [];
            for (let key in stateManager) {
                if (key === 'states' && stateManager[key] instanceof Map) {
                    states = Array.from(stateManager[key].keys());
                    break;
                }
            }
            
            // 現在の状態
            const currentState = stateManager.currentState;
            
            return {
                hasStateManager: true,
                registeredStates: states,
                currentStateName: currentState?.name,
                stateManagerKeys: Object.keys(stateManager)
            };
        });
        
        console.log('📊 StateManager情報:', JSON.stringify(stateInfo, null, 2));
        
        // メニューでSpaceキーを押す
        console.log('\n🎮 Spaceキーで遷移テスト...');
        
        // メニューが準備完了するまで待機
        await page.waitForFunction(
            () => {
                const state = window.game?.stateManager?.currentState;
                return state?.name === 'menu' && state?.optionsAlpha >= 1;
            },
            { timeout: 5000 }
        );
        
        // Spaceキーを押す
        await page.keyboard.press('Space');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 遷移後の状態
        const afterSpace = await page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            return {
                stateName: state?.name,
                isPlayState: state?.name === 'play',
                hasPlayer: !!state?.player
            };
        });
        
        console.log('📊 Space押下後:', afterSpace);
        
    } catch (error) {
        console.error('❌ エラー:', error.message);
    } finally {
        await browser.close();
    }
}

checkRegisteredStates();