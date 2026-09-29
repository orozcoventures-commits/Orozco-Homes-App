import { useEffect, useState } from 'react';
import {
  Search, X, Phone, Mail, Globe, MapPin, BadgeCheck, MessageSquareQuote, Users,
  LoaderCircle, TriangleAlert, LockKeyhole, RefreshCw,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

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

// ── Contractor card ───────────────────────────────────────────────────────────
function ContractorCard({ sub }) {
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
        <span
          className="shrink-0 text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg"
          style={{ backgroundColor: 'rgba(212,175,55,0.12)', color: '#8A6D12', border: '1px solid rgba(212,175,55,0.35)' }}
        >
          {sub.service}
        </span>
      </header>

      <p className="text-sm leading-relaxed" style={{ color: '#374151' }}>{sub.specialty}</p>

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
      <div className="mb-6">
        <p className="text-xs font-bold tracking-[0.18em] uppercase mb-1" style={{ color: '#D4AF37' }}>Admin Tool</p>
        <h2 className="text-2xl font-bold" style={{ color: '#002147' }}>Subcontractors</h2>
        <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
          Find the right trade partner for a task. Search by trade or specialty.
        </p>
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
            {results.map((sub) => <ContractorCard key={sub.id} sub={sub} />)}
          </div>
        </>
      )}
    </div>
  );
}
