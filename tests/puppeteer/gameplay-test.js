import puppeteer from 'puppeteer';

async function runGameplayTest() {
    console.log('Running gameplay tests...\n');
    
    const browser = await puppeteer.launch({ 
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        
        // コンソールメッセージを収集
        const consoleLogs = [];
        page.on('console', msg => {
            consoleLogs.push({
                type: msg.type(),
                text: msg.text()
            });
        });
        
        // エラーを収集
        const pageErrors = [];
        page.on('pageerror', error => {
            pageErrors.push(error.toString());
        });
        
        console.log('=== Loading Game ===');
        await page.goto('http://localhost:3000');
        
        // ゲームの初期化を待つ
        await page.waitForSelector('#gameCanvas', { timeout: 5000 });
        await new Promise(resolve => setTimeout(resolve, 2000)); // ゲーム初期化待ち
        
        console.log('✓ Game loaded\n');
        
        console.log('=== Starting Gameplay ===');
        // START GAMEをクリック
        await page.keyboard.press('Enter');
        await new Promise(resolve => setTimeout(resolve, 3000)); // PlayStateへの遷移を待つ
        
        // ゲームプレイ状態のテスト
        const gameplayState = await page.evaluate(() => {
            const game = window.game;
            if (!game) return { error: 'Game not found' };
            
            const state = game.currentState;
            if (!state) return { error: 'No current state' };
            
            const result = {
                stateName: state.constructor.name,
                hasPlayer: !!state.player,
                playerPos: state.player ? { x: state.player.x, y: state.player.y } : null,
                enemyCount: state.enemies ? state.enemies.length : 0,
                enemies: []
            };
            
            if (state.enemies) {
                state.enemies.forEach((enemy, i) => {
                    result.enemies.push({
                        index: i,
                        type: enemy.constructor.name,
                        position: { x: enemy.x, y: enemy.y },
                        velocity: { x: enemy.vx, y: enemy.vy },
                        grounded: enemy.grounded,
                        active: enemy.active
                    });
                });
            }
            
            return result;
        });
        
        console.log('Game State:', gameplayState);
        console.log('');
        
        // 5秒間敵の動きを監視
        console.log('=== Monitoring Enemy Movement (5 seconds) ===');
        const enemySnapshots = [];
        
        for (let i = 0; i < 10; i++) {
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const snapshot = await page.evaluate(() => {
                const game = window.game;
                if (!game || !game.currentState || !game.currentState.enemies) return null;
                
                return game.currentState.enemies.map(enemy => ({
                    x: Math.round(enemy.x),
                    y: Math.round(enemy.y),
                    vx: Math.round(enemy.vx),
                    vy: Math.round(enemy.vy)
                }));
            });
            
            if (snapshot) {
                enemySnapshots.push(snapshot);
                console.log(`Snapshot ${i + 1}:`, JSON.stringify(snapshot));
            }
        }
        
        console.log('\n=== Enemy Movement Analysis ===');
        
        // 敵の移動を分析
        let hasMovement = false;
        let hasAbnormalPosition = false;
        let hasAbnormalVelocity = false;
        
        if (enemySnapshots.length > 1) {
            for (let i = 0; i < gameplayState.enemyCount; i++) {
                const positions = enemySnapshots.map(s => s[i]);
                
                // 位置の変化をチェック
                const xPositions = positions.map(p => p.x);
                const yPositions = positions.map(p => p.y);
                
                const xMin = Math.min(...xPositions);
                const xMax = Math.max(...xPositions);
                const yMin = Math.min(...yPositions);
                const yMax = Math.max(...yPositions);
                
                const xMovement = xMax - xMin;
                const yMovement = yMax - yMin;
                
                console.log(`Enemy ${i} movement range: X(${xMin}-${xMax}) Y(${yMin}-${yMax})`);
                
                if (xMovement > 5 || yMovement > 5) {
                    hasMovement = true;
                }
                
                // 異常な位置をチェック
                if (xMax > 800 || xMin < -100 || yMax > 500 || yMin < -500) {
                    hasAbnormalPosition = true;
                    console.log(`❌ Enemy ${i} has abnormal position!`);
                }
                
                // 異常な速度をチェック
                const velocities = positions.map(p => ({ vx: p.vx, vy: p.vy }));
                for (const vel of velocities) {
                    if (Math.abs(vel.vx) > 100 || Math.abs(vel.vy) > 100) {
                        hasAbnormalVelocity = true;
                        console.log(`❌ Enemy ${i} has abnormal velocity: vx=${vel.vx}, vy=${vel.vy}`);
                    }
                }
            }
        }
        
        console.log('\n=== Console Errors ===');
        const errors = consoleLogs.filter(log => log.type === 'error');
        if (errors.length > 0) {
            errors.forEach(err => console.log('❌', err.text));
        } else {
            console.log('✓ No console errors');
        }
        
        console.log('\n=== Test Summary ===');
        console.log('Game State:', gameplayState.stateName === 'PlayState' ? 'PASS' : 'FAIL');
        console.log('Player Loaded:', gameplayState.hasPlayer ? 'PASS' : 'FAIL');
        console.log('Enemies Loaded:', gameplayState.enemyCount > 0 ? 'PASS' : 'FAIL');
        console.log('Enemy Movement:', hasMovement ? 'PASS' : 'FAIL');
        console.log('Position Normal:', !hasAbnormalPosition ? 'PASS' : 'FAIL');
        console.log('Velocity Normal:', !hasAbnormalVelocity ? 'PASS' : 'FAIL');
        console.log('No Errors:', errors.length === 0 ? 'PASS' : 'FAIL');
        
        const allPassed = gameplayState.stateName === 'PlayState' && 
                          gameplayState.hasPlayer && 
                          gameplayState.enemyCount > 0 && 
                          hasMovement && 
                          !hasAbnormalPosition && 
                          !hasAbnormalVelocity && 
                          errors.length === 0;
        
        console.log('\nOverall:', allPassed ? 'PASS' : 'FAIL');
        
        await browser.close();
        process.exit(allPassed ? 0 : 1);
        
    } catch (error) {
        console.error('Test error:', error);
        await browser.close();
        process.exit(1);
    }
}

runGameplayTest();