import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAvatarColour, getInitials } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { useMessages } from '../hooks/useMessages';

function Avatar({ name, projectId, size = 'md' }) {
  const dim = size === 'sm' ? '32px' : '40px';
  const fs  = size === 'sm' ? '0.65rem' : '0.8rem';
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold text-white shrink-0"
      style={{ width: dim, height: dim, backgroundColor: getAvatarColour(projectId), fontSize: fs }}
    >
      {getInitials(name)}
    </div>
  );
}

function formatDate(iso) {
  const d   = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

// ── Conversation sidebar item ─────────────────────────────────────────────────
function ConversationItem({ project, isActive, onClick }) {
  const clientName = project.managed_client?.full_name
    ?? project.client_profile?.full_name
    ?? project.project_name;

  return (
    <button
      onClick={onClick}
      className="w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors duration-100 focus:outline-none border-b"
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
      </div>
    </button>
  );
}

// ── Chat message bubble ───────────────────────────────────────────────────────
function MessageBubble({ msg, prevMsg, clientName, projectId, currentUserId }) {
  const isContractor = msg.sender_role === 'admin';
  const showDate = !prevMsg || formatDate(prevMsg.created_at) !== formatDate(msg.created_at);

  return (
    <>
      {showDate && (
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px" style={{ backgroundColor: '#E8E6E1' }} />
          <p className="text-xs font-semibold px-2" style={{ color: '#9CA3AF' }}>{formatDate(msg.created_at)}</p>
          <div className="flex-1 h-px" style={{ backgroundColor: '#E8E6E1' }} />
        </div>
      )}
      <div className={`flex items-end gap-2 ${isContractor ? 'flex-row-reverse' : 'flex-row'}`}>
        {!isContractor && <Avatar name={clientName} projectId={projectId} size="sm" />}
        <div
          className="max-w-[72%] px-4 py-2.5 rounded-2xl"
          style={{
            backgroundColor: isContractor ? '#002147' : '#fff',
            color:           isContractor ? '#fff'    : '#002147',
            border:          isContractor ? 'none'    : '1.5px solid #E8E6E1',
            borderBottomRightRadius: isContractor ? '4px'  : '16px',
            borderBottomLeftRadius:  isContractor ? '16px' : '4px',
          }}
        >
          <p className="text-sm leading-relaxed">{msg.content}</p>
          <p
            className="text-xs mt-1"
            style={{
              color:     isContractor ? 'rgba(255,255,255,0.45)' : '#9CA3AF',
              textAlign: isContractor ? 'right' : 'left',
            }}
          >
            {formatTime(msg.created_at)}
          </p>
        </div>
      </div>
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function MessageCenter() {
  const { user, isAdmin, loading: authLoading } = useAuth();

  const [projects, setProjects]           = useState([]);
  const [activeId, setActiveId]           = useState(null);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [showList, setShowList]           = useState(true);
  const [input, setInput]                 = useState('');
  const [sending, setSending]             = useState(false);

  const bottomRef = useRef(null);

  // The hook handles fetching + Realtime for the active project
  const { messages, loading: loadingMessages, sendMessage } = useMessages(
    activeId,
    user?.id,
    isAdmin
  );

  // Scroll to bottom whenever messages update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Fetch project list once on mount
  useEffect(() => {
    if (authLoading || !user) return;
    setLoadingProjects(true);
    supabase
      .from('projects')
      .select(`
        id, project_name,
        managed_client:clients(full_name),
        client_profile:profiles(full_name)
      `)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        const list = data ?? [];
        setProjects(list);
        if (list.length > 0) setActiveId(list[0].id);
        setLoadingProjects(false);
      });
  }, [user, authLoading]);

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    setSending(true);
    const { error } = await sendMessage(text);
    if (error) setInput(text); // restore on failure
    setSending(false);
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  function selectProject(id) {
    setActiveId(id);
    setShowList(false);
  }

  if (authLoading || !user) return null;

  const activeProject  = projects.find((p) => p.id === activeId) ?? null;
  const activeClientName = activeProject
    ? (activeProject.managed_client?.full_name
       ?? activeProject.client_profile?.full_name
       ?? activeProject.project_name)
    : '';

  return (
    <div className="flex h-[calc(100vh-56px)]" style={{ backgroundColor: '#F5F4F0' }}>

      {/* ── Sidebar: project list ────────────────────────────────────── */}
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
            <div className="flex justify-center py-12">
              <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" strokeOpacity="0.2" /><path d="M12 2a10 10 0 0 1 10 10" />
              </svg>
            </div>
          ) : projects.length === 0 ? (
            <p className="text-xs text-center px-4 py-10" style={{ color: '#9CA3AF' }}>
              No projects yet.
            </p>
          ) : (
            projects.map((p) => (
              <ConversationItem
                key={p.id}
                project={p}
                isActive={p.id === activeId}
                onClick={() => selectProject(p.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Chat panel ──────────────────────────────────────────────── */}
      <div className={`${showList ? 'hidden' : 'flex'} md:flex flex-1 flex-col min-w-0`}>
        {activeProject ? (
          <>
            {/* Header */}
            <div
              className="flex items-center gap-3 px-4 sm:px-6 py-3.5 border-b shrink-0"
              style={{ backgroundColor: '#fff', borderColor: '#E8E6E1' }}
            >
              <button
                onClick={() => setShowList(true)}
                className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center focus:outline-none"
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

            {/* Message list */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
              {loadingMessages ? (
                <div className="flex justify-center py-12">
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
                <div className="space-y-3">
                  {messages.map((msg, i) => (
                    <MessageBubble
                      key={msg.id}
                      msg={msg}
                      prevMsg={messages[i - 1] ?? null}
                      clientName={activeClientName}
                      projectId={activeId}
                      currentUserId={user.id}
                    />
                  ))}
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input bar */}
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
                  onClick={handleSend}
                  disabled={!input.trim() || sending}
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-150 focus:outline-none"
                  style={{
                    backgroundColor: input.trim() && !sending ? '#002147' : '#E8E6E1',
                    color:           input.trim() && !sending ? '#D4AF37' : '#9CA3AF',
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
              {loadingProjects ? 'Loading…' : 'Select a conversation'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
