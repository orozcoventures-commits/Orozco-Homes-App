import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Subscribes to messages for a given project_id.
 * - Fetches existing messages on mount / when projectId changes.
 * - Opens a Supabase Realtime channel so new messages appear instantly.
 * - Returns a sendMessage() function that inserts into the messages table.
 */
export function useMessages(projectId, userId, isAdmin) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);

  // Fetch existing messages whenever the active project changes
  useEffect(() => {
    if (!projectId) {
      setMessages([]);
      return;
    }

    setLoading(true);
    setError(null);

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

    // Realtime subscription — new INSERT events for this project arrive here
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
            // Deduplicate — optimistic insert may have already added this id
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [projectId]);

  // Insert a new message; Realtime will add it to the list automatically
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

  return { messages, loading, error, sendMessage };
}
