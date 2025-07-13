const GameTestHelpers = require('./utils/GameTestHelpers.cjs');

/**
 * パフォーマンスベースライン計測テスト
 * 改善前の状態を記録するため
 */
async function measurePerformanceBaseline() {
    const test = new GameTestHelpers({
        headless: false,
        verbose: true,
        timeout: 90000  // 90秒に延長
    });
    
    await test.runTest(async (t) => {
        // Initialize
        await t.init('Performance Baseline Measurement');
        await t.injectErrorTracking();
        await t.navigateToGame('http://localhost:3000?s=0-5&skip_title=true');
        await t.waitForGameInitialization();
        
        // With skip_title=true, we should go directly to play state
        await t.assertState('play');
        
        // Ensure input focus
        await t.clickAt(100, 100);
        await t.wait(1000);
        await t.assertPlayerExists();
        
        // テスト用にライフを増やす（10ライフに設定）
        await t.page.evaluate(() => {
            if (window.debugSetLives) {
                window.debugSetLives(10);
            } else {
                console.error('debugSetLives関数が見つかりません');
            }
        });
        await t.wait(100); // HUD更新を待つ
        
        // デバッグオーバーレイを表示
        await t.page.keyboard.press('F3');
        await t.wait(500);
        
        // パフォーマンス詳細を表示
        await t.page.keyboard.press('p');
        await t.wait(500);
        
        // HUDManagerの状態を確認
        const hudState = await t.page.evaluate(() => {
            const game = window.game;
            if (!game || !game.stateManager) return { error: 'game or stateManager not found' };
            
            const currentState = game.stateManager.currentState;
            if (!currentState) return { error: 'currentState not found' };
            
            // PlayStateのgetHudManagerメソッドを使用
            const hudManager = currentState.getHudManager ? currentState.getHudManager() : currentState.hudManager;
            if (!hudManager) return { error: 'hudManager not found' };
            
            return {
                hasBackgroundCanvas: !!hudManager.hudBackgroundCanvas,
                hasPauseCanvas: !!hudManager.pauseBackgroundCanvas,
                isInitialized: !!hudManager.hudBackgroundCanvas || !!hudManager.pauseBackgroundCanvas,
                patternCacheSize: hudManager.patternTileCache ? hudManager.patternTileCache.size : 0
            };
        });
        
        console.log('🔍 HUDManager状態:', hudState);
        
        console.log('🎮 パフォーマンスベースライン計測開始...\n');
        console.log('📊 計測中... (15秒間、プレイヤーを動かしながら)');
        
        // パフォーマンスデータを収集
        const performanceData = {
            fps: [],
            frameTime: [],
            drawCalls: {
                total: [],
                sprites: [],
                rects: [],
                text: []
            }
        };
        
        // 最初のフレームでdrawRect呼び出しを確認
        await t.wait(100);
        const firstCheck = await t.page.evaluate(() => {
            const perfDetails = document.querySelector('#performance-details');
            if (perfDetails) {
                return perfDetails.textContent;
            }
            return 'Performance details not found';
        });
        console.log('📊 初回パフォーマンス詳細:', firstCheck);
        
        let currentDirection = null;
        
        // 15秒間、1秒ごとにパフォーマンスデータを収集
        for (let i = 0; i < 15; i++) {
            // 3秒ごとに方向転換してプレイヤーを動かす
            if (i % 3 === 0) {
                // 前の方向キーを離す
                if (currentDirection) {
                    await t.page.keyboard.up(currentDirection === 'right' ? 'ArrowRight' : 'ArrowLeft');
                }
                
                // 新しい方向に動かす
                currentDirection = (i / 3) % 2 === 0 ? 'right' : 'left';
                await t.page.keyboard.down(currentDirection === 'right' ? 'ArrowRight' : 'ArrowLeft');
            }
            
            // たまにジャンプ
            if (i % 2 === 0) {
                await t.page.keyboard.press('Space');
            }
            
            const metrics = await t.page.evaluate(() => {
                const game = window.game;
                if (!game) return null;
                
                // デバッグオーバーレイから取得
                const statsElements = document.querySelectorAll('#debug-info span');
                if (!statsElements || statsElements.length < 7) return null;
                
                const fps = parseInt(statsElements[0].textContent) || 0;
                const frameTimeText = statsElements[5].textContent;
                const frameTime = parseFloat(frameTimeText.replace('ms', '')) || 0;
                const drawCallsTotal = parseInt(statsElements[6].textContent) || 0;
                
                const result = {
                    fps: fps,
                    frameTime: frameTime,
                    drawCalls: {
                        total: drawCallsTotal,
                        sprites: 0,
                        rects: 0,
                        text: 0
                    }
                };
                
                // パフォーマンス詳細から個別の値を取得
                const perfDetails = document.querySelector('#performance-details');
                if (perfDetails) {
                    const text = perfDetails.textContent;
                    const spritesMatch = text.match(/Sprites: (\d+)/);
                    const rectsMatch = text.match(/Rects: (\d+)/);
                    const textMatch = text.match(/Text: (\d+)/);
                    
                    result.drawCalls.sprites = spritesMatch ? parseInt(spritesMatch[1]) : 0;
                    result.drawCalls.rects = rectsMatch ? parseInt(rectsMatch[1]) : 0;
                    result.drawCalls.text = textMatch ? parseInt(textMatch[1]) : 0;
                }
                
                return result;
            });
            
            if (metrics) {
                performanceData.fps.push(metrics.fps);
                performanceData.frameTime.push(metrics.frameTime);
                performanceData.drawCalls.total.push(metrics.drawCalls.total);
                performanceData.drawCalls.sprites.push(metrics.drawCalls.sprites || 0);
                performanceData.drawCalls.rects.push(metrics.drawCalls.rects || 0);
                performanceData.drawCalls.text.push(metrics.drawCalls.text || 0);
                
                process.stdout.write(`\r  計測中... ${i + 1}/15秒 | FPS: ${metrics.fps.toFixed(1)} | Frame: ${metrics.frameTime.toFixed(2)}ms | Calls: ${metrics.drawCalls.total}`);
            }
            
            await t.wait(1000);
        }
        
        // 最後のキーを離す
        if (currentDirection) {
            await t.page.keyboard.up(currentDirection === 'right' ? 'ArrowRight' : 'ArrowLeft');
        }
        
        console.log('\n\n========================================');
        console.log('📊 パフォーマンスベースライン計測結果');
        console.log('========================================\n');
        
        // 平均値を計算
        const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
        const min = (arr) => Math.min(...arr);
        const max = (arr) => Math.max(...arr);
        
        console.log('FPS:');
        console.log(`  平均: ${avg(performanceData.fps).toFixed(1)} fps`);
        console.log(`  最小: ${min(performanceData.fps).toFixed(1)} fps`);
        console.log(`  最大: ${max(performanceData.fps).toFixed(1)} fps`);
        
        console.log('\nフレーム時間:');
        console.log(`  平均: ${avg(performanceData.frameTime).toFixed(2)} ms`);
        console.log(`  最小: ${min(performanceData.frameTime).toFixed(2)} ms`);
        console.log(`  最大: ${max(performanceData.frameTime).toFixed(2)} ms`);
        
        console.log('\n描画呼び出し回数 (平均):');
        console.log(`  合計: ${avg(performanceData.drawCalls.total).toFixed(0)} 回/フレーム`);
        console.log(`  Sprites: ${avg(performanceData.drawCalls.sprites).toFixed(0)} 回`);
        console.log(`  Rects: ${avg(performanceData.drawCalls.rects).toFixed(0)} 回`);
        console.log(`  Text: ${avg(performanceData.drawCalls.text).toFixed(0)} 回`);
        
        console.log('\n========================================');
        
        // 詳細メトリクスをログ出力
        await t.page.evaluate(() => {
            const performanceMonitor = window.PerformanceMonitor?.getInstance();
            if (performanceMonitor && performanceMonitor.logDetailedMetrics) {
                performanceMonitor.logDetailedMetrics();
            }
        });
        
        // CSVデータをエクスポート
        const csvData = await t.page.evaluate(() => {
            const performanceMonitor = window.PerformanceMonitor?.getInstance();
            if (performanceMonitor && performanceMonitor.exportMetrics) {
                return performanceMonitor.exportMetrics();
            }
            return null;
        });
        
        if (csvData) {
            const fs = require('fs');
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `tests/logs/performance-baseline-${timestamp}.csv`;
            fs.writeFileSync(filename, csvData);
            console.log(`\n📄 詳細データを保存: ${filename}`);
        }
        
        console.log('\n✅ 計測完了');
        
        await t.checkForErrors();
    });
}

// Run the test
if (require.main === module) {
    measurePerformanceBaseline()
        .then(() => {
            process.exit(0);
        })
        .catch(error => {
            console.error('Test failed:', error);
            process.exit(1);
        });
}

module.exports = measurePerformanceBaseline;