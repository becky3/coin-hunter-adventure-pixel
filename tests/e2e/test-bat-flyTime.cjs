const GameTestHelpers = require('./utils/GameTestHelpers.cjs');

// flyTimeの問題を特定するテスト
async function runTest() {
    const test = new GameTestHelpers({
        headless: false,
        verbose: true,
        timeout: 30000
    });

    await test.runTest(async (t) => {
        await t.init('Bat FlyTime Test');
        await t.navigateToGame('http://localhost:3000?s=2-1&skip_title=true');
        await t.waitForGameInitialization();
        
        await t.assertState('play');
        await t.ensureInputFocus();
        
        console.log('\n--- flyTime計算の確認 ---');
        
        // 直接flyTimeの計算をテスト
        const calcTest = await t.page.evaluate(() => {
            const tests = [];
            
            // 基本的な計算テスト
            const deltaTime = 16.666666666666668; // 60 FPS
            const dt = deltaTime / 1000;
            tests.push({
                test: 'deltaTime / 1000',
                deltaTime: deltaTime,
                result: dt,
                isZero: dt === 0
            });
            
            // 実際のコウモリで確認
            const bats = window.game?.stateManager?.currentState?.entityManager?.enemies?.filter(e => e.constructor.name === 'Bat') || [];
            if (bats.length > 0) {
                const bat = bats[0];
                bat.batState = 'flying';
                
                // 5回フレーム更新をシミュレート
                const updates = [];
                for (let i = 0; i < 5; i++) {
                    const before = bat.flyTime;
                    bat.flyTime += deltaTime / 1000;
                    updates.push({
                        frame: i + 1,
                        before: before,
                        after: bat.flyTime,
                        delta: deltaTime / 1000,
                        diff: bat.flyTime - before
                    });
                }
                
                tests.push({
                    test: 'Bat flyTime updates',
                    updates: updates
                });
            }
            
            return tests;
        });
        
        console.log('計算テスト結果:', JSON.stringify(calcTest, null, 2));
        
        // プレイヤーを移動してコウモリを起動
        await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const player = state?.entityManager?.player;
            if (player) {
                player.x = 200;
                player.y = 100;
            }
        });
        
        await t.wait(100);
        
        // updateAIが実際に実行されているか確認
        console.log('\n--- updateAI実行の追跡 ---');
        
        const tracking = await t.page.evaluate(() => {
            const bats = window.game?.stateManager?.currentState?.entityManager?.enemies?.filter(e => e.constructor.name === 'Bat') || [];
            const flyingBats = bats.filter(b => b.batState === 'flying');
            
            if (flyingBats.length > 0) {
                const bat = flyingBats[0];
                
                // updateAIをオーバーライドして追跡
                const originalUpdateAI = bat.updateAI.bind(bat);
                const calls = [];
                
                bat.updateAI = function(deltaTime) {
                    const beforeFlyTime = this.flyTime;
                    originalUpdateAI(deltaTime);
                    const afterFlyTime = this.flyTime;
                    
                    calls.push({
                        deltaTime: deltaTime,
                        beforeFlyTime: beforeFlyTime,
                        afterFlyTime: afterFlyTime,
                        batState: this.batState,
                        x: this.x,
                        y: this.y
                    });
                };
                
                // 少し待って実行を確認
                return new Promise(resolve => {
                    setTimeout(() => {
                        resolve({
                            callCount: calls.length,
                            calls: calls.slice(0, 5) // 最初の5回のみ
                        });
                    }, 500);
                });
            }
            
            return { error: 'No flying bats' };
        });
        
        console.log('updateAI追跡結果:', JSON.stringify(tracking, null, 2));
        
        await t.screenshot('bat-flyTime-test');
    });
}

runTest().catch(console.error);