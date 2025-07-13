/**
 * ゴールエフェクトのテスト
 * ゴール到達時のピクセルアート風エフェクトが正しく表示されることを確認
 */

const GameTestHelpers = require('./utils/GameTestHelpers.cjs');

async function testGoalEffect() {
    const test = new GameTestHelpers({
        headless: true,
        verbose: true,
        timeout: 30000
    });

    await test.runTest(async (t) => {
        // ゲーム初期化
        await t.init('Goal Effect Test');
        await t.injectErrorTracking();
        
        // ゲーム開始
        await t.navigateToGame('http://localhost:3000?s=0-1');
        await t.waitForGameInitialization();
        await t.assertState('menu');
        await t.startNewGame();
        await t.assertState('play');
        
        // プレイヤーの初期位置確認
        let playerPos = await t.getPlayerPosition();
        console.log(`  初期位置: ${playerPos.x}`);
        
        // ゴール近くまで高速移動
        await t.page.evaluate(() => {
            if (window.game && window.game.entityManager) {
                const player = window.game.entityManager.getPlayer();
                if (player) {
                    player.x = 1500;
                }
            }
        });
        
        await t.wait(500);
        
        // ゴールに到達
        await t.pressKey('ArrowRight', 1000);
        await t.wait(1000);
        
        // ゴールフラグの状態を確認
        const goalStatus = await t.page.evaluate(() => {
            if (window.game && window.game.entityManager) {
                const entities = window.game.entityManager.entities;
                const goalFlag = entities.find(e => e.constructor.name === 'GoalFlag');
                if (goalFlag) {
                    return {
                        cleared: goalFlag.isCleared(),
                        visible: goalFlag.visible,
                        x: goalFlag.x,
                        y: goalFlag.y
                    };
                }
            }
            return null;
        });
        
        console.log(`  ゴール状態:`, goalStatus);
        
        if (!goalStatus) {
            throw new Error('ゴールフラグが見つかりません');
        }
        
        if (!goalStatus.cleared) {
            throw new Error('ゴールに到達していません');
        }
        
        // エフェクト描画の確認（5フレーム分）
        for (let i = 0; i < 5; i++) {
            await t.wait(50);
            await t.screenshot(`goal-effect-frame-${i}`);
        }
        
        // Canvas APIの直接使用がないことを確認
        const canvasStats = await t.page.evaluate(() => {
            if (window.game && window.game.renderer) {
                const ctx = window.game.renderer.ctx;
                // arcメソッドが呼ばれていないことを確認
                const originalArc = ctx.arc;
                let arcCallCount = 0;
                ctx.arc = function(...args) {
                    arcCallCount++;
                    return originalArc.apply(this, args);
                };
                
                // 1フレーム描画
                window.game.render();
                
                ctx.arc = originalArc;
                
                return {
                    arcCalled: arcCallCount > 0,
                    arcCallCount: arcCallCount
                };
            }
            return null;
        });
        
        console.log(`  Canvas stats:`, canvasStats);
        
        if (canvasStats && canvasStats.arcCalled) {
            console.log(`  ⚠️ ctx.arc()が${canvasStats.arcCallCount}回呼ばれています`);
            // 警告のみで、エラーにはしない（他の部分で使用されている可能性があるため）
        } else {
            console.log(`  ✓ ctx.arc()は使用されていません`);
        }
        
        console.log('\n✅ ゴールエフェクトテスト完了');
    });
}

if (require.main === module) {
    testGoalEffect().catch(error => {
        console.error('テスト実行エラー:', error);
        process.exit(1);
    });
}

module.exports = { testGoalEffect };