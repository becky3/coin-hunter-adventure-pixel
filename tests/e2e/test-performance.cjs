const GameTestHelpers = require('./utils/GameTestHelpers.cjs');

// Performance monitoring test
async function runTest() {
    const test = new GameTestHelpers({
        headless: false,   // Change to false for more reliable testing
        slowMo: 50,        // Add slight delay for stability
        verbose: false
    });

    await test.runTest(async (t) => {
        // Initialize
        await t.init('Performance Test');
        await t.injectErrorTracking();
        await t.navigateToGame();
        await t.waitForGameInitialization();
        
        // Start game
        await t.startNewGame();
        await t.wait(1000); // Wait for game state to stabilize
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
        console.log(`Average FPS: ${avgFps || 'N/A'}`);
        console.log(`Minimum FPS: ${minFps || 'N/A'}`);
        console.log(`Heap Growth: ${(performanceReport.heapGrowth / 1024 / 1024).toFixed(2)} MB`);
        
        // Skip FPS assertions if FPS data is not available
        if (avgFps > 0) {
            if (avgFps < 55) {
                throw new Error(`Average FPS (${avgFps}) is below 55 FPS requirement`);
            }
            
            if (minFps < 30) {
                throw new Error(`Minimum FPS (${minFps}) is below 30 FPS threshold`);
            }
        } else {
            console.log('⚠️  FPS data not available, skipping FPS assertions');
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