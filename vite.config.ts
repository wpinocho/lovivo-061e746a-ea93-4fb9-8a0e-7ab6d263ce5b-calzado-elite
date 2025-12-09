import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { fileURLToPath } from "url";
import * as fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ========== PLUGIN PARA EXTRAER RUTAS ==========
// Lee App.tsx durante el build y extrae las rutas automáticamente
// Las inyecta como window.__LOVIVO_ROUTES__ para que routes-bridge.js las envíe al parent
function routeExtractor(): Plugin {
  return {
    name: 'lovivo-route-extractor',
    transformIndexHtml(html) {
      try {
        const appPath = path.resolve(__dirname, 'src/App.tsx');
        const appContent = fs.readFileSync(appPath, 'utf-8');
        
        // Extraer rutas con regex: <Route path="/algo"
        const routeRegex = /<Route\s+path=["']([^"']+)["']/g;
        const routes: Array<{path: string, name: string, isDynamic: boolean}> = [];
        let match;
        
        while ((match = routeRegex.exec(appContent)) !== null) {
          const routePath = match[1];
          if (routePath !== '*') { // Ignorar catch-all
            routes.push({
              path: routePath,
              name: generateRouteName(routePath),
              isDynamic: routePath.includes(':')
            });
          }
        }
        
        // Inyectar rutas como variable global en el HTML
        const script = `<script>window.__LOVIVO_ROUTES__=${JSON.stringify(routes)};</script>`;
        return html.replace('</head>', `${script}</head>`);
      } catch (e) {
        console.warn('[Route Extractor] Could not parse routes:', e);
        return html;
      }
    }
  };
}

// Genera un nombre legible para la ruta
function generateRouteName(routePath: string): string {
  if (routePath === '/') return 'Inicio';
  
  // /my-orders → My Orders
  // /products/:slug → Products
  // /blog/:slug → Blog
  const cleanPath = routePath
    .replace(/^\//, '')           // Quitar / inicial
    .replace(/\/:[^/]+/g, '')     // Quitar parámetros dinámicos
    .replace(/-/g, ' ');          // Guiones a espacios
  
  // Capitalizar cada palabra
  return cleanPath
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ') || 'Inicio';
}

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    componentTagger(), // ✅ Siempre activo para generar IDs estables
    routeExtractor(),  // ✅ Extrae rutas de App.tsx para el routes-bridge
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
