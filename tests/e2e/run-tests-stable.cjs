const { Worker } = require('worker_threads');
const fs = require('fs');
const path = require('path');
const { toJSTString } = require('./utils/dateHelper.cjs');

// Stable test execution configuration
const TEST_GROUPS = {
    // Group 1: Fast, stable tests (run in parallel)
    fast: [
        'test-stage-validation.cjs',
        'test-fall-damage.cjs',
        'test-basic-flow.cjs'
    ],
    
    // Group 2: Medium tests (run in parallel with reduced workers)
    medium: [
        'test-enemy-types.cjs',
        'test-jump-mechanics.cjs',
        'test-performance.cjs',
        'test-player-respawn-size.cjs'
    ],
    
    // Group 3: Heavy tests (run sequentially)
    heavy: [
        'test-enemy-damage.cjs',
        'test-powerup-features.cjs',
        'test-stage0-4-simple.cjs'
    ]
};

const GROUP_CONFIGS = {
    fast: { workers: 3, timeout: 30000, delay: 1000 },
    medium: { workers: 2, timeout: 60000, delay: 2000 },
    heavy: { workers: 1, timeout: 90000, delay: 3000 }
};

// Ensure logs directory exists
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Create a log file for the entire test run
const runLogPath = path.join(logsDir, `run-stable-tests-${toJSTString()}.log`);
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

// Worker script that runs a single test
const workerCode = `
const { parentPort, workerData } = require('worker_threads');
const path = require('path');

async function runTest() {
    const { testFile } = workerData;
    const testPath = path.resolve(testFile);
    
    try {
        const startTime = Date.now();
        const testModule = require(testPath);
        
        // Run the test
        await testModule();
        
        const duration = Date.now() - startTime;
        parentPort.postMessage({
            success: true,
            testFile,
            duration
        });
    } catch (error) {
        parentPort.postMessage({
            success: false,
            testFile,
            error: error.message,
            stack: error.stack
        });
    }
}

runTest();
`;

// Run a single test in a worker
function runTestInWorker(testFile, timeout) {
    return new Promise((resolve, reject) => {
        const worker = new Worker(workerCode, {
            eval: true,
            workerData: { testFile }
        });

        const timeoutHandle = setTimeout(() => {
            worker.terminate();
            reject(new Error(`Test timeout after ${timeout / 1000} seconds`));
        }, timeout);

        worker.on('message', (result) => {
            clearTimeout(timeoutHandle);
            worker.terminate();
            resolve(result);
        });

        worker.on('error', (error) => {
            clearTimeout(timeoutHandle);
            worker.terminate();
            reject(error);
        });

        worker.on('exit', (code) => {
            if (code !== 0) {
                clearTimeout(timeoutHandle);
                reject(new Error(`Worker stopped with exit code ${code}`));
            }
        });
    });
}

// Run a group of tests with specific configuration
async function runTestGroup(groupName, testFiles, config) {
    console.log(`\n📦 Running ${groupName} tests (${config.workers} workers, ${config.timeout/1000}s timeout)`);
    console.log(`   Tests: ${testFiles.join(', ')}`);
    
    const results = [];
    const testQueue = [...testFiles];
    const runningTests = new Map();
    let workerCount = 0;
    
    while (testQueue.length > 0 || runningTests.size > 0) {
        // Start new tests if we have capacity
        while (runningTests.size < config.workers && testQueue.length > 0) {
            const testFileName = testQueue.shift();
            const testFile = path.join(__dirname, testFileName);
            const testName = path.basename(testFile);
            
            // Add delay between starting workers
            if (workerCount > 0) {
                await new Promise(resolve => setTimeout(resolve, config.delay));
            }
            workerCount++;
            
            console.log(`🔄 Starting: ${testName}`);
            
            const promise = runTestInWorker(testFile, config.timeout)
                .then(result => {
                    const duration = result.duration ? `(${(result.duration / 1000).toFixed(2)}s)` : '';
                    if (result.success) {
                        console.log(`✅ Passed: ${testName} ${duration}`);
                    } else {
                        console.log(`❌ Failed: ${testName} - ${result.error}`);
                    }
                    results.push({ ...result, testName });
                    runningTests.delete(testFile);
                })
                .catch(error => {
                    console.log(`❌ Failed: ${testName} - ${error.message}`);
                    results.push({
                        success: false,
                        testFile,
                        testName,
                        error: error.message
                    });
                    runningTests.delete(testFile);
                });
            
            runningTests.set(testFile, promise);
        }
        
        // Wait for at least one test to complete
        if (runningTests.size > 0) {
            await Promise.race(runningTests.values());
        }
    }
    
    return results;
}

// Main test runner
async function runAllTestsStable() {
    console.log('🚀 Starting Stable E2E Test Suite\n');
    console.log('Test execution strategy:');
    console.log('- Fast tests: Run in parallel with 3 workers');
    console.log('- Medium tests: Run in parallel with 2 workers');
    console.log('- Heavy tests: Run sequentially');
    
    const startTime = Date.now();
    const allResults = [];
    
    // Run each group of tests
    for (const [groupName, testFiles] of Object.entries(TEST_GROUPS)) {
        const config = GROUP_CONFIGS[groupName];
        const results = await runTestGroup(groupName, testFiles, config);
        allResults.push(...results);
        
        // Add delay between groups
        if (groupName !== 'heavy') {
            console.log('\n⏱️  Waiting 5 seconds before next group...');
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
    
    // Generate summary
    const totalDuration = Date.now() - startTime;
    const passed = allResults.filter(r => r.success).length;
    const failed = allResults.filter(r => !r.success).length;
    
    console.log(`\n${'='.repeat(60)}`);
    console.log('TEST SUITE SUMMARY');
    console.log(`${'='.repeat(60)}\n`);
    
    console.log(`Total Tests: ${allResults.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);
    console.log(`Average Duration: ${(totalDuration / allResults.length / 1000).toFixed(2)}s per test`);
    
    if (failed > 0) {
        console.log('\n❌ Failed Tests:');
        allResults.filter(r => !r.success).forEach(result => {
            console.log(`   - ${result.testName}: ${result.error}`);
        });
    }
    
    // Save report
    const reportPath = path.join(__dirname, '../reports', `stable-test-report-${toJSTString()}.json`);
    const reportDir = path.dirname(reportPath);
    
    if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify({
        timestamp: toJSTString(),
        strategy: 'stable',
        groups: TEST_GROUPS,
        summary: {
            total: allResults.length,
            passed,
            failed,
            totalDuration
        },
        results: allResults
    }, null, 2));
    
    console.log(`\nTest report saved to: ${reportPath}`);
    console.log(`Full test log saved to: ${runLogPath}`);
    
    // Close log stream and exit
    runLogStream.end(() => {
        if (failed > 0) {
            console.log('\n❌ TEST FAILURE - BUILD SHOULD NOT PROCEED');
            process.exit(1);
        } else {
            console.log('\n✅ ALL TESTS PASSED!');
            process.exit(0);
        }
    });
}

// Handle process termination
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

// Run tests
if (require.main === module) {
    console.log(`Starting stable test run at ${toJSTString()}`);
    console.log(`Log file: ${runLogPath}`);
    
    runAllTestsStable().catch(error => {
        console.error('Test suite failed:', error);
        runLogStream.end(() => {
            process.exit(1);
        });
    });
}