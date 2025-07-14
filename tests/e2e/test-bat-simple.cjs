const GameTestHelpers = require('./utils/GameTestHelpers.cjs');

// 最もシンプルなコウモリテスト
async function runTest() {
    const test = new GameTestHelpers({
        headless: false,
        verbose: true,
        timeout: 30000
    });

    await test.runTest(async (t) => {
        await t.init('Bat Simple Position Test');
        await t.navigateToGame('http://localhost:3000?s=2-1&skip_title=true');
        await t.waitForGameInitialization();
        
        await t.assertState('play');
        await t.ensureInputFocus();
        
        // 手動でコウモリの位置を変更
        console.log('\n--- 手動位置変更テスト ---');
        
        const manualTest = await t.page.evaluate(() => {
            const bats = window.game?.stateManager?.currentState?.entityManager?.enemies?.filter(e => e.constructor.name === 'Bat') || [];
            if (bats.length > 0) {
                const bat = bats[0];
                const oldX = bat.x;
                const oldY = bat.y;
                
                // 手動で位置を変更
                bat.x = 100;
                bat.y = 100;
                
                // 1フレーム後の位置を確認
                setTimeout(() => {
                    console.log(`[ManualTest] After 1 frame: x=${bat.x}, y=${bat.y}`);
                }, 16);
                
                return {
                    oldPos: { x: oldX, y: oldY },
                    newPos: { x: bat.x, y: bat.y },
                    physicsEnabled: bat.physicsEnabled,
                    active: bat.active
                };
            }
            return null;
        });
        
        console.log('手動変更結果:', manualTest);
        
        await t.wait(1000);
        
        // 位置が維持されているか確認
        const afterTest = await t.page.evaluate(() => {
            const bats = window.game?.stateManager?.currentState?.entityManager?.enemies?.filter(e => e.constructor.name === 'Bat') || [];
            if (bats.length > 0) {
                const bat = bats[0];
                return { x: bat.x, y: bat.y };
            }
            return null;
        });
        
        console.log('1秒後の位置:', afterTest);
        
        // flyTimeの加算テスト
        console.log('\n--- flyTime加算テスト ---');
        const flyTimeTest = await t.page.evaluate(() => {
            const bats = window.game?.stateManager?.currentState?.entityManager?.enemies?.filter(e => e.constructor.name === 'Bat') || [];
            if (bats.length > 0) {
                const bat = bats[0];
                bat.batState = 'flying';
                
                const tests = [];
                
                // 基本的な加算
                bat.flyTime = 0;
                const before = bat.flyTime;
                bat.flyTime += 0.016;
                tests.push({
                    test: '基本加算',
                    before: before,
                    after: bat.flyTime,
                    success: bat.flyTime > 0
                });
                
                // プロパティの確認
                tests.push({
                    test: 'プロパティ存在',
                    hasProperty: 'flyTime' in bat,
                    type: typeof bat.flyTime,
                    value: bat.flyTime
                });
                
                return tests;
            }
            return null;
        });
        
        console.log('flyTimeテスト結果:', flyTimeTest);
        
        await t.screenshot('bat-simple-test');
    });
}

runTest().catch(console.error);