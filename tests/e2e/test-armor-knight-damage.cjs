/**
 * ArmorKnightダメージテスト
 * 
 * パワーグローブでArmorKnightにダメージを与えられることを確認
 */

const GameTestHelpers = require('./utils/GameTestHelpers.cjs');
const testConfig = require('./utils/testConfig.cjs');

async function runArmorKnightDamageTest() {
    const test = new GameTestHelpers({
        headless: testConfig.headless,
        verbose: true,
        timeout: 30000
    });

    await test.runTest(async (t) => {
        await t.init('ArmorKnight Damage Test');
        
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
        
        // プレイヤーが作成されるまで待つ
        await t.waitForCondition(
            () => window.game?.stateManager?.currentState?.player,
            5000,
            'player creation'
        );
        
        // プレイヤーの存在を確認
        await t.assertPlayerExists();
        
        console.log('\n=== ArmorKnight Damage Test ===');
        
        // 初期状態を確認
        const initialState = await t.page.evaluate(() => {
            const state = window.game.stateManager.currentState;
            const player = state.player;
            const armorKnight = state.entityManager.enemies.find(e => e.constructor.name === 'ArmorKnight');
            
            return {
                player: player ? { x: player.x, y: player.y, hasPowerGlove: player.hasPowerGlove } : null,
                armorKnight: armorKnight ? { 
                    x: armorKnight.x, 
                    y: armorKnight.y, 
                    health: armorKnight.health,
                    maxHealth: armorKnight.maxHealth,
                    damage: armorKnight.damage
                } : null
            };
        });
        
        console.log('Initial state:', JSON.stringify(initialState, null, 2));
        t.assert(initialState.armorKnight, 'ArmorKnight should exist');
        t.assert(initialState.armorKnight.health === 3, 'ArmorKnight should have 3 health');
        
        // パワーグローブまで移動
        console.log('Moving to PowerGlove...');
        await t.movePlayer('right', 500);
        await t.wait(500);
        
        // パワーグローブ取得を確認
        const afterPowerGlove = await t.page.evaluate(() => {
            const player = window.game.stateManager.currentState.player;
            return player ? { hasPowerGlove: player.hasPowerGlove } : null;
        });
        
        console.log('After PowerGlove:', afterPowerGlove);
        t.assert(afterPowerGlove.hasPowerGlove, 'Player should have PowerGlove');
        
        // ArmorKnightに近づく（通り過ぎないように）
        console.log('Moving closer to ArmorKnight...');
        await t.movePlayer('right', 400);
        await t.wait(500);
        
        // 攻撃前のArmorKnightの状態
        const beforeAttack = await t.page.evaluate(() => {
            const armorKnight = window.game.stateManager.currentState.entityManager.enemies.find(
                e => e.constructor.name === 'ArmorKnight'
            );
            return armorKnight ? { health: armorKnight.health } : null;
        });
        console.log('ArmorKnight health before attack:', beforeAttack.health);
        
        // パワーグローブで攻撃（3回）
        console.log('Attacking with PowerGlove...');
        for (let i = 0; i < 3; i++) {
            await t.holdKey('.', 100); // Hold the key for 100ms
            await t.wait(1000);
            
            const afterAttack = await t.page.evaluate(() => {
                const armorKnight = window.game.stateManager.currentState.entityManager.enemies.find(
                    e => e.constructor.name === 'ArmorKnight'
                );
                return armorKnight ? { 
                    health: armorKnight.health, 
                    isDead: armorKnight.state === 'dead' 
                } : null;
            });
            
            console.log(`After attack ${i + 1}:`, afterAttack);
            
            if (afterAttack) {
                const expectedHealth = 3 - (i + 1);
                if (expectedHealth > 0) {
                    t.assert(afterAttack.health === expectedHealth, 
                        `ArmorKnight should have ${expectedHealth} health after ${i + 1} attacks`);
                } else {
                    t.assert(afterAttack.isDead, 'ArmorKnight should be dead after 3 attacks');
                }
            }
        }
        
        // 最終確認
        const finalState = await t.page.evaluate(() => {
            const armorKnight = window.game.stateManager.currentState.entityManager.enemies.find(
                e => e.constructor.name === 'ArmorKnight'
            );
            return armorKnight ? { 
                health: armorKnight.health, 
                isDead: armorKnight.state === 'dead' 
            } : { isDead: true };
        });
        
        console.log('Final state:', finalState);
        t.assert(finalState.isDead, 'ArmorKnight should be defeated');
        
        console.log('\n✅ ArmorKnight damage test passed!');
        
        // エラーチェック
        await t.checkForErrors();
    });
}

// テストを実行
runArmorKnightDamageTest().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});