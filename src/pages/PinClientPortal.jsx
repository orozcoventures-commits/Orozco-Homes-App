import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const STATUS_CFG = {
  'on-track': { label: 'On Track',       dot: '#10B981', bg: '#ECFDF5', text: '#065F46' },
  attention:  { label: 'Needs Attention', dot: '#F59E0B', bg: '#FFFBEB', text: '#92400E' },
  delayed:    { label: 'Delayed',         dot: '#EF4444', bg: '#FEF2F2', text: '#991B1B' },
};

const CHANGE_STATUS = {
  pending:  { label: 'Pending Approval', bg: '#FFFBEB', text: '#92400E', border: '#FCD34D' },
  approved: { label: 'Approved',         bg: '#ECFDF5', text: '#065F46', border: '#6EE7B7' },
  declined: { label: 'Declined',         bg: '#FEF2F2', text: '#991B1B', border: '#FECACA' },
};

function fmt(n) {
  return '$' + Math.abs(Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
}

function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function Section({ title, children }) {
  return (
    <div className="mb-8">
      <h3 className="text-xs font-bold tracking-[0.14em] uppercase mb-3" style={{ color: '#D4AF37' }}>{title}</h3>
      {children}
    </div>
  );
}

// ── Lightbox ──────────────────────────────────────────────────────────────────
function Lightbox({ src, caption, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.9)' }} onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center"
        style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: '#fff' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
      <img src={src} alt={caption} onClick={(e) => e.stopPropagation()}
        className="max-w-full max-h-[80vh] rounded-2xl object-contain shadow-2xl" />
      {caption && <p className="mt-4 text-sm text-center max-w-lg px-4" style={{ color: 'rgba(255,255,255,0.7)' }}
        onClick={(e) => e.stopPropagation()}>{caption}</p>}
    </div>
  );
}

export default function PinClientPortal() {
  const { pinSession, exitPinMode } = useAuth();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [lightbox, setLightbox] = useState(null);

  // Message state
  const [msgInput, setMsgInput]   = useState('');
  const [sending, setSending]     = useState(false);
  const [localMsgs, setLocalMsgs] = useState([]);
  const msgEndRef = useRef(null);

  useEffect(() => {
    if (!pinSession) return;
    fetchData();
  }, [pinSession]);

  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [localMsgs, data?.messages]);

  // Poll for new messages every 5 s — PIN clients have no Supabase auth session
  // so Realtime cannot deliver events to them via RLS-gated postgres_changes.
  useEffect(() => {
    if (!pinSession || !data) return;

    const poll = async () => {
      // Find the latest confirmed (non-optimistic) message timestamp
      const confirmed = localMsgs.filter((m) => !String(m.id).startsWith('tmp-'));
      const after = confirmed.length > 0
        ? confirmed[confirmed.length - 1].created_at
        : new Date(0).toISOString();

      const { data: fresh } = await supabase.rpc('get_new_pin_messages', {
        p_project_id: pinSession.projectId,
        p_pin:        pinSession.pin,
        p_after:      after,
      });

      if (fresh && fresh.length > 0) {
        setLocalMsgs((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const added = fresh.filter((m) => !existingIds.has(m.id));
          return added.length > 0 ? [...prev, ...added] : prev;
        });
      }
    };

    const timer = setInterval(poll, 5000);
    return () => clearInterval(timer);
  }, [pinSession, data, localMsgs]);

  async function fetchData() {
    setLoading(true);
    setError('');

    const pin        = String(pinSession.pin ?? '').trim();
    const projectId  = String(pinSession.projectId ?? '').trim();

    console.log('[PinPortal] fetching data', { projectId, pin });

    const { data: result, error: err } = await supabase.rpc('get_pin_portal_data', {
      p_project_id: projectId,
      p_pin:        pin,
    });

    setLoading(false);

    if (err) {
      const isNotFound = err.code === 'PGRST202' || err.code === '42883';
      console.error('[PinPortal] RPC error', { code: err.code, message: err.message, hint: err.hint, details: err.details });
      if (isNotFound) {
        setError('Portal not configured yet (function missing). Contractor: run migration 017 in Supabase SQL Editor.');
      } else {
        setError(`Error ${err.code || 'unknown'}: ${err.message}`);
      }
      return;
    }

    if (!result) {
      console.warn('[PinPortal] RPC returned null — PIN mismatch or project not found', { projectId, pin });
      setError('Your PIN session no longer matches the project record. Please sign out and sign in again.');
      return;
    }

    console.log('[PinPortal] data loaded successfully', result);
    setData(result);
    setLocalMsgs(result.messages ?? []);
  }

  async function handleSend(e) {
    e.preventDefault();
    if (!msgInput.trim() || sending) return;
    setSending(true);
    const optimistic = {
      id: `tmp-${Date.now()}`,
      sender_role: 'client',
      content: msgInput.trim(),
      created_at: new Date().toISOString(),
    };
    setLocalMsgs((prev) => [...prev, optimistic]);
    const input = msgInput.trim();
    setMsgInput('');

    const { data: ok } = await supabase.rpc('send_pin_message', {
      p_project_id: pinSession.projectId,
      p_pin:        pinSession.pin,
      p_content:    input,
    });
    if (!ok) {
      setLocalMsgs((prev) => prev.filter((m) => m.id !== optimistic.id));
      setMsgInput(input);
    }
    setSending(false);
  }

  const project   = data?.project ?? {};
  const weekly    = data?.weekly_update;
  const orders    = data?.change_orders ?? [];
  const photos    = data?.photo_logs ?? [];
  // projects table has no 'status' column — status always comes from weekly_update
  const statusCfg = STATUS_CFG[weekly?.status] ?? STATUS_CFG['on-track'];

  return (
    <>
      {lightbox && <Lightbox src={lightbox.image_url} caption={lightbox.caption} onClose={() => setLightbox(null)} />}

      <div className="min-h-screen" style={{ backgroundColor: '#F5F4F0' }}>

        {/* Top bar */}
        <div className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 py-4"
          style={{ backgroundColor: '#002147', boxShadow: '0 2px 12px rgba(0,0,0,0.18)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: '#D4AF37' }}>
              <span className="font-extrabold text-xs" style={{ color: '#002147' }}>OH</span>
            </div>
            <div>
              <p className="text-xs font-bold text-white leading-none">{pinSession?.projectName ?? 'My Project'}</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
                {pinSession?.clientName}
              </p>
            </div>
          </div>
          <button onClick={exitPinMode}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign Out
          </button>
        </div>

        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">

          {loading && (
            <div className="flex items-center justify-center gap-3 py-24">
              <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" strokeOpacity="0.2"/><path d="M12 2a10 10 0 0 1 10 10"/>
              </svg>
              <span className="text-sm" style={{ color: '#9CA3AF' }}>Loading your project…</span>
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center gap-4 py-24 text-center px-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: '#FEF2F2' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
              <p className="text-sm max-w-xs" style={{ color: '#374151' }}>{error}</p>
              <div className="flex gap-3">
                <button onClick={fetchData} className="px-5 py-2.5 rounded-xl text-sm font-bold"
                  style={{ backgroundColor: '#F5F4F0', color: '#374151', border: '1px solid #E8E6E1' }}>
                  Try Again
                </button>
                <button onClick={exitPinMode} className="px-5 py-2.5 rounded-xl text-sm font-bold"
                  style={{ backgroundColor: '#002147', color: '#D4AF37' }}>
                  Back to Login
                </button>
              </div>
            </div>
          )}

          {!loading && !error && data && (
            <>
              {/* Project header */}
              <div className="rounded-2xl p-6 mb-6"
                style={{ backgroundColor: '#002147', boxShadow: '0 4px 20px rgba(0,33,71,0.18)' }}>
                <p className="text-xs font-bold tracking-[0.16em] uppercase mb-1"
                  style={{ color: '#D4AF37' }}>{project.label}</p>
                <h1 className="text-xl font-bold text-white mb-3">{project.project_name}</h1>

                {weekly && (
                  <>
                    {/* Status pill */}
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-4"
                      style={{ backgroundColor: statusCfg.bg, color: statusCfg.text }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusCfg.dot }} />
                      {statusCfg.label}
                    </span>

                    {/* Progress bar */}
                    <div className="mb-3">
                      <div className="flex justify-between text-xs mb-1.5">
                        <span style={{ color: 'rgba(255,255,255,0.55)' }}>{weekly.current_phase || 'In Progress'}</span>
                        <span className="font-bold" style={{ color: '#D4AF37' }}>{weekly.progress_percent ?? 0}%</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}>
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${weekly.progress_percent ?? 0}%`, backgroundColor: '#D4AF37' }} />
                      </div>
                    </div>

                    {weekly.contractor_note && (
                      <p className="text-sm mt-3 leading-relaxed"
                        style={{ color: 'rgba(255,255,255,0.65)', borderLeft: '2px solid #D4AF37', paddingLeft: '12px' }}>
                        {weekly.contractor_note}
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Change orders */}
              {orders.length > 0 && (
                <Section title="Change Orders">
                  <div className="space-y-3">
                    {orders.map((o) => {
                      const cfg = CHANGE_STATUS[o.status] ?? CHANGE_STATUS.pending;
                      const delta = Number(o.new_cost) - Number(o.original_cost);
                      return (
                        <div key={o.id} className="rounded-2xl overflow-hidden"
                          style={{ backgroundColor: '#fff', border: '1.5px solid #E8E6E1', boxShadow: '0 2px 8px rgba(0,33,71,0.05)' }}>
                          <div className="h-1" style={{ backgroundColor: cfg.text === '#991B1B' ? '#EF4444' : cfg.text === '#065F46' ? '#10B981' : '#F59E0B' }} />
                          <div className="p-4">
                            <div className="flex items-start justify-between gap-3 mb-1">
                              <p className="text-sm font-bold" style={{ color: '#002147' }}>{o.title}</p>
                              <span className="text-xs px-2 py-0.5 rounded-full font-semibold shrink-0"
                                style={{ backgroundColor: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}` }}>
                                {cfg.label}
                              </span>
                            </div>
                            {o.description && <p className="text-xs mb-2" style={{ color: '#6B7280' }}>{o.description}</p>}
                            <div className="flex items-center gap-4 text-xs">
                              <span style={{ color: '#9CA3AF' }}>Original: <strong style={{ color: '#374151' }}>{fmt(o.original_cost)}</strong></span>
                              <span style={{ color: '#9CA3AF' }}>→ Revised: <strong style={{ color: '#002147' }}>{fmt(o.new_cost)}</strong></span>
                              <span className="ml-auto font-bold" style={{ color: delta >= 0 ? '#D97706' : '#059669' }}>
                                {delta >= 0 ? '+' : ''}{fmt(delta)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Section>
              )}

              {/* Photo log */}
              {photos.length > 0 && (
                <Section title="Progress Photos">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {photos.map((p) => (
                      <button key={p.id} onClick={() => p.image_url && setLightbox(p)}
                        className="relative rounded-xl overflow-hidden focus:outline-none group"
                        style={{ aspectRatio: '1', backgroundColor: '#E8E6E1' }}>
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.caption}
                            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"
                            style={{ background: 'linear-gradient(135deg,#002147,#1B4F6B)' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                              stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round">
                              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                              <circle cx="12" cy="13" r="4"/>
                            </svg>
                          </div>
                        )}
                        {/* Category badge */}
                        <div className="absolute top-1.5 left-1.5">
                          <span className="text-xs font-bold px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: '#D4AF37', color: '#002147', fontSize: '0.6rem' }}>
                            {p.category}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </Section>
              )}

              {/* Messages */}
              <Section title="Messages">
                <div className="rounded-2xl overflow-hidden"
                  style={{ backgroundColor: '#fff', border: '1.5px solid #E8E6E1', boxShadow: '0 2px 8px rgba(0,33,71,0.05)' }}>

                  {/* Message thread */}
                  <div className="p-4 space-y-3 max-h-72 overflow-y-auto">
                    {localMsgs.length === 0 ? (
                      <p className="text-xs text-center py-6" style={{ color: '#9CA3AF' }}>
                        No messages yet. Send one below to start the conversation.
                      </p>
                    ) : (
                      localMsgs.map((m) => {
                        const isClient = m.sender_role === 'client';
                        return (
                          <div key={m.id} className={`flex ${isClient ? 'justify-end' : 'justify-start'}`}>
                            <div className="max-w-[80%]">
                              <div className="px-3 py-2 rounded-2xl text-sm"
                                style={isClient
                                  ? { backgroundColor: '#002147', color: '#fff', borderBottomRightRadius: '4px' }
                                  : { backgroundColor: '#F5F4F0', color: '#002147', borderBottomLeftRadius: '4px' }
                                }>
                                {m.content}
                              </div>
                              <p className="text-xs mt-1 px-1"
                                style={{ color: '#9CA3AF', textAlign: isClient ? 'right' : 'left' }}>
                                {isClient ? 'You' : 'Contractor'} · {fmtDate(m.created_at)}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={msgEndRef} />
                  </div>

                  {/* Message input */}
                  <form onSubmit={handleSend} className="flex gap-2 p-3"
                    style={{ borderTop: '1px solid #F3F2EE' }}>
                    <input
                      type="text"
                      value={msgInput}
                      onChange={(e) => setMsgInput(e.target.value)}
                      placeholder="Type a message…"
                      className="flex-1 text-sm rounded-xl px-3 py-2 focus:outline-none"
                      style={{ border: '1.5px solid #E8E6E1', color: '#002147', backgroundColor: '#F9F8F6' }}
                      onFocus={(e) => { e.target.style.borderColor = '#D4AF37'; }}
                      onBlur={(e)  => { e.target.style.borderColor = '#E8E6E1'; }}
                    />
                    <button type="submit" disabled={!msgInput.trim() || sending}
                      className="px-4 py-2 rounded-xl text-sm font-bold transition-all duration-150"
                      style={{
                        backgroundColor: msgInput.trim() && !sending ? '#002147' : '#E5E3DF',
                        color: msgInput.trim() && !sending ? '#D4AF37' : '#9CA3AF',
                      }}>
                      {sending ? '…' : 'Send'}
                    </button>
                  </form>
                </div>
              </Section>
            </>
          )}
        </div>
      </div>
    </>
  );
}
