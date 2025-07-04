const puppeteer = require('puppeteer');

async function runBGMAndDebugTests() {
    console.log('🎮 BGMとデバッグ表示テスト実行中...\n');
    
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    let testsPassed = 0;
    let testsFailed = 0;
    
    // コンソールログを監視
    const logs = [];
    page.on('console', msg => {
        logs.push({ type: msg.type(), text: msg.text() });
    });
    
    try {
        // ゲーム初期化
        await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });
        await page.waitForFunction(() => window.game?.gameLoop?.running, { timeout: 5000 });
        
        // メニュー表示待機
        await page.waitForFunction(
            () => window.game?.stateManager?.currentState?.name === 'menu',
            { timeout: 5000 }
        );
        
        // テスト1: メニューBGM再生確認
        console.log('テスト1: メニューBGM再生確認');
        const menuBGMPlaying = await page.evaluate(() => {
            const musicSystem = window.game?.musicSystem;
            return musicSystem?.isInitialized && musicSystem?.currentBGM?.includes('menu');
        });
        
        if (menuBGMPlaying) {
            console.log('  ✓ メニューBGM再生中');
            testsPassed++;
        } else {
            console.log('  ✗ メニューBGMが再生されていません');
            testsFailed++;
        }
        
        // ゲーム開始
        await page.mouse.click(100, 100);
        await new Promise(resolve => setTimeout(resolve, 100));
        await page.keyboard.press('Space');
        
        // プレイ状態への遷移待機
        await page.waitForFunction(
            () => window.game?.stateManager?.currentState?.name === 'play',
            { timeout: 5000 }
        );
        
        // 初期化完了待機
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // テスト2: ゲームBGM再生確認
        console.log('\nテスト2: ゲームBGM再生確認');
        const gameBGMPlaying = await page.evaluate(() => {
            const musicSystem = window.game?.musicSystem;
            const currentBGM = musicSystem?.currentBGM;
            console.log('Current BGM:', currentBGM);
            console.log('Music System initialized:', musicSystem?.isInitialized);
            return musicSystem?.isInitialized && currentBGM && !currentBGM.includes('menu');
        });
        
        if (gameBGMPlaying) {
            console.log('  ✓ ゲームBGM再生中');
            testsPassed++;
        } else {
            console.log('  ✗ ゲームBGMが再生されていません');
            testsFailed++;
            
            // デバッグ情報出力
            const bgmInfo = await page.evaluate(() => {
                const musicSystem = window.game?.musicSystem;
                return {
                    isInitialized: musicSystem?.isInitialized,
                    currentBGM: musicSystem?.currentBGM,
                    isMuted: musicSystem?.getMuteState()
                };
            });
            console.log('  BGM情報:', bgmInfo);
        }
        
        // テスト3: F3キーでデバッグ表示切り替え
        console.log('\nテスト3: デバッグ表示切り替え');
        await page.keyboard.press('F3');
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const debugVisible = await page.evaluate(() => {
            const debugElement = document.getElementById('debug-info');
            return debugElement && debugElement.style.display !== 'none';
        });
        
        if (debugVisible) {
            console.log('  ✓ デバッグ表示が表示されました');
            testsPassed++;
        } else {
            console.log('  ✗ デバッグ表示が表示されません');
            testsFailed++;
        }
        
        // テスト4: プレイヤー座標更新確認
        console.log('\nテスト4: プレイヤー座標更新確認');
        
        // 初期座標取得
        const initialCoords = await page.evaluate(() => {
            const playerXElement = document.querySelector('#debug-info span');
            const playerYElement = document.querySelector('#debug-info span:nth-of-type(2)');
            return {
                x: playerXElement?.textContent,
                y: playerYElement?.textContent
            };
        });
        
        // 右に移動
        await page.keyboard.down('ArrowRight');
        await new Promise(resolve => setTimeout(resolve, 1000));
        await page.keyboard.up('ArrowRight');
        
        // デバッグ表示のupdate呼び出し
        await page.evaluate(() => {
            if (window.debugOverlay) {
                window.debugOverlay.update(16);
            }
        });
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 移動後の座標取得
        const finalCoords = await page.evaluate(() => {
            const stats = document.querySelectorAll('#debug-info span');
            const playerXSpan = Array.from(stats).find(span => {
                const parent = span.parentElement;
                return parent && parent.textContent.includes('Player X:');
            });
            const playerYSpan = Array.from(stats).find(span => {
                const parent = span.parentElement;
                return parent && parent.textContent.includes('Player Y:');
            });
            
            return {
                x: playerXSpan?.textContent,
                y: playerYSpan?.textContent,
                debugContent: document.getElementById('debug-info')?.innerHTML
            };
        });
        
        console.log('  初期座標:', initialCoords);
        console.log('  移動後座標:', finalCoords);
        
        if (finalCoords.x && initialCoords.x && parseInt(finalCoords.x) > parseInt(initialCoords.x)) {
            console.log('  ✓ プレイヤー座標が更新されました');
            testsPassed++;
        } else {
            console.log('  ✗ プレイヤー座標が更新されません');
            console.log('  デバッグ表示内容:', finalCoords.debugContent);
            testsFailed++;
        }
        
        // テスト5: ステージ名表示確認
        console.log('\nテスト5: ステージ名表示確認');
        const stageName = await page.evaluate(() => {
            const canvas = document.getElementById('gameCanvas');
            const ctx = canvas?.getContext('2d');
            if (!ctx) return null;
            
            // HUDManagerのステージ名取得
            const hudManager = window.game?.stateManager?.currentState?.hudManager;
            return hudManager?.hudData?.stageName;
        });
        
        if (stageName) {
            console.log(`  ✓ ステージ名が表示されています: ${stageName}`);
            testsPassed++;
        } else {
            console.log('  ✗ ステージ名が表示されていません');
            testsFailed++;
        }
        
    } catch (error) {
        console.error('\nテスト実行中にエラーが発生しました:', error.message);
        testsFailed++;
    } finally {
        // コンソールログ出力
        if (logs.length > 0) {
            console.log('\n=== コンソールログ ===');
            logs.forEach(log => {
                console.log(`[${log.type}] ${log.text}`);
            });
        }
        
        await browser.close();
    }
    
    // 結果サマリー
    console.log('\n========================================');
    console.log(`テスト結果: ${testsPassed} 成功 / ${testsFailed} 失敗`);
    console.log('========================================\n');
    
    process.exit(testsFailed > 0 ? 1 : 0);
}

// 実行
runBGMAndDebugTests();