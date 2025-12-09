import React, { createContext, useContext, useEffect } from 'react';
import { usePixelId } from '@/hooks/usePixelId';
import { facebookPixel } from '@/lib/facebook-pixel';
import { STORE_ID } from '@/lib/config';

interface PixelContextType {
  pixelId: string | null;
  loading: boolean;
  error: string | null;
}

const PixelContext = createContext<PixelContextType | undefined>(undefined);

export function PixelProvider({ children }: { children: React.ReactNode }) {
  const { pixelId, loading, error } = usePixelId(STORE_ID);

  useEffect(() => {
    if (pixelId && !loading) {
      facebookPixel.init(pixelId);
      facebookPixel.pageView();
    }
  }, [pixelId, loading]);

  return (
    <PixelContext.Provider value={{ pixelId, loading, error }}>
      {children}
    </PixelContext.Provider>
  );
}

export function usePixel() {
  const context = useContext(PixelContext);
  if (context === undefined) {
    throw new Error('usePixel must be used within a PixelProvider');
  }
  return context;
}