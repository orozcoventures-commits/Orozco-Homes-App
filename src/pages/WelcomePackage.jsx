// Sales → Welcome Package: edit the client Welcome & Capabilities Package,
// preview it and print / save it as PDF (src/utils/welcomePackage.js). Saved in
// welcome_package (migration 061); until then the built-in version is shown.
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  ITEM_KINDS, MAX_TEXT, SECTION_KINDS, defaultWelcomePackage, newSection, normalizeWelcomePackage, welcomePackageHtml, welcomeUrl,
} from '../utils/welcomePackage';
import { SECTION_MARKUP_HELP } from '../utils/proposalTemplate';

const NAVY = '#002147';
const GOLD = '#D4AF37';
const card = { backgroundColor: '#fff', border: '1.5px solid #E8E6E1', boxShadow: '0 2px 12px rgba(0,33,71,0.05)' };
const box = { border: '1px solid #D1D5DB', color: '#1F2937', backgroundColor: '#fff' };
const missingTable = (error) => /welcome_package|schema cache|does not exist/i.test(error?.message ?? '');
const rowsFor = (text, min = 2) => Math.min(12, Math.max(min, String(text ?? '').split('\n').length + 1));

function Input({ label, value, onChange, max = 200, wide }) {
  return (
    <label className={`block ${wide ? 'sm:col-span-2' : ''}`}>
      <span className="block text-xs font-bold mb-1" style={{ color: '#6B7280' }}>{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value.slice(0, max))}
        className="w-full text-sm px-2.5 py-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-300" style={box} />
    </label>
  );
}

function Area({ label, value, onChange, hint, min }) {
  return (
    <label className="block">
      <span className="block text-xs font-bold mb-1" style={{ color: '#6B7280' }}>{label}</span>
      <textarea value={value} onChange={(e) => onChange(e.target.value.slice(0, MAX_TEXT))} rows={rowsFor(value, min)}
        className="w-full text-sm px-2.5 py-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-300" style={{ ...box, lineHeight: 1.5 }} />
      {hint && <span className="block text-[11px] mt-0.5" style={{ color: '#9CA3AF' }}>{hint}</span>}
    </label>
  );
}

const small = 'text-xs underline focus:outline-none';

function Items({ section, set }) {
  const list = section.items;
  const put = (next) => set({ ...section, items: next });
  const noun = section.kind === 'table' ? 'row' : section.kind === 'steps' ? 'step' : 'card';
  return (
    <div className="space-y-2">
      {list.map((it, i) => (
        <div key={i} className="rounded-lg p-2.5" style={{ backgroundColor: '#F9F8F6', border: '1px solid #EEECE7' }}>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="text-xs font-bold" style={{ color: '#9CA3AF' }}>{noun} {i + 1}</span>
            <input value={it.title} onChange={(e) => put(list.map((x, j) => (j === i ? { ...x, title: e.target.value.slice(0, 200) } : x)))}
              placeholder="Title" aria-label={`${noun} ${i + 1} title`}
              className="flex-1 min-w-[180px] text-sm font-semibold px-2 py-1 rounded-md focus:outline-none" style={{ ...box, color: NAVY }} />
            {i > 0 && <button type="button" className={small} style={{ color: '#6B7280' }} onClick={() => { const n = [...list]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; put(n); }}>Move up</button>}
            <button type="button" className={small} style={{ color: '#9CA3AF' }} onClick={() => put(list.filter((_, j) => j !== i))}>Remove</button>
          </div>
          <textarea value={it.text} onChange={(e) => put(list.map((x, j) => (j === i ? { ...x, text: e.target.value.slice(0, MAX_TEXT) } : x)))}
            rows={rowsFor(it.text)} aria-label={`${noun} ${i + 1} text`}
            className="w-full text-sm px-2 py-1 rounded-md focus:outline-none" style={{ ...box, lineHeight: 1.5 }} />
        </div>
      ))}
      <button type="button" onClick={() => put([...list, { title: '', text: '' }])} className="text-xs font-bold underline" style={{ color: '#0369A1' }}>
        + Add a {noun}
      </button>
    </div>
  );
}

function SectionEditor({ section, index, count, set, move, remove }) {
  const k = section.kind;
  const label = `${SECTION_KINDS[k]}${section.title ? ` — ${section.title}` : section.eyebrow ? ` — ${section.eyebrow}` : ''}`;
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl" style={card} data-testid="wp-section">
      <div className="flex flex-wrap items-center gap-2 px-4 py-3">
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
          className="flex-1 min-w-[200px] text-left text-sm font-bold focus:outline-none" style={{ color: NAVY }}>
          <span className="text-xs font-bold mr-2 px-1.5 py-0.5 rounded" style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}>{index + 1}</span>
          {label} <span style={{ color: '#9CA3AF' }}>{open ? '▴' : '▾'}</span>
        </button>
        {section.newPage && <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>New page</span>}
        {index > 0 && <button type="button" className={small} style={{ color: '#6B7280' }} onClick={() => move(-1)}>Move up</button>}
        {index < count - 1 && <button type="button" className={small} style={{ color: '#6B7280' }} onClick={() => move(1)}>Move down</button>}
        <button type="button" className={small} style={{ color: '#9CA3AF' }} onClick={remove} aria-label={`Remove ${label}`}>Remove</button>
      </div>
      {open && (
        <div className="px-4 pb-4 space-y-3" style={{ borderTop: '1px solid #F3F4F6' }}>
          <label className="flex items-center gap-2 text-xs pt-3" style={{ color: '#4B5563' }}>
            <input type="checkbox" checked={section.newPage} onChange={(e) => set({ ...section, newPage: e.target.checked })} />
            Start this section on a new page
          </label>
          <div className="grid sm:grid-cols-2 gap-3">
            {k !== 'contact' && <Input label="Small label above the title (optional — makes the title large)" value={section.eyebrow} onChange={(v) => set({ ...section, eyebrow: v })} max={120} />}
            <Input label={k === 'contact' ? 'Box title' : 'Title (optional)'} value={section.title} onChange={(v) => set({ ...section, title: v })} />
          </div>
          {k !== 'contact' && <Area label="Intro paragraph (optional)" value={section.intro} onChange={(v) => set({ ...section, intro: v })} min={2} />}
          {k === 'text' && <Area label="Text" value={section.body} onChange={(v) => set({ ...section, body: v })} hint={SECTION_MARKUP_HELP} min={4} />}
          {(k === 'quote' || k === 'callout') && <Area label={k === 'quote' ? 'Quote' : 'Highlighted text'} value={section.text} onChange={(v) => set({ ...section, text: v })} hint="Wrap words in **double stars** for bold." />}
          {k === 'table' && (
            <div className="grid sm:grid-cols-2 gap-3">
              <Input label="Left column heading" value={section.col1} onChange={(v) => set({ ...section, col1: v })} max={60} />
              <Input label="Right column heading" value={section.col2} onChange={(v) => set({ ...section, col2: v })} max={60} />
            </div>
          )}
          {ITEM_KINDS.has(k) && <Items section={section} set={set} />}
          {k === 'contact' && <p className="text-xs" style={{ color: '#6B7280' }}>Shows the contact details from “Cover & contact” above.</p>}
        </div>
      )}
    </div>
  );
}

// "Send to client": the /welcome link, to copy or email (pick a client or type an address).
function SendPanel({ dirty, contactName, onClose }) {
  const [clients, setClients] = useState(null);
  const [to, setTo] = useState('');
  const [copied, setCopied] = useState('');
  useEffect(() => {
    supabase.from('clients').select('id, full_name, email').order('full_name')
      .then(({ data }) => setClients((data ?? []).filter((c) => c.email)));
  }, []);
  const url = welcomeUrl();
  const client = clients?.find((c) => c.email === to);
  const first = client?.full_name?.split(/\s+/)[0];
  const body = `${first ? `Hi ${first},` : 'Hello,'}\n\nThank you for considering Orozco Homes for your project. Here is our Welcome & Capabilities Package — what we stand for, how we work and what to expect:\n${url}\n\nWe look forward to working with you.\n\n${contactName}\nOrozco Homes`;
  const mailto = `mailto:${encodeURIComponent(to.trim())}?subject=${encodeURIComponent('Welcome to Orozco Homes')}&body=${encodeURIComponent(body)}`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied('Link copied.'); } catch { setCopied('Could not copy — select the link and copy it.'); }
  };
  return (
    <div className="rounded-2xl p-4 mb-4 space-y-3" style={{ ...card, borderColor: GOLD }} data-testid="wp-send">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold" style={{ color: NAVY }}>Send to a client</p>
        <button type="button" onClick={onClose} className="text-xs underline" style={{ color: '#6B7280' }}>Close</button>
      </div>
      {dirty && (
        <p className="text-xs font-semibold" style={{ color: '#92400E' }}>You have unsaved changes — click Save first. The link shows your last saved version.</p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <input readOnly value={url} onFocus={(e) => e.target.select()} aria-label="Welcome Package link"
          className="flex-1 min-w-[220px] text-sm px-2.5 py-1.5 rounded-lg" style={{ ...box, color: '#6B7280' }} />
        <button type="button" onClick={copy} className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ backgroundColor: NAVY, color: GOLD }}>Copy link</button>
        <a href={url} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ border: '1.5px solid #E8E6E1', color: '#4B5563', backgroundColor: '#fff' }}>Open as client</a>
      </div>
      {copied && <p role="status" className="text-xs font-semibold" style={{ color: '#059669' }}>{copied}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <select value={client ? to : ''} onChange={(e) => setTo(e.target.value)} aria-label="Pick a client"
          className="text-sm px-2 py-1.5 rounded-lg max-w-[260px]" style={box}>
          <option value="">{clients ? 'Pick a client…' : 'Loading clients…'}</option>
          {(clients ?? []).map((c) => <option key={c.id} value={c.email}>{c.full_name || c.email}</option>)}
        </select>
        <input value={to} onChange={(e) => setTo(e.target.value.slice(0, 200))} placeholder="or type an email" aria-label="Client email"
          className="flex-1 min-w-[200px] text-sm px-2.5 py-1.5 rounded-lg" style={box} />
        <a href={mailto} className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ backgroundColor: '#059669', color: '#fff' }}>Email…</a>
      </div>
      <p className="text-[11px]" style={{ color: '#9CA3AF' }}>
        “Email…” opens your email app with a ready message and the link. Anyone with the link can view the package; it shows your latest saved version.
      </p>
    </div>
  );
}

export default function WelcomePackage() {
  const [saved, setSaved] = useState(null);        // last saved content (null = loading)
  const [draft, setDraft] = useState(null);
  const [missing, setMissing] = useState(false);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState('edit');
  const [updatedAt, setUpdatedAt] = useState(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let live = true;
    supabase.from('welcome_package').select('content, updated_at').eq('id', 'default').maybeSingle()
      .then(({ data, error }) => {
        if (!live) return;
        if (error) {
          setMissing(missingTable(error));
          if (!missingTable(error)) setMsg({ status: 'error', text: `Could not load the saved version: ${error.message}` });
        }
        const c = normalizeWelcomePackage(data?.content);
        setSaved(c); setDraft(c); setUpdatedAt(data?.updated_at ?? null);
      });
    return () => { live = false; };
  }, []);

  const html = useMemo(() => (draft ? welcomePackageHtml(draft, { logoUrl: `${window.location.origin}/orozco-homes-logo.png` }) : ''), [draft]);
  if (!draft) return <p className="text-sm py-20 text-center" style={{ color: '#9CA3AF' }}>Loading…</p>;
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const edit = (fn) => { setDraft((d) => fn(structuredClone(d))); setMsg(null); };
  const setSection = (i, s) => edit((d) => { d.sections[i] = s; return d; });

  async function save() {
    setBusy(true); setMsg(null);
    const { data, error } = await supabase.from('welcome_package')
      .upsert({ id: 'default', content: draft }, { onConflict: 'id' }).select('updated_at').single();
    setBusy(false);
    if (error) { setMsg({ status: 'error', text: missingTable(error) ? 'Not saved — run migration 061 in Supabase first.' : `Not saved: ${error.message}` }); return; }
    setSaved(draft); setUpdatedAt(data?.updated_at ?? new Date().toISOString());
    setMsg({ status: 'ok', text: 'Saved.' });
  }

  function printPdf() {
    const win = window.open('', '_blank');
    if (!win) { setMsg({ status: 'error', text: 'Allow pop-ups for this site to print the package.' }); return; }
    win.document.write(welcomePackageHtml(draft, { logoUrl: `${window.location.origin}/orozco-homes-logo.png`, autoPrint: true }));
    win.document.close();
  }

  const btn = (primary) => (primary ? { backgroundColor: NAVY, color: GOLD } : { border: '1.5px solid #E8E6E1', backgroundColor: '#fff', color: '#4B5563' });
  return (
    <div className="px-4 sm:px-6 pt-8 pb-28 max-w-5xl mx-auto" data-testid="welcome-package">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: GOLD }}>Sales</p>
          <h1 className="text-2xl font-bold" style={{ color: NAVY }}>Welcome Package</h1>
          <p className="text-sm mt-0.5" style={{ color: '#6B7280' }}>
            The Welcome &amp; Capabilities Package you send new clients. Edit anything, preview it, then Print / Save as PDF.
          </p>
          <p className="text-xs mt-1" style={{ color: '#9CA3AF' }} data-testid="wp-saved-at">
            {updatedAt ? `Last saved ${new Date(updatedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}` : 'Showing the original version (not saved yet).'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setSending((o) => !o)} className="px-4 py-2 rounded-xl text-xs font-bold" style={{ backgroundColor: '#059669', color: '#fff' }}>
            Send to client
          </button>
          <button type="button" onClick={printPdf} className="px-4 py-2 rounded-xl text-xs font-bold" style={{ backgroundColor: GOLD, color: NAVY }}>
            Print / Save as PDF
          </button>
        </div>
      </div>
      {sending && <SendPanel dirty={dirty} contactName={saved.contact.name} onClose={() => setSending(false)} />}
      {missing && (
        <p role="alert" className="mb-4 text-sm font-semibold" style={{ color: '#DC2626' }}>
          Saving is not set up yet — run migration 061 in Supabase first. You can still edit, preview and print.
        </p>
      )}

      <div role="tablist" className="flex gap-1 mb-4 p-1 rounded-xl w-fit" style={{ backgroundColor: '#F3F4F6' }}>
        {[['edit', 'Edit'], ['preview', 'Preview']].map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
            className="px-4 py-1.5 rounded-lg text-sm font-bold" style={tab === key ? { backgroundColor: NAVY, color: GOLD } : { color: '#4B5563' }}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'preview' ? (
        <iframe title="Welcome Package preview" srcDoc={html} className="w-full rounded-2xl" style={{ ...card, height: '80vh' }} />
      ) : (
        <div className="space-y-3">
          <div className="rounded-2xl p-4" style={card}>
            <p className="text-sm font-bold mb-3" style={{ color: NAVY }}>Cover &amp; contact</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <Input label="Cover — small label" value={draft.cover.eyebrow} onChange={(v) => edit((d) => { d.cover.eyebrow = v; return d; })} />
              <Input label="Cover — title" value={draft.cover.title} onChange={(v) => edit((d) => { d.cover.title = v; return d; })} />
              <Input label="Cover — subtitle" value={draft.cover.subtitle} onChange={(v) => edit((d) => { d.cover.subtitle = v; return d; })} wide />
              {[['name', 'Contact name'], ['title', 'Contact title'], ['phone', 'Phone'], ['email', 'Email'], ['license', 'License line'], ['tagline', 'Tagline']].map(([key, lbl]) => (
                <Input key={key} label={lbl} value={draft.contact[key]} onChange={(v) => edit((d) => { d.contact[key] = v; return d; })} />
              ))}
            </div>
          </div>

          {draft.sections.map((s, i) => (
            <SectionEditor key={s.id} section={s} index={i} count={draft.sections.length}
              set={(next) => setSection(i, next)}
              move={(dir) => edit((d) => { const j = i + dir; [d.sections[i], d.sections[j]] = [d.sections[j], d.sections[i]]; return d; })}
              remove={() => { if (confirm(`Remove section ${i + 1}?`)) edit((d) => { d.sections.splice(i, 1); return d; }); }} />
          ))}

          <div className="rounded-2xl p-4" style={card}>
            <p className="text-xs font-bold mb-2" style={{ color: '#6B7280' }}>Add a section at the end</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(SECTION_KINDS).map(([kind, lbl]) => (
                <button key={kind} type="button" onClick={() => edit((d) => { d.sections.push(newSection(kind)); return d; })}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ border: '1px solid #BAE6FD', color: '#0369A1', backgroundColor: '#F0F9FF' }}>
                  + {lbl}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 md:left-[260px] z-30 px-4 py-3 flex flex-wrap items-center justify-center gap-2"
        style={{ backgroundColor: '#fff', borderTop: `1.5px solid ${dirty ? GOLD : '#E8E6E1'}` }}>
        <button type="button" onClick={save} disabled={!dirty || busy || missing} className="px-5 py-2 rounded-xl text-sm font-bold disabled:opacity-50" style={btn(true)}>
          {busy ? 'Saving…' : 'Save'}
        </button>
        {dirty && (
          <button type="button" onClick={() => { setDraft(saved); setMsg(null); }} className="px-4 py-2 rounded-xl text-sm font-bold" style={btn(false)}>
            Discard changes
          </button>
        )}
        <button type="button" onClick={() => { if (confirm('Replace the package with the original version? Click Save afterwards to keep it.')) { setDraft(defaultWelcomePackage()); setMsg(null); } }}
          className="px-4 py-2 rounded-xl text-sm font-semibold" style={{ color: '#6B7280' }}>
          Reset to original
        </button>
        {!dirty && !msg && <span className="text-xs" style={{ color: '#9CA3AF' }}>No unsaved changes.</span>}
        {msg && <span role={msg.status === 'error' ? 'alert' : 'status'} className="text-sm font-semibold" style={{ color: msg.status === 'error' ? '#DC2626' : '#059669' }}>{msg.text}</span>}
      </div>
    </div>
  );
}
