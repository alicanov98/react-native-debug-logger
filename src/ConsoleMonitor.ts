import { Logger } from './Logger';

export const setupConsoleMonitor = () => {
    const originalLog = console.log;
    const originalInfo = console.info;
    const originalWarn = console.warn;
    const originalError = console.error;

    console.log = (...args: any[]) => {
        originalLog(...args);
        Logger.logInfo(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '));
    };

    console.info = (...args: any[]) => {
        originalInfo(...args);
        Logger.logInfo(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '));
    };

    console.warn = (...args: any[]) => {
        originalWarn(...args);
        Logger.logInfo(`[WARN] ${args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')}`);
    };

    console.error = (...args: any[]) => {
        originalError(...args);
        Logger.logError({
            message: args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')
        });
    };
};
