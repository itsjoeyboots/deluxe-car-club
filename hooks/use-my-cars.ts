import { useCallback, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import type { Car } from '@/types/db';

export type CarWithCover = Car & { cover_url: string | null };

export function useMyCars() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [cars, setCars] = useState<CarWithCover[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId || !isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: err } = await supabase
      .from('cars')
      .select('*, car_photos(url, display_order)')
      .eq('user_id', userId)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: false });
    if (err) {
      setError(err.message);
    } else {
      const rows = (data ?? []) as (Car & {
        car_photos: { url: string; display_order: number }[];
      })[];
      const withCover: CarWithCover[] = rows.map((row) => {
        const photos = [...(row.car_photos ?? [])].sort(
          (a, b) => a.display_order - b.display_order,
        );
        const { car_photos: _photos, ...rest } = row;
        return { ...rest, cover_url: photos[0]?.url ?? null };
      });
      setCars(withCover);
      setError(null);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { cars, loading, error, refresh };
}
