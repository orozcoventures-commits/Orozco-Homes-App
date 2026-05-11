import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useProject } from '../context/ProjectContext';

const STATUS_CFG = {
  pending:  { bg: '#FFFBEB', text: '#92400E', border: '#FCD34D', dot: '#F59E0B', label: 'Pending Approval' },
  approved: { bg: '#ECFDF5', text: '#065F46', border: '#6EE7B7', dot: '#10B981', label: 'Approved'         },
  declined: { bg: '#FEF2F2', text: '#991B1B', border: '#FECACA', dot: '#EF4444', label: 'Declined'         },
};

const CATEGORIES = ['Countertops', 'Electrical', 'Tile', 'Plumbing', 'Shower', 'Appliances', 'Flooring', 'Cabinetry', 'Painting', 'Other'];

function fmt(n) {
  return '$' + Math.abs(Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
}

function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

// ── Add Change Order form (admin only) ────────────────────────────────────────
function AddOrderForm({ projects, onAdded, onCancel }) {
  const { user } = useAuth();
  const [projectId,    setProjectId]    = useState('');
  const [title,        setTitle]        = useState('');
  const [description,  setDescription]  = useState('');
  const [category,     setCategory]     = useState('');
  const [originalCost, setOriginalCost] = useState('');
  const [newCost,      setNewCost]      = useState('');
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState('');

  const inputCls = 'w-full text-sm rounded-xl px-4 py-3 focus:outline-none transition-colors duration-150';
  const inputBaseStyle = { border: '1.5px solid #E8E6E1', color: '#002147', backgroundColor: '#fff' };

  function focused(e)  { e.target.style.borderColor = '#D4AF37'; }
  function blurred(e)  { e.target.style.borderColor = '#E8E6E1'; }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!projectId || !title.trim()) return;
    setError('');
    setSaving(true);
    const { data, error: err } = await supabase
      .from('change_works')
      .insert({
        project_id:    projectId,
        title:         title.trim(),
        description:   description.trim() || null,
        category:      category || null,
        original_cost: parseFloat(originalCost) || 0,
        new_cost:      parseFloat(newCost) || 0,
        created_by:    user?.id,
      })
      .select('*, project:projects(project_name)')
      .single();
    setSaving(false);
    if (err) { setError(err.message); return; }
    onAdded(data);
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4" noValidate>
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Project */}
        <div>
          <label className="block text-xs font-bold mb-2" style={{ color: '#374151' }}>Project <span style={{ color: '#EF4444' }}>*</span></label>
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)} required
            className={inputCls} style={{ ...inputBaseStyle, backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%239CA3AF\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', appearance: 'none' }}
            onFocus={focused} onBlur={blurred}>
            <option value="">Select project…</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.project_name}</option>)}
          </select>
        </div>
        {/* Category */}
        <div>
          <label className="block text-xs font-bold mb-2" style={{ color: '#374151' }}>Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)}
            className={inputCls} style={{ ...inputBaseStyle, backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%239CA3AF\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', appearance: 'none' }}
            onFocus={focused} onBlur={blurred}>
            <option value="">Select category…</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Title */}
      <div>
        <label className="block text-xs font-bold mb-2" style={{ color: '#374151' }}>Title <span style={{ color: '#EF4444' }}>*</span></label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Upgrade to Quartz Countertops"
          className={inputCls} style={inputBaseStyle} onFocus={focused} onBlur={blurred} />
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-bold mb-2" style={{ color: '#374151' }}>Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
          placeholder="Describe the change and reason…"
          className={inputCls} style={{ ...inputBaseStyle, resize: 'none' }}
          onFocus={focused} onBlur={blurred} />
      </div>

      {/* Costs */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold mb-2" style={{ color: '#374151' }}>Original Cost ($)</label>
          <input type="number" min="0" step="0.01" value={originalCost} onChange={(e) => setOriginalCost(e.target.value)} placeholder="0.00"
            className={inputCls} style={inputBaseStyle} onFocus={focused} onBlur={blurred} />
        </div>
        <div>
          <label className="block text-xs font-bold mb-2" style={{ color: '#374151' }}>New Cost ($)</label>
          <input type="number" min="0" step="0.01" value={newCost} onChange={(e) => setNewCost(e.target.value)} placeholder="0.00"
            className={inputCls} style={inputBaseStyle} onFocus={focused} onBlur={blurred} />
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-1">
        <button type="button" onClick={onCancel}
          className="px-5 py-2.5 rounded-xl text-sm font-bold"
          style={{ backgroundColor: '#F5F4F0', color: '#374151' }}>
          Cancel
        </button>
        <button type="submit" disabled={saving || !projectId || !title.trim()}
          className="px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all duration-150"
          style={{
            backgroundColor: saving || !projectId || !title.trim() ? '#E5E3DF' : '#002147',
            color: saving || !projectId || !title.trim() ? '#9CA3AF' : '#D4AF37',
            cursor: saving || !projectId || !title.trim() ? 'not-allowed' : 'pointer',
          }}
          onMouseEnter={(e) => { if (!saving && projectId && title.trim()) e.currentTarget.style.backgroundColor = '#003166'; }}
          onMouseLeave={(e) => { if (!saving && projectId && title.trim()) e.currentTarget.style.backgroundColor = '#002147'; }}>
          {saving ? (
            <>
              <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" strokeOpacity="0.25" /><path d="M12 2a10 10 0 0 1 10 10" />
              </svg>
              Saving…
            </>
          ) : 'Create Change Order'}
        </button>
      </div>
    </form>
  );
}

// ── Main Approvals page ───────────────────────────────────────────────────────
export default function Approvals() {
  const { isAdmin, user, profile } = useAuth();
  const { state } = useProject();
  const activeDbProject = state.activeDbProject;

  const [orders,    setOrders]    = useState([]);
  const [projects,  setProjects]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [signing,   setSigning]   = useState(null);
  const [showForm,  setShowForm]  = useState(false);

  const fetchOrders = useCallback(async () => {
    let query = supabase
      .from('change_works')
      .select('*, project:projects(project_name)')
      .order('submitted_at', { ascending: false });

    if (activeDbProject?.id) {
      query = query.eq('project_id', activeDbProject.id);
    }

    const { data } = await query;
    setOrders(data ?? []);
    setLoading(false);
  }, [activeDbProject?.id]);

  useEffect(() => {
    fetchOrders();
    if (isAdmin) {
      supabase.from('projects').select('id, project_name').order('project_name')
        .then(({ data }) => setProjects(data ?? []));
    }
  }, [fetchOrders, isAdmin]);

  const pending  = orders.filter((o) => o.status === 'pending');
  const approved = orders.filter((o) => o.status === 'approved');
  const total    = approved.reduce((s, o) => s + (Number(o.new_cost) - Number(o.original_cost)), 0);

  async function approve(id) {
    setSigning(id);
    const signerName = isAdmin
      ? (profile?.full_name || 'Contractor')
      : (profile?.full_name || user?.email || 'Client');

    const now = new Date().toISOString();
    const [, ] = await Promise.all([
      supabase.from('change_works').update({ status: 'approved', approved_at: now, approved_by: signerName }).eq('id', id),
      supabase.from('approvals').insert({ change_work_id: id, action: 'approved', signed_by: signerName }),
    ]);

    setOrders((prev) => prev.map((o) =>
      o.id === id ? { ...o, status: 'approved', approved_at: now, approved_by: signerName } : o
    ));
    setSigning(null);
  }

  async function decline(id) {
    const now = new Date().toISOString();
    const signerName = profile?.full_name || user?.email || 'User';

    await Promise.all([
      supabase.from('change_works').update({ status: 'declined', declined_at: now }).eq('id', id),
      supabase.from('approvals').insert({ change_work_id: id, action: 'declined', signed_by: signerName }),
    ]);

    setOrders((prev) => prev.map((o) =>
      o.id === id ? { ...o, status: 'declined', declined_at: now } : o
    ));
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-bold tracking-[0.18em] uppercase mb-1" style={{ color: '#D4AF37' }}>Contractor Tool</p>
          <h2 className="text-2xl font-bold" style={{ color: '#002147' }}>Change Orders & Approvals</h2>
          <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
            {activeDbProject ? `Showing: ${activeDbProject.project_name}` : 'All projects — track material changes and get digital client approvals.'}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-150 focus:outline-none"
            style={{ backgroundColor: showForm ? '#F5F4F0' : '#002147', color: showForm ? '#002147' : '#D4AF37' }}
            onMouseEnter={(e) => { if (!showForm) e.currentTarget.style.backgroundColor = '#003166'; }}
            onMouseLeave={(e) => { if (!showForm) e.currentTarget.style.backgroundColor = '#002147'; }}
          >
            {showForm ? (
              <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>Cancel</>
            ) : (
              <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>Add Change Order</>
            )}
          </button>
        )}
      </div>

      {/* Add order form */}
      {showForm && (
        <div className="rounded-2xl mb-6" style={{ backgroundColor: '#fff', border: '1.5px solid #D4AF37', boxShadow: '0 2px 12px rgba(0,33,71,0.06)' }}>
          <div className="px-6 pt-5 pb-1">
            <p className="text-sm font-bold" style={{ color: '#002147' }}>New Change Order</p>
            <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>Change orders inherit the project context and require client approval.</p>
          </div>
          <AddOrderForm
            projects={projects}
            onAdded={(data) => { setOrders((prev) => [data, ...prev]); setShowForm(false); }}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Pending',        value: pending.length,  color: '#D97706', bg: '#FFFBEB' },
          { label: 'Approved',       value: approved.length, color: '#059669', bg: '#ECFDF5' },
          { label: 'Approved Value', value: fmt(total),      color: '#2563EB', bg: '#EFF6FF' },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl p-4 text-center" style={{ backgroundColor: s.bg, border: `1.5px solid ${s.color}30` }}>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs font-semibold mt-1" style={{ color: '#6B7280' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center gap-3 py-16">
          <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" strokeOpacity="0.2" /><path d="M12 2a10 10 0 0 1 10 10" />
          </svg>
          <span className="text-sm" style={{ color: '#9CA3AF' }}>Loading change orders…</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && orders.length === 0 && (
        <div className="text-center py-16 rounded-2xl" style={{ backgroundColor: '#fff', border: '1.5px solid #E8E6E1' }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#F5F4F0' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" /><polyline points="9 15 11 17 15 13" />
            </svg>
          </div>
          <p className="text-sm font-semibold mb-1" style={{ color: '#374151' }}>No change orders yet</p>
          <p className="text-xs" style={{ color: '#9CA3AF' }}>
            {isAdmin ? 'Click "Add Change Order" above to create one.' : 'No change orders have been submitted for your projects.'}
          </p>
        </div>
      )}

      {/* Change order cards */}
      {!loading && (
        <div className="space-y-4">
          {orders.map((order) => {
            const cfg      = STATUS_CFG[order.status] ?? STATUS_CFG.pending;
            const isSigning = signing === order.id;
            const delta     = Number(order.new_cost) - Number(order.original_cost);
            const projectName = order.project?.project_name ?? '—';

            return (
              <div key={order.id} className="rounded-2xl overflow-hidden"
                style={{ backgroundColor: '#fff', border: '1.5px solid #E8E6E1', boxShadow: '0 2px 10px rgba(0,33,71,0.06)' }}>
                <div className="h-1" style={{ backgroundColor: cfg.dot }} />

                <div className="p-5">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-bold text-sm" style={{ color: '#002147' }}>{order.title}</h3>
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold shrink-0"
                          style={{ backgroundColor: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}` }}>
                          {cfg.label}
                        </span>
                      </div>
                      <p className="text-xs" style={{ color: '#9CA3AF' }}>
                        {projectName}{order.category ? ` · ${order.category}` : ''} · Submitted {fmtDate(order.submitted_at)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold" style={{ color: delta >= 0 ? '#D97706' : '#059669' }}>
                        {delta >= 0 ? '+' : '-'}{fmt(delta)}
                      </p>
                      <p className="text-xs" style={{ color: '#9CA3AF' }}>cost impact</p>
                    </div>
                  </div>

                  {order.description && (
                    <p className="text-sm leading-relaxed mb-4" style={{ color: '#4A4A4A' }}>{order.description}</p>
                  )}

                  {/* Cost breakdown */}
                  <div className="flex items-center gap-6 px-4 py-2.5 rounded-xl mb-4 text-xs"
                    style={{ backgroundColor: '#F9F8F6', border: '1px solid #F0EEE9' }}>
                    <div>
                      <p style={{ color: '#9CA3AF' }}>Original</p>
                      <p className="font-semibold" style={{ color: '#4A4A4A' }}>{fmt(order.original_cost)}</p>
                    </div>
                    <span style={{ color: '#D1D5DB' }}>→</span>
                    <div>
                      <p style={{ color: '#9CA3AF' }}>Revised</p>
                      <p className="font-semibold" style={{ color: '#002147' }}>{fmt(order.new_cost)}</p>
                    </div>
                    <div className="ml-auto">
                      <p style={{ color: '#9CA3AF' }}>Change</p>
                      <p className="font-bold" style={{ color: delta >= 0 ? '#D97706' : '#059669' }}>
                        {delta >= 0 ? '+' : ''}{fmt(delta)}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  {order.status === 'pending' && (
                    <div className="flex gap-3">
                      <button onClick={() => approve(order.id)} disabled={isSigning}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all duration-150 focus:outline-none"
                        style={{ backgroundColor: isSigning ? '#D1FAE5' : '#ECFDF5', color: '#065F46', border: '1.5px solid #6EE7B7' }}>
                        {isSigning ? (
                          <><svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10" strokeOpacity="0.3" /><path d="M12 2a10 10 0 0 1 10 10" /></svg>Signing…</>
                        ) : (
                          <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>Digitally Approve</>
                        )}
                      </button>
                      <button onClick={() => decline(order.id)}
                        className="flex-1 py-2.5 rounded-xl text-sm font-bold focus:outline-none"
                        style={{ backgroundColor: '#FEF2F2', color: '#991B1B', border: '1.5px solid #FECACA' }}>
                        Decline
                      </button>
                    </div>
                  )}

                  {order.status === 'approved' && (
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl" style={{ backgroundColor: '#ECFDF5', border: '1px solid #6EE7B7' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      <p className="text-xs font-semibold" style={{ color: '#065F46' }}>
                        Digitally signed by {order.approved_by} · {fmtDate(order.approved_at)}
                      </p>
                    </div>
                  )}

                  {order.status === 'declined' && (
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl" style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                      <p className="text-xs font-semibold" style={{ color: '#991B1B' }}>
                        Declined · {fmtDate(order.declined_at)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
