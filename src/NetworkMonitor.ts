import { Logger } from './Logger';

const getRedirectedUrl = (originalUrl: string): string => {
  const baseUrl = Logger.getBaseUrl();
  if (!baseUrl) return originalUrl;

  try {
    const original = new URL(originalUrl);
    const replacement = new URL(baseUrl);
    
    // Replace origin (protocol + host + port)
    return originalUrl.replace(original.origin, replacement.origin);
  } catch (e) {
    // If not a valid absolute URL, we can't reliably redirect it
    return originalUrl;
  }
};

export const setupNetworkMonitor = () => {
  if (Logger.isNetworkPatched) return;
  Logger.isNetworkPatched = true;


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
        } else if (input instanceof (window as any).Request) {
          url = input.url;
          method = input.method;
          body = (input as any).body;
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

      // REDIRECTION LOGIC
      const redirectedUrl = getRedirectedUrl(url);
      const newArgs = [...args];
      if (typeof newArgs[0] === 'string') {
        newArgs[0] = redirectedUrl;
      } else if (newArgs[0] instanceof URL) {
        newArgs[0] = new URL(redirectedUrl);
      }

      const reqId = Logger.logRequest({
        url: redirectedUrl !== url ? `${url} -> ${redirectedUrl}` : url,
        method,
        data: body,
        headers,
      });

      try {
        const response = await originalFetch(...(newArgs as any));
        

        const clonedResponse = response.clone();
        

        clonedResponse.text().then(text => {
            let responseData;
            try {
                responseData = JSON.parse(text);
            } catch (e) {
                responseData = text;
            }
            
            const responseHeaders: any = {};
            if (response.headers && (response.headers as any).forEach) {
              (response.headers as any).forEach((value: string, key: string) => {
                responseHeaders[key] = value;
              });
            }

            Logger.logResponse({
              reqId,
              status: response.status,
              data: responseData,
              url,
              method,
              headers: responseHeaders,
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

  const XHR = XMLHttpRequest.prototype as any;
  const originalOpen = XHR.open;
  const originalSend = XHR.send;

  if (XHR._isPatchedByDebugLogger) return;
  XHR._isPatchedByDebugLogger = true;

  const originalSetRequestHeader = XHR.setRequestHeader;

  XHR.open = function(method: string, url: string | URL) {
    this._method = method.toUpperCase();
    const originalUrl = typeof url === 'string' ? url : url.toString();
    this._url = originalUrl;
    this._headers = {};
    
    const redirectedUrl = getRedirectedUrl(originalUrl);
    try {
        return originalOpen.apply(this, [method, redirectedUrl, ...Array.prototype.slice.call(arguments, 2)] as any);
    } catch (err) {
        console.error('DebugLogger: Error in XHR.open', err);
        throw err;
    }
  };

  XHR.setRequestHeader = function(header: string, value: string) {
    if (!this._headers) this._headers = {};
    this._headers[header] = value;
    return originalSetRequestHeader.apply(this, arguments as any);
  };

  XHR.send = function(body: any) {
    const xhr = this as any;
    
    const reqId = Logger.logRequest({
      url: xhr._url,
      method: xhr._method,
      data: body,
      headers: xhr._headers,
    });

    const onComplete = () => {
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

      const responseHeaders: any = {};
      const headersStr = this.getAllResponseHeaders();
      if (headersStr) {
        headersStr.split('\r\n').forEach((line: string) => {
          const [key, ...val] = line.split(': ');
          if (key && val.length > 0) responseHeaders[key] = val.join(': ');
        });
      }

      Logger.logResponse({
        reqId,
        status: this.status,
        data: responseData,
        url: xhr._url,
        method: xhr._method,
        headers: responseHeaders,
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
      this.addEventListener('load', onComplete);
      this.addEventListener('error', onError);
      this.addEventListener('abort', onError);
      this.addEventListener('timeout', onError);
    } else {
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
