/**
 * ArmorKnight基本動作テスト
 * 
 * このテストでは以下を確認します：
 * 1. 横からの接触時のダメージ
 * 2. ArmorKnightの基本的な動作確認
 */

const GameTestHelpers = require('./utils/GameTestHelpers.cjs');
const testConfig = require('./utils/testConfig.cjs');

async function runArmorKnightTest() {
    const test = new GameTestHelpers({
        headless: testConfig.headless,
        verbose: true,
        timeout: 60000  // タイムアウトを60秒に延長
    });

    await test.runTest(async (t) => {
        await t.init('ArmorKnight Basic Test');
        
        // 新しいquickStartメソッドで簡単にゲームを開始！
        // これだけで、エラートラッキング、ゲーム初期化、フォーカス設定、プレイヤー確認まで完了
        await t.quickStart('test-armor-knight');
        
        console.log('\n=== ArmorKnight基本動作テスト ===');
        
        // ArmorKnightの初期状態を確認（新しいgetEntityメソッドを使用）
        const armorKnight = await t.getEntity('ArmorKnight', { single: true });
        
        // ArmorKnightの詳細情報を取得（特殊なプロパティのため別途取得）
        const armorKnightDetails = await t.page.evaluate(() => {
            const state = window.game.stateManager.currentState;
            const ak = state.entityManager.enemies.find(e => e.constructor.name === 'ArmorKnight');
            return ak ? {
                maxHealth: ak.maxHealth,
                damage: ak.damage,
                normalSpeed: ak.normalSpeed,
                chargeSpeed: ak.chargeSpeed,
                canBeStomped: ak.canBeStomped()
            } : null;
        });
        
        const armorKnightInitial = armorKnight ? {
            ...armorKnight,
            ...armorKnightDetails
        } : null;
        
        console.log('ArmorKnight initial state:', armorKnightInitial);
        
        // 基本パラメータの検証
        t.assert(armorKnightInitial !== null, 'ArmorKnight should exist');
        t.assert(armorKnightInitial.maxHealth === 3, 'ArmorKnight should have 3 max health');
        t.assert(armorKnightInitial.canBeStomped === false, 'ArmorKnight should not be stompable');
        
        console.log('\n=== 横からの接触ダメージテスト ===');
        
        // プレイヤーの初期状態を記録（新しいgetEntityメソッドを使用）
        const beforeCollision = await t.getEntity('player');
        console.log('Player before collision:', beforeCollision);
        
        // プレイヤーをArmorKnightの位置まで移動
        await t.movePlayer('right', 2000);
        await t.wait(500);
        
        const afterCollision = await t.getEntity('player');
        console.log('Player after collision:', afterCollision);
        
        // 検証：プレイヤーが小さくなったか（ダメージを受けたか）
        t.assert(afterCollision.isSmall === true && beforeCollision.isSmall === false, 
            'Player should become small after collision with ArmorKnight');
        t.assert(afterCollision.height < beforeCollision.height, 
            'Player height should decrease after taking damage');
        
        console.log('\n=== ArmorKnightの移動確認 ===');
        
        // ArmorKnightの移動を確認
        await t.wait(1000);
        
        const armorKnightAfter = await t.getEntity('ArmorKnight', { single: true });
        
        // 追加の詳細情報（必要に応じて）
        const armorKnightExtraInfo = await t.page.evaluate(() => {
            const state = window.game.stateManager.currentState;
            const ak = state.entityManager.enemies.find(e => e.constructor.name === 'ArmorKnight');
            return ak ? { direction: ak.direction, grounded: ak.grounded } : null;
        });
        
        console.log('ArmorKnight after movement:', armorKnightAfter);
        
        // 移動していることを確認
        t.assert(armorKnightAfter.x !== armorKnightInitial.x, 
            'ArmorKnight should be moving');
        t.assert(armorKnightExtraInfo.grounded === true, 
            'ArmorKnight should be grounded');
        
        // 成功メッセージ
        console.log('\n✅ ArmorKnight basic tests passed!');
        
        // エラーチェック
        await t.checkForErrors();
    });
}

// テストを実行
if (require.main === module) {
    runArmorKnightTest().catch(error => {
        console.error('Test failed:', error);
        process.exit(1);
    });
}

module.exports = runArmorKnightTest;