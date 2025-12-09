// network-bridge.js - Lovivo Network Request Capture Bridge
(function() {
  // Solo ejecutar si estamos dentro de un iframe
  if (window.self === window.top) return;
  
  // Headers sensibles que no queremos enviar
  const SENSITIVE_HEADERS = ['authorization', 'apikey', 'api-key', 'x-api-key', 'cookie', 'set-cookie'];
  
  // Función para filtrar headers sensibles
  function filterHeaders(headers) {
    const filtered = {};
    if (headers) {
      Object.keys(headers).forEach(key => {
        if (!SENSITIVE_HEADERS.includes(key.toLowerCase())) {
          filtered[key] = headers[key];
        } else {
          filtered[key] = '[REDACTED]';
        }
      });
    }
    return filtered;
  }
  
  // Función para enviar datos de red al parent window
  function sendNetworkToParent(data) {
    try {
      window.parent.postMessage({
        source: 'lovivo-preview-bridge',
        level: 'network',
        data: data,
        timestamp: new Date().toISOString()
      }, '*');
    } catch (err) {
      console.error('Failed to send network log to parent:', err);
    }
  }

  // ============= INTERCEPTAR FETCH API =============
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const startTime = Date.now();
    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || 'unknown';
    const options = args[1] || {};
    const method = options.method || 'GET';
    
    // Capturar headers de la petición
    const requestHeaders = {};
    if (options.headers) {
      if (options.headers instanceof Headers) {
        options.headers.forEach((value, key) => {
          requestHeaders[key] = value;
        });
      } else {
        Object.assign(requestHeaders, options.headers);
      }
    }
    
    return originalFetch.apply(this, args)
      .then(response => {
        const duration = Date.now() - startTime;
        
        // Capturar headers de la respuesta
        const responseHeaders = {};
        response.headers.forEach((value, key) => {
          responseHeaders[key] = value;
        });
        
        sendNetworkToParent({
          type: 'fetch',
          url: url,
          method: method,
          status: response.status,
          statusText: response.statusText,
          duration: duration,
          requestHeaders: filterHeaders(requestHeaders),
          responseHeaders: filterHeaders(responseHeaders),
          success: response.ok
        });
        
        return response;
      })
      .catch(error => {
        const duration = Date.now() - startTime;
        
        sendNetworkToParent({
          type: 'fetch',
          url: url,
          method: method,
          status: 0,
          statusText: 'Network Error',
          duration: duration,
          requestHeaders: filterHeaders(requestHeaders),
          error: error.message,
          success: false
        });
        
        throw error;
      });
  };

  // ============= INTERCEPTAR XMLHttpRequest =============
  const OriginalXHR = window.XMLHttpRequest;
  window.XMLHttpRequest = function() {
    const xhr = new OriginalXHR();
    const requestData = {
      type: 'xhr',
      url: '',
      method: 'GET',
      requestHeaders: {},
      startTime: 0
    };
    
    // Interceptar open
    const originalOpen = xhr.open;
    xhr.open = function(method, url, ...rest) {
      requestData.method = method;
      requestData.url = url;
      requestData.startTime = Date.now();
      return originalOpen.apply(this, [method, url, ...rest]);
    };
    
    // Interceptar setRequestHeader
    const originalSetRequestHeader = xhr.setRequestHeader;
    xhr.setRequestHeader = function(header, value) {
      requestData.requestHeaders[header] = value;
      return originalSetRequestHeader.apply(this, [header, value]);
    };
    
    // Interceptar send
    const originalSend = xhr.send;
    xhr.send = function(...args) {
      // Listener para cuando se complete la petición
      xhr.addEventListener('loadend', function() {
        const duration = Date.now() - requestData.startTime;
        
        // Capturar headers de la respuesta
        const responseHeaders = {};
        const headersString = xhr.getAllResponseHeaders();
        if (headersString) {
          headersString.split('\r\n').forEach(line => {
            const parts = line.split(': ');
            if (parts.length === 2) {
              responseHeaders[parts[0]] = parts[1];
            }
          });
        }
        
        sendNetworkToParent({
          type: 'xhr',
          url: requestData.url,
          method: requestData.method,
          status: xhr.status,
          statusText: xhr.statusText,
          duration: duration,
          requestHeaders: filterHeaders(requestData.requestHeaders),
          responseHeaders: filterHeaders(responseHeaders),
          success: xhr.status >= 200 && xhr.status < 300
        });
      });
      
      return originalSend.apply(this, args);
    };
    
    return xhr;
  };
  
  // Copiar propiedades estáticas
  Object.keys(OriginalXHR).forEach(key => {
    window.XMLHttpRequest[key] = OriginalXHR[key];
  });

  // Log de inicialización
  console.log('🌐 Lovivo Network Bridge initialized');
})();
