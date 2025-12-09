import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function usePixelId(storeId: string) {
  const [pixelId, setPixelId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPixelId() {
      try {
        const { data, error } = await supabase
          .from('platform_connections')
          .select('pixel_id')
          .eq('store_id', storeId)
          .maybeSingle();

        if (error) {
          throw error;
        }

        setPixelId(data?.pixel_id || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    if (storeId) {
      fetchPixelId();
    }
  }, [storeId]);

  return { pixelId, loading, error };
}