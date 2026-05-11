import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAvatarColour, getInitials } from '../lib/utils';
import { supabase } from '../lib/supabase';

function Avatar({ name, projectId, size = 'md' }) {
  const s = size === 'sm' ? { wh: '32px', font: '0.65rem' } : { wh: '40px', font: '0.8rem' };
  const color = getAvatarColour(projectId);
  const initials = getInitials(name);
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold text-white shrink-0"
      style={{ width: s.wh, height: s.wh, backgroundColor: color, fontSize: s.font }}
    >
      {initials}
    </div>
  );
}

function formatMsgDate(isoString) {
  const d = new Date(isoString);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatMsgTime(isoString) {
  return new Date(isoString).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export default function MessageCenter() {
  const { user, isAdmin, loading } = useAuth();
  const [projects, setProjects]     = useState([]);
  const [activeId, setActiveId]     = useState(null); // project id
  const [messages, setMessages]     = useState([]);
  const [input, setInput]           = useState('');
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending]       = useState(false);
  const [showList, setShowList]     = useState(true);
  const bottomRef = useRef(null);
  const channelRef = useRef(null);

  useEffect(() => {
    if (loading || !user) return;
    fetchProjects();
  }, [user, loading]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  useEffect(() => {
    if (!activeId) return;
    fetchMessages(activeId);

    // Clean up previous channel
    if (channelRef.current) supabase.removeChannel(channelRef.current);

    const channel = supabase
      .channel(`messages:project:${activeId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `project_id=eq.${activeId}` },
        (payload) => {
          setMessages((prev) => {
            if (prev.find((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
        }
      )
      .subscribe();

    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [activeId]);

  async function fetchProjects() {
    setLoadingProjects(true);
    const { data } = await supabase
      .from('projects')
      .select(`
        id, project_name,
        managed_client:clients(full_name),
        client_profile:profiles(full_name)
      `)
      .order('created_at', { ascending: false });

    if (data) {
      setProjects(data);
      if (data.length > 0) setActiveId(data[0].id);
    }
    setLoadingProjects(false);
  }

  async function fetchMessages(projectId) {
    setLoadingMessages(true);
    const { data } = await supabase
      .from('messages')
      .select('id, sender_id, sender_role, body, created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (data) setMessages(data);
    setLoadingMessages(false);
  }

  async function sendMessage() {
    if (!input.trim() || !activeId || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);

    const { error } = await supabase.from('messages').insert({
      project_id:  activeId,
      sender_id:   user.id,
      sender_role: isAdmin ? 'admin' : 'client',
      body:        text,
    });

    if (error) setInput(text); // restore on error
    setSending(false);
    // Realtime subscription adds the new message automatically
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  function selectProject(id) {
    setActiveId(id);
    setShowList(false);
  }

  if (loading || !user) return null;

  const activeProject = projects.find((p) => p.id === activeId);
  const activeClientName = activeProject
    ? (activeProject.managed_client?.full_name ?? activeProject.client_profile?.full_name ?? activeProject.project_name)
    : '';

  return (
    <div className="flex h-[calc(100vh-56px)]" style={{ backgroundColor: '#F5F4F0' }}>

      {/* ── Conversation list ─────────────────────────────────────────── */}
      <div
        className={`${showList ? 'flex' : 'hidden'} md:flex flex-col shrink-0 border-r`}
        style={{ width: '280px', backgroundColor: '#fff', borderColor: '#E8E6E1' }}
      >
        <div className="px-4 py-4 border-b" style={{ borderColor: '#E8E6E1' }}>
          <h2 className="font-bold text-base" style={{ color: '#002147' }}>Messages</h2>
          <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>
            {loadingProjects ? 'Loading…' : `${projects.length} project${projects.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingProjects ? (
            <div className="flex items-center justify-center py-12">
              <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" strokeOpacity="0.2" /><path d="M12 2a10 10 0 0 1 10 10" />
              </svg>
            </div>
          ) : projects.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-xs" style={{ color: '#9CA3AF' }}>No projects yet.</p>
            </div>
          ) : (
            projects.map((project) => {
              const clientName = project.managed_client?.full_name ?? project.client_profile?.full_name ?? project.project_name;
              const isActive = project.id === activeId;
              return (
                <button
                  key={project.id}
                  onClick={() => selectProject(project.id)}
                  className="w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors duration-120 focus:outline-none border-b"
                  style={{
                    backgroundColor: isActive ? '#F0EEE9' : 'transparent',
                    borderColor: '#F5F4F0',
                    borderLeft: isActive ? '3px solid #D4AF37' : '3px solid transparent',
                  }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = '#F9F8F6'; }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <Avatar name={clientName} projectId={project.id} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: '#002147' }}>{clientName}</p>
                    <p className="text-xs font-medium truncate mt-0.5" style={{ color: '#D4AF37' }}>{project.project_name}</p>
                    <p className="text-xs truncate mt-0.5" style={{ color: '#9CA3AF' }}>
                      {isAdmin ? 'Tap to open conversation' : 'Your project messages'}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Chat window ──────────────────────────────────────────────── */}
      <div className={`${showList ? 'hidden' : 'flex'} md:flex flex-1 flex-col min-w-0`}>
        {activeProject ? (
          <>
            {/* Chat header */}
            <div
              className="flex items-center gap-3 px-4 sm:px-6 py-3.5 border-b shrink-0"
              style={{ backgroundColor: '#fff', borderColor: '#E8E6E1' }}
            >
              <button
                onClick={() => setShowList(true)}
                className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center focus:outline-none mr-1"
                style={{ backgroundColor: '#F0EEE9', color: '#002147' }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 2 4 7 9 12" />
                </svg>
              </button>
              <Avatar name={activeClientName} projectId={activeId} />
              <div>
                <p className="font-bold text-sm" style={{ color: '#002147' }}>{activeClientName}</p>
                <p className="text-xs" style={{ color: '#9CA3AF' }}>{activeProject.project_name}</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-3">
              {loadingMessages ? (
                <div className="flex items-center justify-center py-12">
                  <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="2.5" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.2" /><path d="M12 2a10 10 0 0 1 10 10" />
                  </svg>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <p className="text-sm font-semibold mb-1" style={{ color: '#374151' }}>No messages yet</p>
                    <p className="text-xs" style={{ color: '#9CA3AF' }}>Start the conversation below.</p>
                  </div>
                </div>
              ) : (
                messages.map((msg, i) => {
                  const isMe = msg.sender_id === user.id;
                  const isContractorMsg = msg.sender_role === 'admin';
                  const showDate = i === 0 || formatMsgDate(messages[i - 1].created_at) !== formatMsgDate(msg.created_at);
                  return (
                    <div key={msg.id}>
                      {showDate && (
                        <div className="flex items-center gap-3 my-4">
                          <div className="flex-1 h-px" style={{ backgroundColor: '#E8E6E1' }} />
                          <p className="text-xs font-semibold px-2" style={{ color: '#9CA3AF' }}>{formatMsgDate(msg.created_at)}</p>
                          <div className="flex-1 h-px" style={{ backgroundColor: '#E8E6E1' }} />
                        </div>
                      )}
                      <div className={`flex items-end gap-2 ${isContractorMsg ? 'flex-row-reverse' : 'flex-row'}`}>
                        {!isContractorMsg && (
                          <Avatar name={activeClientName} projectId={activeId} size="sm" />
                        )}
                        <div
                          className="max-w-[72%] px-4 py-2.5 rounded-2xl"
                          style={{
                            backgroundColor: isContractorMsg ? '#002147' : '#fff',
                            color: isContractorMsg ? '#fff' : '#002147',
                            border: isContractorMsg ? 'none' : '1.5px solid #E8E6E1',
                            borderBottomRightRadius: isContractorMsg ? '4px' : '16px',
                            borderBottomLeftRadius:  isContractorMsg ? '16px' : '4px',
                          }}
                        >
                          <p className="text-sm leading-relaxed">{msg.body}</p>
                          <p
                            className="text-xs mt-1"
                            style={{
                              color: isContractorMsg ? 'rgba(255,255,255,0.45)' : '#9CA3AF',
                              textAlign: isContractorMsg ? 'right' : 'left',
                            }}
                          >
                            {formatMsgTime(msg.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div
              className="px-4 sm:px-6 py-3 border-t shrink-0"
              style={{ backgroundColor: '#fff', borderColor: '#E8E6E1' }}
            >
              <div className="flex items-end gap-3">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Type a message… (Enter to send)"
                  rows={1}
                  className="flex-1 text-sm rounded-xl px-4 py-2.5 resize-none focus:outline-none"
                  style={{
                    border: '1.5px solid #E8E6E1',
                    color: '#002147',
                    backgroundColor: '#F9F8F6',
                    maxHeight: '120px',
                  }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || sending}
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-150 focus:outline-none"
                  style={{
                    backgroundColor: input.trim() && !sending ? '#002147' : '#E8E6E1',
                    color: input.trim() && !sending ? '#D4AF37' : '#9CA3AF',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm" style={{ color: '#9CA3AF' }}>
              {loadingProjects ? 'Loading projects…' : 'Select a conversation'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
