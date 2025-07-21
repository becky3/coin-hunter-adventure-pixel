/**
 * ArmorKnight突進機能テスト
 * 
 * ArmorKnightがプレイヤーを検知して突進することを確認
 */

const GameTestHelpers = require('./utils/GameTestHelpers.cjs');
const testConfig = require('./utils/testConfig.cjs');

async function runArmorKnightChargeTest() {
    const test = new GameTestHelpers({
        headless: true,
        verbose: true,
        timeout: 30000
    });

    await test.runTest(async (t) => {
        await t.init('ArmorKnight Charge Test');
        
        // エラートラッキングを設定
        await t.injectErrorTracking();
        
        // テストステージで開始
        await t.navigateToGame('http://localhost:3000?s=test-armor-knight-stomp&skip_title=true');
        
        // ゲームの初期化を待つ
        await t.waitForGameInitialization();
        
        // play状態であることを確認
        await t.assertState('play');
        
        // プレイヤーの存在を確認
        await t.assertPlayerExists();
        
        console.log('\n=== ArmorKnight Charge Test ===');
        
        // ArmorKnightをプレイヤーの近くにスポーン
        await t.page.evaluate(() => {
            const state = window.game.stateManager.currentState;
            const player = state.entityManager.getPlayer();
            
            if (!player) {
                throw new Error('Player not found in test-armor-knight-charge');
            }
            
            // ArmorKnightをプレイヤーの右側80ピクセルにスポーン（検知範囲60より外）
            const armorKnight = window.game.serviceLocator.get('entityFactory').create('armor_knight', player.x + 80, player.y);
            armorKnight.initializeInManager(state.entityManager);
            
            window.testArmorKnight = armorKnight;
            
            console.log(`ArmorKnight spawned at (${armorKnight.x}, ${armorKnight.y})`);
            console.log(`Player at (${player.x}, ${player.y})`);
            console.log(`Distance: ${Math.sqrt(Math.pow(player.x - armorKnight.x, 2) + Math.pow(player.y - armorKnight.y, 2))}`);
        });
        
        // 初期状態を確認
        const initialState = await t.page.evaluate(() => {
            const ak = window.testArmorKnight;
            return {
                x: ak.x,
                moveSpeed: ak.moveSpeed,
                normalSpeed: ak.normalSpeed,
                chargeSpeed: ak.chargeSpeed,
                isCharging: ak.isCharging,
                detectRange: ak.detectRange,
                hasEventBus: !!ak.eventBus
            };
        });
        
        console.log('Initial ArmorKnight state:', JSON.stringify(initialState, null, 2));
        
        // プレイヤーを近づけて検知範囲内に入れる
        await t.wait(1000);
        await t.movePlayer('right', 200);
        await t.wait(500);
        
        // ArmorKnightの状態を確認
        const afterMove = await t.page.evaluate(() => {
            const ak = window.testArmorKnight;
            const player = window.game.stateManager.currentState.player;
            const distance = Math.sqrt(Math.pow(player.x - ak.x, 2) + Math.pow(player.y - ak.y, 2));
            
            return {
                distance: distance,
                isCharging: ak.isCharging,
                moveSpeed: ak.moveSpeed,
                animState: ak.animState,
                direction: ak.direction,
                vx: ak.vx,
                x: ak.x
            };
        });
        
        console.log('After player move:', JSON.stringify(afterMove, null, 2));
        
        // 検証
        t.assert(afterMove.distance < initialState.detectRange, 
            `Player should be within detection range. Distance: ${afterMove.distance}, Range: ${initialState.detectRange}`);
        
        // しばらく待って突進が発生するか確認
        await t.wait(1000);
        
        const finalState = await t.page.evaluate(() => {
            const ak = window.testArmorKnight;
            return {
                isCharging: ak.isCharging,
                moveSpeed: ak.moveSpeed,
                animState: ak.animState,
                x: ak.x
            };
        });
        
        console.log('Final state:', JSON.stringify(finalState, null, 2));
        
        console.log('\n=== Test completed ===');
        
        // エラーチェック
        await t.checkForErrors();
    });
}

// テストを実行
runArmorKnightChargeTest().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});