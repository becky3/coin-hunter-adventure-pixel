import puppeteer from 'puppeteer';

async function testSpringCollision() {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    page.on('console', msg => console.log('Browser:', msg.text()));
    
    try {
        console.log('🎮 Testing Spring collision functionality...\n');
        
        await page.goto('http://localhost:3000');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // ゲーム開始
        await page.keyboard.press('Enter');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 初期状態を確認
        const initialInfo = await page.evaluate(() => {
            const entities = Array.from(window.game?.physicsSystem?.entities || []);
            const spring = entities.find(e => e.constructor.name === 'Spring');
            const player = window.game?.stateManager?.currentState?.player;
            return {
                springId: spring?.id,
                playerId: player?.id,
                collisionPairs: Array.from(window.game?.physicsSystem?.collisionPairs?.keys() || [])
            };
        });
        console.log('Initial info:', initialInfo);
        
        // デバッグワープでSpringの真上へ（Spring位置: x=80, y=160）
        await page.evaluate(() => {
            // debugWarp関数を直接呼び出す
            if (window.debugWarp) {
                // プレイヤーの高さ16を考慮して、Springの上に配置
                window.debugWarp(80, 144); // 160 - 16 = 144
            }
        });
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // ワープ後の状態
        const afterWarp = await page.evaluate(() => {
            const player = window.game?.stateManager?.currentState?.player;
            const spring = Array.from(window.game?.physicsSystem?.entities || [])
                .find(e => e.constructor.name === 'Spring');
            return {
                player: { x: player?.x, y: player?.y, vy: player?.vy, grounded: player?.grounded },
                spring: { x: spring?.x, y: spring?.y },
                distance: Math.abs((player?.x || 0) - (spring?.x || 0))
            };
        });
        console.log('After warp:', afterWarp);
        
        // Springの上に移動
        await page.keyboard.down('ArrowRight');
        await new Promise(resolve => setTimeout(resolve, 500));
        await page.keyboard.up('ArrowRight');
        
        // 最初のバウンスチェック（複数回チェック）
        let bounced = false;
        for (let i = 0; i < 10; i++) {
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const bounceCheck = await page.evaluate(() => {
                const player = window.game?.stateManager?.currentState?.player;
                const spring = Array.from(window.game?.physicsSystem?.entities || [])
                    .find(e => e.constructor.name === 'Spring');
                const pairs = Array.from(window.game?.physicsSystem?.collisionPairs?.keys() || []);
                return {
                    playerVy: player?.vy,
                    playerY: player?.y,
                    springCompression: spring?.compression,
                    collisionPairs: pairs,
                    playerGrounded: player?.grounded
                };
            });
            
            if (bounceCheck.playerVy < -10) {
                console.log(`✅ First bounce detected at check ${i+1}:`, bounceCheck);
                bounced = true;
                break;
            }
        }
        
        if (!bounced) {
            console.log('❌ First bounce failed');
        }
        
        // 着地を待つ
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 着地後の状態
        const afterLanding = await page.evaluate(() => {
            const player = window.game?.stateManager?.currentState?.player;
            const spring = Array.from(window.game?.physicsSystem?.entities || [])
                .find(e => e.constructor.name === 'Spring');
            const pairs = Array.from(window.game?.physicsSystem?.collisionPairs?.keys() || []);
            return {
                player: { x: player?.x, y: player?.y, vy: player?.vy, grounded: player?.grounded },
                spring: { x: spring?.x, y: spring?.y, compression: spring?.compression },
                distance: Math.abs((player?.x || 0) - (spring?.x || 0)),
                collisionPairs: pairs
            };
        });
        console.log('After landing:', afterLanding);
        
        // 再バウンスのチェック
        if (afterLanding.distance < 20) {
            console.log('Still on spring, checking for re-bounce...');
            
            let reBounced = false;
            for (let i = 0; i < 10; i++) {
                await new Promise(resolve => setTimeout(resolve, 100));
                
                const reBounceCheck = await page.evaluate(() => {
                    const player = window.game?.stateManager?.currentState?.player;
                    return { vy: player?.vy, y: player?.y };
                });
                
                if (reBounceCheck.vy < -10) {
                    console.log(`✅ Re-bounce detected at check ${i+1}:`, reBounceCheck);
                    reBounced = true;
                    break;
                }
            }
            
            if (!reBounced) {
                console.log('❌ Re-bounce failed');
            }
        }
        
        await page.screenshot({ path: 'test-spring-collision.png' });
        console.log('\n📸 Screenshot saved: test-spring-collision.png');
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await browser.close();
    }
}

testSpringCollision();