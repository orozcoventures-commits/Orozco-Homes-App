import { useState } from 'react';

const INITIAL_ORDERS = [
  {
    id: 1,
    title: 'Upgrade to Quartz Countertops',
    description: 'Client requested upgrade from laminate to quartz countertops in kitchen island and perimeter.',
    category: 'Countertops',
    project: 'Kitchen Remodel – Johnson',
    originalCost: 2400,
    newCost: 5800,
    delta: 3400,
    status: 'pending',
    date: 'Feb 8, 2025',
  },
  {
    id: 2,
    title: 'Additional GFCI Outlets',
    description: 'Install 4 additional GFCI outlets in kitchen backsplash area to meet updated code requirements.',
    category: 'Electrical',
    project: 'Kitchen Remodel – Johnson',
    originalCost: 0,
    newCost: 680,
    delta: 680,
    status: 'pending',
    date: 'Feb 10, 2025',
  },
  {
    id: 3,
    title: 'Herringbone Tile Pattern Upcharge',
    description: 'Changed backsplash tile layout from horizontal stack to herringbone — additional labor required.',
    category: 'Tile',
    project: 'Kitchen Remodel – Johnson',
    originalCost: 1200,
    newCost: 1650,
    delta: 450,
    status: 'approved',
    approvedAt: 'Feb 3, 2025 · 2:14 PM',
    approvedBy: 'Sarah Johnson',
    date: 'Feb 1, 2025',
  },
  {
    id: 4,
    title: 'Shower Niche Addition',
    description: 'Add two recessed tile niches in master shower surround per client request.',
    category: 'Shower',
    project: 'Master Bath – Rodriguez',
    originalCost: 0,
    newCost: 520,
    delta: 520,
    status: 'approved',
    approvedAt: 'Jan 29, 2025 · 10:08 AM',
    approvedBy: 'Maria Rodriguez',
    date: 'Jan 28, 2025',
  },
  {
    id: 5,
    title: 'Premium Appliance Package',
    description: 'Proposed upgrade to Wolf range and Sub-Zero refrigerator. Client declined — staying with original spec.',
    category: 'Appliances',
    project: 'Kitchen Remodel – Johnson',
    originalCost: 8500,
    newCost: 22000,
    delta: 13500,
    status: 'declined',
    declinedAt: 'Feb 6, 2025 · 9:00 AM',
    date: 'Feb 5, 2025',
  },
];

const STATUS_CFG = {
  pending:  { bg: '#FFFBEB', text: '#92400E', border: '#FCD34D', dot: '#F59E0B', label: 'Pending Approval' },
  approved: { bg: '#ECFDF5', text: '#065F46', border: '#6EE7B7', dot: '#10B981', label: 'Approved'         },
  declined: { bg: '#FEF2F2', text: '#991B1B', border: '#FECACA', dot: '#EF4444', label: 'Declined'         },
};

function fmt(n) {
  return '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2 });
}

export default function Approvals() {
  const [orders, setOrders] = useState(INITIAL_ORDERS);
  const [signing, setSigning] = useState(null); // id being signed

  const pending  = orders.filter((o) => o.status === 'pending');
  const approved = orders.filter((o) => o.status === 'approved');
  const total    = approved.reduce((s, o) => s + o.delta, 0);

  function approve(id) {
    setSigning(id);
    setTimeout(() => {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === id
            ? {
                ...o,
                status: 'approved',
                approvedAt: new Date().toLocaleString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric',
                  hour: 'numeric', minute: '2-digit',
                }),
                approvedBy: 'Client (Digital Signature)',
              }
            : o
        )
      );
      setSigning(null);
    }, 900);
  }

  function decline(id) {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === id
          ? { ...o, status: 'declined', declinedAt: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) }
          : o
      )
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">

      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-bold tracking-[0.18em] uppercase mb-1" style={{ color: '#D4AF37' }}>Contractor Tool</p>
        <h2 className="text-2xl font-bold" style={{ color: '#002147' }}>Change Orders & Approvals</h2>
        <p className="text-sm mt-1" style={{ color: '#6B7280' }}>Track material changes and get digital client approvals.</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Pending',          value: pending.length,  color: '#D97706', bg: '#FFFBEB' },
          { label: 'Approved',         value: approved.length, color: '#059669', bg: '#ECFDF5' },
          { label: 'Approved Value',   value: fmt(total),      color: '#2563EB', bg: '#EFF6FF' },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl p-4 text-center" style={{ backgroundColor: s.bg, border: `1.5px solid ${s.color}30` }}>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs font-semibold mt-1" style={{ color: '#6B7280' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Change order cards */}
      <div className="space-y-4">
        {orders.map((order) => {
          const cfg = STATUS_CFG[order.status];
          const isSigning = signing === order.id;
          return (
            <div
              key={order.id}
              className="rounded-2xl overflow-hidden"
              style={{ backgroundColor: '#fff', border: '1.5px solid #E8E6E1', boxShadow: '0 2px 10px rgba(0,33,71,0.06)' }}
            >
              {/* Top color bar */}
              <div className="h-1" style={{ backgroundColor: cfg.dot }} />

              <div className="p-5">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-bold text-sm" style={{ color: '#002147' }}>{order.title}</h3>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-semibold shrink-0"
                        style={{ backgroundColor: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}` }}
                      >
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: '#9CA3AF' }}>
                      {order.project} · {order.category} · Submitted {order.date}
                    </p>
                  </div>
                  {/* Cost delta */}
                  <div className="text-right shrink-0">
                    <p
                      className="text-lg font-bold"
                      style={{ color: order.delta > 0 ? '#D97706' : '#059669' }}
                    >
                      +{fmt(order.delta)}
                    </p>
                    <p className="text-xs" style={{ color: '#9CA3AF' }}>cost impact</p>
                  </div>
                </div>

                <p className="text-sm leading-relaxed mb-4" style={{ color: '#4A4A4A' }}>
                  {order.description}
                </p>

                {/* Cost breakdown */}
                <div
                  className="flex items-center gap-6 px-4 py-2.5 rounded-xl mb-4 text-xs"
                  style={{ backgroundColor: '#F9F8F6', border: '1px solid #F0EEE9' }}
                >
                  <div>
                    <p style={{ color: '#9CA3AF' }}>Original</p>
                    <p className="font-semibold" style={{ color: '#4A4A4A' }}>{fmt(order.originalCost)}</p>
                  </div>
                  <span style={{ color: '#D1D5DB' }}>→</span>
                  <div>
                    <p style={{ color: '#9CA3AF' }}>Revised</p>
                    <p className="font-semibold" style={{ color: '#002147' }}>{fmt(order.newCost)}</p>
                  </div>
                  <div className="ml-auto">
                    <p style={{ color: '#9CA3AF' }}>Change</p>
                    <p className="font-bold" style={{ color: '#D97706' }}>+{fmt(order.delta)}</p>
                  </div>
                </div>

                {/* Actions / signatures */}
                {order.status === 'pending' && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => approve(order.id)}
                      disabled={isSigning}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all duration-150 focus:outline-none"
                      style={{
                        backgroundColor: isSigning ? '#D1FAE5' : '#ECFDF5',
                        color: '#065F46',
                        border: '1.5px solid #6EE7B7',
                      }}
                    >
                      {isSigning ? (
                        <>
                          <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <circle cx="12" cy="12" r="10" strokeOpacity="0.3" />
                            <path d="M12 2a10 10 0 0 1 10 10" />
                          </svg>
                          Signing…
                        </>
                      ) : (
                        <>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          Digitally Approve
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => decline(order.id)}
                      className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-150 focus:outline-none"
                      style={{ backgroundColor: '#FEF2F2', color: '#991B1B', border: '1.5px solid #FECACA' }}
                    >
                      Decline
                    </button>
                  </div>
                )}

                {order.status === 'approved' && (
                  <div
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl"
                    style={{ backgroundColor: '#ECFDF5', border: '1px solid #6EE7B7' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <p className="text-xs font-semibold" style={{ color: '#065F46' }}>
                      Digitally signed by {order.approvedBy} · {order.approvedAt}
                    </p>
                  </div>
                )}

                {order.status === 'declined' && (
                  <div
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl"
                    style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                    <p className="text-xs font-semibold" style={{ color: '#991B1B' }}>
                      Declined · {order.declinedAt}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
