import { Logger } from './Logger';

const safeStringify = (obj: any): string => {
    try {
        if (typeof obj === 'string') return obj;
        if (typeof obj === 'undefined') return 'undefined';
        if (obj === null) return 'null';
        
        // Handle circular structures safely
        const cache = new Set();
        const str = JSON.stringify(obj, (key, value) => {
            if (typeof value === 'object' && value !== null) {
                if (cache.has(value)) {
                    return '[Circular]';
                }
                cache.add(value);
            }
            return value;
        }, 2);
        
        // Limit total length to avoid performance issues
        if (str.length > 20000) {
            return str.substring(0, 20000) + '\n... [Content truncated for performance]';
        }
        return str;
    } catch (e) {
        return `[Unserializable Content: ${(e as Error).message}]`;
    }
};

export const setupConsoleMonitor = () => {
    if ((console as any)._isPatchedByDebugLogger) return;
    (console as any)._isPatchedByDebugLogger = true;

    const originalLog = console.log;
    const originalInfo = console.info;
    const originalWarn = console.warn;
    const originalError = console.error;

    console.log = (...args: any[]) => {
        originalLog(...args);
        Logger.logInfo(args.map(a => safeStringify(a)).join(' '));
    };

    console.info = (...args: any[]) => {
        originalInfo(...args);
        Logger.logInfo(args.map(a => safeStringify(a)).join(' '));
    };

    console.warn = (...args: any[]) => {
        originalWarn(...args);
        Logger.logInfo(`[WARN] ${args.map(a => safeStringify(a)).join(' ')}`);
    };

    console.error = (...args: any[]) => {
        originalError(...args);
        // Console errors now go to Logs tab with an ERROR prefix
        Logger.logInfo(`[ERROR] ${args.map(a => safeStringify(a)).join(' ')}`);
    };
};
