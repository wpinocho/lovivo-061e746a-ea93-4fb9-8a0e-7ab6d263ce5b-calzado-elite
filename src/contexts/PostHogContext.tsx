import React, { createContext, useContext, useEffect } from 'react';
import posthog from 'posthog-js';
import { STORE_ID } from '@/lib/config';

interface PostHogContextType {
  initialized: boolean;
}

const PostHogContext = createContext<PostHogContextType | undefined>(undefined);

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const [initialized, setInitialized] = React.useState(false);

  useEffect(() => {
    const POSTHOG_KEY = 'phc_ru49b7F3aVosgfA5g91sIGxRC2iBU0RMWFekcI5iSR7';
    
    if (typeof window !== 'undefined' && POSTHOG_KEY) {
      posthog.init(POSTHOG_KEY, {
        api_host: '/ingest',
        ui_host: 'https://us.posthog.com',
        person_profiles: 'identified_only',
        capture_pageview: false, // Capturaremos manualmente después del grupo
        capture_pageleave: true,
        autocapture: false,
        
        // Configuración correcta de cookies
        persistence: 'localStorage+cookie',
        cross_subdomain_cookie: false,
        
        // Debug solo en desarrollo
        debug: process.env.NODE_ENV === 'development',
        
        // Optimizaciones
        disable_session_recording: true,
        advanced_disable_decide: false,
        
      loaded: (posthog) => {
        console.log('✅ PostHog loaded successfully!');
        console.log('🏪 Store ID:', STORE_ID);
        
        // ✅ CRÍTICO: Crear el grupo DENTRO de loaded() para evitar race condition
        posthog.group('store', STORE_ID, {
          store_id: STORE_ID,
          domain: window.location.hostname,
          environment: process.env.NODE_ENV || 'production',
          initialized_at: new Date().toISOString(),
        });
        
        // Verificar que el grupo se configuró correctamente
        const groups = posthog.getGroups();
        console.log('✅ PostHog group created for store:', STORE_ID);
        console.log('📊 Active groups:', groups);
        
        // Capturar pageview inicial DESPUÉS de crear el grupo
        posthog.capture('$pageview', {
          $current_url: window.location.href,
          $pathname: window.location.pathname,
        });
        console.log('📄 Initial pageview captured after group setup');
        
        // Marcar como inicializado DESPUÉS de configurar el grupo
        setInitialized(true);
      },
    });
    }
  }, []);

  return (
    <PostHogContext.Provider value={{ initialized }}>
      {children}
    </PostHogContext.Provider>
  );
}

export function usePostHog() {
  const context = useContext(PostHogContext);
  if (context === undefined) {
    throw new Error('usePostHog must be used within a PostHogProvider');
  }
  return context;
}
