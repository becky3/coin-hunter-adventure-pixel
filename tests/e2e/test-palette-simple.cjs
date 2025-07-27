const GameTestHelpers = require('./utils/GameTestHelpers.cjs');
const testConfig = require('./utils/testConfig.cjs');

// Simple test to check palette system
async function runTest() {
    const test = new GameTestHelpers({
        headless: testConfig.headless,
        verbose: true,
        timeout: 30000
    });

    await test.runTest(async (t) => {
        await t.init('Palette Simple Test');
        
        console.log('\n--- Testing Stage 1-1 (Grassland) ---');
        await t.quickStart('stage1-1');
        await t.wait(1000);
        
        // Check for errors
        const hasErrors = await t.page.evaluate(() => {
            return window.gameErrors && window.gameErrors.length > 0;
        });
        
        if (hasErrors) {
            const errors = await t.page.evaluate(() => window.gameErrors);
            console.log('Errors found:', errors);
        }
        
        // Take screenshot
        await t.screenshot('palette-test-grassland');
        
        console.log('✅ Test completed!');
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