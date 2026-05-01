import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Partner } from '@/types/db';

export type PartnerFilters = {
  search?: string;
  category?: string | 'all';
};

export const PARTNER_CATEGORIES = [
  'wraps',
  'performance',
  'detailing',
  'tints',
  'parts',
  'audio',
  'wheels',
  'paint',
  'service',
  'other',
] as const;
export type PartnerCategory = (typeof PARTNER_CATEGORIES)[number];

export const PARTNER_CATEGORY_LABEL: Record<PartnerCategory, string> = {
  wraps: 'Wraps',
  performance: 'Performance',
  detailing: 'Detailing',
  tints: 'Tints',
  parts: 'Parts',
  audio: 'Audio',
  wheels: 'Wheels',
  paint: 'Paint',
  service: 'Service',
  other: 'Other',
};

export function usePartners(filters: PartnerFilters) {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: err } = await supabase
      .from('partners')
      .select('*')
      .order('featured', { ascending: false })
      .order('name', { ascending: true });
    if (err) {
      setError(err.message);
      setPartners([]);
    } else {
      setError(null);
      setPartners((data ?? []) as Partner[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    let out = partners;
    if (filters.category && filters.category !== 'all') {
      out = out.filter((p) => p.service_categories?.includes(filters.category!));
    }
    const q = filters.search?.trim().toLowerCase();
    if (q) {
      out = out.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.location_name ?? '').toLowerCase().includes(q) ||
          (p.description ?? '').toLowerCase().includes(q),
      );
    }
    return out;
  }, [partners, filters.search, filters.category]);

  return { partners: filtered, total: partners.length, loading, error, refresh };
}

export function usePartner(partnerId: string | undefined) {
  const [partner, setPartner] = useState<Partner | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!partnerId || !isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: err } = await supabase
      .from('partners')
      .select('*')
      .eq('id', partnerId)
      .maybeSingle();
    if (err) setError(err.message);
    else if (!data) setError('Partner not found');
    else {
      setError(null);
      setPartner(data as Partner);
    }
    setLoading(false);
  }, [partnerId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { partner, loading, error, refresh };
}
