import { useCallback, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import type { Event, EventRsvp } from '@/types/db';

export type EventWithRsvp = Event & {
  rsvp_count: number;
  going_count: number;
  my_rsvp: EventRsvp | null;
};

type Range = 'upcoming' | 'past';

const SELECT = `
  *,
  event_rsvps(id, user_id, status, qr_code_token, checked_in_at, guests_count, created_at)
` as const;

export function useEvents(range: Range = 'upcoming') {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const [events, setEvents] = useState<EventWithRsvp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const now = new Date().toISOString();
    let q = supabase.from('events').select(SELECT);
    if (range === 'upcoming') {
      q = q.gte('starts_at', now).neq('status', 'cancelled').order('starts_at', { ascending: true });
    } else {
      q = q.lt('starts_at', now).order('starts_at', { ascending: false });
    }
    const { data, error: err } = await q;
    if (err) {
      setError(err.message);
      setEvents([]);
    } else {
      setError(null);
      setEvents(toWithRsvp((data ?? []) as RawRow[], userId));
    }
    setLoading(false);
  }, [range, userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { events, loading, error, refresh };
}

export function useEvent(eventId: string | undefined) {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const [event, setEvent] = useState<EventWithRsvp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!eventId || !isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: err } = await supabase
      .from('events')
      .select(SELECT)
      .eq('id', eventId)
      .maybeSingle();
    if (err) {
      setError(err.message);
      setEvent(null);
    } else if (!data) {
      setError('Not found');
      setEvent(null);
    } else {
      setError(null);
      const row = data as unknown as RawRow;
      setEvent(toWithRsvp([row], userId)[0] ?? null);
    }
    setLoading(false);
  }, [eventId, userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { event, loading, error, refresh };
}

type RawRow = Event & { event_rsvps: EventRsvp[] };

function toWithRsvp(rows: RawRow[], userId: string | null): EventWithRsvp[] {
  return rows.map((row) => {
    const rsvps = row.event_rsvps ?? [];
    const going = rsvps.filter((r) => r.status === 'going').length;
    const total = rsvps.filter((r) => r.status !== 'cancelled').length;
    const mine =
      (userId && rsvps.find((r) => r.user_id === userId && r.status !== 'cancelled')) ||
      null;
    const { event_rsvps: _drop, ...rest } = row;
    return {
      ...rest,
      rsvp_count: total,
      going_count: going,
      my_rsvp: mine,
    };
  });
}

export type RsvpResult =
  | { ok: true; status: 'going' | 'waitlist'; qrToken: string }
  | { ok: false; error: string };

export async function rsvpToEvent(
  eventId: string,
  userId: string,
  capacity: number | null,
  goingCount: number,
): Promise<RsvpResult> {
  const atCap = capacity != null && goingCount >= capacity;
  const status: 'going' | 'waitlist' = atCap ? 'waitlist' : 'going';
  const qrToken = generateToken();
  const { error } = await supabase.from('event_rsvps').insert({
    event_id: eventId,
    user_id: userId,
    status,
    qr_code_token: qrToken,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, status, qrToken };
}

export async function cancelRsvp(rsvpId: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from('event_rsvps')
    .update({ status: 'cancelled' })
    .eq('id', rsvpId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

function generateToken(): string {
  if (typeof globalThis.crypto !== 'undefined' && 'randomUUID' in globalThis.crypto) {
    return globalThis.crypto.randomUUID();
  }
  // Fallback (RN < some older versions). 128 bits of entropy across 4 randoms.
  return Array.from({ length: 4 }, () =>
    Math.floor(Math.random() * 0xffffffff)
      .toString(16)
      .padStart(8, '0'),
  ).join('-');
}
