const GameTestHelpers = require('./utils/GameTestHelpers');

// Performance monitoring test
async function runTest() {
    const test = new GameTestHelpers({
        headless: true,   // Run headless for performance
        slowMo: 0,        // No slowdown
        verbose: false
    });

    await test.runTest(async (t) => {
        // Initialize
        await t.init('Performance Test');
        await t.navigateToGame();
        await t.waitForGameInitialization();
        
        // Start game
        await t.startNewGame();
        await t.assertPlayerExists();
        
        console.log('\n--- Starting Performance Monitoring ---\n');
        
        // Monitor performance during gameplay
        const performanceReport = await t.monitorPerformance(30000, async () => {
            // Simulate active gameplay
            for (let i = 0; i < 10; i++) {
                await t.movePlayer('right', 800);
                await t.jumpPlayer();
                await t.wait(200);
                await t.movePlayer('left', 600);
                await t.jumpPlayer();
                await t.wait(200);
            }
        });
        
        // Performance assertions
        const avgFps = parseFloat(performanceReport.averageFps);
        const minFps = performanceReport.minFps;
        
        console.log('\n--- Performance Test Results ---');
        console.log(`Average FPS: ${avgFps}`);
        console.log(`Minimum FPS: ${minFps}`);
        console.log(`Heap Growth: ${(performanceReport.heapGrowth / 1024 / 1024).toFixed(2)} MB`);
        
        // Assert performance requirements
        if (avgFps < 55) {
            throw new Error(`Average FPS (${avgFps}) is below 55 FPS requirement`);
        }
        
        if (minFps < 30) {
            throw new Error(`Minimum FPS (${minFps}) is below 30 FPS threshold`);
        }
        
        if (performanceReport.heapGrowth > 50 * 1024 * 1024) {
            console.warn(`⚠️  Warning: Heap grew by ${(performanceReport.heapGrowth / 1024 / 1024).toFixed(2)} MB`);
        }
        
        console.log('\n✅ Performance test passed!');
        
        // Take final screenshot
        await t.screenshot('performance-test-complete');
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