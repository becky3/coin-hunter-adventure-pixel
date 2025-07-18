const GameTestHelpers = require('./utils/GameTestHelpers.cjs');

/**
 * Unified enemy types test
 * Combines test-bat.cjs and test-spider.cjs
 */
async function runTest() {
    const test = new GameTestHelpers({
        headless: true,
        verbose: false,
        timeout: 25000
    });

    await test.runTest(async (t) => {
        // Initialize test
        await t.init('Enemy Types Test');
        
        // Setup error tracking
        await t.injectErrorTracking();
        
        // Navigate to stage 2-1 which has various enemy types
        await t.navigateToGame('http://localhost:3000?s=2-1&skip_title=true');
        await t.waitForGameInitialization();
        
        // With skip_title=true, we should go directly to play state
        await t.assertState('play');
        await t.assertPlayerExists();
        
        console.log('\n=== Testing Enemy Types ===');
        
        // === PART 1: Bat Enemy Test ===
        console.log('\n--- Part 1: Bat Enemy ---');
        
        // Create a Bat enemy
        await t.page.evaluate(() => {
            const state = window.game.stateManager.currentState;
            const Bat = window.Bat;
            if (Bat && state) {
                const bat = new Bat(200, 200, window.game);
                state.entityManager.addEntity('enemies', bat);
                console.log('Bat created at x=200, y=200');
            }
        });
        
        await t.wait(500);
        
        // Check Bat behavior
        const batInfo = await t.page.evaluate(() => {
            const state = window.game.stateManager.currentState;
            const enemies = state.entityManager.getEnemies() || [];
            const bat = enemies.find(e => e.constructor.name === 'Bat');
            
            if (bat) {
                return {
                    exists: true,
                    x: bat.x,
                    y: bat.y,
                    vx: bat.vx,
                    vy: bat.vy,
                    state: bat.state,
                    patrolling: bat.state === 'patrol'
                };
            }
            return { exists: false };
        });
        
        t.assert(batInfo.exists, 'Bat enemy should exist');
        console.log('Bat info:', batInfo);
        
        // Test Bat player detection
        console.log('\nTesting Bat player detection...');
        
        // Move player near the bat
        await t.page.evaluate(() => {
            const state = window.game.stateManager.currentState;
            const player = state.player;
            const enemies = state.entityManager.getEnemies() || [];
            const bat = enemies.find(e => e.constructor.name === 'Bat');
            
            if (player && bat) {
                // Position player within detection range
                player.x = bat.x;
                player.y = bat.y + 50; // Below the bat
            }
        });
        
        await t.wait(1000); // Wait for bat to detect and attack
        
        const batAttackInfo = await t.page.evaluate(() => {
            const state = window.game.stateManager.currentState;
            const enemies = state.entityManager.getEnemies() || [];
            const bat = enemies.find(e => e.constructor.name === 'Bat');
            
            if (bat) {
                return {
                    state: bat.state,
                    isAttacking: bat.state === 'attack',
                    velocityChanged: Math.abs(bat.vx) > 0.1 || Math.abs(bat.vy) > 0.1
                };
            }
            return null;
        });
        
        t.assert(batAttackInfo && (batAttackInfo.isAttacking || batAttackInfo.velocityChanged), 
            'Bat should attack or move when player is detected');
        console.log('✅ Bat enemy detection working');
        
        // === PART 2: Spider Enemy Test ===
        console.log('\n--- Part 2: Spider Enemy ---');
        
        // Clear existing enemies and create a Spider
        await t.page.evaluate(() => {
            const state = window.game.stateManager.currentState;
            // Clear enemies
            state.entityManager.enemies = [];
            
            const Spider = window.Spider;
            if (Spider && state) {
                const spider = new Spider(300, 100, window.game);
                state.entityManager.addEntity('enemies', spider);
                console.log('Spider created at x=300, y=100');
            }
        });
        
        await t.wait(500);
        
        // Check Spider behavior
        const spiderInfo = await t.page.evaluate(() => {
            const state = window.game.stateManager.currentState;
            const enemies = state.entityManager.getEnemies() || [];
            const spider = enemies.find(e => e.constructor.name === 'Spider');
            
            if (spider) {
                return {
                    exists: true,
                    x: spider.x,
                    y: spider.y,
                    state: spider.state,
                    onCeiling: spider.onCeiling,
                    webY: spider.webY
                };
            }
            return { exists: false };
        });
        
        t.assert(spiderInfo.exists, 'Spider enemy should exist');
        t.assert(spiderInfo.onCeiling, 'Spider should start on ceiling');
        console.log('Spider info:', spiderInfo);
        
        // Test Spider player detection and web descent
        console.log('\nTesting Spider player detection...');
        
        // Move player below the spider
        await t.page.evaluate(() => {
            const state = window.game.stateManager.currentState;
            const player = state.player;
            const enemies = state.entityManager.getEnemies() || [];
            const spider = enemies.find(e => e.constructor.name === 'Spider');
            
            if (player && spider) {
                // Position player directly below spider
                player.x = spider.x;
                player.y = spider.y + 100;
            }
        });
        
        await t.wait(1500); // Wait for spider to detect and descend
        
        const spiderDescentInfo = await t.page.evaluate(() => {
            const state = window.game.stateManager.currentState;
            const enemies = state.entityManager.getEnemies() || [];
            const spider = enemies.find(e => e.constructor.name === 'Spider');
            
            if (spider) {
                return {
                    state: spider.state,
                    isDescending: spider.state === 'descending',
                    yPosition: spider.y,
                    onCeiling: spider.onCeiling
                };
            }
            return null;
        });
        
        t.assert(spiderDescentInfo && (spiderDescentInfo.isDescending || !spiderDescentInfo.onCeiling), 
            'Spider should descend when player is below');
        console.log('✅ Spider enemy detection and descent working');
        
        // === PART 3: Enemy Common Features ===
        console.log('\n--- Part 3: Enemy Common Features ---');
        
        // Test enemy damage to player
        const initialLives = await t.page.evaluate(() => {
            return window.game.stateManager.currentState.lives;
        });
        
        // Move player to collide with an enemy
        await t.page.evaluate(() => {
            const state = window.game.stateManager.currentState;
            const player = state.player;
            const enemies = state.entityManager.getEnemies() || [];
            const enemy = enemies[0];
            
            if (player && enemy) {
                player.x = enemy.x;
                player.y = enemy.y;
                player.invulnerable = false; // Ensure player can take damage
            }
        });
        
        await t.wait(500);
        
        const afterCollisionLives = await t.page.evaluate(() => {
            return window.game.stateManager.currentState.lives;
        });
        
        t.assert(afterCollisionLives < initialLives, 'Player should take damage from enemy collision');
        console.log('✅ Enemy damage system working');
        
        // Check for any errors
        await t.checkForErrors();
        
        console.log('\n=== All Enemy Types Tests Passed ===');
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