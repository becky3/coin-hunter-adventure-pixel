const fs = require('fs');
const path = require('path');

// Test configuration
const tests = [
    {
        name: 'Basic Flow Test',
        file: './test-basic-flow.cjs',
        critical: true
    },
    {
        name: 'Damage and Death Test',
        file: './test-damage-and-death.cjs',
        critical: true
    },
    {
        name: 'Performance Test',
        file: './test-performance.cjs',
        critical: true
    },
    {
        name: 'Stress Test',
        file: './test-stress.cjs',
        critical: false
    }
];

// Test runner
async function runAllTests() {
    console.log('🚀 Starting E2E Test Suite\n');
    console.log(`Running ${tests.length} tests...\n`);
    
    const results = [];
    let failedCritical = false;
    
    for (const test of tests) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`Running: ${test.name}`);
        console.log(`Critical: ${test.critical ? 'Yes' : 'No'}`);
        console.log(`${'='.repeat(60)}\n`);
        
        const startTime = Date.now();
        let success = false;
        let error = null;
        
        try {
            const testModule = require(test.file);
            await testModule();
            success = true;
        } catch (err) {
            error = err;
            if (test.critical) {
                failedCritical = true;
            }
        }
        
        const duration = Date.now() - startTime;
        
        results.push({
            name: test.name,
            file: test.file,
            success,
            duration,
            critical: test.critical,
            error: error ? error.message : null
        });
        
        if (success) {
            console.log(`\n✅ ${test.name} - PASSED (${(duration / 1000).toFixed(2)}s)`);
        } else {
            console.log(`\n❌ ${test.name} - FAILED (${(duration / 1000).toFixed(2)}s)`);
            console.error(`Error: ${error.message}`);
        }
    }
    
    // Generate test report
    console.log(`\n${'='.repeat(60)}`);
    console.log('TEST SUITE SUMMARY');
    console.log(`${'='.repeat(60)}\n`);
    
    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
    
    console.log(`Total Tests: ${results.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);
    console.log(`Average Duration: ${(totalDuration / results.length / 1000).toFixed(2)}s`);
    
    console.log('\nDetailed Results:');
    results.forEach(result => {
        const status = result.success ? '✅' : '❌';
        const critical = result.critical ? '[CRITICAL]' : '';
        console.log(`${status} ${result.name} ${critical} - ${(result.duration / 1000).toFixed(2)}s`);
        if (!result.success) {
            console.log(`   Error: ${result.error}`);
        }
    });
    
    // Save report to file
    const reportPath = path.join(__dirname, '../reports', `test-report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    const reportDir = path.dirname(reportPath);
    
    if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        summary: {
            total: results.length,
            passed,
            failed,
            totalDuration,
            criticalFailure: failedCritical
        },
        results
    }, null, 2));
    
    console.log(`\nTest report saved to: ${reportPath}`);
    
    // Exit with appropriate code
    if (failedCritical) {
        console.log('\n❌ CRITICAL TEST FAILURE - BUILD SHOULD NOT PROCEED');
        process.exit(1);
    } else if (failed > 0) {
        console.log('\n⚠️  Non-critical tests failed');
        process.exit(0);
    } else {
        console.log('\n✅ ALL TESTS PASSED!');
        process.exit(0);
    }
}

// Run tests
if (require.main === module) {
    runAllTests().catch(error => {
        console.error('Test suite failed:', error);
        process.exit(1);
    });
}