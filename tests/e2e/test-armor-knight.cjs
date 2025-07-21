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
        timeout: 30000
    });

    await test.runTest(async (t) => {
        await t.init('ArmorKnight Basic Test');
        
        // エラートラッキングを設定
        await t.injectErrorTracking();
        
        // ArmorKnightテストステージで開始
        await t.navigateToGame('http://localhost:3000?s=test-armor-knight&skip_title=true');
        
        // ゲームの初期化を待つ
        await t.waitForGameInitialization();
        
        // play状態であることを確認
        await t.assertState('play');
        
        // 入力フォーカスを確保
        await t.ensureInputFocus();
        
        // プレイヤーの存在を確認
        await t.assertPlayerExists();
        
        console.log('\n=== ArmorKnight基本動作テスト ===');
        
        // ArmorKnightの初期状態を確認
        const armorKnightInitial = await t.page.evaluate(() => {
            const state = window.game.stateManager.currentState;
            const armorKnight = state.entityManager.enemies.find(e => e.constructor.name === 'ArmorKnight');
            return armorKnight ? {
                x: armorKnight.x,
                y: armorKnight.y,
                health: armorKnight.health,
                maxHealth: armorKnight.maxHealth,
                damage: armorKnight.damage,
                moveSpeed: armorKnight.moveSpeed,
                normalSpeed: armorKnight.normalSpeed,
                chargeSpeed: armorKnight.chargeSpeed,
                canBeStomped: armorKnight.canBeStomped()
            } : null;
        });
        
        console.log('ArmorKnight initial state:', armorKnightInitial);
        
        // 基本パラメータの検証
        t.assert(armorKnightInitial !== null, 'ArmorKnight should exist');
        t.assert(armorKnightInitial.maxHealth === 3, 'ArmorKnight should have 3 max health');
        t.assert(armorKnightInitial.canBeStomped === false, 'ArmorKnight should not be stompable');
        
        console.log('\n=== 横からの接触ダメージテスト ===');
        
        // プレイヤーの初期状態を記録（サイズも取得）
        const beforeCollision = await t.page.evaluate(() => {
            const player = window.game.stateManager.currentState.player;
            return {
                health: player.health,
                isSmall: player.isSmall,
                width: player.width,
                height: player.height
            };
        });
        console.log('Player before collision:', beforeCollision);
        
        // プレイヤーをArmorKnightの位置まで移動
        await t.movePlayer('right', 2000);
        await t.wait(500);
        
        const afterCollision = await t.page.evaluate(() => {
            const player = window.game.stateManager.currentState.player;
            return {
                health: player.health,
                isSmall: player.isSmall,
                width: player.width,
                height: player.height
            };
        });
        console.log('Player after collision:', afterCollision);
        
        // 検証：プレイヤーが小さくなったか（ダメージを受けたか）
        t.assert(afterCollision.isSmall === true && beforeCollision.isSmall === false, 
            'Player should become small after collision with ArmorKnight');
        t.assert(afterCollision.height < beforeCollision.height, 
            'Player height should decrease after taking damage');
        
        console.log('\n=== ArmorKnightの移動確認 ===');
        
        // ArmorKnightの移動を確認
        await t.wait(1000);
        
        const armorKnightAfter = await t.page.evaluate(() => {
            const state = window.game.stateManager.currentState;
            const armorKnight = state.entityManager.enemies.find(e => e.constructor.name === 'ArmorKnight');
            return armorKnight ? {
                x: armorKnight.x,
                y: armorKnight.y,
                direction: armorKnight.direction,
                vx: armorKnight.vx,
                grounded: armorKnight.grounded
            } : null;
        });
        
        console.log('ArmorKnight after movement:', armorKnightAfter);
        
        // 移動していることを確認
        t.assert(armorKnightAfter.x !== armorKnightInitial.x, 
            'ArmorKnight should be moving');
        t.assert(armorKnightAfter.grounded === true, 
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