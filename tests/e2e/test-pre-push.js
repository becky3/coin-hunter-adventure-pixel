const fs = require('fs');
const path = require('path');

// Pre-push test configuration
// These tests must pass before code can be pushed
const tests = [
    {
        name: 'Basic Flow Test',
        file: './test-basic-flow.js',
        critical: true,
        timeout: 30000
    },
    {
        name: 'Complete Gameplay Test',
        file: './test-complete-gameplay.js', 
        critical: true,
        timeout: 120000
    },
    {
        name: 'Performance Test',
        file: './test-performance.js',
        critical: true,
        timeout: 60000
    }
];

// Pre-push test runner
async function runPrePushTests() {
    console.log('🚀 Running Pre-Push Tests\n');
    console.log('These tests ensure code quality before pushing to repository.\n');
    
    const startTime = Date.now();
    const results = [];
    let allPassed = true;
    
    // Check if dev server is running
    try {
        const fetch = (await import('node-fetch')).default;
        await fetch('http://localhost:3000');
    } catch (error) {
        console.error('❌ ERROR: Dev server is not running!');
        console.error('Please run "npm run dev" in another terminal before running tests.\n');
        process.exit(1);
    }
    
    // Run each test
    for (const test of tests) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`Running: ${test.name}`);
        console.log(`Timeout: ${test.timeout / 1000}s`);
        console.log(`${'='.repeat(60)}\n`);
        
        const testStartTime = Date.now();
        let success = false;
        let error = null;
        
        try {
            // Create a timeout promise
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error(`Test timeout after ${test.timeout}ms`)), test.timeout);
            });
            
            // Import and run the test
            const testModule = require(test.file);
            
            // Race between test completion and timeout
            await Promise.race([
                testModule(),
                timeoutPromise
            ]);
            
            success = true;
        } catch (err) {
            error = err;
            if (test.critical) {
                allPassed = false;
            }
        }
        
        const testDuration = Date.now() - testStartTime;
        
        results.push({
            name: test.name,
            success,
            duration: testDuration,
            critical: test.critical,
            error: error ? error.message : null
        });
        
        if (success) {
            console.log(`\n✅ ${test.name} - PASSED (${(testDuration / 1000).toFixed(2)}s)`);
        } else {
            console.log(`\n❌ ${test.name} - FAILED (${(testDuration / 1000).toFixed(2)}s)`);
            console.error(`Error: ${error.message}`);
            
            if (test.critical) {
                console.error('\n⛔ CRITICAL TEST FAILED - Push blocked!');
                break; // Stop running further tests
            }
        }
    }
    
    // Summary
    const totalDuration = Date.now() - startTime;
    
    console.log(`\n${'='.repeat(60)}`);
    console.log('PRE-PUSH TEST SUMMARY');
    console.log(`${'='.repeat(60)}\n`);
    
    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`Total Tests: ${results.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);
    
    console.log('\nTest Results:');
    results.forEach(result => {
        const status = result.success ? '✅' : '❌';
        const critical = result.critical ? '[CRITICAL]' : '';
        console.log(`${status} ${result.name} ${critical} - ${(result.duration / 1000).toFixed(2)}s`);
        if (!result.success && result.error) {
            console.log(`   └─ ${result.error}`);
        }
    });
    
    // Save test report
    const reportDir = path.join(__dirname, '../reports');
    if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
    }
    
    const reportPath = path.join(reportDir, `pre-push-report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    fs.writeFileSync(reportPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        type: 'pre-push',
        passed: allPassed,
        summary: {
            total: results.length,
            passed,
            failed,
            duration: totalDuration
        },
        results
    }, null, 2));
    
    console.log(`\nTest report saved: ${reportPath}`);
    
    // Final verdict
    console.log(`\n${'='.repeat(60)}`);
    if (allPassed) {
        console.log('✅ ALL TESTS PASSED - Ready to push!');
        console.log(`${'='.repeat(60)}\n`);
        process.exit(0);
    } else {
        console.log('❌ TESTS FAILED - Please fix issues before pushing!');
        console.log(`${'='.repeat(60)}\n`);
        console.log('Tips:');
        console.log('1. Check the error messages above');
        console.log('2. Run individual tests to debug: npm run test:basic');
        console.log('3. Check screenshots in tests/screenshots/');
        console.log('4. Ensure the game runs correctly: npm run dev\n');
        process.exit(1);
    }
}

// Run tests
if (require.main === module) {
    runPrePushTests().catch(error => {
        console.error('Pre-push test suite failed:', error);
        process.exit(1);
    });
}