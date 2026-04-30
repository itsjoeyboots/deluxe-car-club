import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { MemberTier, Profile } from '@/types/db';

export type MemberFilters = {
  search?: string;
  tier?: 'all' | 'drivers' | 'collector';
};

export type DirectoryMember = Pick<
  Profile,
  | 'id'
  | 'full_name'
  | 'profile_photo_url'
  | 'instagram_handle'
  | 'city'
  | 'tier'
  | 'status'
  | 'app_number'
  | 'approved_at'
  | 'points_balance'
> & {
  primary_car: {
    id: string;
    year: number | null;
    make: string | null;
    model: string | null;
    nickname: string | null;
    cover_url: string | null;
  } | null;
};

const SELECT = `
  id, full_name, profile_photo_url, instagram_handle, city, tier, status,
  app_number, approved_at, points_balance,
  cars(id, year, make, model, nickname, is_primary, car_photos(url, display_order))
` as const;

type Raw = Pick<
  Profile,
  | 'id'
  | 'full_name'
  | 'profile_photo_url'
  | 'instagram_handle'
  | 'city'
  | 'tier'
  | 'status'
  | 'app_number'
  | 'approved_at'
  | 'points_balance'
> & {
  cars: {
    id: string;
    year: number | null;
    make: string | null;
    model: string | null;
    nickname: string | null;
    is_primary: boolean;
    car_photos: { url: string; display_order: number }[];
  }[];
};

export function useMembers(filters: MemberFilters) {
  const [members, setMembers] = useState<DirectoryMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: err } = await supabase
      .from('profiles')
      .select(SELECT)
      .in('status', ['approved', 'paid'])
      .order('approved_at', { ascending: true });
    if (err) {
      setError(err.message);
      setMembers([]);
    } else {
      setError(null);
      setMembers(toDirectory((data ?? []) as Raw[]));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    let out = members;
    if (filters.tier && filters.tier !== 'all') {
      out = out.filter((m) => m.tier === filters.tier);
    }
    const q = filters.search?.trim().toLowerCase();
    if (q) {
      out = out.filter((m) => {
        const car = m.primary_car
          ? `${m.primary_car.year ?? ''} ${m.primary_car.make ?? ''} ${m.primary_car.model ?? ''} ${m.primary_car.nickname ?? ''}`
          : '';
        return (
          (m.full_name ?? '').toLowerCase().includes(q) ||
          (m.city ?? '').toLowerCase().includes(q) ||
          car.toLowerCase().includes(q) ||
          (m.instagram_handle ?? '').toLowerCase().includes(q)
        );
      });
    }
    return out;
  }, [members, filters.search, filters.tier]);

  return { members: filtered, total: members.length, loading, error, refresh };
}

function toDirectory(rows: Raw[]): DirectoryMember[] {
  return rows.map((row) => {
    const cars = row.cars ?? [];
    const primary =
      cars.find((c) => c.is_primary) ?? cars[0] ?? null;
    let coverUrl: string | null = null;
    if (primary?.car_photos?.length) {
      const sorted = [...primary.car_photos].sort(
        (a, b) => a.display_order - b.display_order,
      );
      coverUrl = sorted[0]?.url ?? null;
    }
    const { cars: _drop, ...rest } = row;
    return {
      ...rest,
      primary_car: primary
        ? {
            id: primary.id,
            year: primary.year,
            make: primary.make,
            model: primary.model,
            nickname: primary.nickname,
            cover_url: coverUrl,
          }
        : null,
    };
  });
}

export type { MemberTier };
