/**
 * A simple logger utility that only logs in development mode.
 * Helps keep the production console clean.
 */

const TAG = '[Fantalega]';

export const logger = {
    debug: (message: string, ...args: any[]) => {
        if (__DEV__) {
            console.log(`${TAG}[DEBUG] ${message}`, ...args);
        }
    },
    
    info: (message: string, ...args: any[]) => {
        if (__DEV__) {
            console.info(`${TAG}[INFO] ${message}`, ...args);
        }
    },
    
    warn: (message: string, ...args: any[]) => {
        if (__DEV__) {
            console.warn(`${TAG}[WARN] ${message}`, ...args);
        }
    },
    
    error: (message: string, error?: any, ...args: any[]) => {
        // We might want to log errors even in production (e.g. to a service like Sentry),
        // but for now, we'll just log to console.
        console.error(`${TAG}[ERROR] ${message}`, error, ...args);
    }
};
