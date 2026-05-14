import { useProject } from '../context/ProjectContext';
import { getQuantity, calculateLineItem, hasDimensions, LABOR_RATES, fmtMoney } from '../utils/estimate';

const STATUS_PILLS = {
  Considering: { bg: 'rgba(212,175,55,0.15)',  text: '#D4AF37',  border: 'rgba(212,175,55,0.4)'  },
  Selected:    { bg: 'rgba(110,231,183,0.15)', text: '#6EE7B7',  border: 'rgba(110,231,183,0.4)' },
  Ordered:     { bg: 'rgba(147,197,253,0.15)', text: '#93C5FD',  border: 'rgba(147,197,253,0.4)' },
};

export default function BudgetTracker() {
  const { state, dispatch } = useProject();
  const { dimensions, wasteFactor, isLocked } = state;
  const entries = Object.values(state.selections);

  if (entries.length === 0) return null;

  const usingInstalled = hasDimensions(dimensions);
  const wasteDecimal = (Number(wasteFactor) || 0) / 100;

  function getEntryTotal(item) {
    if (usingInstalled) {
      const laborRate = LABOR_RATES[item.category] ?? 0;
      const qty = getQuantity(item.category, dimensions);
      return calculateLineItem(item.price, laborRate, qty, wasteDecimal);
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
        backgroundColor: '#001A39',
        borderTop: isLocked ? '2px solid #D4AF37' : '2px solid rgba(212,175,55,0.35)',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.35)',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      {/* Accent line */}
      <div style={{ height: '2px', backgroundColor: '#D4AF37', opacity: isLocked ? 1 : 0.6 }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">

          {/* Left — items tracked + status pills */}
          <div className="flex items-center gap-3 flex-wrap">
            {isLocked && (
              <span
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
                style={{ backgroundColor: 'rgba(212,175,55,0.15)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.35)' }}
              >
                🔒 Locked
              </span>
            )}
            <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {entries.length} item{entries.length !== 1 ? 's' : ''}
            </span>
            {['Considering', 'Selected', 'Ordered'].map((status) => {
              const count = entries.filter((e) => e.status === status).length;
              if (!count) return null;
              const p = STATUS_PILLS[status];
              return (
                <div
                  key={status}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: p.bg, color: p.text, border: `1px solid ${p.border}`, fontSize: '0.65rem', fontWeight: 700 }}
                >
                  <span>{count}×</span>
                  <span>{status}</span>
                  <span style={{ opacity: 0.8 }}>{fmtMoney(byStatus[status] ?? 0)}</span>
                </div>
              );
            })}
          </div>

          {/* Right — totals + clear */}
          <div className="flex items-center gap-5">
            {committedTotal > 0 && (
              <div className="text-right">
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '1px' }}>
                  Committed
                </p>
                <p style={{ color: '#D4AF37', fontSize: '1.1rem', fontWeight: 700 }}>
                  {fmtMoney(committedTotal)}
                </p>
              </div>
            )}

            <div
              className="text-right"
              style={{ paddingLeft: committedTotal > 0 ? '1.25rem' : 0, borderLeft: committedTotal > 0 ? '1px solid rgba(255,255,255,0.08)' : 'none' }}
            >
              {usingInstalled ? (
                <>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '1px' }}>
                    Installed Project Estimate
                  </p>
                  <p style={{ color: '#D4AF37', fontSize: '1.4rem', fontWeight: 800, lineHeight: 1 }}>
                    {fmtMoney(total)}
                  </p>
                  <p style={{ color: 'rgba(212,175,55,0.4)', fontSize: '0.6rem', marginTop: '2px' }}>
                    incl. labor + {wasteFactor}% waste
                  </p>
                </>
              ) : (
                <>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '1px' }}>
                    Materials Total
                  </p>
                  <p style={{ color: '#fff', fontSize: '1.4rem', fontWeight: 800, lineHeight: 1 }}>
                    {fmtMoney(total)}
                  </p>
                </>
              )}
            </div>

            {!isLocked && (
              <button
                onClick={() => dispatch({ type: 'CLEAR_SELECTIONS' })}
                className="text-xs font-medium underline transition-colors"
                style={{ color: 'rgba(255,255,255,0.25)' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#FCA5A5'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.25)'; }}
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
