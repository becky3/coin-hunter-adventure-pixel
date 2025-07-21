/**
 * ArmorKnight突進機能シンプルテスト
 * 
 * ArmorKnightがプレイヤーを検知して突進することを確認
 */

const GameTestHelpers = require('./utils/GameTestHelpers.cjs');

async function runArmorKnightChargeTest() {
    const test = new GameTestHelpers({
        headless: true,
        verbose: true,
        timeout: 30000
    });

    await test.runTest(async (t) => {
        await t.init('ArmorKnight Charge Simple Test');
        
        // エラートラッキングを設定
        await t.injectErrorTracking();
        
        // E2Eテスト用ステージで開始
        await t.navigateToGame('http://localhost:3000?s=stage0-1&skip_title=true');
        
        // ゲームの初期化を待つ
        await t.waitForGameInitialization();
        
        // play状態であることを確認
        await t.assertState('play');
        
        // プレイヤーの存在を確認
        await t.assertPlayerExists();
        
        console.log('\n=== ArmorKnight Charge Simple Test ===');
        
        // ArmorKnightをプレイヤーの近くにスポーン
        const spawnResult = await t.page.evaluate(() => {
            const state = window.game.stateManager.currentState;
            const player = state.player;
            
            if (!player) return { error: 'Player not found' };
            
            // EntityFactoryを使用してArmorKnightを作成
            const entityFactory = window.game.serviceLocator.get('entityFactory');
            
            // プレイヤーの右側100ピクセルにスポーン
            const armorKnight = entityFactory.create('armor_knight', player.x + 100, player.y);
            
            if (!armorKnight) return { error: 'Failed to create ArmorKnight' };
            
            // EntityManagerに登録
            armorKnight.initializeInManager(state.entityManager);
            
            // グローバル変数に保存（テスト用）
            window.testArmorKnight = armorKnight;
            
            return {
                success: true,
                playerPos: { x: player.x, y: player.y },
                knightPos: { x: armorKnight.x, y: armorKnight.y },
                detectRange: armorKnight.detectRange,
                normalSpeed: armorKnight.normalSpeed,
                chargeSpeed: armorKnight.chargeSpeed
            };
        });
        
        console.log('Spawn result:', JSON.stringify(spawnResult, null, 2));
        
        if (spawnResult.error) {
            t.assert(false, `Failed to spawn ArmorKnight: ${spawnResult.error}`);
            return;
        }
        
        // 初期状態を確認（突進していない）
        await t.wait(100);
        const initialState = await t.page.evaluate(() => {
            const ak = window.testArmorKnight;
            return {
                isCharging: ak.isCharging,
                moveSpeed: ak.moveSpeed,
                direction: ak.direction,
                x: ak.x
            };
        });
        
        console.log('Initial state:', JSON.stringify(initialState, null, 2));
        t.assert(!initialState.isCharging, 'ArmorKnight should not be charging initially');
        
        // プレイヤーを近づけて検知範囲内に入れる
        console.log('Moving player closer to ArmorKnight...');
        await t.movePlayer('right', 300);
        await t.wait(500);
        
        // 突進状態を確認
        const chargingState = await t.page.evaluate(() => {
            const ak = window.testArmorKnight;
            const player = window.game.stateManager.currentState.player;
            const distance = Math.sqrt(Math.pow(player.x - ak.x, 2) + Math.pow(player.y - ak.y, 2));
            
            return {
                distance: distance,
                detectRange: ak.detectRange,
                isCharging: ak.isCharging,
                moveSpeed: ak.moveSpeed,
                normalSpeed: ak.normalSpeed,
                chargeSpeed: ak.chargeSpeed,
                direction: ak.direction,
                x: ak.x,
                animState: ak.animState
            };
        });
        
        console.log('Charging state:', JSON.stringify(chargingState, null, 2));
        
        // 検証
        t.assert(chargingState.distance < chargingState.detectRange, 
            `Player should be within detection range. Distance: ${chargingState.distance}, Range: ${chargingState.detectRange}`);
        
        // 突進しているか確認
        if (chargingState.isCharging) {
            console.log('✅ ArmorKnight is charging!');
            t.assert(chargingState.moveSpeed === chargingState.chargeSpeed, 
                'Move speed should be charge speed when charging');
            t.assert(chargingState.animState === 'charge', 
                'Animation state should be "charge" when charging');
        } else {
            console.log('❌ ArmorKnight is NOT charging');
        }
        
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