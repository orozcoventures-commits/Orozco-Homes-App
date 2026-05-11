import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAvatarColour } from '../lib/utils';
import { supabase } from '../lib/supabase';

const TODAY = new Date().toLocaleDateString('en-US', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
});

const STATUS_CFG = {
  'on-track': { label: 'On Track',  dot: '#10B981', bg: '#ECFDF5', text: '#065F46', border: '#6EE7B7' },
  'attention': { label: 'Attention', dot: '#F59E0B', bg: '#FFFBEB', text: '#92400E', border: '#FCD34D' },
  'delayed':   { label: 'Delayed',   dot: '#EF4444', bg: '#FEF2F2', text: '#991B1B', border: '#FECACA' },
};

const DEFAULT_PHASES = {
  bathroom:          ['Demo', 'Rough-in', 'Waterproofing', 'Tile', 'Fixtures', 'Final'],
  kitchen:           ['Demo', 'Rough-in', 'Drywall', 'Cabinets', 'Countertops', 'Appliances & Finish'],
  addition:          ['Permits', 'Foundation', 'Framing', 'Roofing', 'MEP Rough-in', 'Insulation', 'Finish Work'],
  portico:           ['Demo & Prep', 'Concrete Base', 'Columns', 'Roof Structure', 'Roofing', 'Lighting & Finish'],
  'garage-conversion': ['Permits', 'Framing', 'MEP Rough-in', 'Insulation & Drywall', 'Flooring', 'Kitchen & Bath', 'Final'],
  'full-renovation': ['Demo', 'Rough-in', 'Framing', 'MEP', 'Drywall', 'Finishes', 'Final'],
};

function CategoryIcon({ category }) {
  const props = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };
  if (category === 'kitchen') return (
    <svg {...props}>
      <path d="M3 3 L3 11 Q3 13 5 13 L5 21" /><path d="M5 7 L3 7" /><path d="M21 3 L21 21" />
      <path d="M14 3 Q14 8 17.5 8 Q21 8 21 3" />
    </svg>
  );
  if (category === 'addition') return (
    <svg {...props}>
      <path d="M3 9.5 L12 3 L21 9.5 V20 Q21 21 20 21 H15 V15 H9 V21 H4 Q3 21 3 20 Z" />
      <line x1="12" y1="12" x2="12" y2="16" /><line x1="10" y1="14" x2="14" y2="14" />
    </svg>
  );
  if (category === 'portico') return (
    <svg {...props}>
      <line x1="3" y1="21" x2="21" y2="21" /><line x1="3" y1="10" x2="21" y2="10" />
      <polyline points="5 10 5 3 19 3 19 10" />
      <line x1="7" y1="21" x2="7" y2="10" /><line x1="11" y1="21" x2="11" y2="10" />
      <line x1="15" y1="21" x2="15" y2="10" /><line x1="19" y1="21" x2="19" y2="10" />
    </svg>
  );
  if (category === 'garage-conversion') return (
    <svg {...props}>
      <rect x="2" y="7" width="20" height="14" rx="1" /><path d="M2 7 L12 2 L22 7" />
      <line x1="7" y1="13" x2="17" y2="13" /><line x1="7" y1="17" x2="17" y2="17" />
    </svg>
  );
  // default: bathroom
  return (
    <svg {...props}>
      <path d="M9 6 Q9 3 12 3 Q15 3 15 6" /><rect x="3" y="6" width="18" height="4" rx="1" />
      <path d="M5 10 L5 19 Q5 21 7 21 L17 21 Q19 21 19 19 L19 10" />
      <line x1="8" y1="15" x2="8" y2="18" /><line x1="12" y1="14" x2="12" y2="18" /><line x1="16" y1="15" x2="16" y2="18" />
    </svg>
  );
}

function PhaseStepper({ phases, activePhaseIndex }) {
  if (!phases || phases.length === 0) return null;
  return (
    <div className="flex items-center w-full">
      {phases.map((phase, i) => {
        const done    = i < activePhaseIndex;
        const current = i === activePhaseIndex;
        return (
          <div key={i} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center shrink-0" style={{ position: 'relative' }}>
              <div
                title={phase}
                className="flex items-center justify-center rounded-full transition-all duration-200"
                style={{
                  width: current ? '20px' : '14px',
                  height: current ? '20px' : '14px',
                  backgroundColor: done ? '#D4AF37' : current ? '#002147' : 'transparent',
                  border: done ? '2px solid #D4AF37' : current ? '2.5px solid #D4AF37' : '2px solid #D1D5DB',
                  boxShadow: current ? '0 0 0 3px rgba(212,175,55,0.2)' : 'none',
                  zIndex: 1,
                }}
              >
                {done && (
                  <svg width="7" height="7" viewBox="0 0 10 10" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="1.5 5 4 7.5 8.5 2.5" />
                  </svg>
                )}
                {current && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#D4AF37' }} />}
              </div>
              <p
                className="hidden lg:block text-center mt-1.5 leading-tight"
                style={{
                  fontSize: '0.58rem',
                  color: done ? '#D4AF37' : current ? '#002147' : '#9CA3AF',
                  fontWeight: current ? '700' : done ? '600' : '400',
                  width: '52px',
                  wordBreak: 'break-word',
                }}
              >
                {phase}
              </p>
            </div>
            {i < phases.length - 1 && (
              <div className="flex-1 h-0.5 mx-0.5" style={{ backgroundColor: i < activePhaseIndex ? '#D4AF37' : '#E5E7EB' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ProgressBar({ percent, status }) {
  const color = status === 'on-track' ? '#D4AF37' : status === 'attention' ? '#F59E0B' : '#EF4444';
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs font-semibold" style={{ color: '#6B7280' }}>Overall Progress</span>
        <span className="text-xs font-bold" style={{ color }}>{percent}%</span>
      </div>
      <div className="w-full rounded-full overflow-hidden" style={{ height: '7px', backgroundColor: '#F0EEE9' }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${percent}%`, background: `linear-gradient(90deg, ${color}CC 0%, ${color} 100%)` }}
        />
      </div>
    </div>
  );
}

function UpdateCard({ update, onEdit }) {
  const cfg = STATUS_CFG[update.status];
  const [expanded, setExpanded] = useState(true);
  const updatedLabel = update.updatedAt
    ? new Date(update.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ backgroundColor: '#fff', border: '1.5px solid #E8E6E1', boxShadow: '0 2px 12px rgba(0,33,71,0.07)' }}
    >
      <div style={{ height: '3px', backgroundColor: update.status === 'on-track' ? '#D4AF37' : update.status === 'attention' ? '#F59E0B' : '#EF4444' }} />

      <div className="flex items-start justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: 'rgba(0,33,71,0.06)', color: '#002147' }}
          >
            <CategoryIcon category={update.category} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-base" style={{ color: '#002147' }}>{update.label}</h3>
              <span
                className="text-xs px-2.5 py-0.5 rounded-full font-semibold"
                style={{ backgroundColor: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}` }}
              >
                {cfg.label}
              </span>
            </div>
            <p className="text-xs mt-0.5 truncate" style={{ color: '#6B7280' }}>
              {update.project} · {update.client}
            </p>
          </div>
        </div>
        <button
          onClick={() => setExpanded((e) => !e)}
          className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center focus:outline-none transition-colors duration-150"
          style={{ backgroundColor: '#F9F8F6', color: '#9CA3AF' }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F0EEE9'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#F9F8F6'; }}
        >
          <svg
            width="12" height="12" viewBox="0 0 10 10" fill="none"
            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
            style={{ transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
          >
            <polyline points="1 3 5 7 9 3" />
          </svg>
        </button>
      </div>

      <div className="overflow-hidden transition-all duration-300" style={{ maxHeight: expanded ? '900px' : '0px' }}>
        <div className="px-6 pb-6 space-y-5">

          {update.phases && update.phases.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#9CA3AF' }}>Phase Tracker</p>
                <p className="text-xs font-semibold" style={{ color: '#002147' }}>
                  {update.currentPhase}
                  <span style={{ color: '#9CA3AF' }}> ({update.activePhaseIndex + 1} of {update.phases.length})</span>
                </p>
              </div>
              <PhaseStepper phases={update.phases} activePhaseIndex={update.activePhaseIndex} />
            </div>
          )}

          <ProgressBar percent={update.progressPercent} status={update.status} />

          {(update.thisWeek?.length > 0 || update.nextWeekGoal) && (
            <div className="grid sm:grid-cols-2 gap-5">
              {update.thisWeek?.length > 0 && (
                <div className="rounded-xl p-4" style={{ backgroundColor: '#F9F8F6', border: '1px solid #F0EEE9' }}>
                  <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: '#002147' }}>This Week's Progress</p>
                  <ul className="space-y-2">
                    {update.thisWeek.map((item, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: '#D4AF37' }} />
                        <span className="text-sm leading-snug" style={{ color: '#4A4A4A' }}>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="space-y-3">
                {update.nextWeekGoal && (
                  <div className="rounded-xl p-4" style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                    <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: '#1E40AF' }}>Next Week's Goal</p>
                    <p className="text-sm leading-snug" style={{ color: '#1E3A8A' }}>{update.nextWeekGoal}</p>
                  </div>
                )}
                {update.contractorNote && (
                  <div className="rounded-xl p-4" style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A' }}>
                    <p className="text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: '#92400E' }}>Contractor Note</p>
                    <p className="text-xs leading-snug" style={{ color: '#78350F' }}>{update.contractorNote}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid #F0EEE9' }}>
            <p className="text-xs" style={{ color: '#9CA3AF' }}>
              Last updated: <span className="font-semibold" style={{ color: '#6B7280' }}>{updatedLabel}</span>
            </p>
            {onEdit && (
              <button
                onClick={() => onEdit(update)}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-150 focus:outline-none"
                style={{ backgroundColor: '#F0EEE9', color: '#002147' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#D4AF37'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#F0EEE9'; }}
              >
                Edit Update
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EditModal({ update, onSave, onClose, saving }) {
  const [thisWeek, setThisWeek] = useState((update.thisWeek || []).join('\n'));
  const [nextWeek, setNextWeek] = useState(update.nextWeekGoal || '');
  const [note, setNote]         = useState(update.contractorNote || '');
  const [status, setStatus]     = useState(update.status || 'on-track');
  const [progress, setProgress] = useState(update.progressPercent ?? 0);
  const [phasesText, setPhasesText] = useState((update.phases || []).join('\n'));
  const [phaseIndex, setPhaseIndex] = useState(update.activePhaseIndex ?? 0);

  const phasesList = phasesText.split('\n').map((s) => s.trim()).filter(Boolean);
  const safeIndex  = Math.min(Number(phaseIndex), Math.max(0, phasesList.length - 1));

  function save() {
    onSave({
      projectId: update.projectId,
      updateId: update.id,
      status,
      progressPercent: Number(progress),
      phases: phasesList,
      activePhaseIndex: safeIndex,
      currentPhase: phasesList[safeIndex] || '',
      thisWeek: thisWeek.split('\n').map((s) => s.trim()).filter(Boolean),
      nextWeekGoal: nextWeek,
      contractorNote: note,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden"
        style={{ backgroundColor: '#fff', boxShadow: '0 24px 64px rgba(0,33,71,0.22)', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#E8E6E1' }}>
          <div>
            <h3 className="font-bold text-base" style={{ color: '#002147' }}>
              {update.id ? 'Edit Weekly Update' : 'Post Weekly Update'}
            </h3>
            <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>{update.label} · {update.project}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center focus:outline-none"
            style={{ backgroundColor: '#F0EEE9', color: '#6B7280' }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="1" y1="1" x2="11" y2="11" /><line x1="11" y1="1" x2="1" y2="11" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: '#6B7280' }}>Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full text-sm rounded-xl px-3 py-2 focus:outline-none"
                style={{ border: '1.5px solid #E8E6E1', color: '#002147', backgroundColor: '#F9F8F6' }}
              >
                <option value="on-track">On Track</option>
                <option value="attention">Attention</option>
                <option value="delayed">Delayed</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: '#6B7280' }}>
                Progress ({progress}%)
              </label>
              <input
                type="range" min="0" max="100" value={progress}
                onChange={(e) => setProgress(e.target.value)}
                className="w-full mt-1"
                style={{ accentColor: '#D4AF37' }}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: '#6B7280' }}>
              Phases <span className="font-normal">(one per line)</span>
            </label>
            <textarea
              value={phasesText}
              onChange={(e) => { setPhasesText(e.target.value); setPhaseIndex(0); }}
              rows={4}
              placeholder={'Demo\nRough-in\nTile\nFixtures\nFinal'}
              className="w-full text-sm rounded-xl px-3 py-2 resize-none focus:outline-none"
              style={{ border: '1.5px solid #E8E6E1', color: '#002147', backgroundColor: '#F9F8F6' }}
            />
          </div>

          {phasesList.length > 0 && (
            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: '#6B7280' }}>Current Phase</label>
              <select
                value={safeIndex}
                onChange={(e) => setPhaseIndex(e.target.value)}
                className="w-full text-sm rounded-xl px-3 py-2 focus:outline-none"
                style={{ border: '1.5px solid #E8E6E1', color: '#002147', backgroundColor: '#F9F8F6' }}
              >
                {phasesList.map((p, i) => (
                  <option key={i} value={i}>{p}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: '#6B7280' }}>
              This Week's Progress <span className="font-normal">(one item per line)</span>
            </label>
            <textarea
              value={thisWeek}
              onChange={(e) => setThisWeek(e.target.value)}
              rows={5}
              className="w-full text-sm rounded-xl px-3 py-2 resize-none focus:outline-none"
              style={{ border: '1.5px solid #E8E6E1', color: '#002147', backgroundColor: '#F9F8F6' }}
            />
          </div>

          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: '#6B7280' }}>Next Week's Goal</label>
            <textarea
              value={nextWeek}
              onChange={(e) => setNextWeek(e.target.value)}
              rows={2}
              className="w-full text-sm rounded-xl px-3 py-2 resize-none focus:outline-none"
              style={{ border: '1.5px solid #E8E6E1', color: '#002147', backgroundColor: '#F9F8F6' }}
            />
          </div>

          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: '#6B7280' }}>Contractor Note</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full text-sm rounded-xl px-3 py-2 resize-none focus:outline-none"
              style={{ border: '1.5px solid #E8E6E1', color: '#002147', backgroundColor: '#F9F8F6' }}
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold focus:outline-none"
              style={{ backgroundColor: '#F0EEE9', color: '#6B7280' }}
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold focus:outline-none transition-colors duration-150"
              style={{ backgroundColor: saving ? '#9CA3AF' : '#002147', color: '#D4AF37' }}
              onMouseEnter={(e) => { if (!saving) e.currentTarget.style.backgroundColor = '#003166'; }}
              onMouseLeave={(e) => { if (!saving) e.currentTarget.style.backgroundColor = '#002147'; }}
            >
              {saving ? 'Saving…' : 'Save Update'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WeeklyUpdates() {
  const { user, profile, isAdmin, loading } = useAuth();
  const [rows, setRows]       = useState([]); // { project, update|null }[]
  const [fetching, setFetching] = useState(true);
  const [editing, setEditing] = useState(null); // normalized update object
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    if (loading || !user) return;
    fetchData();
  }, [user, loading]);

  async function fetchData() {
    setFetching(true);
    const { data, error } = await supabase
      .from('projects')
      .select(`
        id, project_name, label, category,
        managed_client:clients(full_name),
        client_profile:profiles(full_name),
        weekly_updates(id, current_phase, phases, active_phase_index, progress_percent, status, this_week, next_week_goal, contractor_note, updated_at)
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      const enriched = data.map((p) => {
        const sorted = (p.weekly_updates || []).sort(
          (a, b) => new Date(b.updated_at) - new Date(a.updated_at)
        );
        return { project: p, update: sorted[0] || null };
      });
      setRows(enriched);
    }
    setFetching(false);
  }

  function toDisplay({ project, update }) {
    const clientName = project.managed_client?.full_name ?? project.client_profile?.full_name ?? 'Client';
    const color = getAvatarColour(project.id);
    const defaultPhases = DEFAULT_PHASES[project.category] || [];
    return {
      id: update?.id ?? null,
      projectId: project.id,
      clientColor: color,
      label: project.label || project.category || 'Project',
      category: project.category || '',
      project: project.project_name,
      client: clientName,
      currentPhase: update?.current_phase ?? '',
      phases: update?.phases?.length ? update.phases : defaultPhases,
      activePhaseIndex: update?.active_phase_index ?? 0,
      progressPercent: update?.progress_percent ?? 0,
      status: update?.status ?? 'on-track',
      thisWeek: update?.this_week ?? [],
      nextWeekGoal: update?.next_week_goal ?? '',
      contractorNote: update?.contractor_note ?? '',
      updatedAt: update?.updated_at ?? null,
      hasUpdate: !!update,
    };
  }

  async function handleSave(formData) {
    setSaving(true);
    const payload = {
      project_id:         formData.projectId,
      current_phase:      formData.currentPhase,
      phases:             formData.phases,
      active_phase_index: formData.activePhaseIndex,
      progress_percent:   formData.progressPercent,
      status:             formData.status,
      this_week:          formData.thisWeek,
      next_week_goal:     formData.nextWeekGoal,
      contractor_note:    formData.contractorNote,
    };

    if (formData.updateId) {
      await supabase.from('weekly_updates').update(payload).eq('id', formData.updateId);
    } else {
      await supabase.from('weekly_updates').insert(payload);
    }

    setSaving(false);
    setEditing(null);
    fetchData();
  }

  if (loading || !user) return null;

  const displayUpdates = rows.map(toDisplay);
  // Clients: only show projects that have an actual update (RLS already filters to their projects)
  const visibleUpdates = isAdmin ? displayUpdates : displayUpdates.filter((u) => u.hasUpdate);

  const onTrack   = visibleUpdates.filter((u) => u.status === 'on-track').length;
  const attention = visibleUpdates.filter((u) => u.status === 'attention').length;
  const delayed   = visibleUpdates.filter((u) => u.status === 'delayed').length;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-bold tracking-[0.18em] uppercase mb-1" style={{ color: '#D4AF37' }}>
          {isAdmin ? 'Contractor Tool' : 'Client Portal'}
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-2xl font-bold" style={{ color: '#002147' }}>
            {isAdmin ? 'Weekly Project Updates' : 'Your Project Update'}
          </h2>
          <span
            className="text-xs px-2.5 py-1 rounded-full font-bold"
            style={
              isAdmin
                ? { backgroundColor: '#002147', color: '#D4AF37' }
                : { backgroundColor: getAvatarColour(user?.id) + '22', color: getAvatarColour(user?.id), border: `1px solid ${getAvatarColour(user?.id)}40` }
            }
          >
            {isAdmin ? '🔑 Admin View — All Projects' : `👤 ${profile?.full_name || user?.email}`}
          </span>
        </div>
        <p className="text-sm mt-1" style={{ color: '#6B7280' }}>{TODAY}</p>

        {!isAdmin && (
          <div
            className="flex items-center gap-2 mt-3 px-4 py-2.5 rounded-xl text-xs font-medium"
            style={{ backgroundColor: '#ECFDF5', border: '1px solid #6EE7B7', color: '#065F46' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            You are viewing your private project update. Other clients' projects are not accessible from this account.
          </div>
        )}
      </div>

      {fetching ? (
        <div className="flex items-center gap-3 py-20 justify-center">
          <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" strokeOpacity="0.2" /><path d="M12 2a10 10 0 0 1 10 10" />
          </svg>
          <span className="text-sm" style={{ color: '#9CA3AF' }}>Loading updates…</span>
        </div>
      ) : (
        <>
          {/* Stats — admin only */}
          {isAdmin && (
            <div className="grid grid-cols-3 gap-4 mb-8">
              {[
                { label: 'On Track',  value: onTrack,   color: '#059669', bg: '#ECFDF5', border: '#6EE7B7' },
                { label: 'Attention', value: attention,  color: '#D97706', bg: '#FFFBEB', border: '#FCD34D' },
                { label: 'Delayed',   value: delayed,    color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-2xl p-4 text-center"
                  style={{ backgroundColor: s.bg, border: `1.5px solid ${s.border}` }}
                >
                  <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-xs font-semibold mt-1" style={{ color: '#6B7280' }}>{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Admin master dashboard grid */}
          {isAdmin && (
            <div className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-base" style={{ color: '#002147' }}>
                  Master Dashboard
                  <span className="ml-2 text-xs font-normal" style={{ color: '#9CA3AF' }}>— all active clients</span>
                </h3>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: '#002147', color: '#D4AF37' }}>
                  {displayUpdates.length} Projects
                </span>
              </div>

              {displayUpdates.length === 0 ? (
                <div className="rounded-2xl p-8 text-center" style={{ backgroundColor: '#fff', border: '1.5px dashed #E8E6E1' }}>
                  <p className="text-sm font-semibold mb-1" style={{ color: '#374151' }}>No projects yet</p>
                  <p className="text-xs" style={{ color: '#9CA3AF' }}>Go to the Project Dashboard to create your first client project.</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {displayUpdates.map((u) => {
                    const cfg = STATUS_CFG[u.status];
                    return (
                      <div
                        key={u.projectId}
                        className="rounded-2xl p-4 flex flex-col gap-3"
                        style={{ backgroundColor: '#fff', border: `1.5px solid ${u.clientColor}30`, boxShadow: '0 2px 10px rgba(0,33,71,0.06)' }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shrink-0"
                            style={{ backgroundColor: u.clientColor, fontSize: '0.75rem' }}
                          >
                            {u.client.split(' ').map((w) => w[0]).join('')}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-sm truncate" style={{ color: '#002147' }}>{u.client}</p>
                            <p className="text-xs truncate" style={{ color: '#9CA3AF' }}>
                              {u.label} {u.currentPhase ? `· ${u.currentPhase}` : '· No update yet'}
                            </p>
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-xs mb-1" style={{ color: '#9CA3AF' }}>
                            <span>{u.hasUpdate ? u.currentPhase || '—' : 'Not started'}</span>
                            <span className="font-semibold" style={{ color: u.clientColor }}>{u.progressPercent}%</span>
                          </div>
                          <div className="w-full rounded-full" style={{ height: '5px', backgroundColor: '#F0EEE9' }}>
                            <div className="h-full rounded-full" style={{ width: `${u.progressPercent}%`, backgroundColor: u.clientColor }} />
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          {u.hasUpdate ? (
                            <span
                              className="text-xs px-2 py-0.5 rounded-full font-semibold"
                              style={{ backgroundColor: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}` }}
                            >
                              {cfg.label}
                            </span>
                          ) : (
                            <span className="text-xs" style={{ color: '#9CA3AF' }}>No update posted</span>
                          )}
                          <button
                            onClick={() => setEditing(u)}
                            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all duration-150 focus:outline-none"
                            style={{ backgroundColor: '#002147', color: '#D4AF37' }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = u.clientColor; e.currentTarget.style.color = '#fff'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#002147'; e.currentTarget.style.color = '#D4AF37'; }}
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            {u.hasUpdate ? 'Edit' : 'Post Update'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex items-center gap-4 mt-10 mb-6">
                <div className="flex-1 h-px" style={{ backgroundColor: '#E8E6E1' }} />
                <p className="text-xs font-bold tracking-[0.14em] uppercase" style={{ color: '#9CA3AF' }}>Detailed Project Updates</p>
                <div className="flex-1 h-px" style={{ backgroundColor: '#E8E6E1' }} />
              </div>
            </div>
          )}

          {/* Update cards */}
          <div className="space-y-5">
            {visibleUpdates.filter((u) => u.hasUpdate).length === 0 ? (
              <div className="text-center py-16">
                <p className="text-sm font-semibold" style={{ color: '#9CA3AF' }}>
                  {isAdmin ? 'No updates posted yet. Use the dashboard above to post the first update.' : 'No update available for your project yet.'}
                </p>
              </div>
            ) : (
              visibleUpdates.filter((u) => u.hasUpdate).map((u) => (
                <div key={u.projectId}>
                  {isAdmin && (
                    <div className="flex items-center gap-2 mb-2 px-1">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: u.clientColor }} />
                      <p className="text-xs font-bold" style={{ color: u.clientColor }}>{u.client}</p>
                      <span className="text-xs" style={{ color: '#9CA3AF' }}>· {u.project}</span>
                    </div>
                  )}
                  <UpdateCard update={u} onEdit={isAdmin ? setEditing : null} />
                </div>
              ))
            )}
          </div>
        </>
      )}

      {editing && isAdmin && (
        <EditModal
          update={editing}
          onSave={handleSave}
          onClose={() => setEditing(null)}
          saving={saving}
        />
      )}
    </div>
  );
}
