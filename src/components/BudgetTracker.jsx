import { useProject } from '../context/ProjectContext';
import { getQuantity, calculateLineItem, hasDimensions, LABOR_RATES, fmtMoney } from '../utils/estimate';

const STATUS_PILLS = {
  Considering: { bg: 'rgba(212,175,55,0.15)', text: '#D4AF37', border: 'rgba(212,175,55,0.4)' },
  Selected:    { bg: 'rgba(110,231,183,0.15)', text: '#6EE7B7', border: 'rgba(110,231,183,0.4)' },
  Ordered:     { bg: 'rgba(147,197,253,0.15)', text: '#93C5FD', border: 'rgba(147,197,253,0.4)' },
};

export default function BudgetTracker() {
  const { state, dispatch } = useProject();
  const { dimensions } = state;
  const entries = Object.values(state.selections);

  if (entries.length === 0) return null;

  const usingInstalled = hasDimensions(dimensions);

  // Calculate installed cost per entry when dimensions are available
  function getEntryTotal(item) {
    if (usingInstalled) {
      const laborRate = LABOR_RATES[item.category] ?? 0;
      const qty = getQuantity(item.category, dimensions);
      return calculateLineItem(item.price, laborRate, qty);
    }
    return item.price;
  }

  const byStatus = entries.reduce((acc, item) => {
    const val = getEntryTotal(item);
    acc[item.status] = (acc[item.status] || 0) + val;
    return acc;
  }, {});

  const total = entries.reduce((sum, item) => sum + getEntryTotal(item), 0);
  const committedTotal = (byStatus['Selected'] ?? 0) + (byStatus['Ordered'] ?? 0);

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40"
      style={{
        backgroundColor: '#002147',
        borderTop: '2px solid rgba(212,175,55,0.4)',
        boxShadow: '0 -8px 32px rgba(0,33,71,0.3)',
      }}
    >
      {/* Gold top accent */}
      <div style={{ backgroundColor: '#D4AF37', height: '2px' }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">

          {/* Left — item count + status pills */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-semibold tracking-widest uppercase text-white/60">
              {entries.length} item{entries.length !== 1 ? 's' : ''} tracked
            </span>
            {['Considering', 'Selected', 'Ordered'].map((status) => {
              const count = entries.filter((e) => e.status === status).length;
              const amount = byStatus[status] ?? 0;
              if (!count) return null;
              const p = STATUS_PILLS[status];
              return (
                <div
                  key={status}
                  className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold"
                  style={{ backgroundColor: p.bg, color: p.text, border: `1px solid ${p.border}` }}
                >
                  <span>{count}× {status}</span>
                  <span className="font-bold">
                    {fmtMoney(amount)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Right — totals */}
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-xs text-white/40 mb-0.5">Committed (Selected + Ordered)</p>
              <p
                className="text-2xl font-bold"
                style={{ color: '#D4AF37', fontFamily: 'Inter, sans-serif' }}
              >
                {fmtMoney(committedTotal)}
              </p>
            </div>
            <div
              className="text-right pl-5"
              style={{ borderLeft: '1px solid rgba(255,255,255,0.1)' }}
            >
              {usingInstalled ? (
                <>
                  <p className="text-xs text-white/40 mb-0.5">Installed Project Estimate</p>
                  <p className="text-xl font-bold" style={{ color: '#D4AF37' }}>
                    {fmtMoney(total)}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(212,175,55,0.5)' }}>
                    based on your room dimensions
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xs text-white/40 mb-0.5">Total Tracked</p>
                  <p className="text-xl font-bold text-white">
                    {fmtMoney(total)}
                  </p>
                </>
              )}
            </div>
            <button
              onClick={() => dispatch({ type: 'CLEAR_SELECTIONS' })}
              className="text-xs font-medium underline transition-colors"
              style={{ color: 'rgba(255,255,255,0.35)' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#FCA5A5'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; }}
            >
              Clear all
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
