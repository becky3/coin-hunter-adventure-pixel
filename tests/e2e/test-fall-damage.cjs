const GameTestHelpers = require('./utils/GameTestHelpers.cjs');

// Test fall damage
async function runTest() {
    const test = new GameTestHelpers({
        headless: false,  // Show browser to see what's happening
        slowMo: 100,      // Slow down for observation
        verbose: true
    });

    await test.runTest(async (t) => {
        // Initialize game
        await t.init('Fall Damage Test');
        
        // Setup error tracking
        await t.injectErrorTracking();
        
        // Navigate to game with stage parameter
        await t.navigateToGame('http://localhost:3000/?s=0-1');
        await t.waitForGameInitialization();
        
        // Start new game
        await t.startNewGame();
        await t.wait(2000); // Wait for game to fully initialize
        
        // Get initial player stats
        const initialStats = await t.getPlayerStats();
        console.log('\n--- Initial Player Stats ---');
        console.log(`Health: ${initialStats.health}`);
        console.log(`Position: (${initialStats.position.x}, ${initialStats.position.y})`);
        
        // Check console logs for fall damage
        await t.page.evaluate(() => {
            // Override console.log to capture fall damage logs
            const originalLog = console.log;
            window.fallDamageLogs = [];
            console.log = function(...args) {
                const message = args.join(' ');
                if (message.includes('[PlayState] Player fell') || message.includes('Health')) {
                    window.fallDamageLogs.push(message);
                }
                originalLog.apply(console, args);
            };
        });
        
        // Move player to a pit (assuming there's one in stage1-1)
        console.log('\n--- Moving player towards pit ---');
        await t.movePlayer('right', 3000);
        await t.wait(1000);
        
        // Jump into pit
        console.log('\n--- Attempting to fall into pit ---');
        await t.jumpPlayer();
        await t.movePlayer('right', 1000);
        await t.wait(3000); // Wait for fall
        
        // Get player stats after fall
        const afterFallStats = await t.getPlayerStats();
        console.log('\n--- After Fall Player Stats ---');
        console.log(`Health: ${afterFallStats.health}`);
        console.log(`Position: (${afterFallStats.position.x}, ${afterFallStats.position.y})`);
        
        // Check if player took damage
        if (initialStats.health > afterFallStats.health) {
            console.log(`✅ Player took damage: ${initialStats.health} -> ${afterFallStats.health}`);
        } else {
            console.log(`⚠️  Player health unchanged: ${afterFallStats.health}`);
        }
        
        // Get fall damage logs
        const logs = await t.page.evaluate(() => window.fallDamageLogs);
        console.log('\n--- Fall Damage Logs ---');
        logs.forEach(log => console.log(log));
        
        // Check HUD display
        const hudLives = await t.page.evaluate(() => {
            const hudElement = document.querySelector('#game-canvas');
            if (!hudElement) return null;
            
            // Try to get HUD data from game state
            const game = window.game;
            const hudManager = game?.stateManager?.currentState?.hudManager;
            return hudManager?.getHUDData()?.lives;
        });
        
        console.log(`\n--- HUD Lives Display: ${hudLives} ---`);
        
        // Keep browser open for manual inspection
        console.log('\n--- Keeping browser open for 5 seconds for manual inspection ---');
        await t.wait(5000);
    });
}

// Run the test
runTest().catch(console.error);