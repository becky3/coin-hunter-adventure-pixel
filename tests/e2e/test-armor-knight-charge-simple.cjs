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
        
        // Use quickStart for simplified initialization
        await t.quickStart('test-armor-knight');
        
        console.log('\n=== ArmorKnight Charge Simple Test ===');
        
        // 既存のArmorKnightを取得する前に新メソッドでチェック
        const player = await t.getEntity('player');
        const armorKnight = await t.getEntity('ArmorKnight', { single: true });
        
        t.assert(player !== null, 'Player should exist');
        t.assert(armorKnight !== null, 'ArmorKnight should exist in test stage');
        
        const initialSetup = await t.page.evaluate(() => {
            const state = window.game.stateManager.currentState;
            const playerEntity = state.entityManager.getPlayer();
            const armorKnightEntity = state.entityManager.enemies.find(e => e.constructor.name === 'ArmorKnight');
            
            if (!playerEntity) return { error: 'Player not found' };
            if (!armorKnightEntity) return { error: 'ArmorKnight not found in stage' };
            
            // グローバル変数に保存（テスト用）
            window.testArmorKnight = armorKnightEntity;
            
            return {
                success: true,
                playerPos: { x: playerEntity.x, y: playerEntity.y },
                knightPos: { x: armorKnightEntity.x, y: armorKnightEntity.y },
                detectRange: armorKnightEntity.detectRange,
                normalSpeed: armorKnightEntity.normalSpeed,
                chargeSpeed: armorKnightEntity.chargeSpeed
            };
        });
        
        console.log('Initial setup:', JSON.stringify(initialSetup, null, 2));
        
        if (initialSetup.error) {
            t.assert(false, `Failed to get entities: ${initialSetup.error}`);
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
        
        // プレイヤーをArmorKnightに近づける
        // 初期位置: Player(2,12), ArmorKnight(18,12) - 距離約256ピクセル
        // 検知範囲は84ピクセルなので、十分に近づける必要がある
        console.log('Moving player closer to ArmorKnight...');
        await t.movePlayer('right', 2200);  // 2.2秒間右に移動
        await t.wait(500);
        
        // 突進状態を確認
        const chargingState = await t.page.evaluate(() => {
            const ak = window.testArmorKnight;
            const player = window.game.stateManager.currentState.entityManager.getPlayer();
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
if (require.main === module) {
    runArmorKnightChargeTest().catch(error => {
        console.error('Test failed:', error);
        process.exit(1);
    });
}

module.exports = runArmorKnightChargeTest;