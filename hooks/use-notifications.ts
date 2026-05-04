import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { showLocalPush } from '@/lib/push';
import type { Notification, NotificationType } from '@/types/db';

export type AppNotification = Notification & {
  type: NotificationType | string;
};

export function useNotifications() {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const [rows, setRows] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const seen = useRef<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured || !userId) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: err } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);
    if (err) {
      setError(err.message);
      setRows([]);
    } else {
      setError(null);
      const list = (data ?? []) as AppNotification[];
      setRows(list);
      seen.current = new Set(list.map((r) => r.id));
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!isSupabaseConfigured || !userId) return;
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as AppNotification;
          if (seen.current.has(row.id)) return;
          seen.current.add(row.id);
          setRows((cur) => [row, ...cur]);
          // best-effort browser ping; native is a no-op until expo-notifications
          showLocalPush(row.title, row.body);
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as AppNotification;
          setRows((cur) =>
            cur.map((r) => (r.id === row.id ? { ...r, ...row } : r)),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const unreadCount = rows.filter((r) => !r.read_at).length;

  const markRead = useCallback(
    async (ids?: string[]) => {
      if (!userId) return;
      const target = ids ?? rows.filter((r) => !r.read_at).map((r) => r.id);
      if (target.length === 0) return;
      const now = new Date().toISOString();
      // optimistic
      setRows((cur) =>
        cur.map((r) => (target.includes(r.id) ? { ...r, read_at: now } : r)),
      );
      const { error: err } = await supabase
        .from('notifications')
        .update({ read_at: now })
        .in('id', target)
        .eq('user_id', userId);
      if (err) {
        // best-effort revert on failure
        await refresh();
      }
    },
    [rows, userId, refresh],
  );

  return {
    notifications: rows,
    unreadCount,
    loading,
    error,
    refresh,
    markRead,
  };
}
