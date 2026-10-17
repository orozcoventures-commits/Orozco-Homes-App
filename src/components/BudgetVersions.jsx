import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

// Saved versions of a project's Remodel Estimate (migration 056).
// "Save version" stores a snapshot of the estimate (its saved fields, each
// line's amount and the totals); a version can be compared with the current
// estimate or restored (the current estimate is saved as a version first).

const fmt = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('en-US');
const fmtDate = (iso) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const missingTable = (error) => /remodel_budget_versions|schema cache|does not exist/i.test(error?.message ?? '');
const versionLabel = (v) => `v${v.version_no}${v.name ? ` · ${v.name}` : ''}`;

function diffLines(oldLines = [], newLines = []) {
  const byKey = (list) => new Map(list.map((l) => [l.wbs, l]));
  const a = byKey(oldLines); const b = byKey(newLines);
  const rows = [];
  for (const [wbs, n] of b) {
    const o = a.get(wbs);
    if (!o) rows.push({ wbs, label: n.label, section: n.section, old: null, now: n.value });
    else if (Math.round(o.value) !== Math.round(n.value) || o.label !== n.label) rows.push({ wbs, label: n.label, section: n.section, old: o.value, now: n.value, renamed: o.label !== n.label ? o.label : null });
  }
  for (const [wbs, o] of a) if (!b.has(wbs)) rows.push({ wbs, label: o.label, section: o.section, old: o.value, now: null });
  return rows;
}

export default function BudgetVersions({ projectId, getSnapshot, onRestore }) {
  const [open, setOpen] = useState(false);
  const [versions, setVersions] = useState(null);   // null = not loaded
  const [name, setName] = useState('');
  const [msg, setMsg] = useState(null);             // { status, text }
  const [busy, setBusy] = useState(false);
  const [compare, setCompare] = useState(null);     // version being compared

  useEffect(() => {
    if (!projectId || !open) return undefined;
    let live = true;
    supabase.from('remodel_budget_versions').select('id, version_no, name, snapshot, created_at')
      .eq('project_id', projectId).order('version_no', { ascending: false })
      .then(({ data, error }) => {
        if (!live) return;
        if (error) { setVersions([]); setMsg({ status: 'error', text: missingTable(error) ? 'Versions are not set up yet — run migration 056 in Supabase first.' : `Could not load versions: ${error.message}` }); return; }
        setVersions(data ?? []);
      });
    return () => { live = false; };
  }, [projectId, open]);

  // Reset when the project changes.
  const [shownFor, setShownFor] = useState(projectId);
  if (shownFor !== projectId) { setShownFor(projectId); setVersions(null); setCompare(null); setMsg(null); setName(''); }

  if (!projectId) return null;
  const count = versions?.length ?? 0;

  async function insertVersion(label) {
    const nextNo = Math.max(0, ...(versions ?? []).map((v) => v.version_no)) + 1;
    const { data, error } = await supabase.from('remodel_budget_versions')
      .insert({ project_id: projectId, version_no: nextNo, name: label.slice(0, 80), snapshot: getSnapshot() })
      .select('id, version_no, name, snapshot, created_at').single();
    if (error) throw error;
    setVersions((list) => [data, ...(list ?? [])]);
    return data;
  }

  async function saveVersion(e) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      const v = await insertVersion(name.trim());
      setName('');
      setMsg({ status: 'ok', text: `Saved ${versionLabel(v)}.` });
    } catch (error) {
      setMsg({ status: 'error', text: missingTable(error) ? 'Not saved — run migration 056 in Supabase first.' : `Not saved: ${error.message}` });
    }
    setBusy(false);
  }

  async function restore(v) {
    if (!confirm(`Restore ${versionLabel(v)}? The current estimate is saved as a new version first, so nothing is lost. Actual costs are not changed.`)) return;
    setBusy(true); setMsg(null);
    try {
      await insertVersion(`Before restoring v${v.version_no}`);
      onRestore(v.snapshot.budget);
      setCompare(null);
      setMsg({ status: 'ok', text: `Restored ${versionLabel(v)}. The previous estimate was saved as a version.` });
    } catch (error) {
      setMsg({ status: 'error', text: `Not restored: ${error.message}` });
    }
    setBusy(false);
  }

  async function remove(v) {
    if (!confirm(`Delete ${versionLabel(v)}? This can't be undone. The current estimate is not changed.`)) return;
    const { error } = await supabase.from('remodel_budget_versions').delete().eq('id', v.id);
    if (error) { setMsg({ status: 'error', text: `Not deleted: ${error.message}` }); return; }
    setVersions((list) => list.filter((x) => x.id !== v.id));
    if (compare?.id === v.id) setCompare(null);
  }

  const current = open ? getSnapshot() : null;
  const rows = compare && current ? diffLines(compare.snapshot.lines, current.lines) : [];
  const t0 = compare?.snapshot.totals ?? {}; const t1 = current?.totals ?? {};
  const delta = (k) => (t1[k] ?? 0) - (t0[k] ?? 0);
  const signed = (n) => `${n >= 0 ? '+' : '−'}${fmt(Math.abs(n))}`;

  return (
    <div className="w-full">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="text-xs font-bold px-3 py-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-300"
        style={{ border: '1px solid #CBD5E1', color: '#002147', backgroundColor: '#fff' }}>
        Versions{versions ? ` (${count})` : ''} {open ? '▴' : '▾'}
      </button>
      {open && (
        <div className="mt-2 rounded-2xl p-4 text-xs" style={{ backgroundColor: '#fff', border: '1.5px solid #E8E6E1', boxShadow: '0 2px 12px rgba(0,33,71,0.05)' }} data-testid="versions-panel">
          <form onSubmit={saveVersion} className="flex flex-wrap items-center gap-2 mb-3">
            <input value={name} onChange={(e) => setName(e.target.value.slice(0, 80))} placeholder="Version name (e.g. After selections)"
              aria-label="Version name" className="flex-1 min-w-[180px] px-2.5 py-1.5 rounded-lg focus:outline-none" style={{ border: '1px solid #D1D5DB', color: '#002147' }} />
            <button type="submit" disabled={busy} className="px-3 py-1.5 rounded-lg font-bold disabled:opacity-60" style={{ backgroundColor: '#002147', color: '#D4AF37' }}>
              Save version
            </button>
          </form>
          {msg && <p role={msg.status === 'error' ? 'alert' : 'status'} className="mb-2 font-semibold" style={{ color: msg.status === 'error' ? '#DC2626' : '#059669' }}>{msg.text}</p>}
          {versions === null ? (
            <p style={{ color: '#9CA3AF' }}>Loading…</p>
          ) : count === 0 ? (
            <p style={{ color: '#9CA3AF' }}>No versions yet. Save one before big changes (for example after the first walkthrough, and again after selections).</p>
          ) : (
            <table className="w-full">
              <tbody>
                {versions.map((v) => (
                  <tr key={v.id} style={{ borderTop: '1px solid #F3F4F6' }}>
                    <td className="py-1.5 font-semibold" style={{ color: '#002147' }}>{versionLabel(v)}</td>
                    <td className="py-1.5" style={{ color: '#6B7280' }}>{fmtDate(v.created_at)}</td>
                    <td className="py-1.5 text-right font-semibold" style={{ color: '#002147' }}>{fmt(v.snapshot?.totals?.clientPrice)}</td>
                    <td className="py-1.5 text-right whitespace-nowrap">
                      <button type="button" onClick={() => setCompare(compare?.id === v.id ? null : v)} className="ml-2 font-bold underline" style={{ color: '#0369A1' }}>
                        {compare?.id === v.id ? 'Hide' : 'Compare'}
                      </button>
                      <button type="button" disabled={busy} onClick={() => restore(v)} className="ml-2 font-bold underline disabled:opacity-60" style={{ color: '#002147' }}>Restore</button>
                      <button type="button" onClick={() => remove(v)} className="ml-2 underline" style={{ color: '#9CA3AF' }} aria-label={`Delete ${versionLabel(v)}`}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {compare && current && (
            <div className="mt-3 rounded-lg p-3" style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }} data-testid="version-compare">
              <p className="font-bold mb-2" style={{ color: '#002147' }}>{versionLabel(compare)} → current estimate</p>
              <div className="flex flex-wrap gap-x-5 gap-y-1 mb-2">
                {[['clientPrice', 'Client price'], ['directCosts', 'Direct costs'], ['margin', 'Gross margin']].map(([k, label]) => (
                  <span key={k}>{label}: {fmt(t0[k])} → <b>{fmt(t1[k])}</b>{' '}
                    <span style={{ color: delta(k) === 0 ? '#6B7280' : delta(k) > 0 ? '#B45309' : '#059669' }}>({signed(delta(k))})</span>
                  </span>
                ))}
              </div>
              {rows.length === 0 ? (
                <p style={{ color: '#6B7280' }}>No line changes.</p>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr style={{ color: '#9CA3AF' }}>
                      <th className="text-left font-semibold pb-1">Line</th>
                      <th className="text-right font-semibold pb-1">{`v${compare.version_no}`}</th>
                      <th className="text-right font-semibold pb-1">Now</th>
                      <th className="text-right font-semibold pb-1">Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.wbs} style={{ borderTop: '1px solid #E2E8F0' }}>
                        <td className="py-1" style={{ color: '#374151' }}>
                          {r.label} <span style={{ color: '#9CA3AF' }}>· {r.section}</span>
                          {r.old == null && <span className="ml-1 font-semibold" style={{ color: '#059669' }}>added</span>}
                          {r.now == null && <span className="ml-1 font-semibold" style={{ color: '#DC2626' }}>removed</span>}
                          {r.renamed && <span className="ml-1" style={{ color: '#9CA3AF' }}>(was “{r.renamed}”)</span>}
                        </td>
                        <td className="py-1 text-right">{r.old == null ? '—' : fmt(r.old)}</td>
                        <td className="py-1 text-right">{r.now == null ? '—' : fmt(r.now)}</td>
                        <td className="py-1 text-right font-semibold">{signed((r.now ?? 0) - (r.old ?? 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
