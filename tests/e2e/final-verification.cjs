const puppeteer = require('puppeteer');

async function finalVerification() {
    console.log('🎮 最終動作確認テスト\n');
    
    const browser = await puppeteer.launch({
        headless: false,  // ブラウザを表示
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    try {
        await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });
        console.log('✅ ページ読み込み完了');
        
        // ゲーム初期化を待つ
        await page.waitForFunction(
            () => window.game?.stateManager?.currentState?.name === 'menu',
            { timeout: 10000 }
        );
        
        // メニューが完全に表示されるまで待つ
        await page.waitForFunction(
            () => {
                const state = window.game?.stateManager?.currentState;
                return state?.optionsAlpha >= 1;
            },
            { timeout: 10000 }
        );
        console.log('✅ メニュー表示完了');
        
        // Spaceキーでゲーム開始
        console.log('\n🎮 Spaceキーでゲーム開始...');
        await page.keyboard.press('Space');
        
        // PlayStateへの遷移を待つ
        await page.waitForFunction(
            () => window.game?.stateManager?.currentState?.name === 'play',
            { timeout: 5000 }
        );
        console.log('✅ ゲーム開始成功');
        
        // エンティティ情報を取得
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const gameState = await page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const entityManager = state?.entityManager || state?.getEntityManager?.();
            const hudManager = state?.hudManager || state?.getHudManager?.();
            
            return {
                stateName: state?.name,
                player: state?.player ? {
                    x: Math.round(state.player.x),
                    y: Math.round(state.player.y),
                    score: state.player.score
                } : null,
                enemies: entityManager?.getEnemies?.()?.map(e => ({
                    type: e.constructor.name,
                    x: Math.round(e.x),
                    y: Math.round(e.y)
                })) || [],
                items: entityManager?.getItems?.()?.map(i => ({
                    type: i.constructor.name,
                    x: Math.round(i.x), 
                    y: Math.round(i.y)
                })) || [],
                hudData: hudManager?.getHUDData?.() || {}
            };
        });
        
        console.log('\n📊 ゲーム状態:');
        console.log('  プレイヤー:', gameState.player);
        console.log('  敵の数:', gameState.enemies.length);
        console.log('  敵リスト:', gameState.enemies);
        console.log('  アイテム数:', gameState.items.length);
        console.log('  HUDスコア:', gameState.hudData.score);
        
        // 問題1: 敵の表示確認
        console.log('\n✅ 問題1: 敵の表示');
        console.log('  結果:', gameState.enemies.length > 0 ? '修正完了 - 敵が表示されています' : '❌ 敵が表示されていません');
        
        // 問題2: コイン収集テスト
        console.log('\n🪙 問題2: コイン収集とスコア');
        
        // 最初のコインの位置にワープ
        await page.evaluate(() => {
            const player = window.game?.stateManager?.currentState?.player;
            if (player) {
                player.x = 112;
                player.y = 120; // 少し上から落とす
            }
        });
        
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const afterCoin = await page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const hudManager = state?.hudManager || state?.getHudManager?.();
            return {
                playerScore: state?.player?.score || 0,
                hudScore: hudManager?.getHUDData?.()?.score || 0
            };
        });
        
        console.log('  プレイヤースコア:', afterCoin.playerScore);
        console.log('  HUDスコア:', afterCoin.hudScore);
        console.log('  結果:', afterCoin.hudScore > 0 ? '修正完了 - スコアが増加しています' : '❌ スコアが増加していません');
        
        // 問題3: ゴール到達テスト
        console.log('\n🏁 問題3: ゴール到達');
        
        // ゴール位置にワープ
        await page.evaluate(() => {
            const player = window.game?.stateManager?.currentState?.player;
            if (player) {
                player.x = 272;
                player.y = 180; // 少し上から落とす
            }
        });
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const goalState = await page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const hudManager = state?.hudManager || state?.getHudManager?.();
            
            return {
                isPaused: state?.isPaused,
                message: hudManager?.message,
                stateName: state?.name
            };
        });
        
        console.log('  一時停止:', goalState.isPaused);
        console.log('  メッセージ:', goalState.message);
        console.log('  結果:', goalState.message === 'STAGE CLEAR!' ? '修正完了 - ステージクリア表示' : '❌ ステージクリア表示なし');
        
        // 最終スクリーンショット
        await page.screenshot({ path: 'tests/screenshots/final-verification.png' });
        console.log('\n📸 スクリーンショット: tests/screenshots/final-verification.png');
        
        // サマリー
        console.log('\n' + '='.repeat(50));
        console.log('🎯 修正結果サマリー:');
        console.log('  ✅ 敵の表示: ' + (gameState.enemies.length > 0 ? '修正完了' : '要確認'));
        console.log('  ✅ スコア増加: ' + (afterCoin.hudScore > 0 ? '修正完了' : '要確認'));
        console.log('  ✅ ゴール処理: ' + (goalState.message === 'STAGE CLEAR!' ? '修正完了' : '要確認'));
        console.log('='.repeat(50));
        
        console.log('\n5秒後にブラウザを閉じます...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
    } catch (error) {
        console.error('❌ エラー:', error.message);
        await page.screenshot({ path: 'tests/screenshots/error-state.png' });
    } finally {
        await browser.close();
    }
}

finalVerification();