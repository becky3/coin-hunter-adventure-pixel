const puppeteer = require('puppeteer');

async function runAutomatedTests() {
    console.log('🎮 Coin Hunter Adventure - 自動テスト実行中...\n');
    
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    let testsPassed = 0;
    let testsFailed = 0;
    
    try {
        // テスト1: ゲーム初期化
        console.log('テスト1: ゲーム初期化');
        // stage0-1をURLパラメータで指定
        await page.goto('http://localhost:3000/?s=0-1', { waitUntil: 'networkidle0' });
        
        const initialized = await page.waitForFunction(
            () => window.game?.gameLoop?.running,
            { timeout: 5000 }
        ).then(() => true).catch(() => false);
        
        if (initialized) {
            console.log('  ✓ ゲーム初期化成功');
            testsPassed++;
        } else {
            console.log('  ✗ ゲーム初期化失敗');
            testsFailed++;
        }
        
        // テスト2: メニュー表示
        console.log('\nテスト2: メニュー表示');
        const menuDisplayed = await page.waitForFunction(
            () => {
                const state = window.game?.stateManager?.currentState;
                return state?.name === 'menu' && state?.optionsAlpha >= 1;
            },
            { timeout: 10000 }
        ).then(() => true).catch(() => false);
        
        if (menuDisplayed) {
            console.log('  ✓ メニュー表示成功');
            testsPassed++;
        } else {
            console.log('  ✗ メニュー表示失敗');
            testsFailed++;
        }
        
        // テスト3: ゲーム開始
        console.log('\nテスト3: ゲーム開始 (Space キー)');
        // マウスクリックでフォーカスを確保
        await page.mouse.click(100, 100);
        await new Promise(resolve => setTimeout(resolve, 100));
        
        await page.keyboard.down('Space');
        await new Promise(resolve => setTimeout(resolve, 100));
        await page.keyboard.up('Space');
        
        const gameStarted = await page.waitForFunction(
            () => window.game?.stateManager?.currentState?.name === 'play',
            { timeout: 5000 }
        ).then(() => true).catch(() => false);
        
        if (gameStarted) {
            console.log('  ✓ ゲーム開始成功');
            testsPassed++;
            
            // PlayStateの初期化が完了するまで待つ
            await page.waitForFunction(
                () => {
                    const state = window.game?.stateManager?.currentState;
                    return state?.name === 'play' && state?.player !== undefined;
                },
                { timeout: 5000 }
            );
            
            // さらに待機して初期化を確実に完了させる
            await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
            console.log('  ✗ ゲーム開始失敗');
            testsFailed++;
        }
        
        // テスト4: プレイヤー存在確認
        console.log('\nテスト4: プレイヤー存在確認');
        const playerExists = await page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const player = state?.player;
            return !!player && player.x !== undefined && player.y !== undefined;
        });
        
        if (playerExists) {
            console.log('  ✓ プレイヤー存在確認成功');
            testsPassed++;
        } else {
            console.log('  ✗ プレイヤー存在確認失敗');
            testsFailed++;
        }
        
        // テスト5: プレイヤー移動
        console.log('\nテスト5: プレイヤー移動');
        const initialX = await page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            return state?.player?.x;
        });
        
        await page.keyboard.down('ArrowRight');
        await new Promise(resolve => setTimeout(resolve, 500));
        await page.keyboard.up('ArrowRight');
        
        const finalX = await page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            return state?.player?.x;
        });
        
        if (finalX > initialX) {
            console.log('  ✓ プレイヤー移動成功');
            testsPassed++;
        } else {
            console.log('  ✗ プレイヤー移動失敗');
            testsFailed++;
        }
        
        // テスト6: レンダリング確認
        console.log('\nテスト6: レンダリング確認');
        const hasContent = await page.evaluate(() => {
            const canvas = document.getElementById('gameCanvas');
            const ctx = canvas?.getContext('2d');
            
            if (!ctx) return false;
            
            const imageData = ctx.getImageData(0, 0, 100, 100);
            const data = imageData.data;
            
            // 黒以外のピクセルがあるかチェック
            for (let i = 0; i < data.length; i += 4) {
                if (data[i] !== 0 || data[i+1] !== 0 || data[i+2] !== 0) {
                    return true;
                }
            }
            return false;
        });
        
        if (hasContent) {
            console.log('  ✓ レンダリング確認成功');
            testsPassed++;
        } else {
            console.log('  ✗ レンダリング確認失敗');
            testsFailed++;
        }
        
    } catch (error) {
        console.error('\nテスト実行中にエラーが発生しました:', error.message);
        testsFailed++;
    } finally {
        await browser.close();
    }
    
    // 結果サマリー
    console.log('\n========================================');
    console.log(`テスト結果: ${testsPassed} 成功 / ${testsFailed} 失敗`);
    console.log('========================================\n');
    
    // 終了コード（失敗があれば1を返す）
    process.exit(testsFailed > 0 ? 1 : 0);
}

// 引数でサーバー起動を待つかどうか判定
const waitForServer = process.argv.includes('--wait-for-server');

if (waitForServer) {
    console.log('サーバー起動を待っています...');
    const checkServer = async () => {
        try {
            const response = await fetch('http://localhost:3000/');
            if (response.ok) {
                console.log('サーバーが起動しました\n');
                runAutomatedTests();
            } else {
                setTimeout(checkServer, 1000);
            }
        } catch (e) {
            setTimeout(checkServer, 1000);
        }
    };
    checkServer();
} else {
    runAutomatedTests();
}