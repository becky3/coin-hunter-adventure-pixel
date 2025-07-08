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
     * @returns true unless stage is specified in URL query parameter
     */
    static shouldEnableStageProgression(): boolean {
        // If stage is specified in URL (?s=1-2), disable progression
        const params = new URLSearchParams(window.location.search);
        if (params.get('s')) {
            return false;
        }
        
        // Otherwise, enable progression
        return true;
    }
    
    /**
     * Get environment name for logging
     */
    static getEnvironmentName(): string {
        return this.isProduction() ? 'PRODUCTION' : 'TEST';
    }
}