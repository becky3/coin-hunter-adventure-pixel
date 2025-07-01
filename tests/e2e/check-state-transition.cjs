const puppeteer = require('puppeteer');

async function checkStateTransition() {
    console.log('🔍 状態遷移確認\n');
    
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // すべてのログを記録
    const logs = [];
    page.on('console', msg => {
        const text = msg.text();
        logs.push(text);
        if (text.includes('State') || text.includes('state') || text.includes('error') || text.includes('Error')) {
            console.log('📝 LOG:', text);
        }
    });
    
    page.on('pageerror', error => {
        console.log('❌ PAGE ERROR:', error.message);
    });
    
    try {
        await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 初期状態確認
        const initialState = await page.evaluate(() => {
            const game = window.game;
            const stateManager = game?.stateManager;
            
            // 内部プロパティに直接アクセス
            const currentStateInternal = stateManager?.currentState;
            const states = stateManager?.states ? Array.from(stateManager.states.keys()) : [];
            
            return {
                currentStateName: currentStateInternal?.name,
                registeredStates: states,
                hasPlayState: states.includes('play')
            };
        });
        
        console.log('📊 初期状態:', initialState);
        
        // メニューのoptionsAlphaを待つ
        await page.waitForFunction(
            () => {
                const game = window.game;
                const state = game?.stateManager?.currentState;
                return state?.name === 'menu' && state?.optionsAlpha >= 1;
            },
            { timeout: 5000 }
        );
        
        console.log('✅ メニュー準備完了\n');
        
        // changeStateメソッドを直接呼ぶ
        console.log('🔧 changeStateを直接実行...');
        const directTransition = await page.evaluate(() => {
            try {
                const stateManager = window.game?.stateManager;
                stateManager.changeState('play');
                return { success: true, newState: stateManager.currentState?.name };
            } catch (error) {
                return { success: false, error: error.message, stack: error.stack };
            }
        });
        
        console.log('直接遷移結果:', directTransition);
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 遷移後の状態確認
        const afterTransition = await page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            
            // PlayStateの内部構造を確認
            const internalStructure = state ? {
                name: state.name,
                hasPlayer: !!state.player,
                hasEntityManager: !!state.entityManager,
                hasLevelManager: !!state.levelManager,
                hasCameraController: !!state.cameraController,
                hasHudManager: !!state.hudManager,
                hasGetEntityManager: typeof state.getEntityManager === 'function',
                properties: Object.keys(state)
            } : null;
            
            return {
                stateName: state?.name,
                structure: internalStructure
            };
        });
        
        console.log('\n📊 遷移後の状態:', JSON.stringify(afterTransition, null, 2));
        
        // エラーログ確認
        const errorLogs = logs.filter(log => 
            log.toLowerCase().includes('error') || 
            log.toLowerCase().includes('fail') ||
            log.toLowerCase().includes('exception')
        );
        
        if (errorLogs.length > 0) {
            console.log('\n❌ エラーログ:');
            errorLogs.forEach(log => console.log('  -', log));
        }
        
    } catch (error) {
        console.error('❌ テストエラー:', error.message);
    } finally {
        await browser.close();
    }
}

checkStateTransition();