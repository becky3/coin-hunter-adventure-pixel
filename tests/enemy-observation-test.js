import puppeteer from 'puppeteer';

async function observeEnemyBehavior() {
    const browser = await puppeteer.launch({
        headless: false,
        devtools: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({ width: 1280, height: 720 });
    
    console.log('Loading game...');
    await page.goto('http://localhost:3000');
    
    // Wait for game to load
    await page.waitForSelector('#gameCanvas', { timeout: 5000 });
    await page.waitForTimeout(2000);
    
    console.log('Starting game...');
    // Press Enter to start
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
    
    // Function to capture enemy positions
    const captureEnemyData = async () => {
        return await page.evaluate(() => {
            if (!window.gameState || !window.gameState.enemies) {
                return { error: 'No game state or enemies found' };
            }
            
            return {
                enemyCount: window.gameState.enemies.length,
                enemies: window.gameState.enemies.map((enemy, index) => ({
                    index,
                    x: Math.round(enemy.x),
                    y: Math.round(enemy.y),
                    velocityX: enemy.velocityX ? enemy.velocityX.toFixed(2) : 0,
                    velocityY: enemy.velocityY ? enemy.velocityY.toFixed(2) : 0,
                    grounded: enemy.grounded || false,
                    movingRight: enemy.movingRight || false
                }))
            };
        });
    };
    
    // Capture initial positions
    console.log('\n=== INITIAL ENEMY POSITIONS (t=0s) ===');
    const initialData = await captureEnemyData();
    console.log(JSON.stringify(initialData, null, 2));
    
    // Observe for 10 seconds, capturing data every 2 seconds
    for (let t = 2; t <= 10; t += 2) {
        await page.waitForTimeout(2000);
        console.log(`\n=== ENEMY POSITIONS (t=${t}s) ===`);
        const data = await captureEnemyData();
        console.log(JSON.stringify(data, null, 2));
        
        // Check for issues
        if (data.enemies) {
            data.enemies.forEach(enemy => {
                // Check if enemy is flying away (y position too high or too low)
                if (enemy.y < -100 || enemy.y > 800) {
                    console.log(`⚠️  Enemy ${enemy.index} is out of bounds! Y: ${enemy.y}`);
                }
                
                // Check if enemy has excessive velocity
                if (Math.abs(enemy.velocityY) > 10) {
                    console.log(`⚠️  Enemy ${enemy.index} has high Y velocity: ${enemy.velocityY}`);
                }
                
                // Check if enemy is off platform (assuming platforms are around y=400-500)
                if (!enemy.grounded && Math.abs(enemy.velocityY) < 0.1) {
                    console.log(`⚠️  Enemy ${enemy.index} appears to be floating!`);
                }
            });
        }
    }
    
    // Final analysis
    console.log('\n=== FINAL ANALYSIS ===');
    const finalData = await captureEnemyData();
    
    if (finalData.enemies) {
        const movementSummary = finalData.enemies.map(enemy => {
            const initial = initialData.enemies[enemy.index];
            return {
                enemy: enemy.index,
                deltaX: enemy.x - initial.x,
                deltaY: enemy.y - initial.y,
                status: enemy.grounded ? 'ON PLATFORM' : 'AIRBORNE'
            };
        });
        
        console.log('Movement Summary:');
        console.log(JSON.stringify(movementSummary, null, 2));
    }
    
    // Keep browser open for manual inspection
    console.log('\nBrowser will remain open for manual inspection. Press Ctrl+C to exit.');
}

observeEnemyBehavior().catch(console.error);