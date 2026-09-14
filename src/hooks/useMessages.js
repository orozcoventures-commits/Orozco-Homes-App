import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

export function useMessages(projectId, userId, isAdmin) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);

  const realtimeIds = useRef(new Set());

  useEffect(() => {
    if (!projectId) {
      setMessages([]);
      realtimeIds.current = new Set();
      return;
    }

    setLoading(true);
    setError(null);
    realtimeIds.current = new Set();

    supabase
      .from('messages')
      .select('id, sender_id, sender_role, content, created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        else setMessages(data ?? []);
        setLoading(false);
      });

    const channel = supabase
      .channel(`messages:project:${projectId}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'messages',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            realtimeIds.current.add(payload.new.id);
            return [...prev, payload.new];
          });
        }
      )
      .subscribe((status, err) => {
        if (err) console.error('[realtime] channel error', err);
      });

    return () => { supabase.removeChannel(channel); };
  }, [projectId]);

  const sendMessage = useCallback(
    async (content) => {
      const text = (content ?? '').trim();
      if (!text || !projectId || !userId) return { error: 'Missing data' };

      const { error: err } = await supabase.from('messages').insert({
        project_id:  projectId,
        sender_id:   userId,
        sender_role: isAdmin ? 'admin' : 'client',
        content:     text,
      });

      return { error: err?.message ?? null };
    },
    [projectId, userId, isAdmin]
  );

  return { messages, loading, error, sendMessage, realtimeIds };
}
