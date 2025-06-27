import puppeteer from 'puppeteer';

async function checkEnemyStatus() {
    console.log('🎮 Checking enemy status...\n');
    
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        
        // Collect console logs
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log('❌ Console error:', msg.text());
            }
        });
        
        // Load game
        console.log('1. Loading game...');
        await page.goto('http://localhost:3000');
        await page.waitForSelector('#gameCanvas', { timeout: 5000 });
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Start game
        console.log('2. Starting game...');
        await page.keyboard.press('Enter');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check initial enemy state
        console.log('3. Checking enemies...\n');
        const initialState = await page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            if (!state || state.constructor.name !== 'PlayState') {
                return { error: 'Not in PlayState' };
            }
            
            return {
                enemyCount: state.enemies?.length || 0,
                enemies: state.enemies?.map((enemy, i) => ({
                    index: i,
                    type: enemy.constructor.name,
                    pos: { x: Math.round(enemy.x), y: Math.round(enemy.y) },
                    vel: { x: enemy.vx.toFixed(2), y: enemy.vy.toFixed(2) },
                    grounded: enemy.grounded,
                    physicsEnabled: enemy.physicsEnabled,
                    moveSpeed: enemy.moveSpeed,
                    direction: enemy.direction
                })) || []
            };
        });
        
        console.log('Initial state:', JSON.stringify(initialState, null, 2));
        
        // Monitor for 5 seconds
        console.log('\n4. Monitoring enemy movement for 5 seconds...\n');
        
        for (let second = 1; second <= 5; second++) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const currentState = await page.evaluate(() => {
                const state = window.game?.stateManager?.currentState;
                const enemy = state?.enemies?.[0];
                
                if (!enemy) return null;
                
                return {
                    second: new Date().toLocaleTimeString(),
                    pos: { x: Math.round(enemy.x), y: Math.round(enemy.y) },
                    vel: { x: enemy.vx.toFixed(2), y: enemy.vy.toFixed(2) },
                    grounded: enemy.grounded
                };
            });
            
            if (currentState) {
                console.log(`${second}s: pos(${currentState.pos.x}, ${currentState.pos.y}) vel(${currentState.vel.x}, ${currentState.vel.y}) grounded=${currentState.grounded}`);
                
                // Check if enemy flew off
                if (Math.abs(currentState.pos.x) > 500 || Math.abs(currentState.pos.y) > 500) {
                    console.log('\n⚠️  ENEMY FLEW OFF SCREEN!');
                    break;
                }
            }
        }
        
        // Final check
        const finalState = await page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            return {
                enemyCount: state?.enemies?.length || 0,
                enemies: state?.enemies?.map(enemy => ({
                    pos: { x: Math.round(enemy.x), y: Math.round(enemy.y) },
                    onScreen: Math.abs(enemy.x) < 500 && Math.abs(enemy.y) < 500
                })) || []
            };
        });
        
        console.log('\n5. Final check:');
        console.log(`   Enemies on screen: ${finalState.enemies.filter(e => e.onScreen).length}/${finalState.enemyCount}`);
        
        if (finalState.enemies.every(e => e.onScreen)) {
            console.log('   ✅ All enemies stayed on screen!');
        } else {
            console.log('   ❌ Some enemies flew off screen!');
            finalState.enemies.forEach((e, i) => {
                if (!e.onScreen) {
                    console.log(`      Enemy ${i} at (${e.pos.x}, ${e.pos.y})`);
                }
            });
        }
        
    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await browser.close();
    }
}

checkEnemyStatus();