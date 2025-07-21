/**
 * ArmorKnight踏みつけテスト（シンプル版）
 * 
 * ArmorKnightを踏みつけてもプレイヤーがダメージを受けないことを確認
 */

const GameTestHelpers = require('./utils/GameTestHelpers.cjs');
const testConfig = require('./utils/testConfig.cjs');

async function runArmorKnightStompTest() {
    const test = new GameTestHelpers({
        headless: testConfig.headless,
        verbose: true,
        timeout: 30000
    });

    await test.runTest(async (t) => {
        await t.init('ArmorKnight Stomp Test (Simple)');
        
        // エラートラッキングを設定
        await t.injectErrorTracking();
        
        // テストステージで開始
        await t.navigateToGame('http://localhost:3000?s=test-armor-knight&skip_title=true');
        
        // ゲームの初期化を待つ
        await t.waitForGameInitialization();
        
        // play状態であることを確認
        await t.assertState('play');
        
        // 入力フォーカスを確保
        await t.ensureInputFocus();
        
        // プレイヤーの存在を確認
        await t.assertPlayerExists();
        
        console.log('\n=== ArmorKnight Stomp Test (Simple) ===');
        
        // 初期状態を確認
        const initialState = await t.page.evaluate(() => {
            const state = window.game.stateManager.currentState;
            const player = state.player;
            const armorKnight = state.entityManager.enemies.find(e => e.constructor.name === 'ArmorKnight');
            
            return {
                player: player ? { 
                    x: player.x, 
                    y: player.y, 
                    health: player.health,
                    maxHealth: player.maxHealth
                } : null,
                armorKnight: armorKnight ? { 
                    x: armorKnight.x, 
                    y: armorKnight.y, 
                    health: armorKnight.health
                } : null
            };
        });
        
        console.log('Initial state:', initialState);
        t.assert(initialState.armorKnight, 'ArmorKnight should exist');
        t.assert(initialState.player.health === initialState.player.maxHealth, 'Player should be at full health');
        
        // ArmorKnightに近づく
        console.log('Moving closer to ArmorKnight...');
        await t.movePlayer('right', 800);
        await t.wait(500);
        
        // ジャンプしてArmorKnightの上に乗る
        console.log('Jumping on ArmorKnight...');
        await t.pressKey('z');
        await t.wait(100);
        await t.movePlayer('right', 300);
        await t.wait(1000);
        
        // 踏みつけ後の状態を確認
        const afterStomp = await t.page.evaluate(() => {
            const state = window.game.stateManager.currentState;
            const player = state.player;
            const armorKnight = state.entityManager.enemies.find(e => e.constructor.name === 'ArmorKnight');
            
            return {
                player: player ? { 
                    x: player.x, 
                    y: player.y, 
                    vy: player.vy,
                    health: player.health,
                    maxHealth: player.maxHealth
                } : null,
                armorKnight: armorKnight ? { 
                    x: armorKnight.x, 
                    y: armorKnight.y, 
                    health: armorKnight.health,
                    state: armorKnight.state
                } : null
            };
        });
        
        console.log('After stomp:', afterStomp);
        
        // 検証: プレイヤーがダメージを受けていない
        t.assert(afterStomp.player.health === initialState.player.maxHealth, 
            'Player should not take damage from stomping ArmorKnight');
        
        // 検証: ArmorKnightはダメージを受けていない（踏みつけでは倒せない）
        t.assert(afterStomp.armorKnight.health === initialState.armorKnight.health, 
            'ArmorKnight should not take damage from stomping');
        t.assert(afterStomp.armorKnight.state !== 'dead', 'ArmorKnight should not be dead');
        
        console.log('\n✅ ArmorKnight stomp test passed!');
        
        // エラーチェック
        await t.checkForErrors();
    });
}

// テストを実行
runArmorKnightStompTest().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});