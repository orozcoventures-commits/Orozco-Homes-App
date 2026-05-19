import { useProject } from '../context/ProjectContext';
import { getQuantity, calculateLineItem, calculateGrossEstimate, hasDimensions, LABOR_RATES, fmtMoney } from '../utils/estimate';

const STATUS_PILLS = {
  Considering: { bg: 'rgba(212,175,55,0.15)',  text: '#D4AF37',  border: 'rgba(212,175,55,0.4)'  },
  Selected:    { bg: 'rgba(110,231,183,0.15)', text: '#6EE7B7',  border: 'rgba(110,231,183,0.4)' },
  Ordered:     { bg: 'rgba(147,197,253,0.15)', text: '#93C5FD',  border: 'rgba(147,197,253,0.4)' },
};

export default function BudgetTracker() {
  const { state, dispatch } = useProject();
  const { dimensions, wasteFactor, overheadPct, profitPct, contractorView, isLocked } = state;
  const entries = Object.values(state.selections);

  if (entries.length === 0) return null;

  const usingInstalled = hasDimensions(dimensions);
  const wasteDecimal   = (Number(wasteFactor)  || 0) / 100;
  const ohDecimal      = (Number(overheadPct)  || 0) / 100;
  const profitDecimal  = (Number(profitPct)    || 0) / 100;

  function getHardCost(item) {
    if (!usingInstalled) return item.price;
    const laborRate = LABOR_RATES[item.category] ?? 0;
    const qty       = getQuantity(item.category, dimensions);
    return calculateLineItem(item.price, laborRate, qty, wasteDecimal);
  }

  function getClientPrice(item) {
    return calculateGrossEstimate(getHardCost(item), ohDecimal, profitDecimal);
  }

  // Totals by status
  const hardByStatus   = {};
  const clientByStatus = {};
  entries.forEach((item) => {
    const hc = getHardCost(item);
    const cp = getClientPrice(item);
    hardByStatus[item.status]   = (hardByStatus[item.status]   || 0) + hc;
    clientByStatus[item.status] = (clientByStatus[item.status] || 0) + cp;
  });

  const totalHard        = entries.reduce((s, i) => s + getHardCost(i), 0);
  const totalClient      = entries.reduce((s, i) => s + getClientPrice(i), 0);
  const totalOH          = totalClient * ohDecimal;
  const totalProfit      = totalClient * profitDecimal;
  const committedClient  = (clientByStatus['Selected'] ?? 0) + (clientByStatus['Ordered'] ?? 0);

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
      <div style={{ height: '2px', backgroundColor: '#D4AF37', opacity: isLocked ? 1 : 0.5 }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">

          {/* Left — status pills */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {isLocked && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
                style={{ backgroundColor: 'rgba(212,175,55,0.15)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.35)' }}>
                🔒 Locked
              </span>
            )}
            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {entries.length} item{entries.length !== 1 ? 's' : ''}
            </span>
            {['Considering', 'Selected', 'Ordered'].map((status) => {
              const count = entries.filter((e) => e.status === status).length;
              if (!count) return null;
              const p = STATUS_PILLS[status];
              return (
                <div key={status} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: p.bg, color: p.text, border: `1px solid ${p.border}`, fontSize: '0.65rem', fontWeight: 700 }}>
                  <span>{count}×</span>
                  <span>{status}</span>
                  <span style={{ opacity: 0.85 }}>{fmtMoney(clientByStatus[status] ?? 0)}</span>
                </div>
              );
            })}
          </div>

          {/* Right — financial totals */}
          <div className="flex items-stretch gap-0">

            {/* Contractor-only: hard costs + OH + profit */}
            {contractorView && usingInstalled && (
              <div className="text-right pr-5 mr-5" style={{ borderRight: '1px solid rgba(255,255,255,0.08)' }}>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.58rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '3px' }}>
                  Cost Structure
                </p>
                <div className="flex flex-col gap-0.5">
                  <div className="flex justify-between gap-4 items-baseline">
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.62rem' }}>Hard Costs</span>
                    <span style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 600 }}>{fmtMoney(totalHard)}</span>
                  </div>
                  <div className="flex justify-between gap-4 items-baseline">
                    <span style={{ color: 'rgba(212,175,55,0.55)', fontSize: '0.62rem' }}>Overhead ({overheadPct}%)</span>
                    <span style={{ color: '#D4AF37', fontSize: '0.75rem', fontWeight: 600 }}>{fmtMoney(totalOH)}</span>
                  </div>
                  <div className="flex justify-between gap-4 items-baseline">
                    <span style={{ color: 'rgba(212,175,55,0.55)', fontSize: '0.62rem' }}>Net Profit ({profitPct}%)</span>
                    <span style={{ color: '#D4AF37', fontSize: '0.75rem', fontWeight: 600 }}>{fmtMoney(totalProfit)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Committed */}
            {committedClient > 0 && (
              <div className="text-right pr-5 mr-5" style={{ borderRight: '1px solid rgba(255,255,255,0.08)' }}>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.58rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '1px' }}>
                  Committed
                </p>
                <p style={{ color: '#D4AF37', fontSize: '1.05rem', fontWeight: 700 }}>{fmtMoney(committedClient)}</p>
              </div>
            )}

            {/* Grand total */}
            <div className="text-right">
              {usingInstalled ? (
                <>
                  <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.58rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '1px' }}>
                    {contractorView ? 'Client Quote' : 'Total Installed Price'}
                  </p>
                  <p style={{ color: '#D4AF37', fontSize: '1.5rem', fontWeight: 800, lineHeight: 1 }}>
                    {fmtMoney(totalClient)}
                  </p>
                  <p style={{ color: 'rgba(212,175,55,0.35)', fontSize: '0.58rem', marginTop: '2px' }}>
                    {contractorView
                      ? `${wasteFactor}% waste · ${overheadPct}% OH · ${profitPct}% profit`
                      : `incl. labor & ${wasteFactor}% waste`}
                  </p>
                </>
              ) : (
                <>
                  <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.58rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '1px' }}>
                    Materials Total
                  </p>
                  <p style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 800, lineHeight: 1 }}>
                    {fmtMoney(totalClient)}
                  </p>
                </>
              )}
            </div>

            {!isLocked && (
              <div className="flex items-center pl-5 ml-5" style={{ borderLeft: '1px solid rgba(255,255,255,0.08)' }}>
                <button
                  onClick={() => dispatch({ type: 'CLEAR_SELECTIONS' })}
                  className="text-xs font-medium underline transition-colors"
                  style={{ color: 'rgba(255,255,255,0.2)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#FCA5A5'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.2)'; }}
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
