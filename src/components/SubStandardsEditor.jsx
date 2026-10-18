// Subcontractors → Standards: the Subcontractor Standards every Subcontract
// Agreement includes (Exhibit A for all trades, Exhibit B per trade). Admins
// edit the text and publish it as a new version (migration 060); new
// agreements use the latest version, agreements already sent keep theirs.
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { TRADES } from '../utils/trades';
import { BUILT_IN_VERSION, MAX_SECTION, normalizeStandards, versionLabel } from '../utils/subStandards';

const NAVY = '#002147';
const card = { backgroundColor: '#fff', border: '1.5px solid #E8E6E1', boxShadow: '0 2px 12px rgba(0,33,71,0.05)' };
const box = { border: '1px solid #D1D5DB', color: '#1F2937', backgroundColor: '#fff' };
const missingTable = (error) => /sub_standards_versions|schema cache|does not exist/i.test(error?.message ?? '');
const rowsFor = (text) => Math.min(14, Math.max(3, String(text).split('\n').length + 1));

function Section({ title, onTitle, text, onText, label, onRemove, onUp }) {
  return (
    <div className="py-3" style={{ borderTop: '1px solid #F3F4F6' }}>
      <div className="flex flex-wrap items-center gap-2 mb-1.5">
        {label && <span className="text-xs font-bold" style={{ color: '#9CA3AF' }}>{label}</span>}
        <input value={title} onChange={(e) => onTitle(e.target.value.slice(0, 120))} aria-label={`${label ?? ''} title`.trim()}
          className="flex-1 min-w-[200px] text-sm font-bold px-2 py-1 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-300" style={{ ...box, color: NAVY }} />
        {onUp && <button type="button" onClick={onUp} className="text-xs underline" style={{ color: '#6B7280' }} aria-label={`Move ${title} up`}>Move up</button>}
        {onRemove && <button type="button" onClick={onRemove} className="text-xs underline" style={{ color: '#9CA3AF' }} aria-label={`Remove ${title}`}>Remove</button>}
      </div>
      <textarea value={text} onChange={(e) => onText(e.target.value.slice(0, MAX_SECTION))} rows={rowsFor(text)} aria-label={`${title} text`}
        className="w-full text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-300" style={{ ...box, lineHeight: 1.5 }} />
    </div>
  );
}

export default function SubStandardsEditor() {
  const [versions, setVersions] = useState(null);   // published versions, newest first (null = loading)
  const [missing, setMissing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [notes, setNotes] = useState('');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    let live = true;
    supabase.from('sub_standards_versions').select('version_no, content, notes, published_at')
      .order('version_no', { ascending: false })
      .then(({ data, error }) => {
        if (!live) return;
        if (error) {
          setMissing(missingTable(error));
          if (!missingTable(error)) setMsg({ status: 'error', text: `Could not load the standards: ${error.message}` });
          setVersions([]);
        } else {
          setVersions((data ?? []).map((v) => ({ ...v, content: normalizeStandards(v.content) })));
        }
      });
    return () => { live = false; };
  }, []);

  const current = versions?.[0] ?? BUILT_IN_VERSION;
  const all = versions ? [...versions, BUILT_IN_VERSION] : [];
  const base = useMemo(() => normalizeStandards(current.content), [current]);
  const doc = draft ?? base;
  const dirty = draft != null && JSON.stringify(draft) !== JSON.stringify(base);

  const edit = (fn) => { setDraft((d) => fn(structuredClone(d ?? base))); setMsg(null); };
  const setGeneral = (i, field, val) => edit((d) => { d.general[i][field] = val; return d; });
  const setTrade = (key, field, val) => edit((d) => { d.trades[key][field] = val; return d; });

  async function publish() {
    const next = current.version_no + 1;
    if (!confirm(`Publish these standards as Version ${next}?\n\nNew Subcontract Agreements will include Version ${next}. Agreements already sent or signed keep the version they were sent with.`)) return;
    setBusy(true); setMsg(null);
    const { data, error } = await supabase.from('sub_standards_versions')
      .insert({ version_no: next, content: doc, notes: notes.trim().slice(0, 300) })
      .select('version_no, content, notes, published_at').single();
    setBusy(false);
    if (error) {
      setMsg({ status: 'error', text: missingTable(error) ? 'Not published — run migration 060 in Supabase first.' : `Not published: ${error.message}` });
      return;
    }
    setVersions((list) => [{ ...data, content: normalizeStandards(data.content) }, ...(list ?? [])]);
    setDraft(null); setNotes('');
    setMsg({ status: 'ok', text: `Published Version ${next}. New agreements will use it.` });
  }

  if (versions === null) return <p className="text-sm py-10 text-center" style={{ color: '#9CA3AF' }}>Loading…</p>;

  return (
    <div className="space-y-4" data-testid="sub-standards-editor">
      <div className="rounded-2xl p-5 text-sm" style={card}>
        <p style={{ color: '#374151' }}>
          Every Subcontract Agreement you send from <b>Remodel Estimates → Subs &amp; Materials</b> includes these standards:
          Exhibit A for all trades, plus the Exhibit B section for that trade. Edit the text below and click <b>Publish</b>.
          New agreements use the latest version; agreements already sent keep the version they were sent with.
          Each line is one bullet.
        </p>
        <p className="mt-2 font-semibold" style={{ color: NAVY }} data-testid="standards-current">
          Current: {versionLabel(current)}{current.notes ? ` — ${current.notes}` : ''}
        </p>
        {missing && (
          <p role="alert" className="mt-2 font-semibold" style={{ color: '#DC2626' }}>
            Saving versions is not set up yet — run migration 060 in Supabase first. Agreements use the built-in Version 1 until then.
          </p>
        )}
      </div>

      <section className="rounded-2xl p-5" style={card} aria-labelledby="std-a">
        <h3 id="std-a" className="text-sm font-extrabold" style={{ color: NAVY }}>Exhibit A — General Standards (All Trades)</h3>
        <label className="block mt-3">
          <span className="block text-xs font-bold mb-1" style={{ color: '#6B7280' }}>Introduction</span>
          <textarea value={doc.intro} onChange={(e) => edit((d) => { d.intro = e.target.value.slice(0, MAX_SECTION); return d; })} rows={3}
            className="w-full text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-300" style={{ ...box, lineHeight: 1.5 }} />
        </label>
        {doc.general.map((g, i) => (
          <Section key={i} label={`${i + 1}.`} title={g.title} text={g.text}
            onTitle={(v) => setGeneral(i, 'title', v)} onText={(v) => setGeneral(i, 'text', v)}
            onUp={i > 0 ? () => edit((d) => { [d.general[i - 1], d.general[i]] = [d.general[i], d.general[i - 1]]; return d; }) : null}
            onRemove={() => { if (confirm(`Remove section "${g.title}"?`)) edit((d) => { d.general.splice(i, 1); return d; }); }} />
        ))}
        <button type="button" onClick={() => edit((d) => { d.general.push({ title: 'New section', text: '' }); return d; })}
          className="mt-2 text-xs font-bold underline" style={{ color: '#0369A1' }}>+ Add a section</button>
      </section>

      <section className="rounded-2xl p-5" style={card} aria-labelledby="std-b">
        <h3 id="std-b" className="text-sm font-extrabold" style={{ color: NAVY }}>Exhibit B — Trade-Specific Expectations</h3>
        <p className="text-xs mt-1" style={{ color: '#6B7280' }}>One section per trade in Subs &amp; Materials. Only list what is special to the trade — rules for everyone belong in Exhibit A.</p>
        {TRADES.map((t) => (
          <Section key={t.key} label={t.label} title={doc.trades[t.key].title} text={doc.trades[t.key].text}
            onTitle={(v) => setTrade(t.key, 'title', v)} onText={(v) => setTrade(t.key, 'text', v)} />
        ))}
      </section>

      <section className="rounded-2xl p-5" style={card} aria-labelledby="std-c">
        <h3 id="std-c" className="text-sm font-extrabold" style={{ color: NAVY }}>Agreement paragraph (above the signatures)</h3>
        <textarea value={doc.incorporation} onChange={(e) => edit((d) => { d.incorporation = e.target.value.slice(0, MAX_SECTION); return d; })} rows={3}
          aria-label="Agreement paragraph" className="mt-2 w-full text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-300" style={{ ...box, lineHeight: 1.5 }} />
        <p className="text-xs mt-1" style={{ color: '#6B7280' }}>
          Exhibit C (the job's Scope of Work, price and payment schedule) is filled in from each estimate when you create the agreement.
        </p>
      </section>

      <div className="sticky bottom-0 rounded-2xl p-4 flex flex-wrap items-center gap-2" style={{ ...card, borderColor: dirty ? '#D4AF37' : '#E8E6E1' }}>
        <input value={notes} onChange={(e) => setNotes(e.target.value.slice(0, 300))} placeholder="What changed? (optional)" aria-label="What changed"
          className="flex-1 min-w-[200px] text-sm px-3 py-2 rounded-lg focus:outline-none" style={box} />
        <button type="button" onClick={publish} disabled={!dirty || busy || missing}
          className="px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50" style={{ backgroundColor: NAVY, color: '#D4AF37' }}>
          {busy ? 'Publishing…' : `Publish as Version ${current.version_no + 1}`}
        </button>
        {dirty && (
          <button type="button" onClick={() => { setDraft(null); setMsg(null); }} className="px-3 py-2 rounded-lg text-sm font-semibold"
            style={{ border: '1px solid #D1D5DB', color: '#4B5563' }}>Discard changes</button>
        )}
        {!dirty && !msg && <span className="text-xs" style={{ color: '#9CA3AF' }}>No unpublished changes.</span>}
        {msg && <span role={msg.status === 'error' ? 'alert' : 'status'} className="text-sm font-semibold" style={{ color: msg.status === 'error' ? '#DC2626' : '#059669' }}>{msg.text}</span>}
      </div>

      <div className="rounded-2xl p-5 text-sm" style={card}>
        <button type="button" onClick={() => setShowHistory((o) => !o)} aria-expanded={showHistory} className="font-bold" style={{ color: NAVY }}>
          Version history ({all.length}) {showHistory ? '▴' : '▾'}
        </button>
        {showHistory && (
          <table className="w-full mt-2 text-xs">
            <tbody>
              {all.map((v) => (
                <tr key={v.version_no} style={{ borderTop: '1px solid #F3F4F6' }}>
                  <td className="py-1.5 font-semibold" style={{ color: NAVY }}>{versionLabel(v)}</td>
                  <td className="py-1.5" style={{ color: '#6B7280' }}>{v.notes}</td>
                  <td className="py-1.5 text-right">
                    {v.version_no !== current.version_no && (
                      <button type="button" className="underline font-semibold" style={{ color: '#0369A1' }}
                        onClick={() => { if (!dirty || confirm('Replace your unpublished changes with this version\'s text?')) { setDraft(normalizeStandards(v.content)); setMsg({ status: 'ok', text: `Loaded the text of Version ${v.version_no}. Publish to make it current.` }); } }}>
                        Load this text
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
