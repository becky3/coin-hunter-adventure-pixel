/**
 * ダッシュ移動機能のテスト
 * SHIFTキーを押しながら移動することで速度が上がることを確認
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
        await t.init('Dash Movement Test');
        
        console.log('=== Testing dash movement on stage 0-4 ===');
        
        // ステージ0-4（平坦で敵がいない）で開始
        await t.quickStart('0-4');
        
        // プレイヤーの初期位置を取得
        const player = await t.getEntity('player');
        console.log('Initial player position:', player.x, player.y);
        
        // Test 1: 通常移動の速度を測定
        console.log('\n1. Testing normal movement speed...');
        const normalStartX = player.x;
        
        // 1秒間右に移動
        await t.holdKey('ArrowRight', 1000);
        
        const normalEndX = (await t.getEntity('player')).x;
        const normalDistance = normalEndX - normalStartX;
        console.log(`Normal movement: ${normalDistance}px in 1 second`);
        
        // 少し待機
        await t.wait(500);
        
        // Test 2: ダッシュ移動の速度を測定
        console.log('\n2. Testing dash movement speed...');
        const dashStartX = (await t.getEntity('player')).x;
        
        // キー押下を開始
        console.log('Pressing Shift + Right...');
        await t.page.keyboard.down('ShiftLeft');
        await t.page.keyboard.down('ArrowRight');
        
        // 加速データを収集
        const accelerationData = await t.page.evaluate(() => {
            return new Promise((resolve) => {
                const player = window.game.stateManager.currentState.player;
                const data = [];
                let startTime = Date.now();
                const startX = player.x;
                
                const interval = setInterval(() => {
                    const elapsed = (Date.now() - startTime) / 1000;
                    data.push({
                        time: elapsed,
                        dashTimer: player.dashTimer,
                        currentMultiplier: player.currentDashMultiplier,
                        x: player.x,
                        distance: player.x - startX
                    });
                    
                    if (elapsed >= 1.0) {
                        clearInterval(interval);
                        resolve({
                            data: data,
                            finalDistance: player.x - startX
                        });
                    }
                }, 100); // 100msごとに記録
            });
        });
        
        // キーを離す
        await t.page.keyboard.up('ArrowRight');
        await t.page.keyboard.up('ShiftLeft');
        
        console.log('\n=== Acceleration Curve ===');
        console.log('Time | Multiplier | Distance');
        accelerationData.data.forEach(d => {
            if (d.time <= 0.5 || Math.abs(d.time - 0.5) < 0.05 || d.time >= 0.9) {
                console.log(`${d.time.toFixed(1)}s | ${d.currentMultiplier.toFixed(2)}x | ${d.distance.toFixed(1)}px`);
            }
        });
        
        const halfSecondData = accelerationData.data.find(d => d.time >= 0.5);
        console.log(`\n0.5秒時点の速度倍率: ${halfSecondData.currentMultiplier.toFixed(3)}x (目標: 2.4x)`);
        
        const dashDistance = accelerationData.finalDistance;
        console.log(`\nDash movement: ${dashDistance}px in 1 second`);
        
        // ダッシュが通常移動より速いことを確認
        t.assert(dashDistance > normalDistance * 1.5, 
            `Dash distance (${dashDistance}) should be at least 1.5x normal distance (${normalDistance})`);
        
        // Test 3: ジャンプ中のダッシュ
        console.log('\n3. Testing dash during jump...');
        const jumpStartX = (await t.getEntity('player')).x;
        
        // ジャンプしてからダッシュ
        await t.pressKey('Space');
        await t.wait(100);
        
        await t.page.keyboard.down('ShiftRight');
        await t.page.keyboard.down('ArrowRight');
        
        await t.wait(800);
        
        await t.page.keyboard.up('ArrowRight');
        await t.page.keyboard.up('ShiftRight');
        
        const jumpEndX = (await t.getEntity('player')).x;
        const jumpDistance = jumpEndX - jumpStartX;
        console.log(`Jump dash distance: ${jumpDistance}px`);
        
        t.assert(jumpDistance > 0, 'Player should move horizontally during jump dash');
        
        // Test 4: アニメーション速度の確認
        console.log('\n4. Testing animation speed change...');
        
        // 通常歩行のアニメーションデータを取得
        const normalAnimData = await t.page.evaluate(() => {
            return new Promise((resolve) => {
                const player = window.game.stateManager.currentState.entityManager.getPlayer();
                const frames = [];
                let count = 0;
                
                const interval = setInterval(() => {
                    frames.push(player.animFrame);
                    if (++count >= 10) {
                        clearInterval(interval);
                        resolve(frames);
                    }
                }, 100);
            });
        });
        
        // 通常歩行
        await t.holdKey('ArrowRight', 1000);
        await t.wait(100);
        
        // ダッシュのアニメーションデータを取得
        const dashAnimData = await t.page.evaluate(() => {
            return new Promise((resolve) => {
                const player = window.game.stateManager.currentState.entityManager.getPlayer();
                const frames = [];
                let count = 0;
                
                const interval = setInterval(() => {
                    frames.push(player.animFrame);
                    if (++count >= 10) {
                        clearInterval(interval);
                        resolve(frames);
                    }
                }, 100);
            });
        });
        
        // ダッシュ
        await t.page.keyboard.down('ShiftLeft');
        await t.page.keyboard.down('ArrowRight');
        await t.wait(1000);
        await t.page.keyboard.up('ArrowRight');
        await t.page.keyboard.up('ShiftLeft');
        
        console.log('Normal anim frames:', new Set(normalAnimData).size);
        console.log('Dash anim frames:', new Set(dashAnimData).size);
        
        // エラーチェック
        await t.checkForErrors();
        
        // スクリーンショットを撮る
        await t.screenshot('dash-movement-test');
        
        console.log('✅ All dash movement tests passed!');
    });
}

if (require.main === module) {
    runTest().catch(error => {
        console.error('Test failed:', error);
        process.exit(1);
    });
}

module.exports = runTest;