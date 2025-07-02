const GameTestHelpers = require('./utils/GameTestHelpers.cjs');

async function runTest() {
    const test = new GameTestHelpers({
        headless: false,
        slowMo: 100,
        verbose: true
    });

    await test.runTest(async (t) => {
        await t.init('Jump Debug Test');
        await t.navigateToGame();
        await t.waitForGameInitialization();
        await t.startNewGame();
        
        console.log('\n--- Testing Jump Mechanics ---');
        
        // Wait for player to be grounded
        await t.waitForPlayerGrounded();
        
        // Get initial position
        const beforeJump = await t.getPlayerPosition();
        console.log(`Before jump: (${beforeJump.x.toFixed(2)}, ${beforeJump.y.toFixed(2)})`);
        
        // Try different jump methods
        console.log('\nMethod 1: Space key');
        await t.pressKey('Space');
        
        // Check position at different intervals
        for (let i = 1; i <= 5; i++) {
            await t.wait(100);
            const pos = await t.getPlayerPosition();
            const stats = await t.getPlayerStats();
            console.log(`After ${i * 100}ms: (${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}) vy=${stats.velocity.y.toFixed(2)} grounded=${stats.grounded}`);
        }
        
        // Wait to land
        await t.waitForPlayerGrounded();
        
        console.log('\nMethod 2: ArrowUp key');
        const beforeJump2 = await t.getPlayerPosition();
        await t.pressKey('ArrowUp');
        
        for (let i = 1; i <= 5; i++) {
            await t.wait(100);
            const pos = await t.getPlayerPosition();
            const stats = await t.getPlayerStats();
            console.log(`After ${i * 100}ms: (${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}) vy=${stats.velocity.y.toFixed(2)} grounded=${stats.grounded}`);
        }
        
        // Wait to land
        await t.waitForPlayerGrounded();
        
        console.log('\nMethod 3: W key (uppercase)');
        const beforeJump3 = await t.getPlayerPosition();
        await t.pressKey('W');
        
        for (let i = 1; i <= 5; i++) {
            await t.wait(100);
            const pos = await t.getPlayerPosition();
            const stats = await t.getPlayerStats();
            console.log(`After ${i * 100}ms: (${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}) vy=${stats.velocity.y.toFixed(2)} grounded=${stats.grounded}`);
        }
        
        // Check input bindings
        console.log('\n--- Input System Debug ---');
        const inputInfo = await t.page.evaluate(() => {
            const inputSystem = window.game?.inputSystem;
            if (!inputSystem) return null;
            
            return {
                keyBindings: inputSystem.keyBindings,
                currentKeys: inputSystem.keys || {},
                keyMap: inputSystem.keyMap
            };
        });
        console.log('Input info:', JSON.stringify(inputInfo, null, 2));
        
        await t.screenshot('jump-debug');
    });
}

if (require.main === module) {
    runTest().catch(error => {
        console.error('Test failed:', error);
        process.exit(1);
    });
}

module.exports = runTest;