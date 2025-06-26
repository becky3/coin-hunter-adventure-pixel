/**
 * ジャンプ問題のデバッグテスト
 */
import puppeteer from 'puppeteer';

async function testJumpDebug() {
    console.log('🎮 Testing jump functionality...\n');
    
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        
        // デバッグモードを有効化
        await page.evaluateOnNewDocument(() => {
            window.debugMode = true;
        });
        
        // コンソールログを収集
        const logs = [];
        page.on('console', msg => {
            logs.push(`[${msg.type()}] ${msg.text()}`);
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
        
        // プレイヤーの初期状態を確認
        const initialState = await page.evaluate(() => {
            const player = window.game?.stateManager?.currentState?.player;
            if (!player) return null;
            
            return {
                y: player.y,
                vy: player.vy,
                grounded: player.grounded,
                gravityStrength: player.gravityStrength,
                jumpPower: player.jumpPower,
                isJumping: player.isJumping
            };
        });
        
        console.log('3. Initial player state:', initialState);
        
        // ジャンプ前の地面状態確認
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // ジャンプを試みる
        console.log('\n4. Attempting jump...');
        
        // スペースキーを押す
        await page.keyboard.down('Space');
        await new Promise(resolve => setTimeout(resolve, 50));
        await page.keyboard.up('Space');
        
        // ジャンプ後の状態
        const afterJump = await page.evaluate(() => {
            const player = window.game?.stateManager?.currentState?.player;
            if (!player) return null;
            
            return {
                y: player.y,
                vy: player.vy,
                grounded: player.grounded,
                isJumping: player.isJumping,
                jumpTime: player.jumpTime
            };
        });
        
        console.log('5. After jump attempt:', afterJump);
        
        // 数フレーム後の状態
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const afterFewFrames = await page.evaluate(() => {
            const player = window.game?.stateManager?.currentState?.player;
            if (!player) return null;
            
            return {
                y: player.y,
                vy: player.vy,
                grounded: player.grounded,
                isJumping: player.isJumping
            };
        });
        
        console.log('6. After few frames:', afterFewFrames);
        
        // コリジョンシステムの確認
        const collisionInfo = await page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            if (!state) return null;
            
            return {
                hasCollisionSystem: !!state.collisionSystem,
                tileMapLength: state.tileMap?.length || 0,
                playerHitbox: state.player ? {
                    x: state.player.x,
                    y: state.player.y,
                    width: state.player.width,
                    height: state.player.height
                } : null
            };
        });
        
        console.log('\n7. Collision system info:', collisionInfo);
        
        // ログ出力
        console.log('\n📝 Debug logs:');
        logs.filter(log => log.includes('Jump') || log.includes('jump') || log.includes('grounded'))
            .forEach(log => console.log(log));
        
    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await browser.close();
    }
}

testJumpDebug();