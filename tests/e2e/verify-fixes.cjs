const puppeteer = require('puppeteer');

async function verifyFixes() {
    console.log('🔍 修正確認テスト\n');
    
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    try {
        await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // メニューからPlayStateへ遷移
        await page.evaluate(() => {
            window.game.stateManager.changeState('play');
        });
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 1. 敵の確認
        console.log('📊 敵の確認:');
        const enemyCheck = await page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const entityManager = state?.getEntityManager?.();
            const enemies = entityManager?.getEnemies?.() || [];
            
            return {
                count: enemies.length,
                enemies: enemies.map(e => ({
                    type: e.constructor.name,
                    x: Math.round(e.x),
                    y: Math.round(e.y),
                    active: e.active
                }))
            };
        });
        console.log('  敵の数:', enemyCheck.count);
        console.log('  敵リスト:', enemyCheck.enemies);
        
        // 2. コイン収集とスコア確認
        console.log('\n📊 コイン収集テスト:');
        const beforeCoin = await page.evaluate(() => {
            const hud = window.game?.stateManager?.currentState?.getHudManager?.();
            return hud?.getHUDData?.() || {};
        });
        console.log('  収集前:', { score: beforeCoin.score, coins: beforeCoin.coinsCollected });
        
        // プレイヤーをコインの位置に移動
        await page.evaluate(() => {
            const player = window.game?.stateManager?.currentState?.player;
            if (player) {
                player.x = 112; // First coin position
                player.y = 128;
            }
        });
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const afterCoin = await page.evaluate(() => {
            const hud = window.game?.stateManager?.currentState?.getHudManager?.();
            return hud?.getHUDData?.() || {};
        });
        console.log('  収集後:', { score: afterCoin.score, coins: afterCoin.coinsCollected });
        console.log('  スコア増加:', afterCoin.score > beforeCoin.score ? '✅ 成功' : '❌ 失敗');
        
        // 3. ゴール到達テスト
        console.log('\n📊 ゴール到達テスト:');
        
        // プレイヤーをゴールの位置に移動
        await page.evaluate(() => {
            const player = window.game?.stateManager?.currentState?.player;
            if (player) {
                player.x = 272; // Goal position
                player.y = 192;
            }
        });
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // ゴール状態確認
        const goalState = await page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const hudManager = state?.getHudManager?.();
            const isPaused = state?.isPaused;
            const message = hudManager?.message;
            
            return {
                stateName: state?.name,
                isPaused: isPaused,
                message: message
            };
        });
        
        console.log('  現在の状態:', goalState.stateName);
        console.log('  一時停止:', goalState.isPaused ? '✅' : '❌');
        console.log('  メッセージ:', goalState.message || 'なし');
        console.log('  ゴール処理:', goalState.message === 'STAGE CLEAR!' ? '✅ 成功' : '❌ 失敗');
        
        // スクリーンショット
        await page.screenshot({ path: 'tests/screenshots/verify-fixes.png' });
        console.log('\n📸 スクリーンショット: tests/screenshots/verify-fixes.png');
        
        // 結果サマリー
        console.log('\n========== 結果サマリー ==========');
        console.log('✅ 敵の表示:', enemyCheck.count > 0 ? '修正完了' : '問題あり');
        console.log('✅ スコア増加:', afterCoin.score > beforeCoin.score ? '修正完了' : '問題あり');
        console.log('✅ ゴール処理:', goalState.message === 'STAGE CLEAR!' ? '修正完了' : '問題あり');
        
    } catch (error) {
        console.error('❌ エラー:', error.message);
    } finally {
        await browser.close();
    }
}

verifyFixes();