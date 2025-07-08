/**
 * Utility to detect game environment (production vs test)
 */
export class GameEnvironment {
    /**
     * Check if the game is running from index.html (production)
     * @returns true if running from index.html, false otherwise
     */
    static isProduction(): boolean {
        if (typeof window === 'undefined') {
            return false;
        }
        
        const pathname = window.location.pathname;
        
        // Check if running from index.html or root path
        // Production: /index.html, /, or ends with /
        // Test: anything else (e.g., /test.html, /tests/...)
        return pathname === '/' || 
               pathname === '/index.html' || 
               pathname.endsWith('/index.html') ||
               (pathname.endsWith('/') && !pathname.includes('/test'));
    }
    
    /**
     * Check if stage progression should be enabled
     * @returns true if in production mode, false in test mode
     */
    static shouldEnableStageProgression(): boolean {
        return this.isProduction();
    }
    
    /**
     * Get environment name for logging
     */
    static getEnvironmentName(): string {
        return this.isProduction() ? 'PRODUCTION' : 'TEST';
    }
}