import { useEffect, useState } from 'react';
import {
  Search, X, Phone, Mail, Globe, MapPin, BadgeCheck, MessageSquareQuote, Users,
  LoaderCircle, TriangleAlert, LockKeyhole, RefreshCw, Plus, Pencil, CheckCircle2,
  ShieldCheck, ShieldAlert, ShieldQuestion, FileText, Paperclip,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  EMPTY_SUBCONTRACTOR_FORM, toForm, validateForm, createSubcontractor, updateSubcontractor,
  COI_ACCEPT, openCoi, coiStatus, formatCoiDate,
} from '../lib/subcontractorDirectory';

const SEARCH_DEBOUNCE_MS = 250;

class SearchError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

// Calls the admin-only search function with the signed-in user's access token.
// Resolves to { taskName, matched, count, subcontractors }.
async function searchSubcontractors(taskName, signal) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new SearchError('Your session has expired. Please sign in again.', 401);

  const params = new URLSearchParams();
  if (taskName) params.set('taskName', taskName);

  const res = await fetch(`/api/subcontractors/search?${params}`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
    signal,
  });
  const body = await res.json().catch(() => null);

  if (res.status === 401) {
    throw new SearchError('Admin access required. Please sign in again with an admin account.', 401);
  }
  if (!res.ok || !Array.isArray(body?.subcontractors)) {
    throw new SearchError(body?.error || 'Could not load subcontractors.', res.status);
  }
  return body;
}

// Quick filters for the trades used most across the remodel scopes.
const QUICK_TRADES = ['Plumbing', 'Electrical', 'HVAC', 'Framing', 'Drywall', 'Tile', 'Cabinets', 'Roofing', 'Concrete', 'Painting'];

const telHref = (phone) => `tel:${phone.replace(/[^\d+]/g, '')}`;
const webHref = (site) => (/^https?:\/\//i.test(site) ? site : `https://${site}`);

// ── Contact rows ──────────────────────────────────────────────────────────────
function ContactList({ icon: Icon, items, hrefFor, external = false }) {
  if (!items?.length) return null;
  return (
    <div className="flex items-start gap-2.5">
      <Icon size={15} className="shrink-0 mt-0.5" style={{ color: '#D4AF37' }} />
      <div className="flex flex-wrap gap-x-3 gap-y-1 min-w-0">
        {items.map((item) => (
          <a
            key={item}
            href={hrefFor(item)}
            {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            className="text-sm font-medium break-all hover:underline"
            style={{ color: '#002147' }}
          >
            {item}
          </a>
        ))}
      </div>
    </div>
  );
}

function DetailRow({ icon: Icon, children }) {
  if (!children) return null;
  return (
    <div className="flex items-start gap-2.5">
      <Icon size={15} className="shrink-0 mt-0.5" style={{ color: '#9CA3AF' }} />
      <p className="text-sm" style={{ color: '#4B5563' }}>{children}</p>
    </div>
  );
}

// ── COI indicator ─────────────────────────────────────────────────────────────
const COI_STYLES = {
  active:  { icon: ShieldCheck,    label: 'COI active',   color: '#166534', bg: '#F0FDF4', border: '#BBF7D0', dot: '#16A34A' },
  expired: { icon: ShieldAlert,    label: 'COI expired',  color: '#991B1B', bg: '#FEF2F2', border: '#FECACA', dot: '#DC2626' },
  none:    { icon: ShieldQuestion, label: 'No COI date',  color: '#6B7280', bg: '#F9F8F6', border: '#E8E6E1', dot: '#9CA3AF' },
};

function CoiIndicator({ sub, onOpenCoi }) {
  const status = coiStatus(sub.coi_expires_on);
  const { icon: Icon, label, color, bg, border, dot } = COI_STYLES[status];
  return (
    <div
      className="flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-2 rounded-xl text-xs"
      style={{ backgroundColor: bg, border: `1px solid ${border}`, color }}
      data-coi-status={status}
    >
      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: dot }} aria-hidden="true" />
      <Icon size={14} className="shrink-0" />
      <span className="font-semibold whitespace-nowrap">{label}</span>
      {sub.coi_expires_on && (
        <span className="whitespace-nowrap">· {status === 'expired' ? 'Expired' : 'Expires'} {formatCoiDate(sub.coi_expires_on)}</span>
      )}
      {sub.coi_file_path && (
        <button
          type="button"
          onClick={() => onOpenCoi(sub.coi_file_path)}
          className="ml-auto flex items-center gap-1 font-semibold whitespace-nowrap hover:underline focus:outline-none"
          style={{ color: '#002147' }}
        >
          <FileText size={13} /> View COI
        </button>
      )}
    </div>
  );
}

// ── Contractor card ───────────────────────────────────────────────────────────
function ContractorCard({ sub, onEdit, onOpenCoi }) {
  const title = sub.company || sub.name || 'Unnamed contractor';
  const contact = sub.company && sub.name ? sub.name : null;
  const hasContact = sub.phone.length || sub.email.length || sub.website.length;

  return (
    <article
      className="rounded-2xl p-5 flex flex-col gap-4"
      style={{ backgroundColor: '#fff', border: '1px solid #E8E6E1', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-bold leading-snug" style={{ color: '#002147' }}>{title}</h3>
          {contact && <p className="text-sm mt-0.5" style={{ color: '#6B7280' }}>{contact}</p>}
        </div>
        <div className="shrink-0 flex items-center gap-1.5">
          <span
            className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg"
            style={{ backgroundColor: 'rgba(212,175,55,0.12)', color: '#8A6D12', border: '1px solid rgba(212,175,55,0.35)' }}
          >
            {sub.service}
          </span>
          <button
            type="button"
            onClick={() => onEdit(sub)}
            aria-label={`Edit ${title}`}
            title="Edit"
            className="w-7 h-7 rounded-lg flex items-center justify-center focus:outline-none hover:bg-gray-100"
            style={{ color: '#6B7280' }}
          >
            <Pencil size={14} />
          </button>
        </div>
      </header>

      <p className="text-sm leading-relaxed" style={{ color: '#374151' }}>{sub.specialty}</p>

      <CoiIndicator sub={sub} onOpenCoi={onOpenCoi} />

      {hasContact ? (
        <div className="flex flex-col gap-2 pt-3" style={{ borderTop: '1px solid #F0EEE9' }}>
          <ContactList icon={Phone} items={sub.phone} hrefFor={telHref} />
          <ContactList icon={Mail} items={sub.email} hrefFor={(e) => `mailto:${e}`} />
          <ContactList icon={Globe} items={sub.website} hrefFor={webHref} external />
        </div>
      ) : (
        <p className="text-xs pt-3" style={{ color: '#9CA3AF', borderTop: '1px solid #F0EEE9' }}>
          No phone, email or website on file.
        </p>
      )}

      {(sub.address || sub.license || sub.reference || sub.notes) && (
        <div className="flex flex-col gap-2">
          <DetailRow icon={MapPin}>{sub.address}</DetailRow>
          <DetailRow icon={BadgeCheck}>{sub.license}</DetailRow>
          <DetailRow icon={MessageSquareQuote}>
            {[sub.reference, sub.notes].filter(Boolean).join(' · ') || null}
          </DetailRow>
        </div>
      )}
    </article>
  );
}

// ── Add / edit form ───────────────────────────────────────────────────────────
const inputStyle = { border: '1.5px solid #E8E6E1', color: '#002147', backgroundColor: '#F9F8F6' };

function Field({ label, hint, required, className = '', children }) {
  return (
    <div className={className}>
      <label className="block text-xs font-semibold mb-1" style={{ color: '#374151' }}>
        {label}{required && <span style={{ color: '#EF4444' }}> *</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] mt-1" style={{ color: '#9CA3AF' }}>{hint}</p>}
    </div>
  );
}

function SubcontractorModal({ mode, form, setForm, onSave, onClose, onOpenCoi, saving, error }) {
  const isEdit = mode === 'edit';
  const input = (field, props = {}) => (
    <input
      value={form[field]}
      onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
      className="w-full text-sm rounded-xl px-3 py-2 focus:outline-none"
      style={inputStyle}
      {...props}
    />
  );


  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
      onClick={onClose}
    >
      <form
        className="w-full max-w-lg rounded-2xl overflow-hidden flex flex-col"
        style={{ backgroundColor: '#fff', maxHeight: '90vh', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => { e.preventDefault(); onSave(); }}
        noValidate
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#E8E6E1' }}>
          <h2 className="font-bold text-base" style={{ color: '#002147' }}>
            {isEdit ? 'Edit Subcontractor' : 'Add Subcontractor'}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100">
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {error && (
            <div
              className="flex items-start gap-2.5 px-4 py-3 rounded-xl text-sm"
              style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B' }}
              role="alert"
            >
              <TriangleAlert size={15} className="shrink-0 mt-0.5" /> {error}
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Company">{input('company', { placeholder: 'e.g. Harbor Plumbing Co.', autoFocus: true })}</Field>
            <Field label="Contact name">{input('name', { placeholder: 'e.g. Sam Carter' })}</Field>
            <Field label="Trade" required>{input('service', { placeholder: 'e.g. Plumbing' })}</Field>
            <Field label="Specialty" hint="Leave blank to use the trade.">
              {input('specialty', { placeholder: 'e.g. Sewer line repair' })}
            </Field>
          </div>

          <Field label="Phone" hint="Separate multiple numbers with commas.">
            {input('phone', { type: 'tel', placeholder: '757-555-0100, 757-555-0101' })}
          </Field>
          <Field label="Email" hint="Separate multiple emails with commas.">
            {input('email', { type: 'email', placeholder: 'office@example.com' })}
          </Field>
          <Field label="Website">{input('website', { placeholder: 'www.example.com' })}</Field>
          <Field label="Address">{input('address', { placeholder: 'Street, city, VA ZIP' })}</Field>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="License">{input('license', { placeholder: 'e.g. VA-2710000000' })}</Field>
            <Field label="How we know them">{input('reference', { placeholder: 'e.g. Bishard Connection' })}</Field>
          </div>
          {/* Certificate of Insurance */}
          <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: '#F9F8F6', border: '1px solid #F0EEE9' }}>
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#8A6D12' }}>Certificate of Insurance</p>
            <Field label="COI expiration date" hint="Shown red on the list once this date has passed.">
              {input('coi_expires_on', { type: 'date', style: { ...inputStyle, backgroundColor: '#fff' } })}
            </Field>
            <Field label="COI file" hint="PDF or photo, up to 10 MB.">
              {form.coi_file_path && !form.coi_file && (
                <div className="flex items-center gap-2 mb-2 text-sm" style={{ color: '#002147' }}>
                  <Paperclip size={14} style={{ color: '#D4AF37' }} />
                  <button type="button" onClick={() => onOpenCoi(form.coi_file_path)} className="font-semibold hover:underline focus:outline-none">
                    View current COI
                  </button>
                  <span style={{ color: '#D1D5DB' }}>|</span>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, coi_file_path: '' }))}
                    className="font-semibold hover:underline focus:outline-none"
                    style={{ color: '#DC2626' }}
                  >
                    Remove
                  </button>
                </div>
              )}
              <input
                type="file"
                accept={COI_ACCEPT}
                aria-label="COI file"
                onChange={(e) => setForm((f) => ({ ...f, coi_file: e.target.files?.[0] ?? null }))}
                className="block w-full text-sm file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:text-xs file:font-bold"
                style={{ color: '#374151' }}
              />
              {form.coi_file && form.coi_file_path && (
                <p className="text-[11px] mt-1" style={{ color: '#9CA3AF' }}>Replaces the current COI when you save.</p>
              )}
            </Field>
          </div>

          <Field label="Notes">
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              className="w-full text-sm rounded-xl px-3 py-2 focus:outline-none resize-y"
              style={inputStyle}
            />
          </Field>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex items-center gap-3" style={{ borderColor: '#E8E6E1' }}>
          <div className="flex-1" />
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium"
            style={{ backgroundColor: '#F5F4F0', color: '#374151' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold disabled:opacity-50"
            style={{ backgroundColor: '#002147', color: '#D4AF37' }}
          >
            {saving && <LoaderCircle size={13} className="animate-spin" />}
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Subcontractor'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Subcontractors() {
  const [query, setQuery] = useState('');
  const [attempt, setAttempt] = useState(0);
  // Last completed request: `key` identifies which search it answered, so the
  // page is loading whenever the current search hasn't come back yet.
  const [response, setResponse] = useState({ key: null, data: null, error: null });

  const term = query.trim();
  const requestKey = `${term}\u0000${attempt}`;
  const loading = response.key !== requestKey;
  const { data, error } = response;
  const results = data?.subcontractors ?? [];
  const shownTerm = data?.taskName ?? '';

  // Add/edit modal: null when closed, else { mode: 'create' | 'edit', id? }
  const [editor, setEditor] = useState(null);
  const [form, setForm] = useState(EMPTY_SUBCONTRACTOR_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [notice, setNotice] = useState(null);

  function openCreate() {
    setForm(EMPTY_SUBCONTRACTOR_FORM);
    setSaveError(null);
    setEditor({ mode: 'create' });
  }

  function openEdit(sub) {
    setForm(toForm(sub));
    setSaveError(null);
    setEditor({ mode: 'edit', id: sub.id, previousFilePath: sub.coi_file_path ?? null });
  }

  function closeEditor() {
    if (!saving) setEditor(null);
  }

  async function handleSave() {
    const invalid = validateForm(form);
    if (invalid) {
      setSaveError(invalid);
      return;
    }
    setSaving(true);
    setSaveError(null);
    const { error: err } = editor.mode === 'edit'
      ? await updateSubcontractor(editor.id, form, editor.previousFilePath)
      : await createSubcontractor(form);
    setSaving(false);
    if (err) {
      setSaveError(err);
      return;
    }
    const label = form.company.trim() || form.name.trim();
    setNotice(editor.mode === 'edit' ? `Saved changes to ${label}.` : `Added ${label}.`);
    setEditor(null);
    setAttempt((n) => n + 1); // reload the list through the search API
  }

  async function handleOpenCoi(path) {
    const { error: err } = await openCoi(path);
    if (err) setNotice(err);
  }

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    const controller = new AbortController();
    // Debounce typing; the first load and cleared searches go out immediately.
    const timer = setTimeout(() => {
      searchSubcontractors(term, controller.signal)
        .then((body) => setResponse({ key: requestKey, data: body, error: null }))
        .catch((err) => {
          if (err.name === 'AbortError') return;
          setResponse((prev) => ({ key: requestKey, data: prev.data, error: err }));
        });
    }, term ? SEARCH_DEBOUNCE_MS : 0);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [term, requestKey]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <p className="text-xs font-bold tracking-[0.18em] uppercase mb-1" style={{ color: '#D4AF37' }}>Admin Tool</p>
          <h2 className="text-2xl font-bold" style={{ color: '#002147' }}>Subcontractors</h2>
          <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
            Find the right trade partner for a task. Search by trade or specialty.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-150 focus:outline-none"
          style={{ backgroundColor: '#002147', color: '#D4AF37' }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#003166'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#002147'; }}
        >
          <Plus size={15} strokeWidth={2.5} /> Add Subcontractor
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#9CA3AF' }} />
        <input
          type="text"
          enterKeyHint="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a trade, e.g. Drywall, Plumbing, HVAC…"
          aria-label="Search subcontractors by trade"
          className="w-full text-sm rounded-xl pl-11 pr-11 py-3.5 focus:outline-none transition-colors duration-150"
          style={{ backgroundColor: '#fff', border: '1.5px solid #E8E6E1', color: '#111827' }}
          onFocus={(e) => { e.currentTarget.style.borderColor = '#D4AF37'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = '#E8E6E1'; }}
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg focus:outline-none"
            style={{ color: '#6B7280' }}
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Quick trade filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {QUICK_TRADES.map((trade) => {
          const active = term.toLowerCase() === trade.toLowerCase();
          return (
            <button
              key={trade}
              type="button"
              onClick={() => setQuery(active ? '' : trade)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-150 focus:outline-none"
              style={active
                ? { backgroundColor: '#002147', color: '#D4AF37', border: '1px solid #002147' }
                : { backgroundColor: '#fff', color: '#374151', border: '1px solid #E8E6E1' }}
            >
              {trade}
            </button>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <div
          className="flex items-start gap-3 px-4 py-3 mb-4 rounded-xl text-sm"
          style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B' }}
          role="alert"
        >
          {error.status === 401
            ? <LockKeyhole size={16} className="shrink-0 mt-0.5" />
            : <TriangleAlert size={16} className="shrink-0 mt-0.5" />}
          <p className="flex-1">
            {error.message.replace(/([^.!?])$/, '$1.')}
            {data && ' Showing the last results that loaded.'}
          </p>
          {error.status !== 401 && (
            <button
              type="button"
              onClick={() => setAttempt((n) => n + 1)}
              className="shrink-0 flex items-center gap-1.5 text-xs font-bold focus:outline-none"
              style={{ color: '#991B1B' }}
            >
              <RefreshCw size={13} /> Retry
            </button>
          )}
        </div>
      )}

      {/* First load */}
      {!data && loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3" style={{ color: '#6B7280' }}>
          <LoaderCircle size={22} className="animate-spin" style={{ color: '#D4AF37' }} />
          <p className="text-sm">Loading subcontractors…</p>
        </div>
      )}

      {data && (
        <>
          {/* Result summary */}
          <div className="flex items-center gap-2 mb-4 text-sm" style={{ color: '#6B7280' }}>
            {loading
              ? <LoaderCircle size={15} className="animate-spin" style={{ color: '#D4AF37' }} />
              : <Users size={15} />}
            {!shownTerm && <span>Showing all <strong style={{ color: '#002147' }}>{data.count}</strong> subcontractors</span>}
            {shownTerm && data.matched && (
              <span>
                <strong style={{ color: '#002147' }}>{data.count}</strong> {data.count === 1 ? 'match' : 'matches'} for “{shownTerm}”
              </span>
            )}
            {shownTerm && !data.matched && (
              <span>
                No match for “{shownTerm}”. Showing all <strong style={{ color: '#002147' }}>{data.count}</strong> subcontractors.
              </span>
            )}
          </div>

          {/* Cards */}
          <div
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 transition-opacity duration-150"
            style={{ opacity: loading ? 0.6 : 1 }}
            aria-busy={loading}
          >
            {results.map((sub) => <ContractorCard key={sub.id} sub={sub} onEdit={openEdit} onOpenCoi={handleOpenCoi} />)}
          </div>
        </>
      )}

      {editor && (
        <SubcontractorModal
          mode={editor.mode}
          form={form}
          setForm={setForm}
          onSave={handleSave}
          onClose={closeEditor}
          onOpenCoi={handleOpenCoi}
          saving={saving}
          error={saveError}
        />
      )}

      {notice && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-semibold shadow-xl"
          style={{ backgroundColor: '#002147', color: '#D4AF37', pointerEvents: 'none', whiteSpace: 'nowrap' }}
          role="status"
        >
          <CheckCircle2 size={15} /> {notice}
        </div>
      )}
    </div>
  );
}
