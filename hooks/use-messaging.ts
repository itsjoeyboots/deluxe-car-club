import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import type { Message } from '@/types/db';

export type InboxRow = {
  peer_id: string;
  peer_full_name: string | null;
  peer_profile_photo_url: string | null;
  last_message_id: string;
  last_message_content: string;
  last_message_created_at: string;
  last_message_sender_id: string;
  last_message_read_at: string | null;
  unread_count: number;
};

export function useInbox() {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const [rows, setRows] = useState<InboxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId || !isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: err } = await supabase.rpc('get_inbox');
    if (err) {
      setError(err.message);
      setRows([]);
    } else {
      setError(null);
      setRows((data ?? []) as InboxRow[]);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Re-fetch when any message involving me hits the table.
  useEffect(() => {
    if (!userId || !isSupabaseConfigured) return;
    const channel = supabase
      .channel(`inbox-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${userId}`,
        },
        () => refresh(),
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=eq.${userId}`,
        },
        () => refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, refresh]);

  const totalUnread = rows.reduce((sum, r) => sum + (r.unread_count || 0), 0);
  return { rows, loading, error, refresh, totalUnread };
}

export function useThread(peerId: string | undefined) {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const idsRef = useRef(new Set<string>());

  const refresh = useCallback(async () => {
    if (!peerId || !userId || !isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: err } = await supabase
      .from('messages')
      .select('*')
      .or(
        `and(sender_id.eq.${userId},recipient_id.eq.${peerId}),and(sender_id.eq.${peerId},recipient_id.eq.${userId})`,
      )
      .order('created_at', { ascending: true })
      .limit(500);
    if (err) {
      setError(err.message);
      setMessages([]);
      idsRef.current = new Set();
    } else {
      const rows = (data ?? []) as Message[];
      idsRef.current = new Set(rows.map((m) => m.id));
      setMessages(rows);
      setError(null);
    }
    setLoading(false);
  }, [peerId, userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Realtime: subscribe to inserts in either direction and append.
  useEffect(() => {
    if (!peerId || !userId || !isSupabaseConfigured) return;
    const channel = supabase
      .channel(`thread-${userId}-${peerId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const m = payload.new as Message;
          const matchesPair =
            (m.sender_id === userId && m.recipient_id === peerId) ||
            (m.sender_id === peerId && m.recipient_id === userId);
          if (!matchesPair) return;
          if (idsRef.current.has(m.id)) return;
          idsRef.current.add(m.id);
          setMessages((cur) => [...cur, m]);
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        (payload) => {
          const m = payload.new as Message;
          const matchesPair =
            (m.sender_id === userId && m.recipient_id === peerId) ||
            (m.sender_id === peerId && m.recipient_id === userId);
          if (!matchesPair) return;
          setMessages((cur) =>
            cur.map((existing) => (existing.id === m.id ? m : existing)),
          );
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [peerId, userId]);

  const sendMessage = useCallback(
    async (content: string): Promise<{ ok: boolean; error?: string }> => {
      if (!peerId || !userId) return { ok: false, error: 'Not signed in' };
      const trimmed = content.trim();
      if (!trimmed) return { ok: false, error: 'Empty message' };
      const { data, error: err } = await supabase
        .from('messages')
        .insert({
          sender_id: userId,
          recipient_id: peerId,
          content: trimmed,
        })
        .select('*')
        .single();
      if (err) return { ok: false, error: err.message };
      // Optimistic append in case realtime takes a beat
      const m = data as Message;
      if (!idsRef.current.has(m.id)) {
        idsRef.current.add(m.id);
        setMessages((cur) => [...cur, m]);
      }
      return { ok: true };
    },
    [peerId, userId],
  );

  const markRead = useCallback(async () => {
    if (!peerId) return;
    await supabase.rpc('mark_thread_read', { peer_id: peerId });
  }, [peerId]);

  return { messages, loading, error, refresh, sendMessage, markRead };
}
