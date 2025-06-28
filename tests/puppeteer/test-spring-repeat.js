import puppeteer from 'puppeteer';

async function testSpringRepeat() {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    page.on('console', msg => console.log('Browser:', msg.text()));
    
    try {
        console.log('🎮 Testing Spring repeat functionality (10 jumps)...\n');
        
        await page.goto('http://localhost:3000');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // ゲーム開始
        await page.keyboard.press('Enter');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 初期情報を取得
        const info = await page.evaluate(() => {
            const entities = Array.from(window.game?.physicsSystem?.entities || []);
            const spring = entities.find(e => e.constructor.name === 'Spring');
            const player = window.game?.stateManager?.currentState?.player;
            return {
                springPos: spring ? { x: spring.x, y: spring.y, id: spring.id } : null,
                playerStart: player ? { x: player.x, y: player.y } : null
            };
        });
        console.log('Initial positions:', info);
        
        // 通常のプレイでSpringまで移動（少しずつ）
        console.log('\nMoving to spring...');
        
        // 小刻みに移動
        for (let i = 0; i < 3; i++) {
            await page.keyboard.down('ArrowRight');
            await new Promise(resolve => setTimeout(resolve, 100));
            await page.keyboard.up('ArrowRight');
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // 現在位置を確認
            const pos = await page.evaluate(() => {
                const player = window.game?.stateManager?.currentState?.player;
                return player ? { x: player.x, y: player.y } : null;
            });
            console.log(`  Position after move ${i+1}:`, pos);
            
            // Springに近づいたら停止
            if (pos && Math.abs(pos.x - 80) < 20) {
                console.log('  Near spring, stopping movement');
                break;
            }
        }
        
        // ジャンプの繰り返しテスト
        const jumpResults = [];
        let consecutiveJumps = 0;
        let lastJumpTime = Date.now();
        
        for (let attempt = 0; attempt < 20; attempt++) {
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const jumpCheck = await page.evaluate(() => {
                const player = window.game?.stateManager?.currentState?.player;
                const spring = Array.from(window.game?.physicsSystem?.entities || [])
                    .find(e => e.constructor.name === 'Spring');
                const pairs = Array.from(window.game?.physicsSystem?.collisionPairs?.keys() || []);
                
                return {
                    playerX: player?.x,
                    playerY: player?.y,
                    playerVy: player?.vy,
                    grounded: player?.grounded,
                    springCompression: spring?.compression,
                    collisionPairs: pairs,
                    onSpring: player && spring && 
                             Math.abs(player.x - spring.x) < 16 && 
                             Math.abs(player.y + player.height - spring.y) < 5
                };
            });
            
            // ジャンプを検出
            if (jumpCheck.playerVy < -10) {
                const timeSinceLastJump = Date.now() - lastJumpTime;
                consecutiveJumps++;
                jumpResults.push({
                    attempt: attempt + 1,
                    consecutiveJump: consecutiveJumps,
                    timeSinceLastJump,
                    ...jumpCheck
                });
                console.log(`✅ Jump ${consecutiveJumps} detected at attempt ${attempt + 1}:`,
                    `vy=${jumpCheck.playerVy.toFixed(2)}, time since last=${timeSinceLastJump}ms`);
                lastJumpTime = Date.now();
            }
            
            // プレイヤーがSpringから離れた場合
            if (jumpCheck.playerX && info.springPos && 
                Math.abs(jumpCheck.playerX - info.springPos.x) > 30) {
                console.log(`Player moved away from spring at attempt ${attempt + 1}`);
                break;
            }
        }
        
        console.log(`\n📊 Summary: ${consecutiveJumps} consecutive jumps detected`);
        console.log('Jump details:');
        jumpResults.forEach(jump => {
            console.log(`  Jump ${jump.consecutiveJump}: attempt ${jump.attempt}, ` +
                       `time gap ${jump.timeSinceLastJump}ms, ` +
                       `vy=${jump.playerVy.toFixed(2)}`);
        });
        
        // 衝突ペアの状態を確認
        const finalState = await page.evaluate(() => {
            const pairs = window.game?.physicsSystem?.collisionPairs;
            return {
                pairCount: pairs?.size || 0,
                pairs: pairs ? Array.from(pairs.keys()) : []
            };
        });
        console.log('\nFinal collision pairs:', finalState);
        
        await page.screenshot({ path: 'test-spring-repeat.png' });
        console.log('\n📸 Screenshot saved: test-spring-repeat.png');
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await browser.close();
    }
}

testSpringRepeat();