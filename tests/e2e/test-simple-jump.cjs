const GameTestHelpers = require('./utils/GameTestHelpers.cjs');

async function runTest() {
    const test = new GameTestHelpers({
        headless: false,
        slowMo: 0,
        verbose: true
    });

    await test.runTest(async (t) => {
        await t.init('Simple Jump Test');
        await t.navigateToGame();
        await t.waitForGameInitialization();
        await t.startNewGame();
        
        // Wait for player to be ready
        await t.waitForPlayerGrounded();
        await t.wait(1000);
        
        // Get initial state
        const before = await t.getPlayerStats();
        console.log('Before jump:', JSON.stringify(before, null, 2));
        
        // Try jumping
        console.log('\nPressing Space key...');
        await t.pressKey('Space');
        
        // Check state immediately after
        for (let i = 0; i < 10; i++) {
            await t.wait(100);
            const stats = await t.getPlayerStats();
            console.log(`After ${(i + 1) * 100}ms:`, {
                y: stats.position.y.toFixed(2),
                vy: stats.velocity.y.toFixed(2),
                grounded: stats.grounded
            });
            
            if (!stats.grounded || stats.velocity.y < -1) {
                console.log('✅ Jump detected!');
                break;
            }
        }
        
        // Screenshot
        await t.screenshot('simple-jump-test');
        
        // Keep browser open for a bit
        await t.wait(3000);
    });
}

if (require.main === module) {
    runTest().catch(error => {
        console.error('Test failed:', error);
        process.exit(1);
    });
}

module.exports = runTest;