// console-bridge.js - Lovivo Console Log Capture Bridge
(function() {
  // Solo ejecutar si estamos dentro de un iframe
  if (window.self === window.top) return;
  
  // Guardar referencias a los métodos originales de console
  const originalConsole = {
    log: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    info: console.info.bind(console)
  };

  // Función para serializar argumentos de manera segura
  function serializeArg(arg) {
    try {
      if (arg === null) return 'null';
      if (arg === undefined) return 'undefined';
      if (typeof arg === 'function') return arg.toString();
      if (arg instanceof Error) return `Error: ${arg.message}\n${arg.stack}`;
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg, null, 2);
        } catch {
          return Object.prototype.toString.call(arg);
        }
      }
      return String(arg);
    } catch {
      return '[Unserializable]';
    }
  }

  // Función para enviar logs al parent window
  function sendToParent(level, args) {
    try {
      window.parent.postMessage({
        source: 'lovivo-preview-bridge',
        level: level,
        args: args.map(serializeArg),
        message: args.map(serializeArg).join(' '),
        timestamp: new Date().toISOString()
      }, '*');
    } catch (err) {
      originalConsole.error('Failed to send log to parent:', err);
    }
  }

  // Interceptar métodos de console
  ['log', 'warn', 'error', 'info'].forEach(level => {
    console[level] = function(...args) {
      // Llamar al método original (para que se vea en DevTools normalmente)
      originalConsole[level](...args);
      // Enviar al parent
      sendToParent(level, args);
    };
  });

  // Capturar errores no manejados
  window.addEventListener('error', (event) => {
    console.error('Unhandled error:', event.error || event.message);
  });

  // Capturar promise rejections no manejadas
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
  });

  // Log de inicialización
  console.log('🔌 Lovivo Console Bridge initialized');
})();