const puppeteer = require('puppeteer');

async function simpleGameTest() {
    console.log('🔍 シンプルゲームテスト\n');
    
    const browser = await puppeteer.launch({
        headless: false,  // Show browser to see what's happening
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // ログを記録
    page.on('console', msg => {
        if (msg.type() === 'error') {
            console.log('❌ ERROR:', msg.text());
        }
    });
    
    try {
        await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });
        console.log('✅ ページ読み込み完了');
        
        // 初期化を待つ
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // メニューが表示されるまで待つ
        await page.waitForFunction(
            () => {
                const state = window.game?.stateManager?.currentState;
                return state?.name === 'menu' && state?.optionsAlpha >= 1;
            },
            { timeout: 10000 }
        );
        console.log('✅ メニュー表示完了');
        
        // Enterキーを押してゲーム開始
        console.log('🎮 Enterキーを押してゲーム開始...');
        await page.keyboard.press('Enter');
        
        // 少し待つ
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // ゲーム状態を確認
        const gameInfo = await page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const entityManager = state?.entityManager || state?.getEntityManager?.();
            
            return {
                stateName: state?.name,
                hasPlayer: !!state?.player,
                enemies: entityManager?.getEnemies?.()?.length || 0,
                items: entityManager?.getItems?.()?.length || 0
            };
        });
        
        console.log('\n📊 ゲーム情報:');
        console.log('  現在の状態:', gameInfo.stateName);
        console.log('  プレイヤー:', gameInfo.hasPlayer ? '存在' : 'なし');
        console.log('  敵の数:', gameInfo.enemies);
        console.log('  アイテムの数:', gameInfo.items);
        
        // スクリーンショット
        await page.screenshot({ path: 'tests/screenshots/simple-test.png' });
        console.log('\n📸 スクリーンショット: tests/screenshots/simple-test.png');
        
        console.log('\n5秒後にブラウザを閉じます...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
    } catch (error) {
        console.error('❌ エラー:', error.message);
    } finally {
        await browser.close();
    }
}

simpleGameTest();