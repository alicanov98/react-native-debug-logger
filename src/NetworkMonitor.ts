
import { Logger } from './Logger';

export const setupNetworkMonitor = () => {
  if (Logger.isNetworkPatched) return;
  Logger.isNetworkPatched = true;

  // --- Global Fetch Monitor ---
  if (window.fetch) {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      let url = '';
      let method = 'GET';
      let body = null;
      let headers = {};

      try {
        const input = args[0];
        const init = args[1];

        if (typeof input === 'string') {
          url = input;
        } else if (input instanceof URL) {
          url = input.toString();
        } else if (input instanceof Request) {
          url = input.url;
          method = input.method;
          body = input.body;
          headers = (input.headers as any);
        }

        if (init) {
          method = (init.method || method).toUpperCase();
          body = init.body || body;
          headers = init.headers || headers;
        }
      } catch (e) {
        // Fallback if parsing args fails
        url = 'Unknown URL';
      }

      const reqId = Logger.logRequest({
        url,
        method,
        data: body,
        headers,
      });

      try {
        const response = await originalFetch(...args);
        
        // Clone response to avoid consuming the stream for the app
        const clonedResponse = response.clone();
        
        // Parse data asynchronously without blocking the main response
        clonedResponse.text().then(text => {
            let responseData;
            try {
                responseData = JSON.parse(text);
            } catch (e) {
                responseData = text;
            }
            
            Logger.logResponse({
              reqId,
              status: response.status,
              data: responseData,
              url,
              method,
            });
        }).catch(() => {
            Logger.logResponse({
              reqId,
              status: response.status,
              data: '[Binary or unreadable data]',
              url,
              method,
            });
        });

        return response;
      } catch (error: any) {
        Logger.logError({
          reqId,
          message: error.message || 'Fetch failed',
          url,
          method,
        });
        throw error;
      }
    };
  }

  // --- Global XHR Monitor ---
  const XHR = XMLHttpRequest.prototype as any;
  const originalOpen = XHR.open;
  const originalSend = XHR.send;

  // Use a symbol or unique property to prevent double-patching
  if (XHR._isPatchedByDebugLogger) return;
  XHR._isPatchedByDebugLogger = true;

  XHR.open = function(method: string, url: string | URL) {
    this._method = method.toUpperCase();
    this._url = typeof url === 'string' ? url : url.toString();
    try {
        return originalOpen.apply(this, arguments as any);
    } catch (err) {
        console.error('DebugLogger: Error in XHR.open', err);
        throw err;
    }
  };

  XHR.send = function(body: any) {
    const xhr = this as any;
    
    // Log request immediately
    const reqId = Logger.logRequest({
      url: xhr._url,
      method: xhr._method,
      data: body,
    });

    // Strategy: Use addEventListener if available, fallback to proxying onreadystatechange
    const onComplete = () => {
      // Avoid multiple executions for the same request
      if (xhr._alreadyLogged) return;
      xhr._alreadyLogged = true;

      let responseData;
      const responseType = this.responseType;

      try {
        if (responseType === '' || responseType === 'text') {
          try {
            responseData = JSON.parse(this.responseText);
          } catch (e) {
            responseData = this.responseText;
          }
        } else if (responseType === 'json') {
          responseData = this.response;
        } else {
          responseData = `[Binary Data: ${responseType}]`;
        }
      } catch (error) {
        responseData = '[Error reading response]';
      }

      Logger.logResponse({
        reqId,
        status: this.status,
        data: responseData,
        url: xhr._url,
        method: xhr._method,
      });
    };

    const onError = () => {
       if (xhr._alreadyLogged) return;
       xhr._alreadyLogged = true;

       Logger.logError({
         reqId,
         message: 'Network error or aborted',
         status: this.status,
         url: xhr._url,
         method: xhr._method,
       });
    };

    if (this.addEventListener) {
      // In React Native, 'load' fires on success, 'error' on failure
      this.addEventListener('load', onComplete);
      this.addEventListener('error', onError);
      this.addEventListener('abort', onError);
      this.addEventListener('timeout', onError);
    } else {
      // Fallback for environments without addEventListener
      const originalOnReadyStateChange = this.onreadystatechange;
      this.onreadystatechange = function() {
        if (this.readyState === 4) {
          onComplete();
        }
        if (originalOnReadyStateChange) {
          return originalOnReadyStateChange.apply(this, arguments as any);
        }
      };
    }

    try {
        return originalSend.apply(this, arguments as any);
    } catch (err) {
        Logger.logError({
            reqId,
            message: `Send failed: ${(err as Error).message}`,
            url: xhr._url,
            method: xhr._method,
        });
        throw err;
    }
  };
};
