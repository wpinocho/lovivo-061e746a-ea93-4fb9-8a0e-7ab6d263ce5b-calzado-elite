/**
 * Lovivo Routes Bridge
 * 
 * Este script se carga SIEMPRE con el iframe y envía las rutas disponibles
 * al parent window via PostMessage.
 * 
 * Las rutas son extraídas de App.tsx durante el build por el plugin
 * routeExtractor en vite.config.ts e inyectadas como window.__LOVIVO_ROUTES__
 * 
 * Mensajes enviados al parent:
 * - ROUTES_AVAILABLE: Lista de rutas al cargar el iframe
 * - ROUTE_CHANGED: Cuando el usuario navega dentro del iframe
 * 
 * Mensajes que escucha del parent:
 * - NAVIGATE_TO: Navegar a una ruta específica
 */
(function() {
  'use strict';

  // ===== CONFIGURACIÓN =====
  const CONFIG = {
    source: 'lovivo-routes-bridge',
    allowedOrigins: [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:8080',
      'https://lovivo.app',
      'https://www.lovivo.app',
      // Agregar más orígenes permitidos según sea necesario
    ]
  };

  // ===== UTILIDADES =====
  
  /**
   * Obtiene el origen del parent window de manera segura
   */
  function getTargetOrigin() {
    try {
      if (window.parent === window) return '*';
      
      const parentOrigin = document.referrer ? 
        new URL(document.referrer).origin : '*';
      
      // Verificar si el origen está permitido
      if (CONFIG.allowedOrigins.includes(parentOrigin)) {
        return parentOrigin;
      }
      
      // En desarrollo, permitir cualquier localhost
      if (parentOrigin.includes('localhost') || parentOrigin.includes('127.0.0.1')) {
        return parentOrigin;
      }
      
      return '*';
    } catch (e) {
      return '*';
    }
  }

  /**
   * Envía un mensaje al parent window
   */
  function sendMessage(type, data = {}) {
    const targetOrigin = getTargetOrigin();
    
    try {
      window.parent.postMessage({
        source: CONFIG.source,
        type,
        timestamp: Date.now(),
        ...data
      }, targetOrigin);
    } catch (error) {
      console.error('[Routes Bridge] Error sending message:', error);
    }
  }

  // ===== FUNCIONES PRINCIPALES =====

  /**
   * Envía las rutas disponibles al parent
   */
  function sendRoutes() {
    // Las rutas son inyectadas por el plugin routeExtractor en vite.config.ts
    const routes = window.__LOVIVO_ROUTES__ || [];
    
    // Filtrar rutas navegables (sin parámetros dinámicos) para la UI
    const navigableRoutes = routes.filter(r => !r.isDynamic);
    
    sendMessage('ROUTES_AVAILABLE', {
      routes: navigableRoutes,      // Rutas que se pueden mostrar en navegación
      allRoutes: routes,            // Todas las rutas (para referencia)
      currentPath: window.location.pathname
    });
    
    console.log('🧭 [Routes Bridge] Sent', routes.length, 'routes to parent');
    console.log('🧭 [Routes Bridge] Navigable routes:', navigableRoutes.map(r => r.path));
  }

  /**
   * Notifica al parent cuando cambia la ruta
   */
  let lastPath = window.location.pathname;
  
  function notifyRouteChange() {
    const currentPath = window.location.pathname;
    
    if (currentPath !== lastPath) {
      lastPath = currentPath;
      
      sendMessage('ROUTE_CHANGED', {
        currentPath,
        previousPath: lastPath
      });
      
      console.log('🧭 [Routes Bridge] Route changed to:', currentPath);
    }
  }

  /**
   * Navega a una ruta específica
   */
  function navigateTo(path) {
    if (path && typeof path === 'string') {
      console.log('🧭 [Routes Bridge] Navigating to:', path);
      window.location.href = path;
    }
  }

  // ===== EVENT LISTENERS =====

  // Escuchar navegación del browser (back/forward)
  window.addEventListener('popstate', notifyRouteChange);

  // Interceptar history.pushState para detectar navegación programática
  const originalPushState = history.pushState;
  history.pushState = function(...args) {
    originalPushState.apply(this, args);
    setTimeout(notifyRouteChange, 0);
  };

  // Interceptar history.replaceState también
  const originalReplaceState = history.replaceState;
  history.replaceState = function(...args) {
    originalReplaceState.apply(this, args);
    setTimeout(notifyRouteChange, 0);
  };

  // Escuchar mensajes del parent
  window.addEventListener('message', (event) => {
    // Validar origen si es necesario
    const data = event.data;
    
    if (!data || typeof data !== 'object') return;
    
    switch (data.type) {
      case 'NAVIGATE_TO':
        if (data.path) {
          navigateTo(data.path);
        }
        break;
        
      case 'GET_ROUTES':
        // Re-enviar rutas si el parent las solicita
        sendRoutes();
        break;
        
      case 'GET_CURRENT_PATH':
        sendMessage('CURRENT_PATH', {
          currentPath: window.location.pathname
        });
        break;
    }
  });

  // ===== INICIALIZACIÓN =====

  // Enviar rutas cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', sendRoutes);
  } else {
    // DOM ya está listo
    sendRoutes();
  }

  // También enviar después de un pequeño delay para asegurar que React haya inicializado
  setTimeout(sendRoutes, 100);

  console.log('🧭 [Routes Bridge] Initialized');

})();
