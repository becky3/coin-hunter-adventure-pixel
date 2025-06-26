/**
 * ジャンプ問題の詳細なデバッグテスト
 */
import puppeteer from 'puppeteer';

async function testJumpDetailed() {
    console.log('🎮 Testing jump functionality in detail...\n');
    
    const browser = await puppeteer.launch({
        headless: false, // ブラウザを表示
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        devtools: true
    });
    
    try {
        const page = await browser.newPage();
        
        // デバッグモードを有効化
        await page.evaluateOnNewDocument(() => {
            window.debugMode = true;
        });
        
        // ページ読み込み
        console.log('1. Loading game...');
        await page.goto('http://localhost:3000', { 
            waitUntil: 'networkidle2',
            timeout: 30000 
        });
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // ゲーム開始
        console.log('2. Starting game...');
        await page.keyboard.press('Enter');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // デバッグモードを有効化
        await page.evaluate(() => {
            if (window.game) {
                window.game.debug = true;
                console.log('Debug mode enabled');
            }
        });
        
        // ジャンプ前の状態を記録
        console.log('\n3. Recording jump sequence...');
        const jumpSequence = [];
        
        // ジャンプ前
        jumpSequence.push(await page.evaluate(() => {
            const player = window.game?.stateManager?.currentState?.player;
            return {
                time: 'before',
                y: player.y,
                vy: player.vy,
                grounded: player.grounded,
                gravityStrength: player.gravityStrength,
                jumpPower: player.jumpPower
            };
        }));
        
        // スペースキーを押す
        await page.keyboard.down('Space');
        
        // 数フレーム記録
        for (let i = 0; i < 10; i++) {
            await new Promise(resolve => setTimeout(resolve, 16)); // 約1フレーム
            
            jumpSequence.push(await page.evaluate((frame) => {
                const player = window.game?.stateManager?.currentState?.player;
                return {
                    time: `frame ${frame}`,
                    y: player.y,
                    vy: player.vy,
                    grounded: player.grounded,
                    isJumping: player.isJumping
                };
            }, i + 1));
        }
        
        await page.keyboard.up('Space');
        
        // 落下中の状態も記録
        for (let i = 0; i < 20; i++) {
            await new Promise(resolve => setTimeout(resolve, 16));
            
            jumpSequence.push(await page.evaluate((frame) => {
                const player = window.game?.stateManager?.currentState?.player;
                return {
                    time: `fall frame ${frame}`,
                    y: player.y,
                    vy: player.vy,
                    grounded: player.grounded
                };
            }, i + 1));
        }
        
        // 結果を表示
        console.log('\nJump sequence:');
        jumpSequence.forEach(state => {
            console.log(`${state.time}: y=${state.y.toFixed(2)}, vy=${state.vy.toFixed(2)}, grounded=${state.grounded}`);
        });
        
        // 最終位置
        const finalState = await page.evaluate(() => {
            const player = window.game?.stateManager?.currentState?.player;
            return {
                y: player.y,
                vy: player.vy,
                grounded: player.grounded
            };
        });
        
        console.log('\nFinal state:', finalState);
        
        // スクリーンショット
        await page.screenshot({ path: 'tests/screenshots/jump-debug.png' });
        
        // ブラウザは開いたままにする
        console.log('\nBrowser window kept open for inspection. Close manually when done.');
        await new Promise(resolve => setTimeout(resolve, 60000)); // 1分待機
        
    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await browser.close();
    }
}

testJumpDetailed();