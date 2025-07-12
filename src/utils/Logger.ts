/* eslint-disable no-console -- Logger class needs console access for output */
/**
 * Logger utility for debug output
 * Automatically disables console output in production environment
 */
export class Logger {
    private static isProduction = typeof process !== 'undefined' && process.env?.NODE_ENV === 'production';
    private static debugEnabled = !this.isProduction || (window as Window & { debugMode?: boolean }).debugMode;
    private static includeTimestamp = true;

    private static getTimestamp(): string {
        const now = new Date();
        const ms = now.getMilliseconds().toString().padStart(3, '0');
        const time = now.toTimeString().split(' ')[0];
        return `[${time}.${ms}]`;
    }

    static log(message: string, ...args: unknown[]): void {
        if (this.debugEnabled) {
            const timestamp = this.includeTimestamp ? this.getTimestamp() + ' ' : '';
            console.log(timestamp + message, ...args);
        }
    }

    static warn(message: string, ...args: unknown[]): void {
        const timestamp = this.includeTimestamp ? this.getTimestamp() + ' ' : '';
        console.warn(timestamp + message, ...args);
    }

    static error(message: string, ...args: unknown[]): void {
        const timestamp = this.includeTimestamp ? this.getTimestamp() + ' ' : '';
        console.error(timestamp + message, ...args);
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

    /**
     * Enable or disable timestamp in log messages
     */
    static setTimestampEnabled(enabled: boolean): void {
        this.includeTimestamp = enabled;
    }
}

export const log = Logger.log.bind(Logger);
export const warn = Logger.warn.bind(Logger);
export const error = Logger.error.bind(Logger);
/* eslint-enable no-console */