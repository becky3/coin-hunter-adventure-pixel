const { Worker } = require('worker_threads');
const fs = require('fs');
const path = require('path');
const { toJSTString } = require('./utils/dateHelper.cjs');
const testConfig = require('./utils/testConfig.cjs');

// Configuration
const MAX_WORKERS = testConfig.maxWorkers;
const TEST_TIMEOUT = 120000; // Increased from 90 to 120 seconds per test
const WORKER_START_DELAY = 2000; // 2 second delay between worker starts

// Ensure logs directory exists
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Create a log file for the entire test run
const runLogPath = path.join(logsDir, `run-parallel-tests-${toJSTString()}.log`);
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

// Path to worker script
const workerScriptPath = path.join(__dirname, 'utils', 'testWorker.cjs');

// Discover test files
function discoverTests() {
    const testDir = __dirname;
    const testFiles = fs.readdirSync(testDir)
        .filter(file => {
            return file.startsWith('test-') && file.endsWith('.cjs') && 
                   file !== 'run-all-tests.cjs' && file !== 'run-tests-parallel.cjs';
        })
        .sort();

    return testFiles.map(file => path.join(testDir, file));
}

// Run a single test in a worker
function runTestInWorker(testFile) {
    return new Promise((resolve, reject) => {
        const worker = new Worker(workerScriptPath, {
            workerData: { testFile }
        });

        const timeout = setTimeout(() => {
            worker.terminate();
            reject(new Error(`Test timeout after ${TEST_TIMEOUT / 1000} seconds`));
        }, TEST_TIMEOUT);

        worker.on('message', (result) => {
            clearTimeout(timeout);
            worker.terminate();
            resolve(result);
        });

        worker.on('error', (error) => {
            clearTimeout(timeout);
            worker.terminate();
            reject(error);
        });

        worker.on('exit', (code) => {
            if (code !== 0) {
                clearTimeout(timeout);
                reject(new Error(`Worker stopped with exit code ${code}`));
            }
        });
    });
}

// Main test runner
async function runAllTestsParallel() {
    console.log('🚀 Starting Parallel E2E Test Suite\n');
    console.log(`Using ${MAX_WORKERS} parallel workers\n`);
    
    const testFiles = discoverTests();
    console.log(`📋 Discovered ${testFiles.length} test files:\n`);
    testFiles.forEach(file => console.log(`   - ${path.basename(file)}`));
    console.log('');
    
    const startTime = Date.now();
    const results = [];
    const testQueue = [...testFiles];
    const runningTests = new Map();
    
    // Process tests in parallel with staggered starts
    let workerCount = 0;
    while (testQueue.length > 0 || runningTests.size > 0) {
        // Start new tests if we have capacity
        while (runningTests.size < MAX_WORKERS && testQueue.length > 0) {
            const testFile = testQueue.shift();
            const testName = path.basename(testFile);
            
            // Add delay between starting workers to reduce initial load spike
            if (workerCount > 0) {
                await new Promise(resolve => setTimeout(resolve, WORKER_START_DELAY));
            }
            workerCount++;
            
            console.log(`🔄 Starting: ${testName}`);
            
            const promise = runTestInWorker(testFile)
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
    
    // Generate summary
    const totalDuration = Date.now() - startTime;
    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`\n${'='.repeat(60)}`);
    console.log('TEST SUITE SUMMARY');
    console.log(`${'='.repeat(60)}\n`);
    
    console.log(`Total Tests: ${results.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);
    console.log(`Average Duration: ${(totalDuration / results.length / 1000).toFixed(2)}s per test`);
    console.log(`Parallel Speedup: ~${MAX_WORKERS}x`);
    
    if (failed > 0) {
        console.log('\n❌ Failed Tests:');
        results.filter(r => !r.success).forEach(result => {
            console.log(`   - ${result.testName}: ${result.error}`);
        });
    }
    
    // Save report
    const reportPath = path.join(__dirname, '../reports', `parallel-test-report-${toJSTString()}.json`);
    const reportDir = path.dirname(reportPath);
    
    if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify({
        timestamp: toJSTString(),
        parallel: true,
        workers: MAX_WORKERS,
        summary: {
            total: results.length,
            passed,
            failed,
            totalDuration
        },
        results
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
    console.log(`Starting parallel test run at ${toJSTString()}`);
    console.log(`Log file: ${runLogPath}`);
    
    runAllTestsParallel().catch(error => {
        console.error('Test suite failed:', error);
        runLogStream.end(() => {
            process.exit(1);
        });
    });
}