import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { PortalMessage } from '../lib/types';

export function usePortalMessages(projectId: string | null | undefined) {
  const [messages, setMessages] = useState<PortalMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!supabase || !projectId) {
      setMessages([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('portal_messages')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });
      if (err) throw err;
      setMessages((data ?? []) as PortalMessage[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const sendReply = useCallback(
    async (content: string): Promise<PortalMessage> => {
      if (!supabase || !projectId) throw new Error('Projet introuvable');
      const { data, error: err } = await supabase
        .from('portal_messages')
        .insert({
          project_id: projectId,
          sender: 'team',
          content: content.trim(),
          read_by_admin: true,
        })
        .select('*')
        .single();
      if (err) throw err;
      const created = data as PortalMessage;
      setMessages((prev) => [...prev, created]);
      return created;
    },
    [projectId]
  );

  const markClientMessagesRead = useCallback(async () => {
    if (!supabase || !projectId) return;
    const { error: err } = await supabase
      .from('portal_messages')
      .update({ read_by_admin: true })
      .eq('project_id', projectId)
      .eq('sender', 'client')
      .eq('read_by_admin', false);
    if (err) return;
    setMessages((prev) =>
      prev.map((m) => (m.sender === 'client' && !m.read_by_admin ? { ...m, read_by_admin: true } : m))
    );
  }, [projectId]);

  const unreadCount = messages.filter((m) => m.sender === 'client' && !m.read_by_admin).length;

  return {
    messages,
    loading,
    error,
    fetchMessages,
    sendReply,
    markClientMessagesRead,
    unreadCount,
  };
}
