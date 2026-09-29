import { useMemo, useState } from 'react';
import { Search, X, Phone, Mail, Globe, MapPin, BadgeCheck, MessageSquareQuote, Users } from 'lucide-react';

// ── Placeholder data ──────────────────────────────────────────────────────────
// Design preview only: fictional contractors in the same shape the
// /api/subcontractors/search endpoint returns. Replaced by the live API later.
const PLACEHOLDER_SUBCONTRACTORS = [
  {
    id: 1, service: 'Plumbing', name: 'Sam Carter', company: 'Harbor Plumbing Co.',
    specialty: 'Plumbing, Sewer Line Camera Inspection & Pipe Cleaning',
    phone: ['757-555-0101', '757-555-0102'], email: ['office@harborplumbing.example'], website: [],
    address: '100 Example Ave, Virginia Beach, VA 23452', license: null,
    reference: 'Do work for our company', notes: null,
  },
  {
    id: 2, service: 'Drywall/Paint', name: 'Luis Ortega', company: null,
    specialty: 'Drywall & Painting',
    phone: ['757-555-0110'], email: [], website: [],
    address: null, license: null, reference: 'Bishard Connection', notes: null,
  },
  {
    id: 3, service: 'Electrical', name: 'Dana Reeves', company: 'Brightline Electric LLC',
    specialty: 'Electrical',
    phone: ['757-555-0120'], email: ['dana@brightline.example'], website: ['www.brightline.example'],
    address: '200 Sample Rd, Chesapeake, VA 23320', license: 'VA-0000000000',
    reference: 'Recommended by a client', notes: 'Only new homes',
  },
  {
    id: 4, service: 'HVAC', name: null, company: 'Coastal Air Systems',
    specialty: 'HVAC Installation, Ductwork & Air Control',
    phone: ['757-555-0130', '757-555-0131'], email: [], website: [],
    address: null, license: null, reference: 'Saw on the street', notes: null,
  },
  {
    id: 5, service: 'Framing/Drywall', name: 'Ray Morales', company: null,
    specialty: 'Framing & Drywall',
    phone: ['757-555-0140'], email: [], website: [],
    address: null, license: null, reference: null, notes: null,
  },
  {
    id: 6, service: 'Cabinets', name: 'Erin Blake', company: 'Tidewater Cabinet Works',
    specialty: 'Cabinets & Countertops',
    phone: ['757-555-0150'], email: ['erin@tidewatercabinets.example', 'orders@tidewatercabinets.example'],
    website: ['www.tidewatercabinets.example'], address: '300 Demo Blvd, Norfolk, VA 23502',
    license: null, reference: null, notes: null,
  },
  {
    id: 7, service: 'Tile', name: 'Marco Silva', company: null,
    specialty: 'Tile, Drywall & Painting',
    phone: ['757-555-0160'], email: [], website: [],
    address: null, license: null, reference: 'Do work for our company', notes: null,
  },
  {
    id: 8, service: 'Roofing/Siding', name: null, company: 'Summit Roofing & Siding',
    specialty: 'Roofing & Siding',
    phone: ['757-555-0170'], email: [], website: [],
    address: null, license: 'Licensed and Insured', reference: null, notes: null,
  },
];

// Quick filters for the trades used most across the remodel scopes.
const QUICK_TRADES = ['Plumbing', 'Electrical', 'HVAC', 'Framing', 'Drywall', 'Tile', 'Cabinets', 'Roofing', 'Concrete', 'Painting'];

// Same rule as the search API: case-insensitive match on specialty or service;
// no term or no matches falls back to the full list.
function matchSubcontractors(list, term) {
  const q = term.trim().toLowerCase();
  if (!q) return { matched: false, results: list };
  const results = list.filter((s) =>
    [s.specialty, s.service].some((field) => field?.toLowerCase().includes(q)),
  );
  return results.length ? { matched: true, results } : { matched: false, results: list };
}

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
  const subcontractors = PLACEHOLDER_SUBCONTRACTORS;

  const { matched, results } = useMemo(
    () => matchSubcontractors(subcontractors, query),
    [subcontractors, query],
  );
  const term = query.trim();

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

      {/* Result summary */}
      <div className="flex items-center gap-2 mb-4 text-sm" style={{ color: '#6B7280' }}>
        <Users size={15} />
        {!term && <span>Showing all <strong style={{ color: '#002147' }}>{results.length}</strong> subcontractors</span>}
        {term && matched && (
          <span>
            <strong style={{ color: '#002147' }}>{results.length}</strong> {results.length === 1 ? 'match' : 'matches'} for “{term}”
          </span>
        )}
        {term && !matched && (
          <span>
            No match for “{term}”. Showing all <strong style={{ color: '#002147' }}>{results.length}</strong> subcontractors.
          </span>
        )}
      </div>

      {/* Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {results.map((sub) => <ContractorCard key={sub.id} sub={sub} />)}
      </div>
    </div>
  );
}
