import { useCallback, useEffect, useState } from 'react';
import { supabase, isSupabaseEnabled } from '../lib/supabase';
import type { Notification } from '../lib/types';

/**
 * Notifications admin (CRM). Récupère les notifs avec target_user_id IS NULL.
 * Realtime sur INSERT pour rafraîchir le badge live.
 */
export function useNotifications(limit = 30) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!isSupabaseEnabled() || !supabase) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error: err } = await supabase
        .from('notifications')
        .select('*')
        .is('target_user_id', null)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (err) throw err;
      setNotifications((data ?? []) as Notification[]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  // Realtime
  useEffect(() => {
    if (!isSupabaseEnabled() || !supabase) return;
    const channel = supabase
      .channel('notifications_admin')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const n = payload.new as Notification;
          if (n.target_user_id === null) {
            setNotifications((prev) => [n, ...prev].slice(0, limit));
          }
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [limit]);

  const markRead = useCallback(async (id: string) => {
    if (!isSupabaseEnabled() || !supabase) return;
    const { error: err } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id);
    if (err) throw err;
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)),
    );
  }, []);

  const markAllRead = useCallback(async () => {
    if (!isSupabaseEnabled() || !supabase) return;
    const now = new Date().toISOString();
    const { error: err } = await supabase
      .from('notifications')
      .update({ read_at: now })
      .is('target_user_id', null)
      .is('read_at', null);
    if (err) throw err;
    setNotifications((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: now })));
  }, []);

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return { notifications, unreadCount, loading, error, refetch: fetchAll, markRead, markAllRead };
}
