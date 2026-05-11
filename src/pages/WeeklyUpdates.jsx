import { useState } from 'react';

const TODAY = new Date().toLocaleDateString('en-US', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
});
const TODAY_SHORT = new Date().toLocaleDateString('en-US', {
  month: 'short', day: 'numeric', year: 'numeric',
});

const STATUS_CFG = {
  'on-track': { label: 'On Track',  dot: '#10B981', bg: '#ECFDF5', text: '#065F46', border: '#6EE7B7' },
  'attention': { label: 'Attention', dot: '#F59E0B', bg: '#FFFBEB', text: '#92400E', border: '#FCD34D' },
  'delayed':   { label: 'Delayed',   dot: '#EF4444', bg: '#FEF2F2', text: '#991B1B', border: '#FECACA' },
};

const INITIAL_UPDATES = [
  {
    id: 'bathrooms',
    label: 'Bathrooms',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 6 Q9 3 12 3 Q15 3 15 6" /><rect x="3" y="6" width="18" height="4" rx="1" />
        <path d="M5 10 L5 19 Q5 21 7 21 L17 21 Q19 21 19 19 L19 10" />
        <line x1="8" y1="15" x2="8" y2="18" /><line x1="12" y1="14" x2="12" y2="18" /><line x1="16" y1="15" x2="16" y2="18" />
      </svg>
    ),
    project: 'Johnson Residence — Master Bath',
    client: 'Sarah Johnson',
    currentPhase: 'Tile Installation',
    phases: ['Demo', 'Rough-in', 'Waterproofing', 'Tile', 'Fixtures', 'Final'],
    activePhaseIndex: 3,
    progressPercent: 60,
    status: 'on-track',
    thisWeek: [
      'Completed full demo of shower surround and vanity area',
      'Passed city rough-in inspection (plumbing & electrical)',
      'Installed cement backer board on all wet surfaces',
      'Began herringbone tile layout — shower walls 40% complete',
    ],
    nextWeekGoal: 'Finish shower wall tile, begin floor tile, and target grouting by Friday Feb 21.',
    contractorNote: 'Client approved herringbone pattern upgrade (change order signed Feb 3).',
  },
  {
    id: 'kitchens',
    label: 'Kitchens',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3 L3 11 Q3 13 5 13 L5 21" /><path d="M5 7 L3 7" /><path d="M21 3 L21 21" />
        <path d="M14 3 Q14 8 17.5 8 Q21 8 21 3" />
      </svg>
    ),
    project: 'Rodriguez Residence — Full Kitchen',
    client: 'Maria Rodriguez',
    currentPhase: 'Cabinet Installation',
    phases: ['Demo', 'Rough-in', 'Drywall', 'Cabinets', 'Countertops', 'Appliances & Finish'],
    activePhaseIndex: 3,
    progressPercent: 65,
    status: 'on-track',
    thisWeek: [
      'Drywall hung, taped, and first coat of primer applied',
      'All base cabinets delivered and staged on site',
      'Upper cabinet installation 70% complete',
      'Island base frame constructed and leveled',
    ],
    nextWeekGoal: 'Complete upper cabinets, install island cabinetry, schedule countertop template measurement.',
    contractorNote: 'Quartz countertop lead time is 2 weeks from template date.',
  },
  {
    id: 'additions',
    label: 'Additions',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5 L12 3 L21 9.5 V20 Q21 21 20 21 H15 V15 H9 V21 H4 Q3 21 3 20 Z" />
        <line x1="12" y1="12" x2="12" y2="16" /><line x1="10" y1="14" x2="14" y2="14" />
      </svg>
    ),
    project: 'Lee Residence — Master Suite Addition',
    client: 'David Lee',
    currentPhase: 'Framing',
    phases: ['Permits', 'Foundation', 'Framing', 'Roofing', 'MEP Rough-in', 'Insulation', 'Finish Work'],
    activePhaseIndex: 2,
    progressPercent: 35,
    status: 'attention',
    thisWeek: [
      'Foundation footings poured and cured — passed inspection',
      'Framing crew mobilized, exterior walls 60% framed',
      'LVL beam delivered for main header opening',
    ],
    nextWeekGoal: 'Complete exterior wall framing and begin roof truss installation. Roofing crew scheduled Thursday.',
    contractorNote: '3-day delay due to rain — overall schedule adjusted accordingly.',
  },
  {
    id: 'portico',
    label: 'Portico',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="3" y1="21" x2="21" y2="21" /><line x1="3" y1="10" x2="21" y2="10" />
        <polyline points="5 10 5 3 19 3 19 10" />
        <line x1="7" y1="21" x2="7" y2="10" /><line x1="11" y1="21" x2="11" y2="10" />
        <line x1="15" y1="21" x2="15" y2="10" /><line x1="19" y1="21" x2="19" y2="10" />
      </svg>
    ),
    project: 'Nguyen Residence — Front Entry Portico',
    client: 'Linh Nguyen',
    currentPhase: 'Column Installation',
    phases: ['Demo & Prep', 'Concrete Base', 'Columns', 'Roof Structure', 'Roofing', 'Lighting & Finish'],
    activePhaseIndex: 2,
    progressPercent: 45,
    status: 'on-track',
    thisWeek: [
      'Concrete base poured and cured for all 4 column footings',
      'Column bases anchored, plumbed, and braced',
      '2 of 4 Tuscan columns fully installed',
    ],
    nextWeekGoal: 'Install remaining 2 columns and begin roof ledger board and rafter framing.',
    contractorNote: 'Client selected Tuscan column style — all materials on site.',
  },
  {
    id: 'garage',
    label: 'Garage Conversion',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="1" /><path d="M2 7 L12 2 L22 7" />
        <line x1="7" y1="13" x2="17" y2="13" /><line x1="7" y1="17" x2="17" y2="17" />
      </svg>
    ),
    project: 'Patel Residence — ADU Studio',
    client: 'Raj Patel',
    currentPhase: 'Drywall',
    phases: ['Permits', 'Framing', 'MEP Rough-in', 'Insulation & Drywall', 'Flooring', 'Kitchen & Bath', 'Final'],
    activePhaseIndex: 3,
    progressPercent: 52,
    status: 'on-track',
    thisWeek: [
      'All rough-in inspections passed (electrical, plumbing, mechanical)',
      'R-19 insulation installed in exterior walls and ceiling',
      'Drywall hanging complete — taping and first mud coat applied',
    ],
    nextWeekGoal: 'Complete drywall finishing (second coat + sand), begin LVP flooring installation.',
    contractorNote: 'Client selected Pergo "Coastal Oak" LVP flooring — arriving Monday.',
  },
];

// ── Phase Stepper ──────────────────────────────────────────────────────────
function PhaseStepper({ phases, activePhaseIndex }) {
  return (
    <div className="flex items-center w-full">
      {phases.map((phase, i) => {
        const done    = i < activePhaseIndex;
        const current = i === activePhaseIndex;
        const upcoming = i > activePhaseIndex;
        return (
          <div key={phase} className="flex items-center flex-1 min-w-0">
            {/* Circle */}
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
              {/* Phase label — only show on md+ and for key phases */}
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
            {/* Connector line */}
            {i < phases.length - 1 && (
              <div
                className="flex-1 h-0.5 mx-0.5"
                style={{ backgroundColor: i < activePhaseIndex ? '#D4AF37' : '#E5E7EB' }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Progress Bar ───────────────────────────────────────────────────────────
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
          style={{
            width: `${percent}%`,
            background: `linear-gradient(90deg, ${color}CC 0%, ${color} 100%)`,
          }}
        />
      </div>
    </div>
  );
}

// ── Single update card ─────────────────────────────────────────────────────
function UpdateCard({ update, onEdit }) {
  const cfg = STATUS_CFG[update.status];
  const [expanded, setExpanded] = useState(true);

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        backgroundColor: '#fff',
        border: '1.5px solid #E8E6E1',
        boxShadow: '0 2px 12px rgba(0,33,71,0.07)',
      }}
    >
      {/* Gold top accent */}
      <div style={{ height: '3px', backgroundColor: update.status === 'on-track' ? '#D4AF37' : update.status === 'attention' ? '#F59E0B' : '#EF4444' }} />

      {/* Card header */}
      <div className="flex items-start justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: 'rgba(0,33,71,0.06)', color: '#002147' }}
          >
            {update.icon}
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

      {/* Collapsible body */}
      <div
        className="overflow-hidden transition-all duration-300"
        style={{ maxHeight: expanded ? '900px' : '0px' }}
      >
        <div className="px-6 pb-6 space-y-5">

          {/* Phase stepper */}
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

          {/* Progress bar */}
          <ProgressBar percent={update.progressPercent} status={update.status} />

          <div className="grid sm:grid-cols-2 gap-5">
            {/* This week */}
            <div
              className="rounded-xl p-4"
              style={{ backgroundColor: '#F9F8F6', border: '1px solid #F0EEE9' }}
            >
              <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: '#002147' }}>
                This Week's Progress
              </p>
              <ul className="space-y-2">
                {update.thisWeek.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span
                      className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                      style={{ backgroundColor: '#D4AF37' }}
                    />
                    <span className="text-sm leading-snug" style={{ color: '#4A4A4A' }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Next week + note */}
            <div className="space-y-3">
              <div
                className="rounded-xl p-4"
                style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE' }}
              >
                <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: '#1E40AF' }}>
                  Next Week's Goal
                </p>
                <p className="text-sm leading-snug" style={{ color: '#1E3A8A' }}>{update.nextWeekGoal}</p>
              </div>
              {update.contractorNote && (
                <div
                  className="rounded-xl p-4"
                  style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A' }}
                >
                  <p className="text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: '#92400E' }}>
                    Contractor Note
                  </p>
                  <p className="text-xs leading-snug" style={{ color: '#78350F' }}>{update.contractorNote}</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div
            className="flex items-center justify-between pt-3"
            style={{ borderTop: '1px solid #F0EEE9' }}
          >
            <p className="text-xs" style={{ color: '#9CA3AF' }}>
              Last updated: <span className="font-semibold" style={{ color: '#6B7280' }}>{TODAY_SHORT}</span>
            </p>
            <button
              onClick={() => onEdit(update.id)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-150 focus:outline-none"
              style={{ backgroundColor: '#F0EEE9', color: '#002147' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#D4AF37'; e.currentTarget.style.color = '#002147'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#F0EEE9'; e.currentTarget.style.color = '#002147'; }}
            >
              Edit Update
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Edit Modal ─────────────────────────────────────────────────────────────
function EditModal({ update, onSave, onClose }) {
  const [thisWeek, setThisWeek] = useState(update.thisWeek.join('\n'));
  const [nextWeek, setNextWeek] = useState(update.nextWeekGoal);
  const [note, setNote]         = useState(update.contractorNote || '');
  const [status, setStatus]     = useState(update.status);
  const [progress, setProgress] = useState(update.progressPercent);
  const [phase, setPhase]       = useState(update.activePhaseIndex);

  function save() {
    onSave({
      ...update,
      status,
      progressPercent: Number(progress),
      activePhaseIndex: Number(phase),
      currentPhase: update.phases[Number(phase)],
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
        {/* Modal header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: '#E8E6E1' }}
        >
          <div>
            <h3 className="font-bold text-base" style={{ color: '#002147' }}>Edit Weekly Update</h3>
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
          {/* Status + progress */}
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

          {/* Phase selector */}
          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: '#6B7280' }}>Current Phase</label>
            <select
              value={phase}
              onChange={(e) => setPhase(e.target.value)}
              className="w-full text-sm rounded-xl px-3 py-2 focus:outline-none"
              style={{ border: '1.5px solid #E8E6E1', color: '#002147', backgroundColor: '#F9F8F6' }}
            >
              {update.phases.map((p, i) => (
                <option key={p} value={i}>{p}</option>
              ))}
            </select>
          </div>

          {/* This week */}
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

          {/* Next week */}
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

          {/* Note */}
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

          {/* Buttons */}
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
              className="flex-1 py-2.5 rounded-xl text-sm font-bold focus:outline-none transition-colors duration-150"
              style={{ backgroundColor: '#002147', color: '#D4AF37' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#003166'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#002147'; }}
            >
              Save Update
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function WeeklyUpdates() {
  const [updates, setUpdates] = useState(INITIAL_UPDATES);
  const [editing, setEditing] = useState(null); // id of update being edited

  const onTrack  = updates.filter((u) => u.status === 'on-track').length;
  const attention = updates.filter((u) => u.status === 'attention').length;
  const delayed   = updates.filter((u) => u.status === 'delayed').length;

  function handleSave(updated) {
    setUpdates((prev) => prev.map((u) => u.id === updated.id ? updated : u));
    setEditing(null);
  }

  const editingUpdate = updates.find((u) => u.id === editing);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-bold tracking-[0.18em] uppercase mb-1" style={{ color: '#D4AF37' }}>
          Contractor Tool
        </p>
        <h2 className="text-2xl font-bold" style={{ color: '#002147' }}>Weekly Project Updates</h2>
        <p className="text-sm mt-1" style={{ color: '#6B7280' }}>{TODAY}</p>
      </div>

      {/* Summary stats */}
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

      {/* Project update cards */}
      <div className="space-y-5">
        {updates.map((update) => (
          <UpdateCard key={update.id} update={update} onEdit={setEditing} />
        ))}
      </div>

      {/* Edit modal */}
      {editingUpdate && (
        <EditModal
          update={editingUpdate}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
