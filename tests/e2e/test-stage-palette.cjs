const GameTestHelpers = require('./utils/GameTestHelpers.cjs');
const testConfig = require('./utils/testConfig.cjs');

// Test stage palette changes
async function runTest() {
    const test = new GameTestHelpers({
        headless: testConfig.headless,
        verbose: true,
        timeout: 60000
    });

    await test.runTest(async (t) => {
        await t.init('Stage Palette Test');
        
        console.log('\n--- Testing Stage 1-1 (Grassland) ---');
        await t.quickStart('stage1-1');
        await t.wait(2000);
        await t.screenshot('stage-palette-grassland');
        
        console.log('\n--- Testing Stage 2-1 (Cave) ---');
        // Navigate to stage 2-1
        await t.quickStart('stage2-1');
        await t.wait(2000);
        await t.screenshot('stage-palette-cave');
        
        console.log('\n✅ Stage palette test completed!');
        console.log('Check the screenshots to verify color differences between stages.');
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