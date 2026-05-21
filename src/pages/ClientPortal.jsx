import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useProject } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';
import { useDesignSpecs } from '../hooks/useDesignSpecs';

const STATUS_CFG = {
  'on-track':  { label: 'On Track',        dot: '#10B981', bg: '#ECFDF5', color: '#065F46', border: '#6EE7B7' },
  'attention': { label: 'Needs Attention',  dot: '#F59E0B', bg: '#FFFBEB', color: '#92400E', border: '#FCD34D' },
  'delayed':   { label: 'Delayed',          dot: '#EF4444', bg: '#FEF2F2', color: '#991B1B', border: '#FECACA' },
};

const GALLERY_GRADIENTS = [
  'linear-gradient(135deg,#1B4F6B,#2D7DA0)',
  'linear-gradient(135deg,#374151,#6B7280)',
  'linear-gradient(135deg,#3B2F1E,#7C5B3A)',
  'linear-gradient(135deg,#1E3A5F,#2E6DAA)',
  'linear-gradient(135deg,#1A3A2A,#2D6B45)',
  'linear-gradient(135deg,#4A1942,#7D3C73)',
];

function StatusDot({ done, active }) {
  const bg   = done ? '#10B981' : active ? '#D4AF37' : '#D1D5DB';
  const ring = done ? '#D1FAE5' : active ? '#FEF3C7' : '#F3F4F6';
  return (
    <span className="relative flex items-center justify-center w-5 h-5 shrink-0">
      <span className="absolute w-5 h-5 rounded-full opacity-40" style={{ backgroundColor: ring }} />
      <span className="w-2.5 h-2.5 rounded-full z-10" style={{ backgroundColor: bg }} />
    </span>
  );
}

function NoProjectSelected({ isAdmin, onNavigate }) {
  return (
    <div className="max-w-md mx-auto px-6 py-24 text-center">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ backgroundColor: '#F5F4F0' }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      </div>
      <p className="text-base font-bold mb-2" style={{ color: '#002147' }}>No project selected</p>
      <p className="text-sm mb-6" style={{ color: '#6B7280' }}>
        {isAdmin ? 'Select a client project from the home screen to view its portal.' : 'Your contractor will link a project to your account.'}
      </p>
      <button
        onClick={onNavigate}
        className="px-6 py-2.5 rounded-xl text-sm font-bold"
        style={{ backgroundColor: '#002147', color: '#D4AF37' }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#003166'; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#002147'; }}
      >
        Go to Projects
      </button>
    </div>
  );
}

const SPEC_STATUS_CFG = {
  pending_review: { label: 'Pending Review', bg: '#FFFBEB', color: '#92400E', border: '#FCD34D', dot: '#F59E0B' },
  approved:       { label: 'Approved',       bg: '#ECFDF5', color: '#065F46', border: '#6EE7B7', dot: '#10B981' },
  declined:       { label: 'Declined',       bg: '#FEF2F2', color: '#991B1B', border: '#FECACA', dot: '#EF4444' },
};

function fmtCurrency(n) {
  return '$' + (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function DesignSelectionsSection({ projectId, isAdmin }) {
  const { specs, loading, clientRespond } = useDesignSpecs(projectId);
  const [feedbackDraft, setFeedbackDraft] = useState({});
  const [declining,     setDeclining]     = useState(null);
  const [responding,    setResponding]    = useState(null);
  const [toast,         setToast]         = useState('');

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }

  async function handleRespond(specId, status, feedback = '') {
    setResponding(specId + status);
    const result = await clientRespond(specId, status, feedback);
    setResponding(null);
    if (result.error) showToast('Error: ' + result.error);
    else {
      showToast(status === 'approved' ? 'Selection approved!' : 'Selection declined.');
      setDeclining(null);
      setFeedbackDraft((p) => { const n = { ...p }; delete n[specId]; return n; });
    }
  }

  const pending  = specs.filter((s) => s.status === 'pending_review');
  const approved = specs.filter((s) => s.status === 'approved');
  const declined = specs.filter((s) => s.status === 'declined');

  if (loading) return null;
  if (specs.length === 0) return null;

  const approvedTotal = approved.reduce((s, sp) => s + (Number(sp.installed_cost) || 0), 0);

  return (
    <div className="mt-8 rounded-2xl overflow-hidden" style={{ backgroundColor: '#fff', border: '1.5px solid #E8E6E1', boxShadow: '0 2px 12px rgba(0,33,71,0.06)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4" style={{ backgroundColor: 'rgba(0,33,71,0.03)', borderBottom: '1px solid #E8E6E1' }}>
        <div>
          <h3 className="font-bold text-base" style={{ color: '#002147' }}>Design Selections</h3>
          <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>
            {specs.length} item{specs.length !== 1 ? 's' : ''} · {pending.length} pending your review
          </p>
        </div>
        {approved.length > 0 && (
          <div className="text-right">
            <p className="text-xs font-semibold" style={{ color: '#9CA3AF' }}>Approved Total</p>
            <p className="text-base font-extrabold" style={{ color: '#065F46' }}>{fmtCurrency(approvedTotal)}</p>
          </div>
        )}
      </div>

      <div className="px-6 py-5 space-y-5">
        {/* Pending review */}
        {pending.length > 0 && (
          <div>
            <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: '#92400E' }}>
              Awaiting Your Decision ({pending.length})
            </p>
            <div className="space-y-3">
              {pending.map((spec) => (
                <div key={spec.id} className="rounded-xl p-4" style={{ backgroundColor: '#FFFBEB', border: '1.5px solid #FCD34D' }}>
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="font-bold text-sm" style={{ color: '#002147' }}>{spec.product_name}</p>
                      {spec.supplier && <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>{spec.supplier}</p>}
                      <div className="flex flex-wrap gap-2 mt-1.5 text-xs" style={{ color: '#6B7280' }}>
                        <span>{spec.quantity} {spec.unit_type} @ {fmtCurrency(spec.unit_price)}/{spec.unit_type}</span>
                        {spec.phase_tag && <span className="px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}>{spec.phase_tag}</span>}
                      </div>
                    </div>
                    <p className="text-lg font-extrabold" style={{ color: '#002147' }}>{fmtCurrency(spec.installed_cost)}</p>
                  </div>
                  {spec.designer_notes && (
                    <p className="text-xs mb-3 italic" style={{ color: '#78350F' }}>"{spec.designer_notes}"</p>
                  )}

                  {declining === spec.id ? (
                    <div className="space-y-2">
                      <textarea
                        rows={2}
                        value={feedbackDraft[spec.id] ?? ''}
                        onChange={(e) => setFeedbackDraft((p) => ({ ...p, [spec.id]: e.target.value }))}
                        placeholder="Optional: let us know why you're declining this…"
                        className="w-full px-3 py-2 rounded-lg text-xs focus:outline-none resize-none"
                        style={{ backgroundColor: '#fff', border: '1.5px solid #FCD34D', color: '#374151' }}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => setDeclining(null)}
                          className="flex-1 py-2 rounded-lg text-xs font-bold"
                          style={{ backgroundColor: '#F5F4F0', color: '#374151' }}
                        >
                          Back
                        </button>
                        <button
                          onClick={() => handleRespond(spec.id, 'declined', feedbackDraft[spec.id] ?? '')}
                          disabled={responding === spec.id + 'declined'}
                          className="flex-1 py-2 rounded-lg text-xs font-bold"
                          style={{ backgroundColor: '#DC2626', color: '#fff' }}
                        >
                          {responding === spec.id + 'declined' ? 'Saving…' : 'Confirm Decline'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRespond(spec.id, 'approved')}
                        disabled={!!responding}
                        className="flex-1 py-2 rounded-lg text-xs font-bold transition-colors"
                        style={{ backgroundColor: '#065F46', color: '#fff' }}
                        onMouseEnter={(e) => { if (!responding) e.currentTarget.style.backgroundColor = '#047857'; }}
                        onMouseLeave={(e) => { if (!responding) e.currentTarget.style.backgroundColor = '#065F46'; }}
                      >
                        {responding === spec.id + 'approved' ? 'Saving…' : '✓ Approve'}
                      </button>
                      <button
                        onClick={() => setDeclining(spec.id)}
                        disabled={!!responding}
                        className="flex-1 py-2 rounded-lg text-xs font-bold transition-colors"
                        style={{ backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}
                        onMouseEnter={(e) => { if (!responding) e.currentTarget.style.backgroundColor = '#FEE2E2'; }}
                        onMouseLeave={(e) => { if (!responding) e.currentTarget.style.backgroundColor = '#FEF2F2'; }}
                      >
                        ✕ Decline
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Approved */}
        {approved.length > 0 && (
          <div>
            <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: '#065F46' }}>
              Approved ({approved.length})
            </p>
            <div className="grid sm:grid-cols-2 gap-2">
              {approved.map((spec) => (
                <div key={spec.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl" style={{ backgroundColor: '#ECFDF5', border: '1px solid #6EE7B7' }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: '#065F46' }}>{spec.product_name}</p>
                    {spec.supplier && <p className="text-xs truncate" style={{ color: '#6EE7B7' }}>{spec.supplier}</p>}
                  </div>
                  <p className="text-sm font-bold shrink-0 ml-3" style={{ color: '#065F46' }}>{fmtCurrency(spec.installed_cost)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Declined */}
        {declined.length > 0 && (
          <div>
            <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: '#991B1B' }}>
              Declined ({declined.length})
            </p>
            <div className="space-y-2">
              {declined.map((spec) => (
                <div key={spec.id} className="px-3 py-2.5 rounded-xl" style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA' }}>
                  <p className="text-sm font-semibold" style={{ color: '#991B1B' }}>{spec.product_name}</p>
                  {spec.client_feedback && (
                    <p className="text-xs mt-1" style={{ color: '#6B7280' }}>Feedback: {spec.client_feedback}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl text-sm font-semibold shadow-lg" style={{ backgroundColor: '#002147', color: '#D4AF37' }}>
          {toast}
        </div>
      )}
    </div>
  );
}

export default function ClientPortal() {
  const { state, dispatch } = useProject();
  const { isAdmin } = useAuth();
  const project = state.activeDbProject;

  const [update,       setUpdate]       = useState(null);
  const [pendingOrders,setPendingOrders] = useState(0);
  const [loading,      setLoading]      = useState(false);

  useEffect(() => {
    if (!project?.id) { setUpdate(null); return; }
    setLoading(true);
    Promise.all([
      supabase
        .from('weekly_updates')
        .select('*')
        .eq('project_id', project.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('change_works')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', project.id)
        .eq('status', 'pending'),
    ]).then(([{ data: u }, { count }]) => {
      setUpdate(u ?? null);
      setPendingOrders(count ?? 0);
      setLoading(false);
    });
  }, [project?.id]);

  if (!project) {
    return <NoProjectSelected isAdmin={isAdmin} onNavigate={() => dispatch({ type: 'SET_PAGE', page: 'home' })} />;
  }

  const clientName = project.managed_client?.full_name ?? project.client_profile?.full_name ?? 'Client';
  const sCfg       = STATUS_CFG[update?.status ?? 'on-track'];
  const phases     = update?.phases ?? [];

  const stats = [
    { label: 'Project Status',  value: sCfg.label,                     sub: project.project_name, color: sCfg.color, bg: sCfg.bg, dot: sCfg.dot },
    { label: 'Progress',        value: `${update?.progress_percent ?? 0}%`, sub: update?.current_phase ?? 'Not started', color: '#2563EB', bg: '#EFF6FF', dot: '#3B82F6' },
    { label: 'Current Phase',   value: update?.current_phase ?? '—',    sub: phases[update?.active_phase_index ?? 0] ?? 'Awaiting update', color: '#D97706', bg: '#FFFBEB', dot: '#F59E0B' },
    { label: 'Open Items',      value: String(pendingOrders),           sub: 'Pending your approval', color: '#7C3AED', bg: '#F5F3FF', dot: '#8B5CF6' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => dispatch({ type: 'SET_PAGE', page: 'home' })}
          className="flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase mb-4 transition-colors"
          style={{ color: '#9CA3AF' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#D4AF37'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#9CA3AF'; }}
        >
          ← All Projects
        </button>
        <p className="text-xs font-bold tracking-[0.18em] uppercase mb-1" style={{ color: '#D4AF37' }}>
          {isAdmin ? 'Contractor View' : 'Your Project'}
        </p>
        <h2 className="text-2xl font-bold" style={{ color: '#002147' }}>{project.project_name}</h2>
        <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
          {clientName} · {project.label}
          {update && ` · Last updated ${new Date(update.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-3 py-16">
          <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" strokeOpacity="0.2" /><path d="M12 2a10 10 0 0 1 10 10" />
          </svg>
          <span className="text-sm" style={{ color: '#9CA3AF' }}>Loading project data…</span>
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            {stats.map((s) => (
              <div key={s.label} className="rounded-2xl p-4" style={{ backgroundColor: s.bg, border: `1.5px solid ${s.dot}30` }}>
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.dot }} />
                  <p className="text-xs font-semibold" style={{ color: '#6B7280' }}>{s.label}</p>
                </div>
                <p className="text-xl font-bold leading-tight mb-1 truncate" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs truncate" style={{ color: '#9CA3AF' }}>{s.sub}</p>
              </div>
            ))}
          </div>

          {!update ? (
            <div className="rounded-2xl p-10 text-center" style={{ backgroundColor: '#fff', border: '1.5px solid #E8E6E1' }}>
              <p className="text-sm font-semibold mb-1" style={{ color: '#374151' }}>No weekly update yet</p>
              <p className="text-xs" style={{ color: '#9CA3AF' }}>
                {isAdmin ? 'Go to Weekly Updates to post the first update for this project.' : 'Your contractor will post the first update soon.'}
              </p>
              {isAdmin && (
                <button
                  onClick={() => dispatch({ type: 'SET_PAGE', page: 'weekly-updates' })}
                  className="mt-4 px-5 py-2 rounded-xl text-sm font-bold"
                  style={{ backgroundColor: '#002147', color: '#D4AF37' }}
                >
                  Go to Weekly Updates
                </button>
              )}
            </div>
          ) : (
            <div className="grid lg:grid-cols-2 gap-8">

              {/* Timeline */}
              <div className="rounded-2xl p-6" style={{ backgroundColor: '#fff', border: '1.5px solid #E8E6E1', boxShadow: '0 2px 12px rgba(0,33,71,0.06)' }}>
                <h3 className="font-bold text-base mb-5" style={{ color: '#002147' }}>Project Phases</h3>
                {phases.length === 0 ? (
                  <p className="text-sm" style={{ color: '#9CA3AF' }}>No phases defined yet.</p>
                ) : (
                  <div className="space-y-0">
                    {phases.map((phase, i) => {
                      const activeIdx = update.active_phase_index ?? 0;
                      const done   = i < activeIdx;
                      const active = i === activeIdx;
                      return (
                        <div key={phase} className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <StatusDot done={done} active={active} />
                            {i < phases.length - 1 && (
                              <div className="w-px flex-1 my-1" style={{ backgroundColor: done ? '#10B981' : '#E5E7EB', minHeight: '28px' }} />
                            )}
                          </div>
                          <div className="pb-5 flex items-start gap-2 flex-1">
                            <p className="text-sm font-semibold flex-1"
                              style={{ color: active ? '#002147' : done ? '#6B7280' : '#9CA3AF' }}>
                              {phase}
                            </p>
                            {active && (
                              <span className="text-xs px-2 py-0.5 rounded-full font-semibold shrink-0"
                                style={{ backgroundColor: '#FEF3C7', color: '#92400E', border: '1px solid #FCD34D' }}>
                                In Progress
                              </span>
                            )}
                            {done && (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Weekly update details */}
              <div className="flex flex-col gap-6">

                {/* This week */}
                {(update.this_week ?? []).length > 0 && (
                  <div className="rounded-2xl p-6" style={{ backgroundColor: '#fff', border: '1.5px solid #E8E6E1', boxShadow: '0 2px 12px rgba(0,33,71,0.06)' }}>
                    <h3 className="font-bold text-base mb-4" style={{ color: '#002147' }}>Completed This Week</h3>
                    <ul className="space-y-2">
                      {update.this_week.map((item, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm" style={{ color: '#4A4A4A' }}>
                          <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: '#D4AF37' }} />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Next week + note */}
                {(update.next_week_goal || update.contractor_note) && (
                  <div className="rounded-2xl p-6" style={{ backgroundColor: '#fff', border: '1.5px solid #E8E6E1', boxShadow: '0 2px 12px rgba(0,33,71,0.06)' }}>
                    {update.next_week_goal && (
                      <div className="mb-4">
                        <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#9CA3AF' }}>Next Week Goal</p>
                        <p className="text-sm leading-relaxed" style={{ color: '#374151' }}>{update.next_week_goal}</p>
                      </div>
                    )}
                    {update.contractor_note && (
                      <div className="rounded-xl px-4 py-3" style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A' }}>
                        <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#92400E' }}>Contractor Note</p>
                        <p className="text-sm" style={{ color: '#78350F' }}>{update.contractor_note}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Progress bar */}
                <div className="rounded-2xl p-6" style={{ backgroundColor: '#fff', border: '1.5px solid #E8E6E1', boxShadow: '0 2px 12px rgba(0,33,71,0.06)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-sm" style={{ color: '#002147' }}>Overall Progress</h3>
                    <span className="text-lg font-bold" style={{ color: '#D4AF37' }}>{update.progress_percent}%</span>
                  </div>
                  <div className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: '#F3F2EE' }}>
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${update.progress_percent}%`, backgroundColor: '#D4AF37' }} />
                  </div>
                  {pendingOrders > 0 && (
                    <button
                      onClick={() => dispatch({ type: 'SET_PAGE', page: 'approvals' })}
                      className="mt-4 w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150"
                      style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B' }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#FEE2E2'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#FEF2F2'; }}
                    >
                      <span>{pendingOrders} change order{pendingOrders !== 1 ? 's' : ''} pending your approval</span>
                      <span>Review →</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Photo gallery placeholder */}
          <div className="mt-8 rounded-2xl p-6" style={{ backgroundColor: '#fff', border: '1.5px solid #E8E6E1', boxShadow: '0 2px 12px rgba(0,33,71,0.06)' }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-base" style={{ color: '#002147' }}>Progress Gallery</h3>
              <button onClick={() => dispatch({ type: 'SET_PAGE', page: 'photo-log' })}
                className="text-xs font-semibold" style={{ color: '#D4AF37' }}>
                View all →
              </button>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {GALLERY_GRADIENTS.map((gradient, i) => (
                <div key={i} className="relative rounded-xl overflow-hidden cursor-pointer group" style={{ aspectRatio: '1', background: gradient }}>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-center mt-3" style={{ color: '#9CA3AF' }}>Photo log coming soon · Go to Photo Log for full feed</p>
          </div>

          {/* Design Selections — show approved/pending/declined specs with client actions */}
          <DesignSelectionsSection projectId={project.id} isAdmin={isAdmin} />
        </>
      )}
    </div>
  );
}
