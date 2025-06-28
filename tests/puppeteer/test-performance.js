/**
 * パフォーマンステスト
 * 大量のコインを配置した状態でのFPSを計測
 */
import puppeteer from 'puppeteer';

async function testPerformance() {
    console.log('🎮 Performance Test Starting...\n');
    
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        
        // エラー収集
        const errors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                errors.push(msg.text());
            }
        });
        
        page.on('pageerror', error => {
            errors.push(error.message);
        });
        
        // ページ読み込み
        console.log('1. Loading game...');
        await page.goto('http://localhost:3000', { 
            waitUntil: 'networkidle2',
            timeout: 30000 
        });
        
        // ゲーム初期化を待つ
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // パフォーマンステストレベルを直接読み込む
        console.log('2. Loading performance test level...');
        await page.evaluate(() => {
            // ゲームを開始してパフォーマンステストレベルを読み込む
            if (window.game && window.game.stateManager) {
                window.game.stateManager.setState('play', { level: 'performance-test' });
            }
        });
        
        // レベル読み込みを待つ
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // レベル情報を確認
        const levelInfo = await page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            return {
                currentState: state?.constructor.name,
                levelName: state?.currentLevel,
                itemCount: state?.items?.length || 0,
                coinCount: state?.items?.filter(item => item.constructor.name === 'Coin').length || 0
            };
        });
        
        console.log('3. Level loaded:', levelInfo);
        
        // FPS計測の準備
        console.log('\n4. Starting FPS measurement...');
        
        // Performance APIを使用してFPSを計測
        const fpsData = await page.evaluate(async () => {
            const measurements = [];
            let lastTime = performance.now();
            let frameCount = 0;
            
            // 5秒間計測
            const measurementDuration = 5000;
            const startTime = performance.now();
            
            return new Promise((resolve) => {
                const measureFrame = () => {
                    const currentTime = performance.now();
                    const deltaTime = currentTime - lastTime;
                    
                    if (deltaTime > 0) {
                        const fps = 1000 / deltaTime;
                        measurements.push(fps);
                    }
                    
                    lastTime = currentTime;
                    frameCount++;
                    
                    if (currentTime - startTime < measurementDuration) {
                        requestAnimationFrame(measureFrame);
                    } else {
                        // 計測完了
                        const avgFps = measurements.reduce((a, b) => a + b, 0) / measurements.length;
                        const minFps = Math.min(...measurements);
                        const maxFps = Math.max(...measurements);
                        
                        // 標準偏差を計算
                        const variance = measurements.reduce((sum, fps) => {
                            return sum + Math.pow(fps - avgFps, 2);
                        }, 0) / measurements.length;
                        const stdDev = Math.sqrt(variance);
                        
                        resolve({
                            avgFps: avgFps.toFixed(2),
                            minFps: minFps.toFixed(2),
                            maxFps: maxFps.toFixed(2),
                            stdDev: stdDev.toFixed(2),
                            frameCount: frameCount,
                            duration: (currentTime - startTime) / 1000
                        });
                    }
                };
                
                requestAnimationFrame(measureFrame);
            });
        });
        
        // 結果表示
        console.log('\n📊 Performance Test Results:');
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`Coins rendered: ${levelInfo.coinCount}`);
        console.log(`Measurement duration: ${fpsData.duration.toFixed(1)}s`);
        console.log(`Total frames: ${fpsData.frameCount}`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`Average FPS: ${fpsData.avgFps}`);
        console.log(`Min FPS: ${fpsData.minFps}`);
        console.log(`Max FPS: ${fpsData.maxFps}`);
        console.log(`Std Deviation: ${fpsData.stdDev}`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        
        // パフォーマンス判定
        const avgFps = parseFloat(fpsData.avgFps);
        const FPS_THRESHOLD = 55;
        
        if (avgFps >= 60) {
            console.log('✅ EXCELLENT: Maintaining 60 FPS');
        } else if (avgFps >= FPS_THRESHOLD) {
            console.log('✅ PASS: FPS is above threshold');
        } else {
            console.log(`⚠️  WARNING: FPS below ${FPS_THRESHOLD} threshold`);
            console.log('   Consider optimizing coin rendering');
        }
        
        // スクリーンショット
        await page.screenshot({ path: 'tests/screenshots/performance-test.png' });
        console.log('\n📸 Screenshot saved: performance-test.png');
        
        // エラーチェック
        if (errors.length > 0) {
            console.log('\n❌ Errors detected during test:');
            errors.forEach(error => console.log(`  - ${error}`));
        }
        
    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await browser.close();
    }
}

// テスト実行
testPerformance().catch(console.error);