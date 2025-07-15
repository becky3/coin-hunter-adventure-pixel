const GameTestHelpers = require('./utils/GameTestHelpers.cjs');

// 統合されたコウモリのテスト
async function runTest() {
    const test = new GameTestHelpers({
        headless: false,
        verbose: true,
        timeout: 30000
    });

    await test.runTest(async (t) => {
        await t.init('Bat Comprehensive Test');
        await t.navigateToGame('http://localhost:3000?s=2-1&skip_title=true');
        await t.waitForGameInitialization();
        
        await t.assertState('play');
        await t.ensureInputFocus();
        
        console.log('\n=== コウモリの総合テスト ===');
        
        // 1. 表示確認
        console.log('\n--- 1. コウモリの表示確認 ---');
        const displayInfo = await t.page.evaluate(() => {
            const bats = window.game?.stateManager?.currentState?.entityManager?.enemies?.filter(e => e.constructor.name === 'Bat') || [];
            if (bats.length > 0) {
                const bat = bats[0];
                const renderer = window.game?.stateManager?.currentState?.renderer;
                const hasSprite = renderer?.pixelArtRenderer?.sprites?.has('enemies/bat_hang');
                return {
                    count: bats.length,
                    firstBat: {
                        x: bat.x,
                        y: bat.y,
                        width: bat.width,
                        height: bat.height,
                        visible: bat.visible,
                        animState: bat.animState
                    },
                    hasHangSprite: hasSprite
                };
            }
            return { count: 0 };
        });
        
        console.log(`コウモリの数: ${displayInfo.count}`);
        if (displayInfo.count > 0) {
            console.log(`最初のコウモリ: x=${displayInfo.firstBat.x}, y=${displayInfo.firstBat.y}`);
            console.log(`animState: ${displayInfo.firstBat.animState}`);
            console.log(`bat_hangスプライト読み込み: ${displayInfo.hasHangSprite ? '成功' : '失敗'}`);
        }
        
        // 2. 物理設定確認
        console.log('\n--- 2. 物理設定の確認 ---');
        const physicsInfo = await t.page.evaluate(() => {
            const bats = window.game?.stateManager?.currentState?.entityManager?.enemies?.filter(e => e.constructor.name === 'Bat') || [];
            if (bats.length > 0) {
                const bat = bats[0];
                return {
                    physicsEnabled: bat.physicsEnabled,
                    gravity: bat.gravity,
                    gravityScale: bat.gravityScale,
                    friction: bat.friction
                };
            }
            return null;
        });
        console.log('物理設定:', physicsInfo);
        
        // 3. プレイヤー検知と飛行開始
        console.log('\n--- 3. プレイヤー検知テスト ---');
        await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const player = state?.entityManager?.player;
            if (player) {
                player.x = 200;
                player.y = 100;
            }
        });
        
        await t.wait(500);
        
        const detectionInfo = await t.page.evaluate(() => {
            const bats = window.game?.stateManager?.currentState?.entityManager?.enemies?.filter(e => e.constructor.name === 'Bat') || [];
            const flyingBats = bats.filter(b => b.batState === 'flying');
            return {
                totalBats: bats.length,
                flyingBats: flyingBats.length,
                firstFlyingBat: flyingBats.length > 0 ? {
                    x: flyingBats[0].x,
                    y: flyingBats[0].y,
                    batState: flyingBats[0].batState,
                    flyTime: flyingBats[0].flyTime
                } : null
            };
        });
        
        console.log(`飛行中のコウモリ: ${detectionInfo.flyingBats}/${detectionInfo.totalBats}`);
        
        // 4. 放物線飛行の追跡
        console.log('\n--- 4. 放物線飛行パターンの確認 (3秒間) ---');
        let minY = 1000, maxY = 0;
        
        for (let i = 0; i < 6; i++) {
            await t.wait(500);
            
            const info = await t.page.evaluate(() => {
                const bats = window.game?.stateManager?.currentState?.entityManager?.enemies?.filter(e => e.constructor.name === 'Bat') || [];
                const flyingBats = bats.filter(b => b.batState === 'flying');
                
                if (flyingBats.length > 0) {
                    const bat = flyingBats[0];
                    const flightDuration = bat.oneCycleDuration || 2;
                    const ceilingY = bat.ceilingY || 16;
                    const groundY = bat.groundY || 160;
                    const progress = (bat.flyTime % flightDuration) / flightDuration;
                    let targetY;
                    if (progress < 0.5) {
                        const t = progress * 2;
                        const easedT = t * t;
                        targetY = ceilingY + ((groundY - ceilingY) * easedT);
                    } else {
                        const t = (progress - 0.5) * 2;
                        const easedT = 1 - ((1 - t) * (1 - t));
                        targetY = groundY - ((groundY - ceilingY) * easedT);
                    }
                    
                    return {
                        x: Math.round(bat.x),
                        y: Math.round(bat.y * 10) / 10,
                        vx: Math.round(bat.vx * 100) / 100,
                        vy: Math.round(bat.vy * 100) / 100,
                        flyTime: Math.round(bat.flyTime * 100) / 100,
                        targetY: Math.round(targetY * 10) / 10,
                        progress: Math.round(progress * 100) / 100,
                        physicsEnabled: bat.physicsEnabled
                    };
                }
                
                return { noFlyingBats: true };
            });
            
            if (!info.noFlyingBats) {
                console.log(`${i * 0.5}秒: x=${info.x}, y=${info.y}, targetY=${info.targetY}, progress=${info.progress}%`);
                minY = Math.min(minY, info.y);
                maxY = Math.max(maxY, info.y);
            }
        }
        
        // 最初のコウモリから期待値を取得
        const expectedRange = await t.page.evaluate(() => {
            const bats = window.game?.stateManager?.currentState?.entityManager?.enemies?.filter(e => e.constructor.name === 'Bat') || [];
            if (bats.length > 0) {
                const bat = bats[0];
                return {
                    ceilingY: bat.ceilingY || 16,
                    groundY: bat.groundY || 160
                };
            }
            return { ceilingY: 16, groundY: 160 };
        });
        
        console.log(`\nY座標の移動範囲: ${minY} ～ ${maxY} (移動距離: ${maxY - minY}ピクセル)`);
        console.log(`期待される範囲: ${expectedRange.ceilingY} ～ ${expectedRange.groundY} (移動距離: ${expectedRange.groundY - expectedRange.ceilingY}ピクセル)`);
        
        // 5. 最終スクリーンショット
        await t.screenshot('bat-comprehensive-test');
        
        // テスト結果の検証
        if (displayInfo.count === 0) {
            console.error('❌ コウモリが存在しません');
        }
        if (!physicsInfo || physicsInfo.physicsEnabled !== false) {
            console.error('❌ 物理が無効化されていません');
        }
        if (detectionInfo.flyingBats === 0) {
            console.error('❌ プレイヤー検知で飛行を開始していません');
        }
        if (maxY - minY < 50) {
            console.error('❌ 十分な垂直移動がありません');
        }
        
        // 追加デバッグ情報
        console.log('\n--- 追加デバッグ情報 ---');
        const debugInfo = await t.page.evaluate(() => {
            const bats = window.game?.stateManager?.currentState?.entityManager?.enemies?.filter(e => e.constructor.name === 'Bat') || [];
            const flyingBats = bats.filter(b => b.batState === 'flying');
            if (flyingBats.length > 0) {
                const bat = flyingBats[0];
                return {
                    updateAICalled: bat.lastUpdateCheck || false,
                    vx: bat.vx,
                    vy: bat.vy,
                    x: bat.x,
                    y: bat.y,
                    flyTime: bat.flyTime,
                    physicsEnabled: bat.physicsEnabled
                };
            }
            return null;
        });
        console.log('デバッグ情報:', debugInfo);
    });
}

// Run the test if called directly
if (require.main === module) {
    runTest().catch(error => {
        console.error('Test failed:', error);
        process.exit(1);
    });
}

module.exports = runTest;