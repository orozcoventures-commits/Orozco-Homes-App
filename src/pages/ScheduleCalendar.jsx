import { useState, useMemo, useCallback, useRef } from 'react';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, subMonths, addWeeks, subWeeks,
  isSameDay, isSameMonth, isToday, parseISO, differenceInDays,
  startOfDay, endOfDay, isWithinInterval, min, max,
} from 'date-fns';
import {
  ChevronLeft, ChevronRight, Plus, Calendar, List, AlertTriangle,
  Trash2, X, Clock, User, Wrench, Link, CheckCircle2, Loader2,
} from 'lucide-react';
import { useSchedule } from '../hooks/useSchedule';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS = {
  pending:     { label: 'Pending',     bg: '#002147', text: '#fff',    dot: '#4B6A9B' },
  in_progress: { label: 'In Progress', bg: '#D4AF37', text: '#002147', dot: '#D4AF37' },
  completed:   { label: 'Completed',   bg: '#10B981', text: '#fff',    dot: '#10B981' },
  delayed:     { label: 'Delayed',     bg: '#EF4444', text: '#fff',    dot: '#EF4444' },
};

const TASK_TEMPLATES = [
  'Site Preparation', 'Foundation / Footings', 'Framing', 'Roofing',
  'Rough Plumbing', 'Rough Electrical', 'HVAC Rough-In', 'Insulation',
  'Drywall', 'Painting', 'Flooring', 'Tile Work', 'Cabinetry',
  'Finish Carpentry', 'Fixture Installation', 'Final Plumbing',
  'Final Electrical', 'Final HVAC', 'Landscaping', 'Final Inspection',
];

const BLANK_FORM = {
  task_name: '', project_id: '', assigned_to: '',
  resources_allocated: [], start_datetime: '', end_datetime: '',
  status: 'pending', dependencies: [], notes: '',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toLocal(iso) { return iso ? iso.slice(0, 16) : ''; }
function toISO(local) { return local ? new Date(local).toISOString() : ''; }

function eventColor(status) { return STATUS[status] ?? STATUS.pending; }

function daysInView(currentDate, view) {
  if (view === 'day') return [currentDate];
  if (view === 'week') {
    const start = startOfWeek(currentDate, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }
  // month: 6 rows × 7 days
  const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 });
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

function eventsForDay(schedules, day) {
  return schedules.filter((s) => {
    const start = parseISO(s.start_datetime);
    const end   = parseISO(s.end_datetime);
    return isWithinInterval(day, { start: startOfDay(start), end: endOfDay(end) });
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusPill({ status }) {
  const cfg = STATUS[status] ?? STATUS.pending;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
      style={{ backgroundColor: cfg.bg + '22', color: cfg.bg, border: `1px solid ${cfg.bg}44` }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.bg }} />
      {cfg.label}
    </span>
  );
}

function EventPill({ event, onClick, draggable, onDragStart, compact = false }) {
  const cfg = eventColor(event.status);
  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onClick={(e) => { e.stopPropagation(); onClick(event); }}
      className="rounded-md px-2 py-0.5 text-xs font-semibold cursor-pointer truncate leading-5 select-none"
      style={{ backgroundColor: cfg.bg, color: cfg.text, marginBottom: '1px' }}
      title={`${event.task_name}${event.subcontractor ? ' · ' + event.subcontractor.name : ''}`}
    >
      {compact ? event.task_name : `${format(parseISO(event.start_datetime), 'h:mm a')} ${event.task_name}`}
    </div>
  );
}

// ─── Conflict Alert ───────────────────────────────────────────────────────────

function ConflictAlert({ conflicts }) {
  if (!conflicts.length) return null;
  return (
    <div className="rounded-xl p-3 mb-4" style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA' }}>
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle size={14} color="#DC2626" />
        <span className="text-xs font-bold" style={{ color: '#DC2626' }}>Scheduling Conflict Detected</span>
      </div>
      {conflicts.map((c, i) => (
        <p key={i} className="text-xs" style={{ color: '#7F1D1D' }}>
          <strong>{c.conflict_item}</strong> already booked for{' '}
          <em>{c.conflict_task}</em> — {c.conflict_project}
          <span className="ml-1 text-xs capitalize">[{c.conflict_type}]</span>
        </p>
      ))}
    </div>
  );
}

// ─── Task Form Modal ──────────────────────────────────────────────────────────

function TaskModal({
  mode, form, setForm, onSave, onDelete, onClose,
  projects, subcontractors, resources, schedules,
  conflicts, checking, saving,
}) {
  const isEdit = mode === 'edit';
  const otherSchedules = schedules.filter((s) => s.id !== form.id);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden flex flex-col"
        style={{ backgroundColor: '#fff', maxHeight: '90vh', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#E8E6E1' }}>
          <h2 className="font-bold text-base" style={{ color: '#002147' }}>
            {isEdit ? 'Edit Task' : 'New Scheduled Task'}
          </h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100">
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <ConflictAlert conflicts={conflicts} />

          {/* Task name */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: '#374151' }}>Task Name *</label>
            <input
              value={form.task_name}
              onChange={(e) => setForm((f) => ({ ...f, task_name: e.target.value }))}
              placeholder="e.g. Framing, Rough Plumbing…"
              className="w-full text-sm rounded-xl px-3 py-2 focus:outline-none"
              style={{ border: '1.5px solid #E8E6E1', color: '#002147', backgroundColor: '#F9F8F6' }}
            />
          </div>

          {/* Project */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: '#374151' }}>Project *</label>
            <select
              value={form.project_id}
              onChange={(e) => setForm((f) => ({ ...f, project_id: e.target.value }))}
              className="w-full text-sm rounded-xl px-3 py-2 focus:outline-none"
              style={{ border: '1.5px solid #E8E6E1', color: '#002147', backgroundColor: '#F9F8F6' }}
            >
              <option value="">— Select project —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.project_name}</option>
              ))}
            </select>
          </div>

          {/* Start / End */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: '#374151' }}>Start *</label>
              <input
                type="datetime-local"
                value={form.start_datetime}
                onChange={(e) => setForm((f) => ({ ...f, start_datetime: e.target.value }))}
                className="w-full text-sm rounded-xl px-3 py-2 focus:outline-none"
                style={{ border: '1.5px solid #E8E6E1', color: '#002147', backgroundColor: '#F9F8F6' }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: '#374151' }}>End *</label>
              <input
                type="datetime-local"
                value={form.end_datetime}
                onChange={(e) => setForm((f) => ({ ...f, end_datetime: e.target.value }))}
                className="w-full text-sm rounded-xl px-3 py-2 focus:outline-none"
                style={{ border: '1.5px solid #E8E6E1', color: '#002147', backgroundColor: '#F9F8F6' }}
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: '#374151' }}>Status</label>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(STATUS).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setForm((f) => ({ ...f, status: key }))}
                  className="px-3 py-1 rounded-full text-xs font-bold transition-all"
                  style={{
                    backgroundColor: form.status === key ? cfg.bg : cfg.bg + '18',
                    color: form.status === key ? cfg.text : cfg.bg,
                    border: `1.5px solid ${cfg.bg}`,
                  }}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Subcontractor */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: '#374151' }}>
              <span className="flex items-center gap-1"><User size={11} />Assigned Subcontractor</span>
            </label>
            <select
              value={form.assigned_to}
              onChange={(e) => setForm((f) => ({ ...f, assigned_to: e.target.value }))}
              className="w-full text-sm rounded-xl px-3 py-2 focus:outline-none"
              style={{ border: '1.5px solid #E8E6E1', color: '#002147', backgroundColor: '#F9F8F6' }}
            >
              <option value="">— Unassigned —</option>
              {subcontractors.map((s) => (
                <option key={s.id} value={s.id}>{s.name} — {s.trade}</option>
              ))}
            </select>
          </div>

          {/* Resources */}
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: '#374151' }}>
              <span className="flex items-center gap-1"><Wrench size={11} />Resources / Equipment</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {resources.map((r) => {
                const checked = form.resources_allocated.includes(r.id);
                return (
                  <button
                    key={r.id}
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        resources_allocated: checked
                          ? f.resources_allocated.filter((x) => x !== r.id)
                          : [...f.resources_allocated, r.id],
                      }))
                    }
                    className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                    style={{
                      backgroundColor: checked ? '#002147' : '#F5F4F0',
                      color: checked ? '#D4AF37' : '#374151',
                      border: `1px solid ${checked ? '#002147' : '#E8E6E1'}`,
                    }}
                  >
                    {r.name}
                  </button>
                );
              })}
              {resources.length === 0 && (
                <p className="text-xs" style={{ color: '#9CA3AF' }}>No resources yet — add them via SQL.</p>
              )}
            </div>
          </div>

          {/* Dependencies */}
          {otherSchedules.length > 0 && (
            <div>
              <label className="block text-xs font-semibold mb-2" style={{ color: '#374151' }}>
                <span className="flex items-center gap-1"><Link size={11} />Must finish before this task starts</span>
              </label>
              <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                {otherSchedules.map((s) => {
                  const checked = form.dependencies.includes(s.id);
                  return (
                    <label key={s.id} className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setForm((f) => ({
                            ...f,
                            dependencies: checked
                              ? f.dependencies.filter((x) => x !== s.id)
                              : [...f.dependencies, s.id],
                          }))
                        }
                        className="rounded"
                        style={{ accentColor: '#002147' }}
                      />
                      <span className="text-xs truncate" style={{ color: '#374151' }}>
                        {s.task_name}
                        <span className="ml-1" style={{ color: '#9CA3AF' }}>
                          — {s.project?.project_name}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: '#374151' }}>Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              placeholder="Any additional details…"
              className="w-full text-sm rounded-xl px-3 py-2 resize-none focus:outline-none"
              style={{ border: '1.5px solid #E8E6E1', color: '#002147', backgroundColor: '#F9F8F6' }}
            />
          </div>

          {/* Cascade hint (edit only) */}
          {isEdit && (
            <p className="text-xs" style={{ color: '#9CA3AF' }}>
              Changing dates will automatically shift all dependent tasks by the same amount.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex items-center gap-3" style={{ borderColor: '#E8E6E1' }}>
          {isEdit && (
            <button
              onClick={onDelete}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold"
              style={{ backgroundColor: '#FEF2F2', color: '#DC2626' }}
            >
              <Trash2 size={12} /> Delete
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium"
            style={{ backgroundColor: '#F5F4F0', color: '#374151' }}
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving || checking || !form.task_name || !form.project_id || !form.start_datetime || !form.end_datetime}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold disabled:opacity-50"
            style={{ backgroundColor: '#002147', color: '#D4AF37' }}
          >
            {(saving || checking) && <Loader2 size={13} className="animate-spin" />}
            {checking ? 'Checking…' : saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Schedule Task'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Month Cell ───────────────────────────────────────────────────────────────

function MonthCell({ day, currentDate, schedules, onDayClick, onEventClick, onDrop }) {
  const dayEvents = eventsForDay(schedules, day);
  const inMonth   = isSameMonth(day, currentDate);
  const isT       = isToday(day);
  const MAX_VIS   = 3;

  return (
    <div
      className="border-b border-r min-h-[96px] p-1 transition-colors"
      style={{
        borderColor: '#E8E6E1',
        backgroundColor: isT ? '#FFF8E8' : 'transparent',
        opacity: inMonth ? 1 : 0.4,
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); onDrop(day, e); }}
      onClick={() => onDayClick(day)}
    >
      {/* Day number */}
      <div className="flex justify-end mb-0.5">
        <span
          className="text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full"
          style={{
            backgroundColor: isT ? '#D4AF37' : 'transparent',
            color: isT ? '#002147' : inMonth ? '#002147' : '#9CA3AF',
          }}
        >
          {format(day, 'd')}
        </span>
      </div>

      {/* Events */}
      {dayEvents.slice(0, MAX_VIS).map((ev) => (
        <EventPill
          key={ev.id}
          event={ev}
          compact
          onClick={onEventClick}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('scheduleId', ev.id);
            e.dataTransfer.setData('originalStart', ev.start_datetime);
          }}
        />
      ))}
      {dayEvents.length > MAX_VIS && (
        <button
          onClick={(e) => { e.stopPropagation(); onEventClick(dayEvents[0]); }}
          className="text-xs font-semibold mt-0.5"
          style={{ color: '#9CA3AF' }}
        >
          +{dayEvents.length - MAX_VIS} more
        </button>
      )}
    </div>
  );
}

// ─── Week / Day grid ──────────────────────────────────────────────────────────

function WeekDayColumn({ day, schedules, onDayClick, onEventClick, onDrop, singleDay = false }) {
  const dayEvents = eventsForDay(schedules, day);
  const isT = isToday(day);

  return (
    <div
      className="flex-1 border-r last:border-r-0 p-2"
      style={{ borderColor: '#E8E6E1', minHeight: singleDay ? '60vh' : '300px' }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); onDrop(day, e); }}
      onClick={() => onDayClick(day)}
    >
      {/* Day header */}
      <div className="text-center mb-2">
        <p className="text-xs font-medium" style={{ color: '#9CA3AF' }}>
          {format(day, 'EEE')}
        </p>
        <span
          className="text-sm font-bold w-8 h-8 rounded-full flex items-center justify-center mx-auto"
          style={{
            backgroundColor: isT ? '#D4AF37' : 'transparent',
            color: isT ? '#002147' : '#002147',
          }}
        >
          {format(day, 'd')}
        </span>
      </div>

      {/* Events */}
      <div className="space-y-1">
        {dayEvents.length === 0 ? (
          <p className="text-xs text-center py-4" style={{ color: '#D1D5DB' }}>—</p>
        ) : dayEvents.map((ev) => (
          <div
            key={ev.id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('scheduleId', ev.id);
              e.dataTransfer.setData('originalStart', ev.start_datetime);
            }}
            onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}
            className="rounded-xl px-3 py-2 cursor-pointer select-none"
            style={{
              backgroundColor: eventColor(ev.status).bg,
              color: eventColor(ev.status).text,
            }}
          >
            <p className="text-xs font-bold truncate">{ev.task_name}</p>
            {ev.subcontractor && (
              <p className="text-xs truncate opacity-80">{ev.subcontractor.name}</p>
            )}
            <p className="text-xs opacity-70 mt-0.5">
              {format(parseISO(ev.start_datetime), 'h:mm a')} – {format(parseISO(ev.end_datetime), 'h:mm a')}
            </p>
            {ev.notes && (
              <p className="text-xs opacity-60 truncate mt-0.5">{ev.notes}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Mobile / Field List view ─────────────────────────────────────────────────

function ListView({ schedules, onEventClick, filterProjectId }) {
  const today = new Date();
  const upcoming = schedules
    .filter((s) => !filterProjectId || s.project_id === filterProjectId)
    .filter((s) => parseISO(s.end_datetime) >= startOfDay(today))
    .slice(0, 30);

  const grouped = upcoming.reduce((acc, s) => {
    const key = format(parseISO(s.start_datetime), 'yyyy-MM-dd');
    (acc[key] = acc[key] || []).push(s);
    return acc;
  }, {});

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4">
      {Object.keys(grouped).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Calendar size={32} color="#D1D5DB" className="mb-3" />
          <p className="text-sm font-semibold" style={{ color: '#374151' }}>No upcoming tasks</p>
          <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>Click + to schedule the first task.</p>
        </div>
      ) : (
        Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([dateKey, evs]) => (
          <div key={dateKey} className="mb-5">
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#D4AF37' }}>
              {format(parseISO(dateKey), 'EEEE, MMMM d')}
            </p>
            <div className="space-y-2">
              {evs.map((ev) => (
                <div
                  key={ev.id}
                  onClick={() => onEventClick(ev)}
                  className="rounded-2xl p-3 cursor-pointer flex items-start gap-3"
                  style={{ backgroundColor: '#fff', border: '1.5px solid #E8E6E1', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
                >
                  <div className="w-2 rounded-full self-stretch" style={{ backgroundColor: eventColor(ev.status).bg }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate" style={{ color: '#002147' }}>{ev.task_name}</p>
                    <p className="text-xs truncate" style={{ color: '#9CA3AF' }}>
                      {ev.project?.project_name}
                      {ev.subcontractor && ` · ${ev.subcontractor.name}`}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <Clock size={10} color="#9CA3AF" />
                      <span className="text-xs" style={{ color: '#9CA3AF' }}>
                        {format(parseISO(ev.start_datetime), 'h:mm a')} – {format(parseISO(ev.end_datetime), 'h:mm a')}
                      </span>
                    </div>
                  </div>
                  <StatusPill status={ev.status} />
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ScheduleCalendar() {
  const {
    schedules, subcontractors, resources, projects,
    loading, checkConflicts, createSchedule, updateSchedule, deleteSchedule,
  } = useSchedule();

  const [view, setView]               = useState('month');   // month | week | day | list
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filterProject, setFilter]    = useState('');
  const [modal, setModal]             = useState(null);      // null | { mode, form, originalStart }
  const [form, setForm]               = useState(BLANK_FORM);
  const [conflicts, setConflicts]     = useState([]);
  const [checking, setChecking]       = useState(false);
  const [saving, setSaving]           = useState(false);
  const [dragTaskName, setDragTaskName] = useState(null);

  // ── Filtered schedules ─────────────────────────────────────────────────────
  const filtered = useMemo(
    () => filterProject ? schedules.filter((s) => s.project_id === filterProject) : schedules,
    [schedules, filterProject]
  );

  // ── Navigation ─────────────────────────────────────────────────────────────
  function navigate(dir) {
    if (view === 'month') setCurrentDate((d) => dir > 0 ? addMonths(d, 1) : subMonths(d, 1));
    else if (view === 'week') setCurrentDate((d) => dir > 0 ? addWeeks(d, 1) : subWeeks(d, 1));
    else setCurrentDate((d) => addDays(d, dir));
  }

  function headerLabel() {
    if (view === 'month') return format(currentDate, 'MMMM yyyy');
    if (view === 'week') {
      const s = startOfWeek(currentDate, { weekStartsOn: 0 });
      const e = addDays(s, 6);
      return isSameMonth(s, e) ? format(s, 'MMMM yyyy') : `${format(s, 'MMM')} – ${format(e, 'MMM yyyy')}`;
    }
    return format(currentDate, 'EEEE, MMMM d, yyyy');
  }

  // ── Modal helpers ─────────────────────────────────────────────────────────
  function openCreate(prefill = {}) {
    setConflicts([]);
    setForm({ ...BLANK_FORM, ...prefill });
    setModal({ mode: 'create' });
  }

  function openEdit(event) {
    setConflicts([]);
    setForm({
      id: event.id,
      task_name: event.task_name,
      project_id: event.project_id,
      assigned_to: event.assigned_to ?? '',
      resources_allocated: event.resources_allocated ?? [],
      start_datetime: toLocal(event.start_datetime),
      end_datetime: toLocal(event.end_datetime),
      status: event.status,
      dependencies: event.dependencies ?? [],
      notes: event.notes ?? '',
    });
    setModal({ mode: 'edit', originalStart: event.start_datetime });
  }

  // ── Conflict check on form change ─────────────────────────────────────────
  async function runConflictCheck(f) {
    if (!f.assigned_to && f.resources_allocated.length === 0) { setConflicts([]); return; }
    if (!f.start_datetime || !f.end_datetime) return;
    setChecking(true);
    const result = await checkConflicts({
      assignedTo:         f.assigned_to || null,
      resourcesAllocated: f.resources_allocated,
      startDatetime:      toISO(f.start_datetime),
      endDatetime:        toISO(f.end_datetime),
      excludeId:          f.id ?? null,
    });
    setConflicts(result);
    setChecking(false);
  }

  function updateForm(updater) {
    setForm((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      // Debounce-free: run check when relevant fields change
      runConflictCheck(next);
      return next;
    });
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!form.task_name || !form.project_id || !form.start_datetime || !form.end_datetime) return;
    const start = toISO(form.start_datetime);
    const end   = toISO(form.end_datetime);
    if (new Date(end) <= new Date(start)) {
      alert('End time must be after start time.');
      return;
    }

    setSaving(true);
    const payload = {
      project_id:          form.project_id,
      task_name:           form.task_name,
      assigned_to:         form.assigned_to || null,
      resources_allocated: form.resources_allocated,
      start_datetime:      start,
      end_datetime:        end,
      status:              form.status,
      dependencies:        form.dependencies,
      notes:               form.notes,
    };

    let result;
    if (modal.mode === 'edit') {
      result = await updateSchedule(form.id, payload, {
        cascade:       true,
        originalStart: modal.originalStart,
      });
    } else {
      result = await createSchedule(payload);
    }

    setSaving(false);
    if (result.error) { alert(result.error); return; }
    if (result.cascadedCount > 0) {
      alert(`Task updated. ${result.cascadedCount} dependent task(s) automatically shifted.`);
    }
    setModal(null);
  }

  async function handleDelete() {
    if (!form.id || !confirm('Delete this scheduled task?')) return;
    setSaving(true);
    const { error } = await deleteSchedule(form.id);
    setSaving(false);
    if (error) { alert(error); return; }
    setModal(null);
  }

  // ── Drag-and-drop: move event to a different day, or drop template ────────
  function handleDrop(targetDay, e) {
    const scheduleId    = e.dataTransfer.getData('scheduleId');
    const originalStart = e.dataTransfer.getData('originalStart');
    const taskName      = e.dataTransfer.getData('taskTemplate');

    if (taskName) {
      // Dragged from unscheduled templates panel
      const startISO = new Date(targetDay.setHours(8, 0, 0, 0)).toISOString();
      const endISO   = new Date(new Date(startISO).getTime() + 4 * 3600 * 1000).toISOString();
      openCreate({
        task_name:      taskName,
        start_datetime: toLocal(startISO),
        end_datetime:   toLocal(endISO),
      });
      setDragTaskName(null);
      return;
    }

    if (!scheduleId || !originalStart) return;
    const ev = schedules.find((s) => s.id === scheduleId);
    if (!ev) return;

    const diffDays  = differenceInDays(targetDay, parseISO(originalStart));
    if (diffDays === 0) return;

    const diffMs    = diffDays * 24 * 60 * 60 * 1000;
    const newStart  = new Date(new Date(ev.start_datetime).getTime() + diffMs);
    const newEnd    = new Date(new Date(ev.end_datetime).getTime() + diffMs);
    updateSchedule(ev.id, {
      start_datetime: newStart.toISOString(),
      end_datetime:   newEnd.toISOString(),
    }, { cascade: true, originalStart: ev.start_datetime });
  }

  // ── Day header (month view) ───────────────────────────────────────────────
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // ── Calendar grid rendering ───────────────────────────────────────────────
  const days = useMemo(() => daysInView(currentDate, view), [currentDate, view]);

  return (
    <div className="flex h-[calc(100vh-56px)]" style={{ backgroundColor: '#F5F4F0' }}>

      {/* ── Left sidebar ─────────────────────────────────────────────────── */}
      <div
        className="hidden md:flex flex-col shrink-0 border-r overflow-hidden"
        style={{ width: '240px', backgroundColor: '#fff', borderColor: '#E8E6E1' }}
      >
        {/* Header */}
        <div className="px-4 py-4 border-b" style={{ borderColor: '#E8E6E1' }}>
          <h2 className="font-bold text-sm" style={{ color: '#002147' }}>Job Scheduler</h2>
          <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>
            {filtered.length} task{filtered.length !== 1 ? 's' : ''} scheduled
          </p>
        </div>

        {/* Project filter */}
        <div className="px-3 py-3 border-b" style={{ borderColor: '#F5F4F0' }}>
          <select
            value={filterProject}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full text-xs rounded-lg px-2 py-1.5 focus:outline-none"
            style={{ border: '1px solid #E8E6E1', color: '#002147', backgroundColor: '#F9F8F6' }}
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.project_name}</option>
            ))}
          </select>
        </div>

        {/* New Task button */}
        <div className="px-3 py-3 border-b" style={{ borderColor: '#F5F4F0' }}>
          <button
            onClick={() => openCreate()}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold"
            style={{ backgroundColor: '#002147', color: '#D4AF37' }}
          >
            <Plus size={13} /> New Task
          </button>
        </div>

        {/* Unscheduled task templates */}
        <div className="flex-1 overflow-y-auto">
          <p className="px-3 pt-3 pb-1 text-xs font-bold uppercase tracking-wider" style={{ color: '#D4AF37' }}>
            Task Templates
          </p>
          <p className="px-3 pb-2 text-xs" style={{ color: '#9CA3AF' }}>Drag onto the calendar</p>
          {TASK_TEMPLATES.map((name) => (
            <div
              key={name}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('taskTemplate', name);
                setDragTaskName(name);
              }}
              onDragEnd={() => setDragTaskName(null)}
              className="mx-3 mb-1 px-3 py-2 rounded-lg text-xs font-medium cursor-grab active:cursor-grabbing select-none"
              style={{
                backgroundColor: dragTaskName === name ? '#002147' : '#F5F4F0',
                color: dragTaskName === name ? '#D4AF37' : '#374151',
                border: '1px solid #E8E6E1',
              }}
            >
              {name}
            </div>
          ))}
        </div>

        {/* Status Legend */}
        <div className="px-3 py-3 border-t" style={{ borderColor: '#F5F4F0' }}>
          <p className="text-xs font-bold mb-2" style={{ color: '#9CA3AF' }}>Legend</p>
          {Object.entries(STATUS).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cfg.bg }} />
              <span className="text-xs" style={{ color: '#374151' }}>{cfg.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Calendar area ────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Toolbar */}
        <div
          className="flex items-center gap-2 px-4 py-3 border-b shrink-0 flex-wrap"
          style={{ backgroundColor: '#fff', borderColor: '#E8E6E1' }}
        >
          {/* Nav */}
          <button onClick={() => navigate(-1)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100">
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3 h-7 rounded-lg text-xs font-semibold"
            style={{ backgroundColor: '#F5F4F0', color: '#002147' }}
          >
            Today
          </button>
          <button onClick={() => navigate(1)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100">
            <ChevronRight size={14} />
          </button>

          {/* Label */}
          <h3 className="font-bold text-sm ml-1" style={{ color: '#002147' }}>{headerLabel()}</h3>

          <div className="flex-1" />

          {/* View toggle */}
          <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: '#E8E6E1' }}>
            {['month', 'week', 'day', 'list'].map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className="px-3 py-1.5 text-xs font-semibold capitalize transition-colors"
                style={{
                  backgroundColor: view === v ? '#002147' : '#fff',
                  color: view === v ? '#D4AF37' : '#374151',
                }}
              >
                {v === 'list' ? <List size={13} /> : v}
              </button>
            ))}
          </div>

          {/* Mobile new task */}
          <button
            onClick={() => openCreate()}
            className="md:hidden w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: '#002147', color: '#D4AF37' }}
          >
            <Plus size={15} />
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 size={24} className="animate-spin" style={{ color: '#D4AF37' }} />
          </div>
        )}

        {/* List view */}
        {!loading && view === 'list' && (
          <ListView
            schedules={filtered}
            onEventClick={openEdit}
            filterProjectId={filterProject}
          />
        )}

        {/* Month view */}
        {!loading && view === 'month' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Day-of-week header */}
            <div className="grid grid-cols-7 border-b shrink-0" style={{ borderColor: '#E8E6E1', backgroundColor: '#fff' }}>
              {DOW.map((d) => (
                <div key={d} className="py-2 text-center text-xs font-bold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>
                  {d}
                </div>
              ))}
            </div>
            {/* Grid */}
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-7" style={{ borderTop: '1px solid #E8E6E1', borderLeft: '1px solid #E8E6E1' }}>
                {days.map((day) => (
                  <MonthCell
                    key={day.toISOString()}
                    day={day}
                    currentDate={currentDate}
                    schedules={filtered}
                    onDayClick={(d) => { setCurrentDate(d); setView('day'); }}
                    onEventClick={openEdit}
                    onDrop={handleDrop}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Week view */}
        {!loading && view === 'week' && (
          <div className="flex-1 overflow-y-auto">
            <div className="flex border-b" style={{ borderColor: '#E8E6E1', backgroundColor: '#fff', minHeight: '100%' }}>
              {days.map((day) => (
                <WeekDayColumn
                  key={day.toISOString()}
                  day={day}
                  schedules={filtered}
                  onDayClick={(d) => { setCurrentDate(d); setView('day'); }}
                  onEventClick={openEdit}
                  onDrop={(d) => handleDrop(d, window._lastDragEvent)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Day view */}
        {!loading && view === 'day' && (
          <div className="flex-1 overflow-y-auto">
            <div className="flex" style={{ minHeight: '100%' }}>
              <WeekDayColumn
                day={currentDate}
                schedules={filtered}
                onDayClick={() => openCreate({ start_datetime: toLocal(new Date().toISOString()) })}
                onEventClick={openEdit}
                onDrop={(d) => handleDrop(d, window._lastDragEvent)}
                singleDay
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Modal ────────────────────────────────────────────────────────── */}
      {modal && (
        <TaskModal
          mode={modal.mode}
          form={form}
          setForm={updateForm}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setModal(null)}
          projects={projects}
          subcontractors={subcontractors}
          resources={resources}
          schedules={schedules}
          conflicts={conflicts}
          checking={checking}
          saving={saving}
        />
      )}
    </div>
  );
}
