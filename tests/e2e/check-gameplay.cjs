const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
    console.log('=== ゲームプレイ動作確認 ===\n');
    
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // ログ収集
    const logs = [];
    page.on('console', msg => {
        const text = msg.text();
        logs.push(`[${msg.type()}] ${text}`);
        // 重要なログはリアルタイム表示
        if (text.includes('PlayState:') || text.includes('error') || text.includes('Error')) {
            console.log(`  LOG: ${text}`);
        }
    });
    
    try {
        console.log('1. ページを読み込んでいます...');
        await page.goto('http://localhost:3000');
        
        // Loading画面が非表示になるまで待つ
        await page.waitForFunction(
            () => document.getElementById('loadingScreen')?.style.display === 'none',
            { timeout: 10000 }
        );
        console.log('   ✓ 初期化完了');
        
        // メニュー状態を確認
        await page.waitForFunction(
            () => window.game?.stateManager?.currentState?.name === 'menu',
            { timeout: 5000 }
        );
        console.log('   ✓ メニュー画面表示');
        
        // メニューオプションが表示されるまで待つ（optionsAlpha = 1）
        console.log('\n2. メニューオプションの表示を待っています...');
        await page.waitForFunction(
            () => {
                const state = window.game?.stateManager?.currentState;
                return state && state.optionsAlpha >= 1;
            },
            { timeout: 5000 }
        );
        console.log('   ✓ メニューオプション表示完了');
        
        // メニューのスクリーンショット
        await page.screenshot({ path: path.join(__dirname, '../screenshots/menu-full.png') });
        
        // GAME STARTを実行
        console.log('\n3. START GAME を実行します...');
        await page.keyboard.press('Space');
        
        // PlayStateへの遷移を確認（タイムアウトを長めに）
        let transitioned = false;
        try {
            await page.waitForFunction(
                () => window.game?.stateManager?.currentState?.name === 'play',
                { timeout: 10000 }
            );
            transitioned = true;
            console.log('   ✓ PlayStateに遷移しました');
        } catch (e) {
            console.log('   ✗ PlayStateへの遷移に失敗しました');
        }
        
        // 現在の状態を詳細に取得
        const gameState = await page.evaluate(() => {
            const game = window.game;
            const state = game?.stateManager?.currentState;
            
            return {
                currentStateName: state?.name || 'none',
                stateManager: {
                    transitioning: game?.stateManager?.transitioning || false,
                    states: game?.stateManager?.states ? 
                        Array.from(game.stateManager.states.keys()) : []
                },
                playState: state?.name === 'play' ? {
                    hasPlayer: !!state.player,
                    playerPos: state.player ? { x: state.player.x, y: state.player.y } : null,
                    isPaused: state.isPaused || false,
                    time: state.time || -1,
                    lives: state.lives || 0,
                    levelLoaded: !!state.levelData,
                    enemyCount: state.enemies?.length || 0,
                    itemCount: state.items?.length || 0
                } : null
            };
        });
        
        console.log('\n4. ゲーム状態:');
        console.log(JSON.stringify(gameState, null, 2));
        
        if (transitioned && gameState.currentStateName === 'play') {
            // プレイ画面のスクリーンショット
            await page.screenshot({ path: path.join(__dirname, '../screenshots/play-initial.png') });
            
            // プレイヤーの移動テスト
            console.log('\n5. プレイヤー操作テスト...');
            
            // 初期位置
            const initialPos = gameState.playState?.playerPos || { x: 0, y: 0 };
            console.log(`   初期位置: x=${initialPos.x}, y=${initialPos.y}`);
            
            // 右移動
            await page.keyboard.down('ArrowRight');
            await new Promise(resolve => setTimeout(resolve, 1000));
            await page.keyboard.up('ArrowRight');
            
            // 移動後の位置
            const afterRightPos = await page.evaluate(() => {
                const player = window.game?.stateManager?.currentState?.player;
                return player ? { x: player.x, y: player.y } : null;
            });
            
            console.log(`   右移動後: x=${afterRightPos?.x}, y=${afterRightPos?.y}`);
            
            if (afterRightPos && afterRightPos.x > initialPos.x) {
                console.log('   ✓ プレイヤーが右に移動しました');
            } else {
                console.log('   ✗ プレイヤーが移動していません');
            }
            
            // ジャンプテスト
            console.log('\n6. ジャンプテスト...');
            const beforeJump = afterRightPos || initialPos;
            
            await page.keyboard.press('Space');
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const afterJump = await page.evaluate(() => {
                const player = window.game?.stateManager?.currentState?.player;
                return player ? { 
                    x: player.x, 
                    y: player.y,
                    vy: player.vy,
                    grounded: player.grounded
                } : null;
            });
            
            console.log(`   ジャンプ後: y=${afterJump?.y}, vy=${afterJump?.vy}, grounded=${afterJump?.grounded}`);
            
            // 時間経過の確認
            console.log('\n7. 時間カウントダウン確認...');
            const time1 = gameState.playState?.time || -1;
            await new Promise(resolve => setTimeout(resolve, 2000));
            const time2 = await page.evaluate(() => {
                return window.game?.stateManager?.currentState?.time || -1;
            });
            
            console.log(`   時間: ${time1} → ${time2}`);
            if (time2 < time1 && time2 > 0) {
                console.log('   ✓ 時間がカウントダウンされています');
            } else {
                console.log('   ✗ 時間が進行していません');
            }
            
            // 最終スクリーンショット
            await page.screenshot({ path: path.join(__dirname, '../screenshots/play-final.png') });
        }
        
        // PlayStateのログ確認
        const playStateLogs = logs.filter(log => log.includes('PlayState:'));
        if (playStateLogs.length > 0) {
            console.log('\n8. PlayStateログ:');
            playStateLogs.forEach(log => console.log('   ' + log));
        }
        
    } catch (error) {
        console.error('\nエラー:', error.message);
    } finally {
        await browser.close();
    }
    
    console.log('\n=== テスト完了 ===');
})();