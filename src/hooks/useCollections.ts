import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { STORE_ID } from '@/lib/config';

const CACHE_KEY = `collections-exists-${STORE_ID}`;

export const useCollections = () => {
  // Initialize with cached value from localStorage to prevent flash
  const [hasCollections, setHasCollections] = useState(() => {
    const cached = localStorage.getItem(CACHE_KEY);
    return cached === 'true';
  });
  const [loading, setLoading] = useState(false); // false to prevent flash

  useEffect(() => {
    const fetchCollections = async () => {
      try {
        const { data } = await supabase
          .from('collections')
          .select('id')
          .eq('status', 'active')
          .eq('store_id', STORE_ID)
          .limit(1);

        const exists = (data || []).length > 0;
        setHasCollections(exists);
        
        // Save to localStorage for next load
        localStorage.setItem(CACHE_KEY, String(exists));
      } catch (error) {
        console.error('Error fetching collections:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCollections();
  }, []);

  return { 
    hasCollections,
    loading
  };
};
