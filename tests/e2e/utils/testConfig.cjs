/**
 * Shared test configuration
 */
module.exports = {
    // Headless mode configuration
    headless: process.env.HEADLESS === 'false' ? false : true,
    
    // Parallel test configuration
    maxWorkers: Math.max(1, parseInt(process.env.MAX_WORKERS, 10) || 3),
    
    // Screenshot configuration
    enableScreenshots: process.env.ENABLE_SCREENSHOTS === 'true',
    
    // Test timeouts
    timeouts: {
        fast: 30000,
        medium: 60000,
        heavy: 90000
    }
};