const GameTestHelpers = require('./utils/GameTestHelpers.cjs');

// Variable Jumpのテスト
async function runTest() {
    const test = new GameTestHelpers({
        headless: false,
        verbose: true,
        timeout: 29000
    });

    await test.runTest(async (t) => {
        // Initialize game
        await t.init('Variable Jump Test');
        
        // Setup error tracking
        await t.injectErrorTracking();
        
        // Navigate to game with test stage
        await t.navigateToGame('http://localhost:3000/?skip_title=true&s=1-1');
        await t.waitForGameInitialization();
        
        // With skip_title=true, we should go directly to play state
        await t.assertState('play');
        
        // Ensure input focus
        await t.ensureInputFocus();
        await t.assertPlayerExists();
        
        console.log('\n=== Testing Variable Jump ===');
        
        // プレイヤーが地面に着地するまで待つ
        console.log('\nWaiting for player to land...');
        await t.wait(1000);
        
        // Variable Jump Boostを適切な値に設定
        console.log('\nSetting variable jump boost to 0.5...');
        await t.page.evaluate(() => {
            const game = window.game;
            const state = game.stateManager.currentState;
            if (state && state.player) {
                state.player.variableJumpBoost = 0.5;
                console.log('[Test] Variable jump boost set to:', state.player.variableJumpBoost);
                console.log('[Test] Player grounded:', state.player.grounded);
                console.log('[Test] Player Y position:', state.player.y);
            }
        });
        
        // 安定のため少し待つ
        await t.wait(500);
        
        // テスト1: 短いジャンプ（即座にボタンを離す）
        console.log('\n--- Test 1: Short Jump (immediate release) ---');
        
        // ジャンプ前の位置を記録
        const startPosition = await t.page.evaluate(() => {
            const state = window.game.stateManager.currentState;
            return { x: state.player.x, y: state.player.y };
        });
        
        // 短いジャンプを実行
        await t.page.keyboard.down(' ');
        await t.wait(20); // 20ms後にリリース
        await t.page.keyboard.up(' ');
        
        // ジャンプの最高点を追跡
        let shortJumpMaxHeight = 0;
        for (let i = 0; i < 30; i++) { // 約0.5秒間追跡
            const height = await t.page.evaluate((startY) => {
                const state = window.game.stateManager.currentState;
                return startY - state.player.y;
            }, startPosition.y);
            
            if (height > shortJumpMaxHeight) {
                shortJumpMaxHeight = height;
            }
            
            await t.wait(16); // 約60FPS
        }
        
        console.log('Short jump max height:', shortJumpMaxHeight.toFixed(1), 'pixels');
        
        // 着地を待つ
        await t.wait(1000);
        
        // テスト2: 長いジャンプ（ボタンを長押し）
        console.log('\n--- Test 2: Long Jump (300ms hold) ---');
        
        // ジャンプ前の位置を記録
        const startPosition2 = await t.page.evaluate(() => {
            const state = window.game.stateManager.currentState;
            return { x: state.player.x, y: state.player.y };
        });
        
        // 長いジャンプを実行
        await t.page.keyboard.down(' ');
        
        // ジャンプの最高点を追跡しながら長押し
        let longJumpMaxHeight = 0;
        let elapsedTime = 0;
        const frameTime = 16; // 約60FPS
        const holdDuration = 300; // 300ms長押し
        
        // 再帰的なsetTimeoutを使用してシリアル実行を保証
        const trackJump = async () => {
            try {
                const height = await t.page.evaluate((startY) => {
                    const state = window.game.stateManager.currentState;
                    return startY - state.player.y;
                }, startPosition2.y);
                
                if (height > longJumpMaxHeight) {
                    longJumpMaxHeight = height;
                }
                
                elapsedTime += frameTime;
                
                // 300ms経過したらボタンを離す
                if (elapsedTime >= holdDuration) {
                    await t.page.keyboard.up(' ');
                } else {
                    // まだ時間が残っている場合は次のフレームをスケジュール
                    setTimeout(trackJump, frameTime);
                }
            } catch (e) {
                console.error('Error tracking jump:', e);
            }
        };
        
        // トラッキング開始
        setTimeout(trackJump, frameTime);
        
        // ジャンプが完了するまで待つ
        await t.wait(1500);
        
        console.log('Long jump max height:', longJumpMaxHeight.toFixed(1), 'pixels');
        
        // 結果を比較
        console.log('\n=== Results ===');
        console.log('Short jump height:', shortJumpMaxHeight.toFixed(1), 'pixels');
        console.log('Long jump height:', longJumpMaxHeight.toFixed(1), 'pixels');
        console.log('Difference:', (longJumpMaxHeight - shortJumpMaxHeight).toFixed(1), 'pixels');
        console.log('Height increase:', ((longJumpMaxHeight / shortJumpMaxHeight - 1) * 100).toFixed(1), '%');
        
        // Variable Jumpが機能しているか確認
        const heightIncrease = longJumpMaxHeight / shortJumpMaxHeight;
        t.assert(heightIncrease >= 1.2, // 少なくとも20%は高くなるべき
            `Variable jump not working! Long jump (${longJumpMaxHeight.toFixed(1)}px) should be at least 20% higher than short jump (${shortJumpMaxHeight.toFixed(1)}px). Actual increase: ${((heightIncrease - 1) * 100).toFixed(1)}%`);
        
        console.log('\n✅ Variable jump is working correctly!');
        
        // スクリーンショットを保存
        // await t.screenshot('variable-jump-test-complete');
    });
}

// 単体実行の場合
if (require.main === module) {
    runTest().catch(error => {
        console.error('Test failed:', error);
        process.exit(1);
    });
}

module.exports = runTest;