export type LogType = 'request' | 'response' | 'error' | 'info' | 'database' | 'navigation';

export interface LogEntry {
  id: string;
  type: LogType;
  timestamp: string;
  url?: string;
  originalUrl?: string;
  isRedirected?: boolean;
  method?: string;
  requestData?: any;
  responseData?: any;
  requestHeaders?: any;
  responseHeaders?: any;
  headers?: any; // For backward compatibility
  status?: number;
  message?: string;
  durationMs?: number;
  size?: string;
}

export interface CustomUrlEntry {
  title: string;
  url: string;
}

class DebugLogger {
  private static instance: DebugLogger;
  private logs: LogEntry[] = [];
  private listeners: ((logs: LogEntry[]) => void)[] = [];
  public isNetworkPatched = false;
  private baseUrl: string = '';
  private customUrls: CustomUrlEntry[] = [];
  private notifyTimeout: any = null;

  private constructor() {}

  public static getInstance(): DebugLogger {
    if (!DebugLogger.instance) {
      DebugLogger.instance = new DebugLogger();
    }
    return DebugLogger.instance;
  }

  public setBaseUrl(url: string) {
    this.baseUrl = url;
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public getCustomUrls(): CustomUrlEntry[] {
    return this.customUrls;
  }

  public addCustomUrl(entry: CustomUrlEntry) {
    const exists = this.customUrls.some(u => u.url === entry.url);
    if (!exists) {
      this.customUrls = [entry, ...this.customUrls];
    }
  }

  public removeCustomUrl(url: string) {
    this.customUrls = this.customUrls.filter(u => u.url !== url);
    // If the currently active URL is the one we're removing, reset it
    if (this.baseUrl === url) {
      this.baseUrl = '';
    }
  }

  private notify() {
    if (this.notifyTimeout) {
        clearTimeout(this.notifyTimeout);
    }
    this.notifyTimeout = setTimeout(() => {
        const currentLogs = this.getLogs();
        this.listeners.forEach(listener => listener(currentLogs));
        this.notifyTimeout = null;
    }, 100);
  }

  private calculateSize(data: any): string {
      try {
          if (!data) return '0.00 kb';
          const str = typeof data === 'string' ? data : JSON.stringify(data);
          return `${(str.length / 1024).toFixed(2)} kb`;
      } catch (e) {
          return '0.00 kb';
      }
  }

  public logRequest(data: {
    url?: string;
    originalUrl?: string;
    isRedirected?: boolean;
    method?: string;
    data?: any;
    headers?: any;
    reqId?: string;
    _isAxios?: boolean;
    axiosConfig?: any;
  }) {
    const reqId = data.reqId || Math.random().toString(36).substring(7);

    if (data._isAxios && data.axiosConfig) {
      data.axiosConfig.__reqId = reqId;
    }

    const log: LogEntry = {
      id: reqId,
      type: 'request',
      timestamp: new Date().toISOString(),
      url: data.url,
      originalUrl: data.originalUrl,
      isRedirected: data.isRedirected,
      method: data.method?.toUpperCase(),
      requestData: data.data,
      requestHeaders: data.headers,
    };

    this.logs.unshift(log);
    if (this.logs.length > 500) {
      this.logs.pop();
    }
    this.notify();
    return reqId;
  }

  public logResponse(data: {
    reqId?: string;
    status: number;
    data?: any;
    url?: string;
    originalUrl?: string;
    isRedirected?: boolean;
    method?: string;
    headers?: any;
  }) {
    const size = this.calculateSize(data.data);
    if (data.reqId) {
      const logIndex = this.logs.findIndex(l => l.id === data.reqId);
      if (logIndex !== -1) {
        const start = new Date(this.logs[logIndex].timestamp).getTime();
        const durationMs = Date.now() - start;
        this.logs[logIndex] = {
          ...this.logs[logIndex],
          type: 'response',
          status: data.status,
          responseData: data.data,
          responseHeaders: data.headers,
          durationMs,
          size,
        };
        this.notify();
        return;
      }
    }

    this.logs.unshift({
      id: data.reqId || Math.random().toString(36).substring(7),
      type: 'response',
      timestamp: new Date().toISOString(),
      url: data.url,
      method: data.method?.toUpperCase(),
      status: data.status,
      responseData: data.data,
      responseHeaders: data.headers,
      durationMs: 0,
      size,
    });
    this.notify();
  }

  public logError(data: {
    reqId?: string;
    message?: string;
    status?: number;
    data?: any;
    url?: string;
    method?: string;
  }) {
    if (data.reqId) {
      const logIndex = this.logs.findIndex(l => l.id === data.reqId);
      if (logIndex !== -1) {
        const start = new Date(this.logs[logIndex].timestamp).getTime();
        const durationMs = Date.now() - start;
        this.logs[logIndex] = {
          ...this.logs[logIndex],
          type: 'error',
          status: data.status,
          message: data.message,
          responseData: data.data,
          durationMs,
        };
        this.notify();
        return;
      }
    }

    this.logs.unshift({
      id: data.reqId || Math.random().toString(36).substring(7),
      type: 'error',
      timestamp: new Date().toISOString(),
      url: data.url,
      method: data.method?.toUpperCase(),
      status: data.status,
      message: data.message,
      responseData: data.data,
    });
    this.notify();
  }

  public logInfo(message: string, data?: any) {
    this.logs.unshift({
      id: Math.random().toString(36).substring(7),
      type: 'info',
      timestamp: new Date().toISOString(),
      message,
      requestData: data,
    });
    this.notify();
  }

  public logDatabase(query: string, data?: any) {
    this.logs.unshift({
      id: Math.random().toString(36).substring(7),
      type: 'database',
      timestamp: new Date().toISOString(),
      message: query,
      requestData: data,
    });
    this.notify();
  }

  public logNavigation(route: string, params?: any) {
    this.logs.unshift({
      id: Math.random().toString(36).substring(7),
      type: 'navigation',
      timestamp: new Date().toISOString(),
      message: `Navigated to: ${route}`,
      requestData: params,
      url: route,
    });
    this.notify();
  }

  public getLogs(): LogEntry[] {
    return [...this.logs];
  }

  public clearLogs() {
    this.logs = [];
    this.notify();
  }

  public subscribe(listener: (logs: LogEntry[]) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  public init() {}
}

export const Logger = DebugLogger.getInstance();
export default Logger;
