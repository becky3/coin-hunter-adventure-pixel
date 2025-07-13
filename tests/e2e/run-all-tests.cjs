const fs = require('fs');
const path = require('path');
const { toJSTString } = require('./utils/dateHelper.cjs');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Create a log file for the entire test run
const runLogPath = path.join(logsDir, `run-all-tests-${toJSTString()}.log`);
const runLogStream = fs.createWriteStream(runLogPath, { flags: 'a' });

// Override console.log to also write to log file
const originalConsoleLog = console.log;
console.log = function(...args) {
    const message = args.join(' ');
    originalConsoleLog.apply(console, args);
    runLogStream.write(`[${new Date().toISOString()}] ${message}\n`);
};

// Override console.error to also write to log file
const originalConsoleError = console.error;
console.error = function(...args) {
    const message = args.join(' ');
    originalConsoleError.apply(console, args);
    runLogStream.write(`[${new Date().toISOString()}] [ERROR] ${message}\n`);
};

// Automatically discover all test files
function discoverTests() {
    const testDir = __dirname;
    const testFiles = fs.readdirSync(testDir)
        .filter(file => {
            // Include files that start with 'test-' and end with '.cjs'
            // Exclude this runner script itself
            return file.startsWith('test-') && file.endsWith('.cjs') && file !== 'run-all-tests.cjs';
        })
        .sort(); // Sort for consistent order

    return testFiles.map(file => {
        // Convert filename to human-readable name
        const name = file
            .replace('.cjs', '')
            .replace(/^test-/, '')
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ') + ' Test';

        return {
            name,
            file: `./${file}`
        };
    });
}

// Get all tests
const tests = discoverTests();

console.log(`📋 Discovered ${tests.length} test files:${tests.map(t => `\n   - ${t.file}`).join('')}\n`);

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
            
            // Set a timeout for each test (90 seconds)
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Test timeout after 90 seconds')), 90000);
            });
            
            // Run test with timeout
            await Promise.race([
                testModule(),
                timeoutPromise
            ]);
            
            success = true;
            
            // Add a delay between tests to ensure cleanup
            if (tests.indexOf(test) < tests.length - 1) {
                console.log('\n⏳ Waiting 5 seconds before next test...');
                await new Promise(resolve => setTimeout(resolve, 5000));
                
                // Force garbage collection if available (requires --expose-gc flag)
                if (global.gc) {
                    console.log('🧹 Running garbage collection...');
                    global.gc();
                }
                
                // Additional wait for browser cleanup
                console.log('🔄 Ensuring browser cleanup...');
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        } catch (err) {
            error = err;
            failedCritical = true;
        }
        
        // If any test failed, stop immediately
        if (error) {
            console.log(`\n❌ ${test.name} - FAILED`);
            console.error(`Error: ${error.message}`);
            console.log('\n🛑 Stopping test suite due to test failure');
            
            results.push({
                name: test.name,
                file: test.file,
                success: false,
                duration: Date.now() - startTime,
                error: error.message
            });
            
            break; // Exit the test loop
        }
        
        const duration = Date.now() - startTime;
        
        results.push({
            name: test.name,
            file: test.file,
            success,
            duration,
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
        console.log(`${status} ${result.name} - ${(result.duration / 1000).toFixed(2)}s`);
        if (!result.success) {
            console.log(`   Error: ${result.error}`);
        }
    });
    
    // Save report to file
    const reportPath = path.join(__dirname, '../reports', `test-report-${toJSTString()}.json`);
    const reportDir = path.dirname(reportPath);
    
    if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify({
        timestamp: toJSTString(),
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
    console.log(`\nFull test log saved to: ${runLogPath}`);
    
    // Close the log stream before exiting
    runLogStream.end(() => {
        // Exit with appropriate code
        if (failed > 0) {
            console.log('\n❌ TEST FAILURE - BUILD SHOULD NOT PROCEED');
            process.exit(1);
        } else {
            console.log('\n✅ ALL TESTS PASSED!');
            process.exit(0);
        }
    });
}

// Run tests
if (require.main === module) {
    console.log(`Starting test run at ${toJSTString()}`);
    console.log(`Log file: ${runLogPath}`);
    
    runAllTests().catch(error => {
        console.error('Test suite failed:', error);
        runLogStream.end(() => {
            process.exit(1);
        });
    });
}

// Handle unexpected exits
process.on('SIGINT', () => {
    console.log('\nTest run interrupted by user');
    runLogStream.end(() => {
        process.exit(1);
    });
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
    runLogStream.end(() => {
        process.exit(1);
    });
});