const STATS = [
  { label: 'Project Status',   value: 'In Progress', sub: 'Kitchen Remodel',       color: '#D97706', bg: '#FFFBEB', dot: '#F59E0B' },
  { label: 'Days Remaining',   value: '23',           sub: 'Est. completion Mar 5', color: '#2563EB', bg: '#EFF6FF', dot: '#3B82F6' },
  { label: 'Budget Health',    value: 'On Track',     sub: '$48,200 of $52,000',    color: '#059669', bg: '#ECFDF5', dot: '#10B981' },
  { label: 'Open Items',       value: '2',            sub: 'Pending your approval', color: '#7C3AED', bg: '#F5F3FF', dot: '#8B5CF6' },
];

const TIMELINE = [
  { label: 'Contract Signed',         date: 'Jan 15, 2025', status: 'done',       note: 'All parties signed' },
  { label: 'Demo & Rough-in',         date: 'Jan 28, 2025', status: 'done',       note: 'Completed ahead of schedule' },
  { label: 'Plumbing & Electrical',   date: 'Feb 5, 2025',  status: 'done',       note: 'Passed inspection' },
  { label: 'Tile Installation',       date: 'Feb 10–20',    status: 'active',     note: 'Currently in progress' },
  { label: 'Cabinet & Countertop',    date: 'Feb 21–28',    status: 'upcoming',   note: 'Materials arriving Feb 19' },
  { label: 'Final Walkthrough',       date: 'Mar 5, 2025',  status: 'upcoming',   note: 'Client sign-off & punch list' },
];

const GALLERY = [
  { id: 1, caption: 'Demo Complete',          date: 'Jan 28',  gradient: 'linear-gradient(135deg,#1B4F6B,#2D7DA0)' },
  { id: 2, caption: 'Plumbing Rough-in',      date: 'Feb 5',   gradient: 'linear-gradient(135deg,#374151,#6B7280)' },
  { id: 3, caption: 'Backer Board Set',       date: 'Feb 9',   gradient: 'linear-gradient(135deg,#3B2F1E,#7C5B3A)' },
  { id: 4, caption: 'Tile Layout Started',    date: 'Feb 10',  gradient: 'linear-gradient(135deg,#1E3A5F,#2E6DAA)' },
  { id: 5, caption: 'Electrical Inspection',  date: 'Feb 6',   gradient: 'linear-gradient(135deg,#1A3A2A,#2D6B45)' },
  { id: 6, caption: 'Tile Progress Day 3',    date: 'Feb 13',  gradient: 'linear-gradient(135deg,#4A1942,#7D3C73)' },
];

function StatusDot({ status }) {
  const cfg = {
    done:     { bg: '#10B981', ring: '#D1FAE5' },
    active:   { bg: '#D4AF37', ring: '#FEF3C7' },
    upcoming: { bg: '#D1D5DB', ring: '#F3F4F6' },
  }[status];
  return (
    <span className="relative flex items-center justify-center w-5 h-5 shrink-0">
      <span className="absolute w-5 h-5 rounded-full opacity-40" style={{ backgroundColor: cfg.ring }} />
      <span className="w-2.5 h-2.5 rounded-full z-10" style={{ backgroundColor: cfg.bg }} />
    </span>
  );
}

export default function ClientPortal() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-bold tracking-[0.18em] uppercase mb-1" style={{ color: '#D4AF37' }}>
          Contractor View
        </p>
        <h2 className="text-2xl font-bold" style={{ color: '#002147' }}>Client Portal</h2>
        <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
          Johnson Residence · Kitchen Remodel · Started Jan 15, 2025
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {STATS.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl p-4"
            style={{ backgroundColor: s.bg, border: `1.5px solid ${s.dot}30` }}
          >
            <div className="flex items-center gap-1.5 mb-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.dot }} />
              <p className="text-xs font-semibold" style={{ color: '#6B7280' }}>{s.label}</p>
            </div>
            <p className="text-2xl font-bold leading-none mb-1" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs" style={{ color: '#9CA3AF' }}>{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">

        {/* Timeline */}
        <div
          className="rounded-2xl p-6"
          style={{ backgroundColor: '#fff', border: '1.5px solid #E8E6E1', boxShadow: '0 2px 12px rgba(0,33,71,0.06)' }}
        >
          <h3 className="font-bold text-base mb-5" style={{ color: '#002147' }}>Project Timeline</h3>
          <div className="space-y-0">
            {TIMELINE.map((item, i) => (
              <div key={item.label} className="flex gap-4">
                {/* Connector */}
                <div className="flex flex-col items-center">
                  <StatusDot status={item.status} />
                  {i < TIMELINE.length - 1 && (
                    <div
                      className="w-px flex-1 my-1"
                      style={{
                        backgroundColor: item.status === 'done' ? '#10B981' : '#E5E7EB',
                        minHeight: '28px',
                      }}
                    />
                  )}
                </div>
                {/* Content */}
                <div className="pb-5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p
                      className="text-sm font-semibold"
                      style={{ color: item.status === 'upcoming' ? '#9CA3AF' : '#002147' }}
                    >
                      {item.label}
                    </p>
                    {item.status === 'active' && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-semibold"
                        style={{ backgroundColor: '#FEF3C7', color: '#92400E', border: '1px solid #FCD34D' }}
                      >
                        In Progress
                      </span>
                    )}
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>{item.date} · {item.note}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Photo Gallery */}
        <div
          className="rounded-2xl p-6"
          style={{ backgroundColor: '#fff', border: '1.5px solid #E8E6E1', boxShadow: '0 2px 12px rgba(0,33,71,0.06)' }}
        >
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-base" style={{ color: '#002147' }}>Progress Gallery</h3>
            <span className="text-xs font-medium" style={{ color: '#9CA3AF' }}>{GALLERY.length} photos</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {GALLERY.map((photo) => (
              <div
                key={photo.id}
                className="relative rounded-xl overflow-hidden group cursor-pointer"
                style={{ aspectRatio: '1', background: photo.gradient }}
              >
                {/* Overlay */}
                <div
                  className="absolute inset-0 flex flex-col justify-end p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 60%)' }}
                >
                  <p className="text-white text-xs font-semibold leading-tight">{photo.caption}</p>
                  <p className="text-white/60 text-xs">{photo.date}</p>
                </div>
                {/* Camera icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-center mt-3" style={{ color: '#9CA3AF' }}>
            Hover to preview · Go to Photo Log for full feed
          </p>
        </div>
      </div>
    </div>
  );
}
