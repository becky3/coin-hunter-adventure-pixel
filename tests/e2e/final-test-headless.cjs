const puppeteer = require('puppeteer');

async function finalTestHeadless() {
    console.log('🎮 最終動作確認テスト (Headless)\n');
    
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    try {
        await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });
        console.log('✅ ページ読み込み完了');
        
        // 初期化を待つ
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 現在の状態を確認してからメニューで操作
        const menuState = await page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            return {
                name: state?.name,
                optionsAlpha: state?.optionsAlpha
            };
        });
        console.log('📊 メニュー状態:', menuState);
        
        // executeOptionを直接呼んでゲーム開始
        console.log('\n🎮 ゲーム開始 (executeOption直接実行)...');
        await page.evaluate(() => {
            const menuState = window.game?.stateManager?.currentState;
            if (menuState && menuState.name === 'menu') {
                // selectedOptionを0（START GAME）に設定
                menuState.selectedOption = 0;
                // executeOptionを実行
                if (menuState.executeOption) {
                    menuState.executeOption();
                }
            }
        });
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // ゲーム状態を取得
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
                items: entityManager?.getItems?.()?.filter(i => i.constructor.name === 'Coin').length || 0,
                hudData: hudManager?.getHUDData?.() || {}
            };
        });
        
        console.log('\n📊 ゲーム状態:');
        console.log('  状態名:', gameState.stateName);
        console.log('  プレイヤー:', gameState.player ? '存在' : 'なし');
        console.log('  敵の数:', gameState.enemies.length);
        console.log('  コインの数:', gameState.items);
        
        if (gameState.stateName !== 'play') {
            console.log('❌ PlayStateへの遷移に失敗しました');
            return;
        }
        
        // 問題1: 敵の表示確認
        console.log('\n✅ 問題1: 敵が表示されない');
        console.log('  敵リスト:', gameState.enemies);
        console.log('  結果:', gameState.enemies.length > 0 ? '修正完了' : '❌ まだ敵が表示されていません');
        
        // 問題2: コイン収集とスコア
        console.log('\n✅ 問題2: コインを取ってもスコアが増えない');
        
        // プレイヤーを最初のコインに移動
        await page.evaluate(() => {
            const player = window.game?.stateManager?.currentState?.player;
            const entityManager = window.game?.stateManager?.currentState?.getEntityManager?.();
            const coins = entityManager?.getItems?.()?.filter(i => i.constructor.name === 'Coin') || [];
            
            if (player && coins.length > 0) {
                player.x = coins[0].x;
                player.y = coins[0].y;
            }
        });
        
        // コイン収集を待つ
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const scoreAfterCoin = await page.evaluate(() => {
            const hudManager = window.game?.stateManager?.currentState?.getHudManager?.();
            return hudManager?.getHUDData?.()?.score || 0;
        });
        
        console.log('  スコア:', scoreAfterCoin);
        console.log('  結果:', scoreAfterCoin > 0 ? '修正完了' : '❌ まだスコアが増えていません');
        
        // 問題3: ゴール到達
        console.log('\n✅ 問題3: ゴールしても黄色い丸が出るだけ');
        
        // プレイヤーをゴールに移動
        await page.evaluate(() => {
            const player = window.game?.stateManager?.currentState?.player;
            const entityManager = window.game?.stateManager?.currentState?.getEntityManager?.();
            const goal = entityManager?.getItems?.()?.find(i => i.constructor.name === 'GoalFlag');
            
            if (player && goal) {
                player.x = goal.x;
                player.y = goal.y;
            }
        });
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const goalResult = await page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const hudManager = state?.getHudManager?.();
            
            return {
                isPaused: state?.isPaused,
                message: hudManager?.message
            };
        });
        
        console.log('  一時停止:', goalResult.isPaused);
        console.log('  メッセージ:', goalResult.message);
        console.log('  結果:', goalResult.message === 'STAGE CLEAR!' ? '修正完了' : '❌ まだクリア表示がありません');
        
        // スクリーンショット
        await page.screenshot({ path: 'tests/screenshots/final-test-result.png' });
        
        // 最終結果
        console.log('\n' + '='.repeat(50));
        console.log('🎯 修正結果サマリー:');
        console.log('  敵の表示: ' + (gameState.enemies.length > 0 ? '✅ 修正完了' : '❌ 要確認'));
        console.log('  スコア増加: ' + (scoreAfterCoin > 0 ? '✅ 修正完了' : '❌ 要確認'));
        console.log('  ゴール処理: ' + (goalResult.message === 'STAGE CLEAR!' ? '✅ 修正完了' : '❌ 要確認'));
        console.log('='.repeat(50));
        
    } catch (error) {
        console.error('❌ エラー:', error.message);
    } finally {
        await browser.close();
    }
}

finalTestHeadless();