/**
 * quickStartメソッドの動作確認用シンプルテスト
 */

const GameTestHelpers = require('./utils/GameTestHelpers.cjs');
const testConfig = require('./utils/testConfig.cjs');

async function runTest() {
    const test = new GameTestHelpers({
        headless: testConfig.headless,
        verbose: true,
        timeout: 30000
    });

    await test.runTest(async (t) => {
        await t.init('QuickStart Simple Test');
        
        console.log('=== Testing quickStart method ===');
        
        // シンプルにquickStartを呼ぶ（test-armor-knightステージで）
        await t.quickStart('test-armor-knight');
        
        console.log('✅ quickStart completed!');
        
        // プレイヤーの存在を確認
        const player = await t.getEntity('player');
        console.log('Player info:', player);
        
        t.assert(player !== null, 'Player should exist');
        t.assert(player.x > 0, 'Player should have valid x position');
        t.assert(player.y > 0, 'Player should have valid y position');
        
        // エラーチェック
        await t.checkForErrors();
        
        console.log('✅ All tests passed!');
    });
}

if (require.main === module) {
    runTest().catch(error => {
        console.error('Test failed:', error);
        process.exit(1);
    });
}

module.exports = runTest;