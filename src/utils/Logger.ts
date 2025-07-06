/* eslint-disable no-console */
/**
 * Logger utility for debug output
 * Automatically disables console output in production environment
 */
export class Logger {
    private static isProduction = typeof process !== 'undefined' && process.env?.NODE_ENV === 'production';
    private static debugEnabled = !this.isProduction || (window as Window & { debugMode?: boolean }).debugMode;

    static log(message: string, ...args: unknown[]): void {
        if (this.debugEnabled) {
            console.log(message, ...args);
        }
    }

    static warn(message: string, ...args: unknown[]): void {
        // Warnings are always shown
        console.warn(message, ...args);
    }

    static error(message: string, ...args: unknown[]): void {
        // Errors are always shown
        console.error(message, ...args);
    }

    static group(label: string): void {
        if (this.debugEnabled && console.group) {
            console.group(label);
        }
    }

    static groupEnd(): void {
        if (this.debugEnabled && console.groupEnd) {
            console.groupEnd();
        }
    }

    static table(data: unknown): void {
        if (this.debugEnabled && console.table) {
            console.table(data);
        }
    }

    static time(label: string): void {
        if (this.debugEnabled && console.time) {
            console.time(label);
        }
    }

    static timeEnd(label: string): void {
        if (this.debugEnabled && console.timeEnd) {
            console.timeEnd(label);
        }
    }

    /**
     * Enable or disable debug logging at runtime
     */
    static setDebugMode(enabled: boolean): void {
        this.debugEnabled = enabled;
        (window as Window & { debugMode?: boolean }).debugMode = enabled;
    }

    /**
     * Check if debug mode is enabled
     */
    static isDebugMode(): boolean {
        return this.debugEnabled;
    }
}

// Create a global shorthand
export const log = Logger.log.bind(Logger);
export const warn = Logger.warn.bind(Logger);
export const error = Logger.error.bind(Logger);