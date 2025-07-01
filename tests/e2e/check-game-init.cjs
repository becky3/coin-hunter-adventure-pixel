const puppeteer = require('puppeteer');

async function checkGameInit() {
    console.log('🔍 ゲーム初期化確認\n');
    
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // 初期化ログを記録
    const initLogs = [];
    page.on('console', msg => {
        const text = msg.text();
        if (text.includes('Registering states') || 
            text.includes('registerState') || 
            text.includes('MenuState') || 
            text.includes('PlayState')) {
            console.log('📝 INIT LOG:', text);
            initLogs.push(text);
        }
    });
    
    try {
        await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // ゲーム構造を確認
        const gameStructure = await page.evaluate(() => {
            const game = window.game;
            if (!game) return { hasGame: false };
            
            // GameCoreの構造を確認
            const stateManager = game.stateManager;
            const states = stateManager?.states;
            
            // Statesの詳細を取得
            let stateDetails = {};
            if (states instanceof Map) {
                for (let [key, value] of states) {
                    stateDetails[key] = {
                        name: value.name,
                        constructor: value.constructor.name
                    };
                }
            }
            
            return {
                hasGame: true,
                hasStateManager: !!stateManager,
                statesType: states ? states.constructor.name : 'null',
                stateCount: states ? states.size : 0,
                stateDetails,
                currentState: stateManager?.currentState?.name
            };
        });
        
        console.log('\n📊 ゲーム構造:', JSON.stringify(gameStructure, null, 2));
        
        // registerStateメソッドを手動で呼ぶ
        console.log('\n🔧 手動で状態を登録...');
        const manualRegister = await page.evaluate(() => {
            try {
                const stateManager = window.game?.stateManager;
                
                // PlayStateクラスが存在するか確認
                const hasPlayStateClass = typeof window.PlayState !== 'undefined';
                
                if (!hasPlayStateClass) {
                    // モジュールから動的にインポートを試みる
                    return { error: 'PlayState class not found in window' };
                }
                
                // 手動で登録
                const playState = new window.PlayState(window.game);
                stateManager.registerState(playState);
                
                return {
                    success: true,
                    stateCount: stateManager.states.size
                };
            } catch (error) {
                return {
                    error: error.message,
                    stack: error.stack
                };
            }
        });
        
        console.log('手動登録結果:', manualRegister);
        
        // 初期化ログの確認
        console.log('\n📋 初期化ログ:');
        initLogs.forEach(log => console.log('  -', log));
        
    } catch (error) {
        console.error('❌ エラー:', error.message);
    } finally {
        await browser.close();
    }
}

checkGameInit();