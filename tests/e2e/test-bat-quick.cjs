const GameTestHelpers = require('./utils/GameTestHelpers.cjs');

// コウモリの動作を素早く確認するテスト
async function runTest() {
    const test = new GameTestHelpers({
        headless: false,
        verbose: true,
        timeout: 60000  // 60秒に延長
    });

    await test.runTest(async (t) => {
        await t.init('Bat Quick Test');
        
        console.log('ゲームにナビゲート中...');
        await t.navigateToGame('http://localhost:3000?s=2-1&skip_title=true');
        await t.wait(3000); // 余裕を持って待機
        
        console.log('ゲーム初期化を待機中...');
        await t.waitForGameInitialization();
        
        await t.assertState('play');
        await t.ensureInputFocus();
        
        console.log('\n=== コウモリの放物線飛行テスト ===');
        
        // コウモリの初期状態を確認
        const initialState = await t.page.evaluate(() => {
            const bats = window.game?.stateManager?.currentState?.entityManager?.enemies?.filter(e => e.constructor.name === 'Bat') || [];
            return {
                count: bats.length,
                firstBat: bats.length > 0 ? {
                    x: bats[0].x,
                    y: bats[0].y,
                    physicsEnabled: bats[0].physicsEnabled,
                    batState: bats[0].batState
                } : null
            };
        });
        
        console.log(`コウモリ数: ${initialState.count}`);
        if (initialState.firstBat) {
            console.log(`初期位置: x=${initialState.firstBat.x}, y=${initialState.firstBat.y}`);
            console.log(`物理: ${initialState.firstBat.physicsEnabled ? '有効' : '無効'}`);
        }
        
        // プレイヤーを移動してコウモリを起動
        await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const player = state?.entityManager?.player;
            if (player) {
                player.x = 200;
                player.y = 100;
            }
        });
        
        await t.wait(500);
        
        // 5秒間の飛行を追跡
        console.log('\n--- 飛行パターンの追跡 ---');
        let positions = [];
        
        for (let i = 0; i < 10; i++) {
            await t.wait(500);
            
            const pos = await t.page.evaluate(() => {
                const bats = window.game?.stateManager?.currentState?.entityManager?.enemies?.filter(e => e.constructor.name === 'Bat') || [];
                const flyingBats = bats.filter(b => b.batState === 'flying');
                
                if (flyingBats.length > 0) {
                    const bat = flyingBats[0];
                    return {
                        x: Math.round(bat.x),
                        y: Math.round(bat.y),
                        vx: bat.vx,
                        vy: bat.vy,
                        flyTime: bat.flyTime
                    };
                }
                return null;
            });
            
            if (pos) {
                positions.push(pos);
                console.log(`${i * 0.5}秒: x=${pos.x}, y=${pos.y}, vy=${pos.vy.toFixed(1)}`);
            }
        }
        
        // 結果の分析
        if (positions.length > 0) {
            const yValues = positions.map(p => p.y);
            const minY = Math.min(...yValues);
            const maxY = Math.max(...yValues);
            const yMovement = maxY - minY;
            
            console.log(`\n=== 結果 ===`);
            console.log(`Y座標の範囲: ${minY} ～ ${maxY}`);
            console.log(`垂直移動距離: ${yMovement}ピクセル`);
            console.log(`放物線飛行: ${yMovement > 50 ? '✅ 成功' : '❌ 失敗'}`);
        }
        
        await t.screenshot('bat-quick-test');
    });
}

runTest().catch(console.error);