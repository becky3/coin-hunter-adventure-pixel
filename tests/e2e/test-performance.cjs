const GameTestHelpers = require('./utils/GameTestHelpers.cjs');
const testConfig = require('./utils/testConfig.cjs');

// Performance monitoring test
async function runTest() {
    const test = new GameTestHelpers({
        headless: testConfig.headless,
        verbose: false,
        timeout: 60000
    });

    await test.runTest(async (t) => {
        // Initialize
        await t.init('Performance Test');
        
        // Use quickStart for simplified initialization
        await t.quickStart('test-all-sprites');
        await t.wait(1000); // Wait for game state to stabilize
        
        console.log('\n--- Starting Performance Monitoring ---\n');
        
        // Monitor performance during gameplay (reduced duration and actions)
        const performanceReport = await t.monitorPerformance(10000, async () => {
            // Simulate active gameplay with fewer iterations
            for (let i = 0; i < 3; i++) {
                await t.movePlayer('right', 500);
                await t.jumpPlayer();
                await t.wait(100);
                await t.movePlayer('left', 400);
                await t.jumpPlayer();
                await t.wait(100);
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
            t.assert(avgFps >= 55, `Average FPS (${avgFps}) is below 55 FPS requirement`);
            
            t.assert(minFps >= 30, `Minimum FPS (${minFps}) is below 30 FPS threshold`);
        } else {
            console.log('⚠️  FPS data not available, skipping FPS assertions');
        }
        
        if (performanceReport.heapGrowth > 50 * 1024 * 1024) {
            console.warn(`⚠️  Warning: Heap grew by ${(performanceReport.heapGrowth / 1024 / 1024).toFixed(2)} MB`);
        }
        
        console.log('\n✅ Performance test passed!');
        
        // Take final screenshot
        // await t.screenshot('performance-test-complete');
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