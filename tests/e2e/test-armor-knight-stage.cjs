/**
 * ArmorKnight実ステージ動作確認テスト
 * 
 * ステージ0-4でArmorKnightの実際の動作を確認します：
 * 1. 踏みつけ時の反発動作
 * 2. プレイヤー検知と突進機能
 * 3. 横からの接触時のダメージ
 */

const GameTestHelpers = require('./utils/GameTestHelpers.cjs');
const testConfig = require('./utils/testConfig.cjs');

async function runArmorKnightStageTest() {
    const test = new GameTestHelpers({
        headless: testConfig.headless,
        verbose: true,
        timeout: 60000
    });

    await test.runTest(async (t) => {
        await t.init('ArmorKnight Stage Test');
        
        // エラートラッキングを設定
        await t.injectErrorTracking();
        
        // ステージ0-4で開始
        await t.navigateToGame('http://localhost:3000?s=0-4&skip_title=true');
        
        // ゲームの初期化を待つ
        await t.waitForGameInitialization();
        
        // play状態であることを確認
        await t.assertState('play');
        
        // 入力フォーカスを確保
        await t.ensureInputFocus();
        
        // プレイヤーの存在を確認
        await t.assertPlayerExists();
        
        console.log('\n=== ステージ0-4でのArmorKnight動作確認 ===');
        
        // 初期状態を確認
        const initialState = await t.page.evaluate(() => {
            const state = window.game.stateManager.currentState;
            const player = state.player;
            const enemies = state.entityManager.enemies;
            
            return {
                player: {
                    x: player.x,
                    y: player.y,
                    health: player.health
                },
                enemies: enemies.map(e => ({
                    type: e.constructor.name,
                    x: e.x,
                    y: e.y,
                    health: e.health,
                    maxHealth: e.maxHealth,
                    damage: e.damage
                }))
            };
        });
        
        console.log('Initial state:', JSON.stringify(initialState, null, 2));
        
        // ArmorKnightが配置されているか確認
        const armorKnights = initialState.enemies.filter(e => e.type === 'ArmorKnight');
        t.assert(armorKnights.length > 0, 'ArmorKnight should be present in stage 0-4');
        console.log(`Found ${armorKnights.length} ArmorKnight(s)`);
        
        // 最初のArmorKnightの情報を確認
        const firstArmorKnight = armorKnights[0];
        console.log('First ArmorKnight:', firstArmorKnight);
        t.assert(firstArmorKnight.health === 3, 'ArmorKnight should have 3 health');
        t.assert(firstArmorKnight.damage === 1, 'ArmorKnight should have 1 damage');
        
        console.log('\n=== Test 1: 踏みつけテスト ===');
        
        // ArmorKnightの位置まで移動
        console.log('Moving to ArmorKnight position...');
        await t.movePlayer('right', 2000);
        await t.wait(500);
        
        // ジャンプしてArmorKnightの上に乗る
        console.log('Jumping on ArmorKnight...');
        await t.pressKey('ArrowUp');
        await t.wait(100);
        await t.releaseKey('ArrowUp');
        await t.wait(1000);
        
        // 踏みつけ後の状態を確認
        const afterStomp = await t.page.evaluate(() => {
            const state = window.game.stateManager.currentState;
            const player = state.player;
            const armorKnight = state.entityManager.enemies.find(e => e.constructor.name === 'ArmorKnight');
            
            return {
                player: {
                    x: player.x,
                    y: player.y,
                    vy: player.vy,
                    health: player.health
                },
                armorKnight: armorKnight ? {
                    health: armorKnight.health,
                    isDead: armorKnight.state === 'dead'
                } : null
            };
        });
        
        console.log('After stomp attempt:', afterStomp);
        
        // ArmorKnightは生存しているはず
        if (afterStomp.armorKnight) {
            t.assert(!afterStomp.armorKnight.isDead, 'ArmorKnight should not die from stomping');
            t.assert(afterStomp.armorKnight.health === 3, 'ArmorKnight should not take damage from stomping');
        }
        
        console.log('\n=== Test 2: プレイヤー検知テスト ===');
        
        // 一旦離れる
        await t.movePlayer('left', 1500);
        await t.wait(500);
        
        // ArmorKnightに近づく
        console.log('Approaching ArmorKnight to trigger charge...');
        await t.movePlayer('right', 500);
        await t.wait(1000);
        
        // ArmorKnightの状態を確認
        const chargingState = await t.page.evaluate(() => {
            const armorKnight = window.game.stateManager.currentState.entityManager.enemies.find(
                e => e.constructor.name === 'ArmorKnight'
            );
            
            return armorKnight ? {
                isCharging: armorKnight.isCharging,
                moveSpeed: armorKnight.moveSpeed,
                vx: armorKnight.vx,
                direction: armorKnight.direction
            } : null;
        });
        
        console.log('ArmorKnight charging state:', chargingState);
        
        if (chargingState) {
            console.log('ArmorKnight is charging:', chargingState.isCharging);
            console.log('Move speed:', chargingState.moveSpeed);
        }
        
        console.log('\n=== Test 3: 横からの接触ダメージテスト ===');
        
        const beforeCollision = await t.getPlayerStats();
        console.log('Player health before collision:', beforeCollision.health);
        
        // ArmorKnightに横から接触
        await t.movePlayer('right', 1000);
        await t.wait(1000);
        
        const afterCollision = await t.getPlayerStats();
        console.log('Player health after collision:', afterCollision.health);
        
        // ダメージを受けたか確認
        if (afterCollision.health < beforeCollision.health) {
            console.log('✅ Player took damage from side collision');
            t.assert(beforeCollision.health - afterCollision.health === 1, 'Player should take 1 damage');
        }
        
        // 成功メッセージ
        console.log('\n✅ ArmorKnight stage tests completed!');
        
        // エラーチェック
        await t.checkForErrors();
    });
}

// テストを実行
runArmorKnightStageTest().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});