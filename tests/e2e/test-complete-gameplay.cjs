const GameTestHelpers = require('./utils/GameTestHelpers.cjs');

// Complete gameplay test - from start to goal
async function runTest() {
    const test = new GameTestHelpers({
        headless: false,  // Set to true for CI
        slowMo: 0,        // No delay for actual gameplay
        verbose: true,
        timeout: 120000   // 2 minutes for complete gameplay
    });

    await test.runTest(async (t) => {
        // Setup
        await t.init('Complete Gameplay Test');
        await t.injectErrorTracking();
        await t.navigateToGame();
        await t.waitForGameInitialization();
        
        // Start game
        await t.startNewGame();
        await t.assertPlayerExists();
        await t.screenshot('gameplay-start');
        
        console.log('\n--- Starting Complete Gameplay Test ---\n');
        
        // Get initial level info
        const levelInfo = await t.getLevelInfo();
        console.log(`Level: ${levelInfo.name}`);
        console.log(`Entities: ${levelInfo.entities}`);
        
        // Wait for player to be grounded before starting
        await t.waitForPlayerGrounded();
        
        // Define goal check function
        const checkGoalReached = async () => {
            return await t.page.evaluate(() => {
                const state = window.game?.stateManager?.currentState;
                if (!state || state.name !== 'play') return false;
                
                // Check if player reached goal
                // This might be indicated by:
                // 1. Level completion flag
                // 2. Specific player position
                // 3. State change
                // 4. Victory condition
                
                // Check for level completion
                if (state.levelCompleted || state.isLevelComplete) {
                    return true;
                }
                
                // Check for goal entity collision
                const player = state.player;
                const goalEntity = state.entities?.find(e => 
                    e.type === 'goal' || 
                    e.type === 'exit' || 
                    e.type === 'finish' ||
                    e.name === 'goal'
                );
                
                if (player && goalEntity) {
                    const dx = Math.abs(player.position.x - goalEntity.position.x);
                    const dy = Math.abs(player.position.y - goalEntity.position.y);
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    // Check if player is close enough to goal
                    if (distance < 50) {
                        return true;
                    }
                }
                
                // Check if reached right edge of level (common goal position)
                const levelWidth = state.levelManager?.currentLevel?.width || 3000;
                if (player && player.position.x > levelWidth - 100) {
                    return true;
                }
                
                return false;
            });
        };
        
        // Gameplay strategy
        console.log('Executing gameplay strategy...\n');
        
        const startTime = Date.now();
        const maxPlayTime = 90000; // 90 seconds max
        let reachedGoal = false;
        let lastPlayerX = 0;
        let stuckCounter = 0;
        
        // Main gameplay loop
        while (!reachedGoal && (Date.now() - startTime) < maxPlayTime) {
            // Get current player state
            const playerStats = await t.getPlayerStats();
            if (!playerStats) {
                throw new Error('Lost player during gameplay');
            }
            
            console.log(`Position: (${playerStats.position.x.toFixed(0)}, ${playerStats.position.y.toFixed(0)}) | Health: ${playerStats.health}`);
            
            // Check if player is stuck
            if (Math.abs(playerStats.position.x - lastPlayerX) < 10) {
                stuckCounter++;
                if (stuckCounter > 5) {
                    console.log('Player seems stuck, trying to jump...');
                    await t.jumpPlayer();
                    await t.wait(500);
                    stuckCounter = 0;
                }
            } else {
                stuckCounter = 0;
            }
            lastPlayerX = playerStats.position.x;
            
            // Basic movement strategy
            // Move right (most platform games have goals to the right)
            await t.holdKey('ArrowRight', 300);
            
            // Check for enemies ahead
            const enemies = await t.getEnemies();
            const nearbyEnemies = enemies.filter(enemy => {
                const dx = enemy.position.x - playerStats.position.x;
                const dy = Math.abs(enemy.position.y - playerStats.position.y);
                return dx > 0 && dx < 200 && dy < 100 && enemy.alive;
            });
            
            if (nearbyEnemies.length > 0) {
                console.log(`Enemy detected! Attempting to jump over...`);
                await t.jumpPlayer();
                await t.wait(400);
            }
            
            // Check for gaps or platforms (simple heuristic)
            if (Math.random() < 0.3) { // 30% chance to jump (for platforms/gaps)
                await t.jumpPlayer();
                await t.wait(300);
            }
            
            // Check for coins
            const coins = await t.getCoins();
            const nearbyCoins = coins.filter(coin => {
                const dx = Math.abs(coin.position.x - playerStats.position.x);
                const dy = Math.abs(coin.position.y - playerStats.position.y);
                return dx < 100 && dy < 100 && !coin.collected;
            });
            
            if (nearbyCoins.length > 0) {
                console.log(`Found ${nearbyCoins.length} coins nearby`);
            }
            
            // Check if goal reached
            reachedGoal = await checkGoalReached();
            
            // Take periodic screenshots
            if ((Date.now() - startTime) % 10000 < 500) { // Every 10 seconds
                await t.screenshot(`gameplay-progress-${Math.floor((Date.now() - startTime) / 10000)}`);
            }
            
            // Small delay to prevent overwhelming the game
            await t.wait(100);
        }
        
        // Results
        const playTime = (Date.now() - startTime) / 1000;
        console.log(`\n--- Gameplay Results ---`);
        console.log(`Time elapsed: ${playTime.toFixed(1)} seconds`);
        
        if (reachedGoal) {
            console.log('✅ GOAL REACHED!');
            await t.screenshot('goal-reached');
            
            // Wait for any victory animation or state change
            await t.wait(2000);
            
            // Check final state
            const finalState = await t.getGameState();
            console.log(`Final game state: ${finalState.currentState}`);
            
            // Get final player stats
            const finalStats = await t.getPlayerStats();
            if (finalStats) {
                console.log(`Final position: (${finalStats.position.x.toFixed(0)}, ${finalStats.position.y.toFixed(0)})`);
                console.log(`Final health: ${finalStats.health}`);
                console.log(`Final score: ${finalStats.score}`);
            }
        } else {
            throw new Error(`Failed to reach goal within ${maxPlayTime / 1000} seconds`);
        }
        
        // Performance check during gameplay
        const perfMetrics = await t.page.metrics();
        console.log(`\nPerformance Metrics:`);
        console.log(`JS Heap: ${(perfMetrics.JSHeapUsedSize / 1024 / 1024).toFixed(2)} MB`);
        console.log(`DOM Nodes: ${perfMetrics.Nodes}`);
        
        // Check for errors
        await t.checkForErrors();
        
        console.log('\n✅ Complete gameplay test passed!');
    });
}

// Run the test
if (require.main === module) {
    runTest().catch(error => {
        console.error('Test failed:', error);
        process.exit(1);
    });
}

module.exports = runTest;