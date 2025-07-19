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