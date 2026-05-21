import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useDesignSpecs } from '../hooks/useDesignSpecs';
import { useAuth } from '../context/AuthContext';

const ROOM_CATEGORIES = [
  { key: 'all',      label: 'All Rooms' },
  { key: 'bathroom', label: 'Bathrooms' },
  { key: 'kitchen',  label: 'Kitchens' },
  { key: 'bedroom',  label: 'Bedrooms' },
  { key: 'living',   label: 'Living Areas' },
  { key: 'addition', label: 'Addition' },
  { key: 'exterior', label: 'Exterior / Portico' },
  { key: 'garage',   label: 'Garage' },
  { key: 'attic',    label: 'Attic' },
  { key: 'other',    label: 'Other' },
];

const UNIT_TYPES = ['sqft', 'lf', 'ea', 'hr', 'ls', 'cy', 'sy'];

const STATUS_CFG = {
  pending_review: { label: 'Pending Review', bg: '#FFFBEB', color: '#92400E', border: '#FCD34D', dot: '#F59E0B' },
  approved:       { label: 'Approved',       bg: '#ECFDF5', color: '#065F46', border: '#6EE7B7', dot: '#10B981' },
  declined:       { label: 'Declined',       bg: '#FEF2F2', color: '#991B1B', border: '#FECACA', dot: '#EF4444' },
};

function fmt(n) {
  return '$' + (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const EMPTY_FORM = {
  room_category:  'bathroom',
  product_name:   '',
  supplier:       '',
  unit_price:     '',
  unit_type:      'sqft',
  quantity:       '1',
  labor_rate:     '',
  phase_tag:      '',
  designer_notes: '',
  status:         'pending_review',
};

function StatusPill({ status }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.pending_review;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
      style={{ backgroundColor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

function SpecCard({ spec, onEdit, onDelete, isAdmin }) {
  const installed = Number(spec.installed_cost) || 0;
  return (
    <div
      className="rounded-2xl p-4"
      style={{ backgroundColor: '#fff', border: '1.5px solid #E8E6E1', boxShadow: '0 1px 6px rgba(0,33,71,0.05)' }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate" style={{ color: '#002147' }}>{spec.product_name}</p>
          {spec.supplier && <p className="text-xs mt-0.5 truncate" style={{ color: '#9CA3AF' }}>{spec.supplier}</p>}
        </div>
        <StatusPill status={spec.status} />
      </div>

      <div className="grid grid-cols-3 gap-3 mb-3 text-xs">
        <div>
          <p className="font-semibold mb-0.5" style={{ color: '#9CA3AF' }}>Unit Price</p>
          <p className="font-bold" style={{ color: '#374151' }}>{fmt(spec.unit_price)}/{spec.unit_type}</p>
        </div>
        <div>
          <p className="font-semibold mb-0.5" style={{ color: '#9CA3AF' }}>Quantity</p>
          <p className="font-bold" style={{ color: '#374151' }}>{spec.quantity} {spec.unit_type}</p>
        </div>
        <div>
          <p className="font-semibold mb-0.5" style={{ color: '#9CA3AF' }}>Labor Rate</p>
          <p className="font-bold" style={{ color: '#374151' }}>{fmt(spec.labor_rate)}/{spec.unit_type}</p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid #F3F2EE' }}>
        <div>
          <p className="text-xs font-semibold" style={{ color: '#9CA3AF' }}>Installed Cost</p>
          <p className="text-base font-extrabold" style={{ color: '#002147' }}>{fmt(installed)}</p>
        </div>
        {(isAdmin || spec.canEdit) && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(spec)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
              style={{ backgroundColor: '#F0EEE9', color: '#374151', border: '1px solid #E8E6E1' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#E5E3DD'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#F0EEE9'; }}
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(spec.id)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
              style={{ backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#FEE2E2'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#FEF2F2'; }}
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {spec.designer_notes && (
        <div className="mt-3 px-3 py-2 rounded-xl text-xs" style={{ backgroundColor: '#F9F8F6', color: '#6B7280', border: '1px solid #F0EEE9' }}>
          <span className="font-semibold" style={{ color: '#374151' }}>Note: </span>{spec.designer_notes}
        </div>
      )}
      {spec.client_feedback && spec.status === 'declined' && (
        <div className="mt-3 rounded-xl overflow-hidden" style={{ border: '1.5px solid #FECACA' }}>
          <div className="flex items-center gap-1.5 px-3 py-1.5" style={{ backgroundColor: '#DC2626' }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <p className="text-xs font-bold text-white uppercase tracking-wide">Client Feedback</p>
          </div>
          <div className="px-3 py-2.5" style={{ backgroundColor: '#FEF2F2' }}>
            <p className="text-sm italic" style={{ color: '#991B1B' }}>"{spec.client_feedback}"</p>
          </div>
        </div>
      )}
      {spec.phase_tag && (
        <div className="mt-2">
          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}>
            {spec.phase_tag}
          </span>
        </div>
      )}
    </div>
  );
}

function SpecModal({ initial, projects, onSave, onClose, saving }) {
  const [form, setForm] = useState(initial ?? EMPTY_FORM);
  const [projectId, setProjectId] = useState(initial?.project_id ?? (projects[0]?.id ?? ''));
  const [error, setError] = useState('');

  function set(k, v) { setForm((p) => ({ ...p, [k]: v })); }

  const installedCost = ((Number(form.unit_price) || 0) + (Number(form.labor_rate) || 0)) * (Number(form.quantity) || 0);

  async function handleSave() {
    if (!form.product_name.trim()) { setError('Product name is required'); return; }
    if (!projectId) { setError('Select a project'); return; }
    setError('');
    const payload = {
      project_id:     projectId,
      room_category:  form.room_category,
      product_name:   form.product_name.trim(),
      supplier:       form.supplier.trim(),
      unit_price:     Number(form.unit_price) || 0,
      unit_type:      form.unit_type,
      quantity:       Number(form.quantity) || 1,
      labor_rate:     Number(form.labor_rate) || 0,
      phase_tag:      form.phase_tag.trim(),
      designer_notes: form.designer_notes.trim(),
      status:         form.status,
    };
    await onSave(payload, initial?.id);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4" style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}>
      <div className="w-full sm:max-w-xl rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl" style={{ backgroundColor: '#fff', maxHeight: '95vh', overflowY: 'auto' }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ backgroundColor: '#002147' }}>
          <h2 className="font-bold text-base" style={{ color: '#D4AF37' }}>
            {initial ? 'Edit Spec' : 'Add Design Spec'}
          </h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)' }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="1" y1="1" x2="11" y2="11" /><line x1="11" y1="1" x2="1" y2="11" /></svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {error && <p className="text-xs px-3 py-2 rounded-lg font-semibold" style={{ backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>{error}</p>}

          {/* Project */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wide block mb-1" style={{ color: '#374151' }}>Project</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none"
              style={{ backgroundColor: '#F9FAFB', border: '1.5px solid #E5E7EB', color: '#111827' }}
            >
              <option value="">— Select project —</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.project_name}</option>)}
            </select>
          </div>

          {/* Room + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wide block mb-1" style={{ color: '#374151' }}>Room</label>
              <select value={form.room_category} onChange={(e) => set('room_category', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none"
                style={{ backgroundColor: '#F9FAFB', border: '1.5px solid #E5E7EB', color: '#111827' }}>
                {ROOM_CATEGORIES.filter((r) => r.key !== 'all').map((r) => (
                  <option key={r.key} value={r.key}>{r.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wide block mb-1" style={{ color: '#374151' }}>Status</label>
              <select value={form.status} onChange={(e) => set('status', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none"
                style={{ backgroundColor: '#F9FAFB', border: '1.5px solid #E5E7EB', color: '#111827' }}>
                <option value="pending_review">Pending Review</option>
                <option value="approved">Approved</option>
                <option value="declined">Declined</option>
              </select>
            </div>
          </div>

          {/* Product name */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wide block mb-1" style={{ color: '#374151' }}>Product Name *</label>
            <input
              type="text" value={form.product_name} onChange={(e) => set('product_name', e.target.value)}
              placeholder="e.g. Calacatta Marble 12×24 Tile"
              className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none"
              style={{ backgroundColor: '#F9FAFB', border: '1.5px solid #E5E7EB', color: '#111827' }}
            />
          </div>

          {/* Supplier */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wide block mb-1" style={{ color: '#374151' }}>Supplier</label>
            <input
              type="text" value={form.supplier} onChange={(e) => set('supplier', e.target.value)}
              placeholder="e.g. Floor & Decor, Ferguson, Lowe's"
              className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none"
              style={{ backgroundColor: '#F9FAFB', border: '1.5px solid #E5E7EB', color: '#111827' }}
            />
          </div>

          {/* Pricing row */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wide block mb-1" style={{ color: '#374151' }}>Unit Price ($)</label>
              <input
                type="number" min="0" step="0.01" value={form.unit_price}
                onChange={(e) => set('unit_price', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none"
                style={{ backgroundColor: '#F9FAFB', border: '1.5px solid #E5E7EB', color: '#111827' }}
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wide block mb-1" style={{ color: '#374151' }}>Unit Type</label>
              <select value={form.unit_type} onChange={(e) => set('unit_type', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none"
                style={{ backgroundColor: '#F9FAFB', border: '1.5px solid #E5E7EB', color: '#111827' }}>
                {UNIT_TYPES.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wide block mb-1" style={{ color: '#374151' }}>Quantity</label>
              <input
                type="number" min="0.01" step="0.01" value={form.quantity}
                onChange={(e) => set('quantity', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none"
                style={{ backgroundColor: '#F9FAFB', border: '1.5px solid #E5E7EB', color: '#111827' }}
              />
            </div>
          </div>

          {/* Labor rate + Phase tag */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wide block mb-1" style={{ color: '#374151' }}>Labor Rate ($/unit)</label>
              <input
                type="number" min="0" step="0.01" value={form.labor_rate}
                onChange={(e) => set('labor_rate', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none"
                style={{ backgroundColor: '#F9FAFB', border: '1.5px solid #E5E7EB', color: '#111827' }}
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wide block mb-1" style={{ color: '#374151' }}>Phase Tag</label>
              <input
                type="text" value={form.phase_tag} onChange={(e) => set('phase_tag', e.target.value)}
                placeholder="e.g. Rough-in, Finish"
                className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none"
                style={{ backgroundColor: '#F9FAFB', border: '1.5px solid #E5E7EB', color: '#111827' }}
              />
            </div>
          </div>

          {/* Installed cost preview */}
          <div
            className="flex items-center justify-between px-4 py-3 rounded-xl"
            style={{ backgroundColor: 'rgba(0,33,71,0.04)', border: '1.5px solid rgba(0,33,71,0.12)' }}
          >
            <span className="text-xs font-semibold" style={{ color: '#6B7280' }}>Installed Cost Preview</span>
            <span className="text-base font-extrabold" style={{ color: '#002147' }}>{fmt(installedCost)}</span>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wide block mb-1" style={{ color: '#374151' }}>Designer Notes</label>
            <textarea
              rows={2} value={form.designer_notes} onChange={(e) => set('designer_notes', e.target.value)}
              placeholder="Internal notes about this selection..."
              className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none resize-none"
              style={{ backgroundColor: '#F9FAFB', border: '1.5px solid #E5E7EB', color: '#111827' }}
            />
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4" style={{ borderTop: '1px solid #F0EEE9' }}>
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-bold" style={{ backgroundColor: '#F5F4F0', color: '#374151', border: '1px solid #E8E6E1' }}>
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors"
            style={{ backgroundColor: saving ? '#9CA3AF' : '#002147', color: '#D4AF37' }}
          >
            {saving ? 'Saving…' : initial ? 'Update Spec' : 'Add Spec'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DesignerWorkspace() {
  const { isAdmin, profile } = useAuth();
  const canEdit = isAdmin || profile?.role === 'designer';

  const [projects,    setProjects]    = useState([]);
  const [projectId,   setProjectId]   = useState('');
  const [activeRoom,  setActiveRoom]  = useState('all');
  const [modal,       setModal]       = useState(null);  // null | 'add' | spec object
  const [saving,      setSaving]      = useState(false);
  const [toast,       setToast]       = useState('');
  const [deleteId,    setDeleteId]    = useState(null);

  const { specs, loading, createSpec, updateSpec, deleteSpec } = useDesignSpecs(projectId || null);

  // Load projects on mount
  useEffect(() => {
    supabase
      .from('projects')
      .select('id, project_name')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setProjects(data ?? []);
        if (data && data.length > 0) setProjectId(data[0].id);
      });
  }, []);

  const filteredSpecs = useMemo(() => {
    if (activeRoom === 'all') return specs;
    return specs.filter((s) => s.room_category === activeRoom);
  }, [specs, activeRoom]);

  const totals = useMemo(() => {
    const approved = specs.filter((s) => s.status === 'approved');
    return {
      all:      specs.length,
      pending:  specs.filter((s) => s.status === 'pending_review').length,
      approved: approved.length,
      declined: specs.filter((s) => s.status === 'declined').length,
      approvedCost: approved.reduce((s, sp) => s + (Number(sp.installed_cost) || 0), 0),
    };
  }, [specs]);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 2800);
  }

  async function handleSave(payload, editId) {
    setSaving(true);
    let result;
    if (editId) {
      result = await updateSpec(editId, payload);
    } else {
      result = await createSpec(payload);
    }
    setSaving(false);
    if (result.error) { showToast('Error: ' + result.error); return; }
    setModal(null);
    showToast(editId ? 'Spec updated' : 'Spec added');
  }

  async function handleDelete(id) {
    setDeleteId(null);
    const result = await deleteSpec(id);
    if (result.error) showToast('Error: ' + result.error);
    else showToast('Spec deleted');
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-bold tracking-[0.18em] uppercase mb-1" style={{ color: '#D4AF37' }}>Interior Design</p>
          <h1 className="text-2xl font-extrabold" style={{ color: '#002147' }}>Designer Workspace</h1>
          <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
            Curate material specifications per room — clients approve or decline each item.
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => setModal('add')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold shrink-0"
            style={{ backgroundColor: '#002147', color: '#D4AF37' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#003166'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#002147'; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Add Spec
          </button>
        )}
      </div>

      {/* Project selector */}
      <div className="rounded-2xl p-5 mb-6" style={{ backgroundColor: '#fff', border: '1.5px solid #E8E6E1', boxShadow: '0 2px 12px rgba(0,33,71,0.05)' }}>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-48">
            <label className="text-xs font-bold uppercase tracking-wide block mb-1" style={{ color: '#374151' }}>Project</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none"
              style={{ backgroundColor: '#F9FAFB', border: '1.5px solid #E5E7EB', color: '#111827' }}
            >
              <option value="">— Select a project —</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.project_name}</option>)}
            </select>
          </div>

          {/* Summary stat chips */}
          {projectId && (
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Total',    value: totals.all,        color: '#002147', bg: '#F5F4F0' },
                { label: 'Pending',  value: totals.pending,    color: '#92400E', bg: '#FFFBEB' },
                { label: 'Approved', value: totals.approved,   color: '#065F46', bg: '#ECFDF5' },
                { label: 'Declined', value: totals.declined,   color: '#991B1B', bg: '#FEF2F2' },
              ].map(({ label, value, color, bg }) => (
                <div key={label} className="flex flex-col items-center px-3 py-1.5 rounded-xl" style={{ backgroundColor: bg }}>
                  <span className="text-lg font-extrabold leading-none" style={{ color }}>{value}</span>
                  <span className="text-xs font-semibold mt-0.5" style={{ color }}>{label}</span>
                </div>
              ))}
              {totals.approved > 0 && (
                <div className="flex flex-col items-center px-3 py-1.5 rounded-xl" style={{ backgroundColor: '#F0F9FF' }}>
                  <span className="text-base font-extrabold leading-none" style={{ color: '#0369A1' }}>
                    ${(totals.approvedCost).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </span>
                  <span className="text-xs font-semibold mt-0.5" style={{ color: '#0369A1' }}>Approved Total</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {!projectId ? (
        <div className="rounded-2xl p-16 text-center" style={{ backgroundColor: '#fff', border: '1.5px solid #E8E6E1' }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#F5F4F0' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <p className="font-bold text-base mb-1" style={{ color: '#002147' }}>Select a project to begin</p>
          <p className="text-sm" style={{ color: '#9CA3AF' }}>Choose a project above to view and manage its design specifications.</p>
        </div>
      ) : (
        <>
          {/* Room category tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-2 mb-6" style={{ scrollbarWidth: 'none' }}>
            {ROOM_CATEGORIES.map(({ key, label }) => {
              const isActive = activeRoom === key;
              const count = key === 'all' ? specs.length : specs.filter((s) => s.room_category === key).length;
              return (
                <button
                  key={key}
                  onClick={() => setActiveRoom(key)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-colors"
                  style={{
                    backgroundColor: isActive ? '#002147' : '#fff',
                    color:           isActive ? '#D4AF37' : '#6B7280',
                    border:          isActive ? '1.5px solid #002147' : '1.5px solid #E8E6E1',
                  }}
                >
                  {label}
                  {count > 0 && (
                    <span
                      className="px-1.5 py-0.5 rounded-full font-bold"
                      style={{
                        backgroundColor: isActive ? 'rgba(212,175,55,0.25)' : '#F3F4F6',
                        color: isActive ? '#D4AF37' : '#6B7280',
                        fontSize: '0.6rem',
                        minWidth: '16px',
                        textAlign: 'center',
                      }}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Spec cards grid */}
          {loading ? (
            <div className="flex items-center justify-center gap-3 py-16">
              <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" strokeOpacity="0.2" /><path d="M12 2a10 10 0 0 1 10 10" />
              </svg>
              <span className="text-sm" style={{ color: '#9CA3AF' }}>Loading specs…</span>
            </div>
          ) : filteredSpecs.length === 0 ? (
            <div className="rounded-2xl p-12 text-center" style={{ backgroundColor: '#fff', border: '1.5px dashed #E8E6E1' }}>
              <p className="font-semibold text-sm mb-1" style={{ color: '#374151' }}>No specs yet for this {activeRoom === 'all' ? 'project' : 'room'}</p>
              {canEdit && (
                <button
                  onClick={() => setModal('add')}
                  className="mt-3 px-4 py-2 rounded-xl text-xs font-bold"
                  style={{ backgroundColor: '#002147', color: '#D4AF37' }}
                >
                  + Add First Spec
                </button>
              )}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSpecs.map((spec) => (
                <SpecCard
                  key={spec.id}
                  spec={spec}
                  isAdmin={canEdit}
                  onEdit={(s) => setModal(s)}
                  onDelete={(id) => setDeleteId(id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Add / Edit modal */}
      {modal && (
        <SpecModal
          initial={modal === 'add' ? null : modal}
          projects={projects}
          onSave={handleSave}
          onClose={() => setModal(null)}
          saving={saving}
        />
      )}

      {/* Delete confirmation */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-sm rounded-2xl p-6" style={{ backgroundColor: '#fff' }}>
            <p className="font-bold text-base mb-2" style={{ color: '#002147' }}>Delete this spec?</p>
            <p className="text-sm mb-6" style={{ color: '#6B7280' }}>This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 rounded-xl text-sm font-bold" style={{ backgroundColor: '#F5F4F0', color: '#374151' }}>Cancel</button>
              <button onClick={() => handleDelete(deleteId)} className="flex-1 py-2.5 rounded-xl text-sm font-bold" style={{ backgroundColor: '#DC2626', color: '#fff' }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl text-sm font-semibold shadow-lg" style={{ backgroundColor: '#002147', color: '#D4AF37' }}>
          {toast}
        </div>
      )}
    </div>
  );
}
