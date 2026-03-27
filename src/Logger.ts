
export type LogType = 'request' | 'response' | 'error' | 'info';

export interface LogEntry {
  id: string;
  type: LogType;
  timestamp: string;
  url?: string;
  method?: string;
  requestData?: any;
  responseData?: any;
  headers?: any;
  status?: number;
  message?: string;
}

class DebugLogger {
  private static instance: DebugLogger;
  private logs: LogEntry[] = [];
  private listeners: ((logs: LogEntry[]) => void)[] = [];
  public isNetworkPatched = false;

  private constructor() {}

  public static getInstance(): DebugLogger {
    if (!DebugLogger.instance) {
      DebugLogger.instance = new DebugLogger();
    }
    return DebugLogger.instance;
  }

  private notify() {
    this.listeners.forEach(listener => listener(this.getLogs()));
  }

  public logRequest(data: {
    url?: string;
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
      method: data.method?.toUpperCase(),
      requestData: data.data,
      headers: data.headers,
    };

    this.logs.unshift(log);
    if (this.logs.length > 200) {
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
    method?: string;
  }) {
    if (data.reqId) {
      const logIndex = this.logs.findIndex(l => l.id === data.reqId);
      if (logIndex !== -1) {
        this.logs[logIndex] = {
          ...this.logs[logIndex],
          type: 'response',
          status: data.status,
          responseData: data.data,
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
        this.logs[logIndex] = {
          ...this.logs[logIndex],
          type: 'error',
          status: data.status,
          message: data.message,
          responseData: data.data,
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

  public init() {
    // This can be used as a central initialization point
    // We will call setupNetworkMonitor from here if it's available
  }
}

export const Logger = DebugLogger.getInstance();
