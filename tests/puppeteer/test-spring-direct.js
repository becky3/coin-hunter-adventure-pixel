import puppeteer from 'puppeteer';

async function testSpringDirect() {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    page.on('console', msg => console.log('Browser:', msg.text()));
    
    try {
        console.log('🎮 Testing Spring bounce repetition (10+ times)...\n');
        
        await page.goto('http://localhost:3000');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // ゲーム開始
        await page.keyboard.press('Enter');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Spring位置を確認
        const springInfo = await page.evaluate(() => {
            const entities = Array.from(window.game?.physicsSystem?.entities || []);
            const spring = entities.find(e => e.constructor.name === 'Spring');
            return spring ? { x: spring.x, y: spring.y, id: spring.id } : null;
        });
        console.log('Spring position:', springInfo);
        
        if (!springInfo) {
            console.error('Spring not found!');
            return;
        }
        
        // プレイヤーをSpringの真上に配置（少し高めから落下させる）
        await page.evaluate((springX, springY) => {
            if (window.debugWarp) {
                // Springの上30ピクセルから落下
                window.debugWarp(springX, springY - 30);
            }
        }, springInfo.x, springInfo.y);
        
        console.log(`Player placed above spring at (${springInfo.x}, ${springInfo.y - 30})`);
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // ジャンプ検出のループ
        const jumpLog = [];
        let jumpCount = 0;
        let lastY = null;
        let lastVy = null;
        let noJumpCount = 0;
        
        console.log('\nMonitoring jumps...');
        
        for (let i = 0; i < 100; i++) { // 最大100回チェック（10秒間）
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const state = await page.evaluate(() => {
                const player = window.game?.stateManager?.currentState?.player;
                const spring = Array.from(window.game?.physicsSystem?.entities || [])
                    .find(e => e.constructor.name === 'Spring');
                const pairs = window.game?.physicsSystem?.collisionPairs;
                
                return {
                    playerX: player?.x,
                    playerY: player?.y,
                    playerVy: player?.vy,
                    grounded: player?.grounded,
                    springCompression: spring?.compression,
                    triggered: spring?.triggered,
                    pairCount: pairs?.size || 0,
                    pairKeys: pairs ? Array.from(pairs.keys()) : [],
                    playerId: player?.id,
                    springId: spring?.id
                };
            });
            
            // ジャンプを検出（上向きの大きな速度）
            if (state.playerVy < -10 && (lastVy === null || lastVy >= -10)) {
                jumpCount++;
                jumpLog.push({
                    jump: jumpCount,
                    frame: i,
                    y: state.playerY,
                    vy: state.playerVy,
                    compression: state.springCompression,
                    pairs: state.pairKeys
                });
                console.log(`✅ Jump ${jumpCount}: frame ${i}, vy=${state.playerVy.toFixed(2)}, ` +
                           `compression=${state.springCompression}, pairs=[${state.pairKeys.join(',')}]`);
                noJumpCount = 0;
            }
            
            // 着地を検出
            if (lastY !== null && state.grounded && !lastGrounded && 
                Math.abs(state.playerX - springInfo.x) < 10) {
                console.log(`  Landed on spring: y=${state.playerY}, grounded=${state.grounded}`);
            }
            
            // プレイヤーがSpringから離れた場合
            if (state.playerX && Math.abs(state.playerX - springInfo.x) > 20) {
                console.log(`Player moved away from spring at frame ${i}`);
                break;
            }
            
            // 長時間ジャンプしない場合
            if (state.grounded && Math.abs(state.playerX - springInfo.x) < 10) {
                noJumpCount++;
                if (noJumpCount > 20) { // 2秒間ジャンプしない
                    console.log(`No jump detected for 2 seconds while on spring`);
                    console.log(`Final state: player at (${state.playerX}, ${state.playerY}), ` +
                               `vy=${state.playerVy}, grounded=${state.grounded}`);
                    console.log(`Collision pairs: [${state.pairKeys.join(', ')}]`);
                    break;
                }
            }
            
            lastY = state.playerY;
            lastVy = state.playerVy;
            var lastGrounded = state.grounded;
        }
        
        // 結果のサマリー
        console.log(`\n📊 Test Summary:`);
        console.log(`Total jumps: ${jumpCount}`);
        console.log(`Expected: 10+ jumps`);
        console.log(`Result: ${jumpCount >= 10 ? '✅ PASS' : '❌ FAIL'}`);
        
        if (jumpLog.length > 0) {
            console.log('\nJump details:');
            jumpLog.forEach(j => {
                console.log(`  Jump ${j.jump} at frame ${j.frame}: vy=${j.vy.toFixed(2)}`);
            });
        }
        
        await page.screenshot({ path: 'test-spring-direct.png' });
        console.log('\n📸 Screenshot saved: test-spring-direct.png');
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await browser.close();
    }
}

testSpringDirect();