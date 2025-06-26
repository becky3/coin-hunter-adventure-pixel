/**
 * ジャンプ挙動の詳細な数値監視
 */
import puppeteer from 'puppeteer';

async function testJumpMonitor() {
    console.log('🎮 Monitoring jump behavior with detailed logging...\n');
    
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        
        // コンソールログを収集
        page.on('console', msg => {
            if (msg.text().includes('JUMP_MONITOR')) {
                console.log(msg.text());
            }
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
        
        // 監視用のコードを注入
        await page.evaluate(() => {
            const player = window.game?.stateManager?.currentState?.player;
            if (!player) return;
            
            // 元のupdate関数を保存
            const originalUpdate = player.update.bind(player);
            let frameCount = 0;
            let jumpStarted = false;
            let maxY = player.y;
            let minY = player.y;
            
            // update関数をオーバーライド
            player.update = function(deltaTime) {
                const beforeY = this.y;
                const beforeVy = this.vy;
                const beforeGrounded = this.grounded;
                
                // 元の関数を実行
                originalUpdate(deltaTime);
                
                // ジャンプ開始を検出
                if (!jumpStarted && !this.grounded && beforeGrounded) {
                    jumpStarted = true;
                    frameCount = 0;
                    console.log('JUMP_MONITOR: === JUMP STARTED ===');
                }
                
                // ジャンプ中の監視
                if (jumpStarted && frameCount < 60) { // 1秒間監視
                    frameCount++;
                    
                    // 最高点と最低点を記録
                    if (this.y < minY) minY = this.y;
                    if (this.y > maxY) maxY = this.y;
                    
                    // 10フレームごとに詳細を出力
                    if (frameCount % 10 === 0 || frameCount <= 5) {
                        console.log(`JUMP_MONITOR: Frame ${frameCount}: y=${this.y.toFixed(1)}, vy=${this.vy.toFixed(2)}, grounded=${this.grounded}, deltaY=${(this.y - beforeY).toFixed(2)}`);
                    }
                    
                    // 着地を検出
                    if (this.grounded && !beforeGrounded) {
                        console.log(`JUMP_MONITOR: === LANDED === at frame ${frameCount}`);
                        console.log(`JUMP_MONITOR: Jump height: ${(maxY - minY).toFixed(1)} pixels`);
                        console.log(`JUMP_MONITOR: Min Y: ${minY.toFixed(1)}, Max Y: ${maxY.toFixed(1)}`);
                        jumpStarted = false;
                    }
                }
                
                // 画面外チェック
                if (this.y < 0) {
                    console.log(`JUMP_MONITOR: WARNING! Player Y is negative: ${this.y.toFixed(1)}`);
                }
                if (this.y > 300) {
                    console.log(`JUMP_MONITOR: WARNING! Player Y is too high: ${this.y.toFixed(1)}`);
                }
            };
            
            console.log('JUMP_MONITOR: Monitoring installed');
        });
        
        console.log('\n3. Performing jump test...');
        
        // 初期位置を記録
        const initialPos = await page.evaluate(() => {
            const player = window.game?.stateManager?.currentState?.player;
            return { x: player.x, y: player.y, grounded: player.grounded };
        });
        console.log('Initial position:', initialPos);
        
        // ジャンプ実行
        await page.keyboard.press('Space');
        
        // 2秒待機（ジャンプの完了を待つ）
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 最終位置
        const finalPos = await page.evaluate(() => {
            const player = window.game?.stateManager?.currentState?.player;
            return { x: player.x, y: player.y, grounded: player.grounded };
        });
        console.log('\nFinal position:', finalPos);
        
        // レベルデータも確認
        const levelInfo = await page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            return {
                tileSize: 16, // TILE_SIZE
                levelHeight: state?.levelHeight,
                tileMapHeight: state?.tileMap?.length
            };
        });
        console.log('\nLevel info:', levelInfo);
        
    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await browser.close();
    }
}

testJumpMonitor();