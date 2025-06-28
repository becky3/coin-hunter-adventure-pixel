import puppeteer from 'puppeteer';

async function testSpringFall() {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    page.on('console', msg => console.log('Browser:', msg.text()));
    
    try {
        console.log('🎮 Testing Spring behavior when falling from above...\n');
        
        await page.goto('http://localhost:3000');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // ゲーム開始
        await page.keyboard.press('Enter');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Spring位置を確認
        const springInfo = await page.evaluate(() => {
            const entities = Array.from(window.game?.physicsSystem?.entities || []);
            const spring = entities.find(e => e.constructor.name === 'Spring');
            return spring ? { x: spring.x, y: spring.y, id: spring.id, height: spring.height } : null;
        });
        console.log('Spring info:', springInfo);
        
        if (!springInfo) {
            console.error('Spring not found!');
            return;
        }
        
        // 高い位置から落下テスト（複数回）
        for (let test = 0; test < 3; test++) {
            console.log(`\n--- Fall Test ${test + 1} ---`);
            
            // プレイヤーを高い位置に配置
            const dropHeight = 50 + test * 20; // 徐々に高くする
            await page.evaluate((springX, springY, height) => {
                if (window.debugWarp) {
                    window.debugWarp(springX, springY - height);
                }
            }, springInfo.x, springInfo.y, dropHeight);
            
            console.log(`Dropped from height: ${dropHeight}px above spring`);
            
            // 落下と衝突を監視
            let bounced = false;
            let maxPenetration = 0;
            let bounceFrame = -1;
            
            for (let frame = 0; frame < 30; frame++) {
                await new Promise(resolve => setTimeout(resolve, 50));
                
                const state = await page.evaluate(() => {
                    const player = window.game?.stateManager?.currentState?.player;
                    const spring = Array.from(window.game?.physicsSystem?.entities || [])
                        .find(e => e.constructor.name === 'Spring');
                    
                    if (!player || !spring) return null;
                    
                    const playerBottom = player.y + player.height;
                    const penetration = playerBottom > spring.y ? playerBottom - spring.y : 0;
                    
                    return {
                        playerY: player.y,
                        playerBottom,
                        playerVy: player.vy,
                        springY: spring.y,
                        penetration,
                        grounded: player.grounded,
                        compression: spring.compression
                    };
                });
                
                if (!state) continue;
                
                // 最大侵入深度を記録
                if (state.penetration > maxPenetration) {
                    maxPenetration = state.penetration;
                }
                
                // バウンスを検出
                if (!bounced && state.playerVy < -10) {
                    bounced = true;
                    bounceFrame = frame;
                    console.log(`  Bounced at frame ${frame}: vy=${state.playerVy.toFixed(2)}, ` +
                               `penetration=${state.penetration.toFixed(1)}px`);
                }
                
                // デバッグ出力（落下中と衝突時）
                if (frame % 5 === 0 || (state.penetration > 0 && frame < 10)) {
                    console.log(`  Frame ${frame}: y=${state.playerY.toFixed(1)}, ` +
                               `vy=${state.playerVy.toFixed(2)}, ` +
                               `penetration=${state.penetration.toFixed(1)}px`);
                }
            }
            
            console.log(`  Result: ${bounced ? '✅ Bounced' : '❌ No bounce'}`);
            console.log(`  Max penetration: ${maxPenetration.toFixed(1)}px`);
            
            if (maxPenetration > 5) {
                console.log(`  ⚠️ Warning: Player penetrated spring by ${maxPenetration.toFixed(1)}px`);
            }
            
            // 次のテストの前に待機
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // 連続ジャンプもテスト
        console.log('\n--- Continuous Jump Test ---');
        
        // プレイヤーをSpringの真上に配置
        await page.evaluate((springX, springY) => {
            if (window.debugWarp) {
                window.debugWarp(springX, springY - 30);
            }
        }, springInfo.x, springInfo.y);
        
        let jumpCount = 0;
        for (let i = 0; i < 50; i++) {
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const state = await page.evaluate(() => {
                const player = window.game?.stateManager?.currentState?.player;
                return player ? { vy: player.vy, y: player.y } : null;
            });
            
            if (state && state.vy < -10) {
                jumpCount++;
                if (jumpCount <= 5) {
                    console.log(`  Jump ${jumpCount}: vy=${state.vy.toFixed(2)}`);
                }
            }
        }
        
        console.log(`\nTotal consecutive jumps: ${jumpCount}`);
        console.log(jumpCount >= 5 ? '✅ Continuous jumping works' : '❌ Continuous jumping failed');
        
        await page.screenshot({ path: 'test-spring-fall.png' });
        console.log('\n📸 Screenshot saved: test-spring-fall.png');
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await browser.close();
    }
}

testSpringFall();